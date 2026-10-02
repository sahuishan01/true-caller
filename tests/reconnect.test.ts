import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SignalingClient } from '../core/signaling/signaling_client.js';
import { LocalSignalingServer } from '../core/signaling/signaling_server.js';
import { WebRtcMeshCoordinator } from '../core/webrtc/mesh_coordinator.js';

describe('Auto Reconnect & Mesh Recovery', () => {
  let server: LocalSignalingServer;
  const testPort = 45461;

  beforeEach(async () => {
    server = new LocalSignalingServer({
      roomId: 'room-reconnect',
      roomName: 'Mesh Recovery Room',
      hostPeerId: 'host-rec-1',
      hostDisplayName: 'Host',
      hostIp: '127.0.0.1',
      port: testPort,
    });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('triggers reconnecting event sequence when connection drops unexpectedly', async () => {
    const client = new SignalingClient('client-rec-1', 'Rec User', 'android', undefined, true);
    await client.connect('127.0.0.1', testPort);
    expect(client.getIsConnected()).toBe(true);

    let reconnectingEmitted = false;
    let attemptNumber = 0;

    client.on('reconnecting', (info) => {
      reconnectingEmitted = true;
      attemptNumber = info.attempt;
    });

    // Simulate unexpected drop by forcefully closing the underlying websocket without client.leave()
    const rawWs = (client as any).ws;
    if (rawWs) {
      rawWs.close();
    }

    // Wait a brief moment for onClose and scheduleReconnect to trigger
    await new Promise((r) => setTimeout(r, 80));

    expect(reconnectingEmitted).toBe(true);
    expect(attemptNumber).toBe(1);

    client.disconnect();
  });

  it('MeshCoordinator triggers iceRestartRequired on peer connection failure for offerer', () => {
    const client = new SignalingClient('client-a', 'Alice', 'android');
    const coordinator = new WebRtcMeshCoordinator(client);

    // Mock an active peer with ID 'client-z' (lexicographically greater than 'client-a', so 'client-a' is offerer)
    (coordinator as any).addPeer(
      {
        id: 'client-z',
        displayName: 'Zack',
        deviceType: 'android',
        isHost: false,
        isMuted: false,
        joinedAt: Date.now(),
      },
      false
    );

    let iceRestartTriggeredFor: any = null;
    coordinator.on('iceRestartRequired', (peerId) => {
      iceRestartTriggeredFor = peerId;
    });

    // Simulate connection failure on peer 'client-z'
    coordinator.updateConnectionState('client-z', 'failed');

    expect(iceRestartTriggeredFor).toBe('client-z');
  });
});
