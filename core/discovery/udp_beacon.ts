import dgram from 'dgram';
import { EventEmitter } from 'events';
import { NETWORK_CONSTANTS } from '../constants/network_constants.js';
import { RoomBeaconPacket, RoomDetails } from '../types/signaling.js';

export interface DiscoveredRoom {
  room: RoomDetails;
  lastSeen: number;
  rttEstimateMs?: number;
}

export class UdpBeaconBroadcaster {
  private socket: dgram.Socket | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isBroadcasting: boolean = false;
  private room: RoomDetails;

  constructor(room: RoomDetails) {
    this.room = room;
  }

  public updateRoomDetails(room: RoomDetails): void {
    this.room = room;
  }

  public start(): Promise<void> {
    if (this.isBroadcasting) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.bind(0, () => {
        try {
          this.socket!.setBroadcast(true);
          this.isBroadcasting = true;

          this.intervalTimer = setInterval(() => {
            this.broadcastPacket();
          }, NETWORK_CONSTANTS.BEACON_INTERVAL_MS);

          // Broadcast immediately
          this.broadcastPacket();
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      this.socket.on('error', (err) => {
        console.error('[UdpBeaconBroadcaster] Socket error:', err);
      });
    });
  }

  private broadcastPacket(): void {
    if (!this.socket || !this.isBroadcasting) return;

    const packet: RoomBeaconPacket = {
      protocol: 'truecall-v1',
      roomId: this.room.roomId,
      roomName: this.room.name,
      hostPeerId: this.room.hostId,
      hostIp: this.room.hostIp,
      port: this.room.port,
      hasPin: this.room.hasPin,
      participantCount: this.room.participantCount,
      timestamp: Date.now(),
    };

    const buffer = Buffer.from(JSON.stringify(packet));

    // Send to global broadcast address
    this.socket.send(buffer, 0, buffer.length, NETWORK_CONSTANTS.UDP_BEACON_PORT, '255.255.255.255');

    // Also send to common hotspot subnet broadcasts
    const subnetBroadcasts = ['192.168.43.255', '172.20.10.15', '192.168.1.255', '192.168.0.255'];
    for (const addr of subnetBroadcasts) {
      this.socket.send(buffer, 0, buffer.length, NETWORK_CONSTANTS.UDP_BEACON_PORT, addr);
    }
  }

  public stop(): Promise<void> {
    if (!this.isBroadcasting) return Promise.resolve();

    return new Promise((resolve) => {
      if (this.intervalTimer) {
        clearInterval(this.intervalTimer);
        this.intervalTimer = null;
      }
      this.isBroadcasting = false;

      if (this.socket) {
        this.socket.close(() => {
          this.socket = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export class UdpBeaconListener extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private discoveredRooms: Map<string, DiscoveredRoom> = new Map();
  private pruneTimer: NodeJS.Timeout | null = null;
  private isListening: boolean = false;

  public start(): Promise<void> {
    if (this.isListening) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('message', (msg, rinfo) => {
        try {
          const packet: RoomBeaconPacket = JSON.parse(msg.toString());
          if (packet.protocol !== 'truecall-v1') return;

          const now = Date.now();
          const hostIp = packet.hostIp || rinfo.address;

          const room: RoomDetails = {
            roomId: packet.roomId,
            name: packet.roomName,
            hostId: packet.hostPeerId,
            hostIp: hostIp,
            port: packet.port,
            hasPin: packet.hasPin,
            participantCount: packet.participantCount,
            maxParticipants: 8,
            createdAt: packet.timestamp,
          };

          const isNew = !this.discoveredRooms.has(packet.roomId);
          this.discoveredRooms.set(packet.roomId, {
            room,
            lastSeen: now,
          });

          this.emit('roomUpdated', room, isNew);
        } catch {}
      });

      this.socket.on('error', (err) => {
        console.error('[UdpBeaconListener] Error:', err);
      });

      this.socket.bind(NETWORK_CONSTANTS.UDP_BEACON_PORT, '0.0.0.0', () => {
        this.isListening = true;

        // Periodic pruning of stale rooms (> 5 seconds old)
        this.pruneTimer = setInterval(() => {
          this.pruneStaleRooms();
        }, 2000);

        resolve();
      });
    });
  }

  private pruneStaleRooms(): void {
    const now = Date.now();
    for (const [roomId, entry] of this.discoveredRooms.entries()) {
      if (now - entry.lastSeen > NETWORK_CONSTANTS.HEARTBEAT_TIMEOUT_MS) {
        this.discoveredRooms.delete(roomId);
        this.emit('roomExpired', roomId);
      }
    }
  }

  public getActiveRooms(): RoomDetails[] {
    return Array.from(this.discoveredRooms.values()).map((e) => e.room);
  }

  public stop(): Promise<void> {
    if (!this.isListening) return Promise.resolve();

    return new Promise((resolve) => {
      if (this.pruneTimer) {
        clearInterval(this.pruneTimer);
        this.pruneTimer = null;
      }
      this.isListening = false;
      this.discoveredRooms.clear();

      if (this.socket) {
        this.socket.close(() => {
          this.socket = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
