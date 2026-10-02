import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoomDetails, PeerProfile } from '../core/types/signaling.js';
import { RemotePeerState, WebRtcMeshCoordinator } from '../core/webrtc/mesh_coordinator.js';
import { AudioEngineManager, AudioRoute } from '../core/webrtc/audio_engine.js';
import { SignalingClient } from '../core/signaling/signaling_client.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { ActiveCallScreen } from './screens/ActiveCallScreen.js';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'active_call'>('home');
  const [localDisplayName, setLocalDisplayName] = useState<string>(() => {
    return localStorage.getItem('truecall_name') || `User-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [localIp, setLocalIp] = useState<string>('127.0.0.1');
  const [isHotspotHost, setIsHotspotHost] = useState<boolean>(false);
  const [discoveredRooms, setDiscoveredRooms] = useState<RoomDetails[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomDetails | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [peers, setPeers] = useState<RemotePeerState[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('speaker');
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);

  // References to active media and peer connections
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const signalingClientRef = useRef<SignalingClient | null>(null);
  const coordinatorRef = useRef<WebRtcMeshCoordinator | null>(null);
  const audioEngineRef = useRef<AudioEngineManager>(new AudioEngineManager());

  // Initialize network info on mount
  useEffect(() => {
    const hostname = window.location.hostname;
    setLocalIp(hostname);
    if (hostname === '192.168.43.1' || hostname === '172.20.10.1') {
      setIsHotspotHost(true);
    }
  }, []);

  // Poll for LAN rooms via fast-probe
  useEffect(() => {
    if (currentScreen !== 'home') return;

    const probeLanRooms = async () => {
      try {
        const hostnamesToProbe = [
          window.location.hostname,
          '192.168.43.1',
          '172.20.10.1',
          '127.0.0.1',
        ];
        const uniqueHosts = Array.from(new Set(hostnamesToProbe));

        for (const host of uniqueHosts) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);

            const res = await fetch(`http://${host}:45455/room-info`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const room = (await res.json()) as RoomDetails;
              if (room.roomId) {
                setDiscoveredRooms((prev) => {
                  const filtered = prev.filter((r) => r.roomId !== room.roomId);
                  return [...filtered, room];
                });
              }
            }
          } catch {}
        }
      } catch {}
    };

    probeLanRooms();
    const interval = setInterval(probeLanRooms, 4000);
    return () => clearInterval(interval);
  }, [currentScreen]);

  // Start local microphone capture and audio level analysis
  const startLocalAudioCapture = useCallback(async () => {
    try {
      const constraints = audioEngineRef.current.getMediaConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Setup audio analyzer for speaking animation
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudioLevel = () => {
          if (!analyserRef.current || !localStreamRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1.0, avg / 80.0);
          setLocalAudioLevel(normalized);

          if (coordinatorRef.current) {
            coordinatorRef.current.reportLocalAudioLevel(normalized);
          }

          animFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };
        checkAudioLevel();
      }
      return stream;
    } catch (err) {
      console.warn('[TrueCalling App] Microphone capture failed or denied:', err);
      return null;
    }
  }, []);

  const stopLocalAudioCapture = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setLocalAudioLevel(0);
  }, []);

  // Create an RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = useCallback((remotePeerId: string): RTCPeerConnection => {
    if (peerConnectionsRef.current.has(remotePeerId)) {
      return peerConnectionsRef.current.get(remotePeerId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [], // Pure LAN/Hotspot - no external STUN needed
    });

    // Add local tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Send local ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && coordinatorRef.current) {
        coordinatorRef.current.handleLocalIceCandidate(remotePeerId, event.candidate.toJSON());
      }
    };

    // Play remote audio stream when received
    pc.ontrack = (event) => {
      let audioEl = audioElementsRef.current.get(remotePeerId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        audioElementsRef.current.set(remotePeerId, audioEl);
      }
      audioEl.srcObject = event.streams[0] || new MediaStream([event.track]);
      audioEl.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (coordinatorRef.current) {
        coordinatorRef.current.updateConnectionState(
          remotePeerId,
          pc.connectionState as any
        );
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const audioEl = audioElementsRef.current.get(remotePeerId);
        if (audioEl) {
          audioEl.pause();
          audioEl.srcObject = null;
          audioElementsRef.current.delete(remotePeerId);
        }
      }
    };

    peerConnectionsRef.current.set(remotePeerId, pc);
    return pc;
  }, []);

  // Join an existing room via WebSocket signaling
  const handleJoinRoom = useCallback(async (room: RoomDetails, pin?: string) => {
    localStorage.setItem('truecall_name', localDisplayName);
    setCurrentRoom(room);
    setIsHost(false);

    // 1. Capture local audio
    await startLocalAudioCapture();

    // 2. Initialize Signaling Client
    const myPeerId = `peer-${Date.now().toString(36)}`;
    const client = new SignalingClient(myPeerId, localDisplayName, 'android', pin);
    signalingClientRef.current = client;

    // 3. Initialize Mesh Coordinator
    const coordinator = new WebRtcMeshCoordinator(client);
    coordinatorRef.current = coordinator;

    // 4. Bind Coordinator Events
    coordinator.on('meshReady', () => {
      setCurrentScreen('active_call');
      setPeers(coordinator.getPeers());
    });

    coordinator.on('peerAdded', () => {
      setPeers(coordinator.getPeers());
    });

    coordinator.on('peerRemoved', (peerId) => {
      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }
      const audioEl = audioElementsRef.current.get(peerId);
      if (audioEl) {
        audioEl.pause();
        audioEl.srcObject = null;
        audioElementsRef.current.delete(peerId);
      }
      setPeers(coordinator.getPeers());
    });

    coordinator.on('peerUpdated', () => {
      setPeers([...coordinator.getPeers()]);
    });

    coordinator.on('audioLevelUpdated', () => {
      setPeers([...coordinator.getPeers()]);
    });

    coordinator.on('createOfferRequired', async (remotePeerId: string) => {
      try {
        const pc = getOrCreatePeerConnection(remotePeerId);
        const offer = await pc.createOffer();
        const optimizedSdp = audioEngineRef.current.optimizeVoiceSdp(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp: optimizedSdp });
        coordinator.handleLocalOfferCreated(remotePeerId, optimizedSdp);
      } catch (err) {
        console.error('[WebRTC] Error creating offer for peer:', remotePeerId, err);
      }
    });

    coordinator.on('remoteOfferReceived', async (fromPeerId: string, sdp: string) => {
      try {
        const pc = getOrCreatePeerConnection(fromPeerId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
        const answer = await pc.createAnswer();
        const optimizedSdp = audioEngineRef.current.optimizeVoiceSdp(answer.sdp || '');
        await pc.setLocalDescription({ type: 'answer', sdp: optimizedSdp });
        coordinator.handleLocalAnswerCreated(fromPeerId, optimizedSdp);
      } catch (err) {
        console.error('[WebRTC] Error handling remote offer from peer:', fromPeerId, err);
      }
    });

    coordinator.on('remoteAnswerReceived', async (fromPeerId: string, sdp: string) => {
      try {
        const pc = getOrCreatePeerConnection(fromPeerId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      } catch (err) {
        console.error('[WebRTC] Error handling remote answer from peer:', fromPeerId, err);
      }
    });

    coordinator.on('addIceCandidateRequired', async (fromPeerId: string, candidate: any) => {
      try {
        const pc = getOrCreatePeerConnection(fromPeerId);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('[WebRTC] Error adding ICE candidate:', err);
      }
    });

    try {
      await client.connect(room.hostIp, room.port);
    } catch (err: any) {
      alert(`Could not connect to room: ${err.message}`);
      stopLocalAudioCapture();
    }
  }, [localDisplayName, startLocalAudioCapture, stopLocalAudioCapture, getOrCreatePeerConnection]);

  // Host a new call
  const handleHostCall = useCallback((roomName: string, pin?: string) => {
    const hostRoom: RoomDetails = {
      roomId: `room-${Date.now().toString(36)}`,
      name: roomName,
      hostId: `host-${Date.now().toString(36)}`,
      hostIp: window.location.hostname || '127.0.0.1',
      port: 45455,
      hasPin: Boolean(pin && pin.length > 0),
      participantCount: 1,
      maxParticipants: 8,
      createdAt: Date.now(),
    };

    setIsHost(true);
    handleJoinRoom(hostRoom, pin);
  }, [handleJoinRoom]);

  // Direct IP connect
  const handleDirectIpConnect = useCallback((ip: string, port: number = 45455) => {
    const directRoom: RoomDetails = {
      roomId: `direct-${ip}`,
      name: `Call on ${ip}`,
      hostId: `host-${ip}`,
      hostIp: ip,
      port,
      hasPin: false,
      participantCount: 1,
      maxParticipants: 8,
      createdAt: Date.now(),
    };
    handleJoinRoom(directRoom);
  }, [handleJoinRoom]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);
    if (coordinatorRef.current) {
      coordinatorRef.current.toggleMute();
    }
  }, [isMuted]);

  // Toggle Audio Route (Speaker vs Earpiece vs Bluetooth)
  const handleToggleAudioRoute = useCallback(() => {
    const routes: AudioRoute[] = ['speaker', 'earpiece', 'bluetooth'];
    const nextRoute = routes[(routes.indexOf(audioRoute) + 1) % routes.length];
    setAudioRoute(nextRoute);
    audioEngineRef.current.setAudioRoute(nextRoute);
  }, [audioRoute]);

  // Leave active call
  const handleLeaveCall = useCallback(() => {
    stopLocalAudioCapture();

    // Close all WebRTC peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop all audio playback
    audioElementsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Leave signaling mesh
    if (coordinatorRef.current) {
      coordinatorRef.current.leaveMesh();
      coordinatorRef.current = null;
    }
    if (signalingClientRef.current) {
      signalingClientRef.current.disconnect();
      signalingClientRef.current = null;
    }

    setPeers([]);
    setCurrentRoom(null);
    setIsMuted(false);
    setCurrentScreen('home');
  }, [stopLocalAudioCapture]);

  return (
    <div>
      {currentScreen === 'home' ? (
        <HomeScreen
          localIp={localIp}
          isHotspotHost={isHotspotHost}
          discoveredRooms={discoveredRooms}
          onHostCall={handleHostCall}
          onJoinRoom={(room, pin) => handleJoinRoom(room, pin)}
          onDirectIpConnect={handleDirectIpConnect}
        />
      ) : (
        currentRoom && (
          <ActiveCallScreen
            room={currentRoom}
            localDisplayName={localDisplayName}
            isHost={isHost}
            isMuted={isMuted}
            localAudioLevel={localAudioLevel}
            audioRoute={audioRoute}
            peers={peers}
            onToggleMute={handleToggleMute}
            onToggleAudioRoute={handleToggleAudioRoute}
            onLeaveCall={handleLeaveCall}
          />
        )
      )}
    </div>
  );
};
