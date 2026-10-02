import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { NETWORK_CONSTANTS } from '../constants/network_constants.js';
import {
  JoinAcceptedPayload,
  JoinRejectedPayload,
  JoinRequestPayload,
  PeerProfile,
  RoomDetails,
  SignalingMessage,
} from '../types/signaling.js';

export interface SignalingClientEvents {
  connected: (room: RoomDetails, existingPeers: PeerProfile[]) => void;
  rejected: (reason: string) => void;
  peerJoined: (peer: PeerProfile) => void;
  peerLeft: (peerId: string) => void;
  offer: (fromPeerId: string, sdp: string) => void;
  answer: (fromPeerId: string, sdp: string) => void;
  iceCandidate: (fromPeerId: string, candidate: any) => void;
  muteStatus: (peerId: string, isMuted: boolean) => void;
  audioLevel: (peerId: string, level: number, isSpeaking: boolean) => void;
  disconnected: () => void;
}

export class SignalingClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private peerId: string;
  private displayName: string;
  private deviceType: 'android' | 'ios' | 'desktop';
  private pin?: string;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(
    peerId: string,
    displayName: string,
    deviceType: 'android' | 'ios' | 'desktop' = 'android',
    pin?: string
  ) {
    super();
    this.peerId = peerId;
    this.displayName = displayName;
    this.deviceType = deviceType;
    this.pin = pin;
  }

  public getMyPeerId(): string {
    return this.peerId;
  }

  public connect(hostIp: string, port: number = NETWORK_CONSTANTS.SIGNALING_PORT): Promise<JoinAcceptedPayload> {
    return new Promise((resolve, reject) => {
      const url = `ws://${hostIp}:${port}`;
      this.ws = new WebSocket(url);

      let isHandshakeComplete = false;

      this.ws.on('open', () => {
        // Send JOIN_REQUEST
        const joinRequest: SignalingMessage<JoinRequestPayload> = {
          type: 'JOIN_REQUEST',
          fromPeerId: this.peerId,
          payload: {
            displayName: this.displayName,
            deviceType: this.deviceType,
            pin: this.pin,
          },
          timestamp: Date.now(),
        };
        this.send(joinRequest);
        this.startHeartbeat();
      });

      this.ws.on('message', (data: Buffer | string) => {
        try {
          const msg: SignalingMessage = JSON.parse(data.toString());
          this.handleIncomingMessage(msg, (accepted) => {
            isHandshakeComplete = true;
            this.isConnected = true;
            resolve(accepted);
          }, (rejectedReason) => {
            reject(new Error(`Join rejected: ${rejectedReason}`));
          });
        } catch (err) {
          console.error('[SignalingClient] Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        this.stopHeartbeat();
        this.isConnected = false;
        this.emit('disconnected');
        if (!isHandshakeComplete) {
          reject(new Error('Connection closed before handshake completed'));
        }
      });

      this.ws.on('error', (err) => {
        this.stopHeartbeat();
        this.isConnected = false;
        if (!isHandshakeComplete) {
          reject(err);
        }
      });
    });
  }

  private handleIncomingMessage(
    msg: SignalingMessage,
    onAccept: (payload: JoinAcceptedPayload) => void,
    onReject: (reason: string) => void
  ): void {
    switch (msg.type) {
      case 'JOIN_ACCEPTED': {
        const payload = msg.payload as JoinAcceptedPayload;
        this.peerId = payload.assignedPeerId;
        onAccept(payload);
        this.emit('connected', payload.room, payload.existingPeers);
        break;
      }

      case 'JOIN_REJECTED': {
        const payload = msg.payload as JoinRejectedPayload;
        onReject(payload.reason);
        this.emit('rejected', payload.reason);
        break;
      }

      case 'PEER_JOINED': {
        const peer = msg.payload as PeerProfile;
        this.emit('peerJoined', peer);
        break;
      }

      case 'PEER_LEFT': {
        const { peerId } = msg.payload as { peerId: string };
        this.emit('peerLeft', peerId);
        break;
      }

      case 'OFFER': {
        const payload = msg.payload as { sdp: string };
        this.emit('offer', msg.fromPeerId, payload.sdp);
        break;
      }

      case 'ANSWER': {
        const payload = msg.payload as { sdp: string };
        this.emit('answer', msg.fromPeerId, payload.sdp);
        break;
      }

      case 'ICE_CANDIDATE': {
        this.emit('iceCandidate', msg.fromPeerId, msg.payload);
        break;
      }

      case 'MUTE_STATUS': {
        const { isMuted } = msg.payload as { isMuted: boolean };
        this.emit('muteStatus', msg.fromPeerId, isMuted);
        break;
      }

      case 'AUDIO_LEVEL': {
        const { level, isSpeaking } = msg.payload as { level: number; isSpeaking: boolean };
        this.emit('audioLevel', msg.fromPeerId, level, isSpeaking);
        break;
      }

      case 'PONG':
        // Heartbeat response received
        break;
    }
  }

  public sendOffer(toPeerId: string, sdp: string): void {
    this.send({
      type: 'OFFER',
      fromPeerId: this.peerId,
      toPeerId,
      payload: { sdp, sdpType: 'offer' },
      timestamp: Date.now(),
    });
  }

  public sendAnswer(toPeerId: string, sdp: string): void {
    this.send({
      type: 'ANSWER',
      fromPeerId: this.peerId,
      toPeerId,
      payload: { sdp, sdpType: 'answer' },
      timestamp: Date.now(),
    });
  }

  public sendIceCandidate(toPeerId: string, candidate: any): void {
    this.send({
      type: 'ICE_CANDIDATE',
      fromPeerId: this.peerId,
      toPeerId,
      payload: candidate,
      timestamp: Date.now(),
    });
  }

  public setMute(isMuted: boolean): void {
    this.send({
      type: 'MUTE_STATUS',
      fromPeerId: this.peerId,
      payload: { isMuted },
      timestamp: Date.now(),
    });
  }

  public sendAudioLevel(level: number, isSpeaking: boolean): void {
    this.send({
      type: 'AUDIO_LEVEL',
      fromPeerId: this.peerId,
      payload: { level, isSpeaking },
      timestamp: Date.now(),
    });
  }

  public leave(): void {
    if (this.isConnected && this.ws) {
      this.send({
        type: 'LEAVE_ROOM',
        fromPeerId: this.peerId,
        payload: {},
        timestamp: Date.now(),
      });
      this.disconnect();
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  private send(msg: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      this.send({
        type: 'PING',
        fromPeerId: this.peerId,
        payload: {},
        timestamp: Date.now(),
      });
    }, NETWORK_CONSTANTS.PING_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
