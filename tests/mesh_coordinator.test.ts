import { describe, test, expect } from 'bun:test';
import { WebRtcMeshCoordinator } from '../core/webrtc/mesh_coordinator.js';
import { AudioEngineManager } from '../core/webrtc/audio_engine.js';
import { SignalingClient } from '../core/signaling/signaling_client.js';

describe('WebRTC Mesh Coordinator & Audio Engine', () => {
  test('Deterministic tie-breaker eliminates negotiation glare', () => {
    const mockClientA = new SignalingClient('peer-aaa', 'Alice', 'ios');
    const mockClientB = new SignalingClient('peer-zzz', 'Bob', 'android');

    const coordinatorA = new WebRtcMeshCoordinator(mockClientA);
    const coordinatorB = new WebRtcMeshCoordinator(mockClientB);

    // 'peer-aaa' < 'peer-zzz'
    // Alice should initiate offer, Bob should NOT initiate offer
    expect(coordinatorA.shouldInitiateOffer('peer-zzz')).toBe(true);
    expect(coordinatorB.shouldInitiateOffer('peer-aaa')).toBe(false);
  });

  test('AudioEngineManager optimizes SDP for voice with Opus FEC and DTX', () => {
    const engine = new AudioEngineManager();
    const mockSdp = [
      'v=0',
      'o=- 123456 2 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=rtpmap:111 opus/48000/2',
    ].join('\r\n');

    const optimized = engine.optimizeVoiceSdp(mockSdp);

    expect(optimized).toContain('a=fmtp:111 maxaveragebitrate=32000;stereo=0;useinbandfec=1;usedtx=1');
  });

  test('AudioEngineManager audio route switching', () => {
    const engine = new AudioEngineManager();
    expect(engine.getCurrentRoute()).toBe('speaker');

    engine.setAudioRoute('earpiece');
    expect(engine.getCurrentRoute()).toBe('earpiece');

    engine.setAudioRoute('bluetooth');
    expect(engine.getCurrentRoute()).toBe('bluetooth');
  });

  test('Mute toggle state in coordinator', () => {
    const mockClient = new SignalingClient('peer-local', 'User', 'android');
    const coordinator = new WebRtcMeshCoordinator(mockClient);

    expect(coordinator.getIsMuted()).toBe(false);

    const mutedState = coordinator.toggleMute();
    expect(mutedState).toBe(true);
    expect(coordinator.getIsMuted()).toBe(true);

    const unmutedState = coordinator.toggleMute();
    expect(unmutedState).toBe(false);
    expect(coordinator.getIsMuted()).toBe(false);
  });
});
