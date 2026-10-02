import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import http from 'http';
import { DeviceDiscoveryManager } from '../core/discovery/device_discovery.js';
import { LocalSignalingServer } from '../core/signaling/signaling_server.js';
import { CallInvitePayload, DiscoveredDevice } from '../core/types/signaling.js';

describe('DeviceDiscoveryManager & Call Invites', () => {
  let server: LocalSignalingServer;
  let testPort = 45459;

  beforeEach(async () => {
    server = new LocalSignalingServer({
      roomId: 'room-test-1',
      roomName: 'Sprint Standup',
      hostPeerId: 'peer-host-1',
      hostDisplayName: 'Ishan (Host)',
      hostIp: '127.0.0.1',
      port: testPort,
    });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('probes a live device and parses device-info correctly', async () => {
    const manager = new DeviceDiscoveryManager({
      deviceId: 'dev-client-1',
      displayName: 'Alice Phone',
      ip: '127.0.0.1',
      port: 45460,
    });

    const dev = await manager.probeDevice('127.0.0.1', testPort);
    expect(dev).not.toBeNull();
    expect(dev!.deviceId).toBe('peer-host-1');
    expect(dev!.displayName).toBe('Ishan (Host)');
    expect(dev!.status).toBe('hosting');
    expect(dev!.currentRoomName).toBe('Sprint Standup');

    const list = manager.getDiscoveredDevices();
    expect(list.length).toBe(1);
    expect(list[0].deviceId).toBe('peer-host-1');
  });

  it('sends call invite via HTTP POST to target device and receives response', async () => {
    let receivedInvite: CallInvitePayload | null = null;
    server.on('callInvite', (invite) => {
      receivedInvite = invite;
    });

    const manager = new DeviceDiscoveryManager({
      deviceId: 'dev-caller',
      displayName: 'Caller Device',
      ip: '127.0.0.1',
    });

    const invitePayload: CallInvitePayload = {
      inviteId: 'inv-999',
      hostPeerId: 'peer-caller',
      hostDisplayName: 'Caller Device',
      hostIp: '127.0.0.1',
      port: testPort,
      roomId: 'room-new-1',
      roomName: 'Urgent Sync',
      timestamp: Date.now(),
    };

    const resp = await manager.sendCallInvite('127.0.0.1', invitePayload, testPort);
    expect(resp.accepted).toBe(true);
    expect(resp.inviteId).toBe('inv-999');
    expect(receivedInvite).not.toBeNull();
    expect((receivedInvite as any).roomName).toBe('Urgent Sync');
  });

  it('prunes stale devices after inactivity timeout', () => {
    const manager = new DeviceDiscoveryManager({
      deviceId: 'dev-local',
    });

    const mockDevice: DiscoveredDevice = {
      deviceId: 'dev-old',
      displayName: 'Stale Device',
      ip: '192.168.43.99',
      port: 45455,
      deviceType: 'android',
      status: 'available',
      lastSeen: Date.now() - 10000, // 10s ago
    };

    manager.registerDiscoveredDevice(mockDevice);
    expect(manager.getDiscoveredDevices().length).toBe(1);

    manager.pruneStaleDevices(5000);
    expect(manager.getDiscoveredDevices().length).toBe(0);
  });
});
