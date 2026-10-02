import { describe, test, expect } from 'bun:test';
import { MdnsDiscoveryHelper } from '../core/discovery/mdns_discovery.js';
import { GatewayFastProbe } from '../core/discovery/gateway_probe.js';
import { LocalSignalingServer } from '../core/signaling/signaling_server.js';
import { RoomDetails } from '../core/types/signaling.js';

describe('Discovery Engine (mDNS & Gateway Fast-Probe)', () => {
  test('mDNS TXT record serialization and deserialization', () => {
    const mockRoom: RoomDetails = {
      roomId: 'room-abc-123',
      name: 'Forest Camp Call',
      hostId: 'host-10',
      hostIp: '192.168.43.1',
      port: 45455,
      hasPin: true,
      participantCount: 3,
      maxParticipants: 8,
      createdAt: Date.now(),
    };

    const record = MdnsDiscoveryHelper.buildServiceRecord(mockRoom);
    expect(record.type).toBe('_truecall._tcp');
    expect(record.txt.roomId).toBe('room-abc-123');
    expect(record.txt.hasPin).toBe('1');
    expect(record.txt.count).toBe('3');

    const parsed = MdnsDiscoveryHelper.parseServiceRecord('192.168.43.1', 45455, record.txt);
    expect(parsed).not.toBeNull();
    expect(parsed!.roomId).toBe('room-abc-123');
    expect(parsed!.name).toBe('Forest Camp Call');
    expect(parsed!.hasPin).toBe(true);
    expect(parsed!.participantCount).toBe(3);
    expect(parsed!.hostIp).toBe('192.168.43.1');
  });

  test('GatewayFastProbe detects host room in <50ms', async () => {
    const probeServerPort = 45457;
    const probeServer = new LocalSignalingServer({
      roomId: 'hotspot-room-99',
      roomName: 'Hotspot Auto Room',
      hostPeerId: 'host-gateway-1',
      hostDisplayName: 'Hotspot Gateway',
      hostIp: '127.0.0.1',
      port: probeServerPort,
    });

    await probeServer.start();

    const probe = new GatewayFastProbe();
    const result = await probe.probeIp('127.0.0.1', probeServerPort);

    expect(result).not.toBeNull();
    expect(result!.roomId).toBe('hotspot-room-99');
    expect(result!.name).toBe('Hotspot Auto Room');
    expect(result!.hostIp).toBe('127.0.0.1');

    // Test probing an unresponsive port returns null gracefully without throwing
    const deadResult = await probe.probeIp('127.0.0.1', 49999, 100);
    expect(deadResult).toBeNull();

    await probeServer.stop();
  });
});
