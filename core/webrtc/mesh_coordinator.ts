import { TypedEventEmitter } from '../utils/event_emitter.js';
import { PeerProfile, RoomDetails } from '../types/signaling.js';
import { SignalingClient } from '../signaling/signaling_client.js';

export type PeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export interface RemotePeerState {
  profile: PeerProfile;
  connectionState: PeerConnectionState;
  isPolite: boolean;
  audioTrackAttached: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0.0 to 1.0
  rttMs?: number;
  packetLossPercent?: number;
}

export class WebRtcMeshCoordinator extends TypedEventEmitter {
  private myPeerId: string;
  private signalingClient: SignalingClient;
  private peers: Map<string, RemotePeerState> = new Map();
  private pendingIceCandidates: Map<string, any[]> = new Map();
  private isMuted: boolean = false;
  private currentRoom: RoomDetails | null = null;

  constructor(signalingClient: SignalingClient) {
    super();
    this.signalingClient = signalingClient;
    this.myPeerId = signalingClient.getMyPeerId();
    this.setupSignalingListeners();
  }

  private setupSignalingListeners(): void {
    this.signalingClient.on('connected', (room: RoomDetails, existingPeers: PeerProfile[]) => {
      this.currentRoom = room;
      this.myPeerId = this.signalingClient.getMyPeerId();

      for (const peer of existingPeers) {
        if (peer.id === this.myPeerId) continue;
        this.addPeer(peer, true);
      }
      this.emit('meshReady', room);
    });

    this.signalingClient.on('peerJoined', (peer: PeerProfile) => {
      if (peer.id === this.myPeerId) return;
      this.addPeer(peer, false);
    });

    this.signalingClient.on('peerLeft', (peerId: string) => {
      this.removePeer(peerId);
    });

    this.signalingClient.on('offer', (fromPeerId: string, sdp: string) => {
      this.handleRemoteOffer(fromPeerId, sdp);
    });

    this.signalingClient.on('answer', (fromPeerId: string, sdp: string) => {
      this.handleRemoteAnswer(fromPeerId, sdp);
    });

    this.signalingClient.on('iceCandidate', (fromPeerId: string, candidate: any) => {
      this.handleRemoteIceCandidate(fromPeerId, candidate);
    });

    this.signalingClient.on('muteStatus', (peerId: string, isMuted: boolean) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.profile.isMuted = isMuted;
        this.emit('peerUpdated', peer);
      }
    });

    this.signalingClient.on('audioLevel', (peerId: string, level: number, isSpeaking: boolean) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.audioLevel = level;
        peer.isSpeaking = isSpeaking;
        this.emit('audioLevelUpdated', peerId, level, isSpeaking);
      }
    });

    this.signalingClient.on('reconnecting', (info) => {
      this.emit('meshReconnecting', info);
    });

    this.signalingClient.on('reconnected', () => {
      this.emit('meshReconnected');
      this.restartMeshIce();
    });

    this.signalingClient.on('reconnectFailed', () => {
      this.emit('meshReconnectFailed');
    });
  }

  /**
   * Deterministic negotiation tie-breaker:
   * The node with lexicographically smaller ID acts as offerer.
   */
  public shouldInitiateOffer(remotePeerId: string): boolean {
    return this.myPeerId < remotePeerId;
  }

  private addPeer(peer: PeerProfile, isExisting: boolean): void {
    if (this.peers.has(peer.id)) return;

    const shouldOffer = this.shouldInitiateOffer(peer.id);
    const peerState: RemotePeerState = {
      profile: peer,
      connectionState: 'new',
      isPolite: !shouldOffer,
      audioTrackAttached: false,
      isSpeaking: false,
      audioLevel: 0.0,
    };

    this.peers.set(peer.id, peerState);
    this.pendingIceCandidates.set(peer.id, []);
    this.emit('peerAdded', peerState);

    if (shouldOffer) {
      this.initiateOffer(peer.id);
    }
  }

  private initiateOffer(remotePeerId: string): void {
    const peerState = this.peers.get(remotePeerId);
    if (!peerState) return;

    peerState.connectionState = 'connecting';
    this.emit('peerUpdated', peerState);

    // Simulated / WebRTC offer trigger event for platform layer
    this.emit('createOfferRequired', remotePeerId);
  }

  public handleLocalOfferCreated(remotePeerId: string, sdp: string): void {
    this.signalingClient.sendOffer(remotePeerId, sdp);
  }

  public handleRemoteOffer(fromPeerId: string, sdp: string): void {
    const peerState = this.peers.get(fromPeerId);
    if (!peerState) return;

    peerState.connectionState = 'connecting';
    this.emit('peerUpdated', peerState);

    // Platform layer handles RTCPeerConnection.setRemoteDescription and createAnswer
    this.emit('remoteOfferReceived', fromPeerId, sdp);
  }

  public handleLocalAnswerCreated(remotePeerId: string, sdp: string): void {
    this.signalingClient.sendAnswer(remotePeerId, sdp);
  }

  public handleRemoteAnswer(fromPeerId: string, sdp: string): void {
    const peerState = this.peers.get(fromPeerId);
    if (!peerState) return;

    peerState.connectionState = 'connected';
    this.emit('peerUpdated', peerState);

    // Platform layer handles RTCPeerConnection.setRemoteDescription
    this.emit('remoteAnswerReceived', fromPeerId, sdp);

    // Flush any pending candidates
    this.flushPendingCandidates(fromPeerId);
  }

  public handleLocalIceCandidate(toPeerId: string, candidate: any): void {
    this.signalingClient.sendIceCandidate(toPeerId, candidate);
  }

  public handleRemoteIceCandidate(fromPeerId: string, candidate: any): void {
    const peerState = this.peers.get(fromPeerId);
    if (!peerState) return;

    if (peerState.connectionState === 'connected' || peerState.connectionState === 'connecting') {
      this.emit('addIceCandidateRequired', fromPeerId, candidate);
    } else {
      const pending = this.pendingIceCandidates.get(fromPeerId) || [];
      pending.push(candidate);
      this.pendingIceCandidates.set(fromPeerId, pending);
    }
  }

  private flushPendingCandidates(peerId: string): void {
    const pending = this.pendingIceCandidates.get(peerId);
    if (pending && pending.length > 0) {
      for (const candidate of pending) {
        this.emit('addIceCandidateRequired', peerId, candidate);
      }
      this.pendingIceCandidates.set(peerId, []);
    }
  }

  public updateConnectionState(peerId: string, state: PeerConnectionState): void {
    const peerState = this.peers.get(peerId);
    if (peerState) {
      peerState.connectionState = state;
      this.emit('peerUpdated', peerState);

      if (state === 'disconnected' || state === 'failed') {
        this.emit('peerConnectionInterrupted', peerId);
        if (this.shouldInitiateOffer(peerId)) {
          this.emit('iceRestartRequired', peerId);
        }
      }
    }
  }

  public restartIce(peerId: string): void {
    if (this.peers.has(peerId)) {
      this.emit('iceRestartRequired', peerId);
    }
  }

  public restartMeshIce(): void {
    for (const peerId of this.peers.keys()) {
      if (this.shouldInitiateOffer(peerId)) {
        this.emit('iceRestartRequired', peerId);
      }
    }
  }

  public updatePeerMetrics(peerId: string, rttMs: number, packetLossPercent: number): void {
    const peerState = this.peers.get(peerId);
    if (peerState) {
      peerState.rttMs = rttMs;
      peerState.packetLossPercent = packetLossPercent;
      this.emit('peerMetricsUpdated', peerId, rttMs, packetLossPercent);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.signalingClient.setMute(this.isMuted);
    this.emit('localMuteChanged', this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public reportLocalAudioLevel(level: number): void {
    const isSpeaking = level > 0.15 && !this.isMuted;
    this.signalingClient.sendAudioLevel(level, isSpeaking);
  }

  public removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connectionState = 'closed';
      this.peers.delete(peerId);
      this.pendingIceCandidates.delete(peerId);
      this.emit('peerRemoved', peerId);
    }
  }

  public getPeers(): RemotePeerState[] {
    return Array.from(this.peers.values());
  }

  public leaveMesh(): void {
    this.signalingClient.leave();
    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }
    this.currentRoom = null;
    this.emit('meshClosed');
  }
}
