import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { NETWORK_CONSTANTS } from '../constants/network_constants.js';
import { TypedEventEmitter } from '../utils/event_emitter.js';
import {
  DiscoveredDevice,
  CallInvitePayload,
  CallInviteResponsePayload,
  JoinAcceptedPayload,
  JoinRejectedPayload,
  JoinRequestPayload,
  PeerProfile,
  RoomDetails,
  SignalingMessage,
} from '../types/signaling.js';

export interface SignalingServerConfig {
  roomId: string;
  roomName: string;
  hostPeerId: string;
  hostDisplayName: string;
  hostDeviceType?: 'android' | 'ios' | 'desktop';
  hostIp: string;
  port?: number;
  pin?: string;
  maxParticipants?: number;
}

export class LocalSignalingServer extends TypedEventEmitter {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private peers: Map<string, { profile: PeerProfile; socket: WebSocket }> = new Map();
  private config: SignalingServerConfig;
  private isRunning: boolean = false;

  constructor(config: SignalingServerConfig) {
    super();
    this.config = {
      port: NETWORK_CONSTANTS.SIGNALING_PORT,
      maxParticipants: 8,
      hostDeviceType: 'android',
      ...config,
    };
  }

  public getDeviceInfo(): DiscoveredDevice {
    return {
      deviceId: this.config.hostPeerId,
      displayName: this.config.hostDisplayName,
      ip: this.config.hostIp,
      port: this.config.port || NETWORK_CONSTANTS.SIGNALING_PORT,
      deviceType: this.config.hostDeviceType || 'android',
      status: this.isRunning ? 'hosting' : 'available',
      currentRoomName: this.config.roomName,
      lastSeen: Date.now(),
    };
  }

  public async start(): Promise<RoomDetails> {
    if (this.isRunning) {
      return this.getRoomDetails();
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Universal CORS headers for local LAN/Hotspot WebViews and browsers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Fast-probe HTTP endpoints for LAN/Hotspot peers
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
          return;
        }

        if (req.method === 'GET' && req.url === '/room-info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getRoomDetails()));
          return;
        }

        if (req.method === 'GET' && req.url === '/device-info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getDeviceInfo()));
          return;
        }

        if (req.method === 'POST' && req.url === '/invite') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const invite = JSON.parse(body) as CallInvitePayload;
              this.emit('callInvite', invite);
              const response: CallInviteResponsePayload = {
                inviteId: invite.inviteId,
                fromDeviceId: this.config.hostPeerId,
                fromDisplayName: this.config.hostDisplayName,
                accepted: true,
              };
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(response));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'invalid_json' }));
            }
          });
          return;
        }

        res.writeHead(404);
        res.end();
      });

      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on('connection', (ws: WebSocket, req) => {
        let currentPeerId: string | null = null;

        ws.on('message', (data: Buffer | string) => {
          try {
            const raw = data.toString();
            const message: SignalingMessage = JSON.parse(raw);
            currentPeerId = this.handleSignalingMessage(ws, message, currentPeerId);
          } catch (err) {
            console.error('[SignalingServer] Failed to parse message:', err);
          }
        });

        ws.on('close', () => {
          if (currentPeerId) {
            this.removePeer(currentPeerId);
          }
        });

        ws.on('error', (err) => {
          console.error('[SignalingServer] Socket error on peer:', currentPeerId, err);
          if (currentPeerId) {
            this.removePeer(currentPeerId);
          }
        });
      });

      // Register host in peer list
      this.peers.set(this.config.hostPeerId, {
        profile: {
          id: this.config.hostPeerId,
          displayName: this.config.hostDisplayName,
          deviceType: this.config.hostDeviceType || 'android',
          isHost: true,
          isMuted: false,
          joinedAt: Date.now(),
        },
        socket: null as unknown as WebSocket, // Host is in-process
      });

      const port = this.config.port || NETWORK_CONSTANTS.SIGNALING_PORT;
      this.server.listen(port, '0.0.0.0', () => {
        this.isRunning = true;
        resolve(this.getRoomDetails());
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  public getRoomDetails(): RoomDetails {
    return {
      roomId: this.config.roomId,
      name: this.config.roomName,
      hostId: this.config.hostPeerId,
      hostIp: this.config.hostIp,
      port: this.config.port || NETWORK_CONSTANTS.SIGNALING_PORT,
      hasPin: Boolean(this.config.pin && this.config.pin.length > 0),
      participantCount: this.peers.size,
      maxParticipants: this.config.maxParticipants || 8,
      createdAt: Date.now(),
    };
  }

  public getConnectedPeers(): PeerProfile[] {
    return Array.from(this.peers.values()).map((p) => p.profile);
  }

  private handleSignalingMessage(
    ws: WebSocket,
    msg: SignalingMessage,
    currentPeerId: string | null
  ): string | null {
    switch (msg.type) {
      case 'JOIN_REQUEST': {
        const payload = msg.payload as JoinRequestPayload;
        // Verify PIN if configured
        if (this.config.pin && this.config.pin !== payload.pin) {
          const rejected: SignalingMessage<JoinRejectedPayload> = {
            type: 'JOIN_REJECTED',
            fromPeerId: this.config.hostPeerId,
            toPeerId: msg.fromPeerId,
            payload: { reason: 'INVALID_PIN' },
            timestamp: Date.now(),
          };
          ws.send(JSON.stringify(rejected));
          ws.close();
          return null;
        }

        // Verify room capacity
        if (this.peers.size >= (this.config.maxParticipants || 8)) {
          const rejected: SignalingMessage<JoinRejectedPayload> = {
            type: 'JOIN_REJECTED',
            fromPeerId: this.config.hostPeerId,
            toPeerId: msg.fromPeerId,
            payload: { reason: 'ROOM_FULL' },
            timestamp: Date.now(),
          };
          ws.send(JSON.stringify(rejected));
          ws.close();
          return null;
        }

        const newPeerId = msg.fromPeerId || `peer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newProfile: PeerProfile = {
          id: newPeerId,
          displayName: payload.displayName || 'Guest',
          deviceType: payload.deviceType || 'android',
          isHost: false,
          isMuted: false,
          joinedAt: Date.now(),
        };

        const existingPeersList = this.getConnectedPeers();

        // Register peer
        this.peers.set(newPeerId, { profile: newProfile, socket: ws });

        // Send JOIN_ACCEPTED to joining peer
        const accepted: SignalingMessage<JoinAcceptedPayload> = {
          type: 'JOIN_ACCEPTED',
          fromPeerId: this.config.hostPeerId,
          toPeerId: newPeerId,
          payload: {
            assignedPeerId: newPeerId,
            room: this.getRoomDetails(),
            existingPeers: existingPeersList,
          },
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(accepted));

        // Notify all other peers
        const peerJoined: SignalingMessage<PeerProfile> = {
          type: 'PEER_JOINED',
          fromPeerId: newPeerId,
          payload: newProfile,
          timestamp: Date.now(),
        };
        this.broadcast(peerJoined, newPeerId);

        return newPeerId;
      }

      case 'OFFER':
      case 'ANSWER':
      case 'ICE_CANDIDATE': {
        // Direct peer-to-peer WebRTC signaling relay
        if (msg.toPeerId) {
          this.sendToPeer(msg.toPeerId, msg);
        }
        return currentPeerId;
      }

      case 'MUTE_STATUS':
      case 'AUDIO_LEVEL': {
        if (currentPeerId && this.peers.has(currentPeerId)) {
          const peer = this.peers.get(currentPeerId)!;
          if (msg.type === 'MUTE_STATUS') {
            peer.profile.isMuted = (msg.payload as { isMuted: boolean }).isMuted;
          }
        }
        // Broadcast state update to everyone else
        this.broadcast(msg, currentPeerId || undefined);
        return currentPeerId;
      }

      case 'PING': {
        const pong: SignalingMessage = {
          type: 'PONG',
          fromPeerId: this.config.hostPeerId,
          toPeerId: msg.fromPeerId,
          payload: {},
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(pong));
        return currentPeerId;
      }

      case 'LEAVE_ROOM': {
        if (currentPeerId) {
          this.removePeer(currentPeerId);
          ws.close();
        }
        return null;
      }

      default:
        return currentPeerId;
    }
  }

  private sendToPeer(peerId: string, message: SignalingMessage): void {
    const peer = this.peers.get(peerId);
    if (peer && peer.socket && peer.socket.readyState === WebSocket.OPEN) {
      peer.socket.send(JSON.stringify(message));
    }
  }

  public broadcast(message: SignalingMessage, excludePeerId?: string): void {
    const serialized = JSON.stringify(message);
    for (const [peerId, peer] of this.peers.entries()) {
      if (excludePeerId && peerId === excludePeerId) continue;
      if (peer.socket && peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(serialized);
      }
    }
  }

  public removePeer(peerId: string): void {
    if (!this.peers.has(peerId)) return;
    this.peers.delete(peerId);

    const leaveMessage: SignalingMessage<{ peerId: string }> = {
      type: 'PEER_LEFT',
      fromPeerId: peerId,
      payload: { peerId },
      timestamp: Date.now(),
    };
    this.broadcast(leaveMessage);
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      // Terminate any active websocket clients
      if (this.wss) {
        try {
          this.wss.clients.forEach((client) => {
            try {
              client.terminate();
            } catch {}
          });
          this.wss.close();
        } catch {}
        this.wss = null;
      }

      for (const peer of this.peers.values()) {
        if (peer.socket) {
          try {
            peer.socket.terminate();
          } catch {}
        }
      }
      this.peers.clear();

      if (this.server) {
        try {
          if (typeof (this.server as any).closeAllConnections === 'function') {
            (this.server as any).closeAllConnections();
          }
          this.server.close(() => {
            this.isRunning = false;
            resolve();
          });
        } catch {
          this.isRunning = false;
          resolve();
        }
        this.server = null;
      } else {
        this.isRunning = false;
        resolve();
      }
    });
  }
}
