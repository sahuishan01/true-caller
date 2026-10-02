import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import http from 'http';
import { LocalSignalingServer } from '../core/signaling/signaling_server.js';
import { SignalingClient } from '../core/signaling/signaling_client.js';

describe('LocalSignalingServer & SignalingClient Protocol', () => {
  const TEST_PORT = 45456;
  let server: LocalSignalingServer;

  beforeAll(async () => {
    server = new LocalSignalingServer({
      roomId: 'test-room-uuid-1',
      roomName: 'Offline Test Room',
      hostPeerId: 'host-peer-0',
      hostDisplayName: 'Ishan (Host)',
      hostIp: '127.0.0.1',
      port: TEST_PORT,
      pin: '1234',
      maxParticipants: 4,
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  test('GET /health returns 200 OK', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
  });

  test('GET /room-info returns room metadata for fast-probing', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/room-info`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.roomId).toBe('test-room-uuid-1');
    expect(body.name).toBe('Offline Test Room');
    expect(body.hasPin).toBe(true);
    expect(body.port).toBe(TEST_PORT);
  });

  test('Client with incorrect PIN is rejected', async () => {
    const badClient = new SignalingClient('peer-bad', 'Intruder', 'android', '9999');
    let rejected = false;
    try {
      await badClient.connect('127.0.0.1', TEST_PORT);
    } catch (err: any) {
      rejected = true;
      expect(err.message).toContain('INVALID_PIN');
    }
    expect(rejected).toBe(true);
    badClient.disconnect();
  });

  test('Client 1 connects with correct PIN and receives JOIN_ACCEPTED', async () => {
    const client1 = new SignalingClient('peer-1', 'Alice', 'ios', '1234');
    const accepted = await client1.connect('127.0.0.1', TEST_PORT);

    expect(accepted.assignedPeerId).toBe('peer-1');
    expect(accepted.room.roomId).toBe('test-room-uuid-1');
    expect(accepted.existingPeers.length).toBeGreaterThanOrEqual(1); // host exists

    // Client 2 connects
    const client2 = new SignalingClient('peer-2', 'Bob', 'android', '1234');

    const peerJoinedPromise = new Promise<void>((resolve) => {
      client1.on('peerJoined', (peer) => {
        if (peer.id === 'peer-2') {
          expect(peer.displayName).toBe('Bob');
          resolve();
        }
      });
    });

    await client2.connect('127.0.0.1', TEST_PORT);
    await peerJoinedPromise;

    // Test SDP Offer relay from Client 1 to Client 2
    const offerPromise = new Promise<string>((resolve) => {
      client2.on('offer', (fromPeerId, sdp) => {
        expect(fromPeerId).toBe('peer-1');
        resolve(sdp);
      });
    });

    client1.sendOffer('peer-2', 'mock-sdp-offer-string');
    const receivedOffer = await offerPromise;
    expect(receivedOffer).toBe('mock-sdp-offer-string');

    // Test SDP Answer relay from Client 2 to Client 1
    const answerPromise = new Promise<string>((resolve) => {
      client1.on('answer', (fromPeerId, sdp) => {
        expect(fromPeerId).toBe('peer-2');
        resolve(sdp);
      });
    });

    client2.sendAnswer('peer-1', 'mock-sdp-answer-string');
    const receivedAnswer = await answerPromise;
    expect(receivedAnswer).toBe('mock-sdp-answer-string');

    // Test Mute broadcast
    const mutePromise = new Promise<boolean>((resolve) => {
      client2.on('muteStatus', (fromPeerId, isMuted) => {
        expect(fromPeerId).toBe('peer-1');
        resolve(isMuted);
      });
    });

    client1.setMute(true);
    const receivedMute = await mutePromise;
    expect(receivedMute).toBe(true);

    // Test peer left
    const peerLeftPromise = new Promise<string>((resolve) => {
      client1.on('peerLeft', (peerId) => {
        expect(peerId).toBe('peer-2');
        resolve(peerId);
      });
    });

    client2.leave();
    const leftPeerId = await peerLeftPromise;
    expect(leftPeerId).toBe('peer-2');

    client1.disconnect();
  });
});
