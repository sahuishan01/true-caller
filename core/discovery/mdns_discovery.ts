import { NETWORK_CONSTANTS } from '../constants/network_constants.js';
import { RoomDetails } from '../types/signaling.js';

export interface MdnsServiceRecord {
  name: string;
  type: string;
  port: number;
  txt: {
    roomId: string;
    roomName: string;
    hostId: string;
    hasPin: string; // '1' | '0'
    count: string;
    version: string;
  };
}

export class MdnsDiscoveryHelper {
  /**
   * Builds the Bonjour/mDNS service definition to publish via native platform or bonsoir.
   */
  public static buildServiceRecord(room: RoomDetails): MdnsServiceRecord {
    return {
      name: `TrueCall-${room.roomId.slice(0, 8)}`,
      type: NETWORK_CONSTANTS.MDNS_SERVICE_TYPE,
      port: room.port,
      txt: {
        roomId: room.roomId,
        roomName: room.name,
        hostId: room.hostId,
        hasPin: room.hasPin ? '1' : '0',
        count: room.participantCount.toString(),
        version: '1.0.0',
      },
    };
  }

  /**
   * Parses a resolved mDNS TXT record back into RoomDetails.
   */
  public static parseServiceRecord(hostIp: string, port: number, txt: Record<string, string>): RoomDetails | null {
    if (!txt.roomId || !txt.roomName) return null;

    return {
      roomId: txt.roomId,
      name: txt.roomName,
      hostId: txt.hostId || 'unknown',
      hostIp: hostIp,
      port: port,
      hasPin: txt.hasPin === '1',
      participantCount: parseInt(txt.count || '1', 10),
      maxParticipants: 8,
      createdAt: Date.now(),
    };
  }
}
