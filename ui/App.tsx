import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RoomDetails,
  PeerProfile,
  DiscoveredDevice,
  CallInvitePayload,
} from '../core/types/signaling.js';
import { RemotePeerState, WebRtcMeshCoordinator } from '../core/webrtc/mesh_coordinator.js';
import { AudioEngineManager, AudioRoute } from '../core/webrtc/audio_engine.js';
import { SignalingClient } from '../core/signaling/signaling_client.js';
import { DeviceDiscoveryManager } from '../core/discovery/device_discovery.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { ActiveCallScreen } from './screens/ActiveCallScreen.js';
import { IncomingCallModal } from './components/IncomingCallModal.js';
import { ReconnectionBanner } from './components/ReconnectionBanner.js';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'active_call'>('home');
  const [localDisplayName, setLocalDisplayName] = useState<string>(() => {
    return localStorage.getItem('truecall_name') || `User-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [localIp, setLocalIp] = useState<string>('127.0.0.1');
  const [isHotspotHost, setIsHotspotHost] = useState<boolean>(false);
  const [discoveredRooms, setDiscoveredRooms] = useState<RoomDetails[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomDetails | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [peers, setPeers] = useState<RemotePeerState[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('speaker');
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);

  // Auto Reconnection & Network State
  const [reconnectStatus, setReconnectStatus] = useState<
    'connected' | 'reconnecting' | 'offline' | 'reconnect_failed'
  >('connected');
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(1);
  const [isScanningDevices, setIsScanningDevices] = useState<boolean>(false);

  // Incoming Call Invitation
  const [pendingInvite, setPendingInvite] = useState<CallInvitePayload | null>(null);

  // References to active media, connections, and managers
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const signalingClientRef = useRef<SignalingClient | null>(null);
  const coordinatorRef = useRef<WebRtcMeshCoordinator | null>(null);
  const audioEngineRef = useRef<AudioEngineManager>(new AudioEngineManager());
  const discoveryManagerRef = useRef<DeviceDiscoveryManager | null>(null);

  // Initialize network info on mount
  useEffect(() => {
    let detectedIp = '127.0.0.1';
    try {
      const nativeIp = (window as any).AndroidNative?.getLocalIpAddress?.();
      if (nativeIp && nativeIp !== '127.0.0.1') {
        detectedIp = nativeIp;
      } else if (
        window.location.hostname &&
        window.location.hostname !== 'appassets.androidplatform.net' &&
        window.location.hostname !== 'localhost'
      ) {
        detectedIp = window.location.hostname;
      }
    } catch {}

    setLocalIp(detectedIp);
    if (detectedIp === '192.168.43.1' || detectedIp === '172.20.10.1') {
      setIsHotspotHost(true);
    }
  }, []);

  // Initialize Device Discovery Manager
  useEffect(() => {
    const discovery = new DeviceDiscoveryManager({
      displayName: localDisplayName,
      ip: localIp,
      port: 45455,
      deviceType: 'android',
    });
    discoveryManagerRef.current = discovery;

    discovery.on('deviceDiscovered', () => {
      setDiscoveredDevices(discovery.getDiscoveredDevices());
    });
    discovery.on('deviceUpdated', () => {
      setDiscoveredDevices(discovery.getDiscoveredDevices());
    });
    discovery.on('deviceLost', () => {
      setDiscoveredDevices(discovery.getDiscoveredDevices());
    });

    discovery.startDiscovery(3000);

    try {
      (window as any).AndroidNative?.updateDeviceProfile?.(
        localDisplayName,
        currentScreen === 'active_call' ? 'in_call' : 'available',
        currentRoom?.name || ''
      );
    } catch {}

    return () => {
      discovery.stopDiscovery();
    };
  }, [localIp, localDisplayName]);

  // Listen for incoming call invites via Native Bridge and Custom Events
  useEffect(() => {
    const handleNativeInvite = (e: any) => {
      if (e.detail && e.detail.roomId) {
        setPendingInvite(e.detail as CallInvitePayload);
      }
    };

    window.addEventListener('truecall_invite', handleNativeInvite);
    (window as any).onCallInviteReceived = (invite: CallInvitePayload) => {
      setPendingInvite(invite);
    };

    return () => {
      window.removeEventListener('truecall_invite', handleNativeInvite);
      delete (window as any).onCallInviteReceived;
    };
  }, []);

  // Network State Listeners for Auto Reconnect on Same Network
  useEffect(() => {
    const handleOnline = () => {
      console.log('[TrueCalling] Local network connection restored');
      setReconnectStatus((prev) => {
        if (prev === 'offline' || prev === 'reconnect_failed') {
          if (signalingClientRef.current) {
            signalingClientRef.current.reconnectNow().catch(() => {});
          }
          if (coordinatorRef.current) {
            coordinatorRef.current.restartMeshIce();
          }
          return 'reconnecting';
        }
        return prev;
      });

      if (discoveryManagerRef.current) {
        discoveryManagerRef.current.scanNetwork();
      }
    };

    const handleOffline = () => {
      console.log('[TrueCalling] Local network disconnected');
      setReconnectStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll for LAN rooms via fast-probe
  useEffect(() => {
    if (currentScreen !== 'home') return;

    const probeLanRooms = async () => {
      try {
        const hostnamesToProbe = [
          localIp,
          '192.168.43.1',
          '172.20.10.1',
          '127.0.0.1',
        ].filter((h) => h && h !== 'appassets.androidplatform.net');
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
  }, [currentScreen, localIp]);

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
    setReconnectStatus('connected');

    // 1. Capture local audio
    await startLocalAudioCapture();

    // 2. Initialize Signaling Client with auto-reconnect enabled
    const myPeerId = `peer-${Date.now().toString(36)}`;
    const client = new SignalingClient(myPeerId, localDisplayName, 'android', pin, true);
    signalingClientRef.current = client;

    // 3. Initialize Mesh Coordinator
    const coordinator = new WebRtcMeshCoordinator(client);
    coordinatorRef.current = coordinator;

    // 4. Bind Coordinator & Signaling Events
    coordinator.on('meshReady', () => {
      setCurrentScreen('active_call');
      setPeers(coordinator.getPeers());
      setReconnectStatus('connected');
      try {
        (window as any).AndroidNative?.startCall?.(room.name, 1);
        (window as any).AndroidNative?.updateDeviceProfile?.(localDisplayName, 'in_call', room.name);
      } catch {}
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

    coordinator.on('iceRestartRequired', async (remotePeerId: string) => {
      try {
        console.log('[WebRTC] Initiating ICE restart for peer:', remotePeerId);
        const pc = getOrCreatePeerConnection(remotePeerId);
        const offer = await pc.createOffer({ iceRestart: true });
        const optimizedSdp = audioEngineRef.current.optimizeVoiceSdp(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp: optimizedSdp });
        coordinator.handleLocalOfferCreated(remotePeerId, optimizedSdp);
      } catch (err) {
        console.error('[WebRTC] Error restarting ICE for peer:', remotePeerId, err);
      }
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

    // Auto-reconnect handling on signaling client
    client.on('reconnecting', (info) => {
      console.log(`[SignalingClient] Reconnecting attempt ${info.attempt}/${info.maxAttempts}`);
      setReconnectStatus('reconnecting');
      setReconnectAttempt(info.attempt);
    });

    client.on('reconnected', () => {
      console.log('[SignalingClient] Successfully reconnected to mesh');
      setReconnectStatus('connected');
      setReconnectAttempt(1);
    });

    client.on('reconnectFailed', () => {
      console.warn('[SignalingClient] Auto-reconnect attempts exhausted');
      setReconnectStatus('reconnect_failed');
    });

    try {
      await client.connect(room.hostIp, room.port);
    } catch (err: any) {
      alert(`Could not connect to room: ${err.message}`);
      stopLocalAudioCapture();
    }
  }, [localDisplayName, startLocalAudioCapture, stopLocalAudioCapture, getOrCreatePeerConnection]);

  // Host a new call and send explicit invites to selected devices
  const handleHostCallAndInvite = useCallback(
    async (
      roomName: string,
      pin: string | undefined,
      invitedDevices: DiscoveredDevice[]
    ) => {
      const roomId = `room-${Date.now().toString(36)}`;
      const hostId = `host-${Date.now().toString(36)}`;
      const hostRoom: RoomDetails = {
        roomId,
        name: roomName,
        hostId,
        hostIp: localIp || '127.0.0.1',
        port: 45455,
        hasPin: Boolean(pin && pin.length > 0),
        participantCount: 1,
        maxParticipants: 8,
        createdAt: Date.now(),
      };

      try {
        (window as any).AndroidNative?.setHostedRoom?.(JSON.stringify(hostRoom));
      } catch {}

      setIsHost(true);
      await handleJoinRoom(hostRoom, pin);

      // Send invitations to each selected device
      if (invitedDevices && invitedDevices.length > 0 && discoveryManagerRef.current) {
        for (const target of invitedDevices) {
          const invite: CallInvitePayload = {
            inviteId: `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            hostPeerId: hostId,
            hostDisplayName: localDisplayName,
            hostIp: localIp || '127.0.0.1',
            port: 45455,
            roomId,
            roomName,
            pin,
            timestamp: Date.now(),
          };

          discoveryManagerRef.current
            .sendCallInvite(target.ip, invite, target.port)
            .catch(() => {});
        }
      }
    },
    [handleJoinRoom, localIp, localDisplayName]
  );

  // Direct Call to a single device
  const handleCallSingleDevice = useCallback(
    (device: DiscoveredDevice) => {
      handleHostCallAndInvite(`Call with ${device.displayName}`, undefined, [device]);
    },
    [handleHostCallAndInvite]
  );

  // Manual Trigger for Scanning Devices
  const handleScanDevicesNow = useCallback(async () => {
    if (discoveryManagerRef.current) {
      setIsScanningDevices(true);
      await discoveryManagerRef.current.scanNetwork();
      setDiscoveredDevices(discoveryManagerRef.current.getDiscoveredDevices());
      setIsScanningDevices(false);
    }
  }, []);

  // Direct IP connect
  const handleDirectIpConnect = useCallback(
    (ip: string, port: number = 45455) => {
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
    },
    [handleJoinRoom]
  );

  // Handle Accept Incoming Call
  const handleAcceptInvite = useCallback(
    (invite: CallInvitePayload) => {
      setPendingInvite(null);
      const room: RoomDetails = {
        roomId: invite.roomId,
        name: invite.roomName,
        hostId: invite.hostPeerId,
        hostIp: invite.hostIp,
        port: invite.port,
        hasPin: Boolean(invite.pin),
        participantCount: 2,
        maxParticipants: 8,
        createdAt: invite.timestamp,
      };
      handleJoinRoom(room, invite.pin);
    },
    [handleJoinRoom]
  );

  // Handle Decline Incoming Call
  const handleDeclineInvite = useCallback((_invite: CallInvitePayload) => {
    setPendingInvite(null);
  }, []);

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

    try {
      (window as any).AndroidNative?.stopCall?.();
      (window as any).AndroidNative?.clearHostedRoom?.();
      (window as any).AndroidNative?.updateDeviceProfile?.(localDisplayName, 'available', '');
    } catch {}

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
    setReconnectStatus('connected');
    setCurrentScreen('home');
  }, [stopLocalAudioCapture, localDisplayName]);

  const handleRetryReconnect = useCallback(() => {
    if (signalingClientRef.current) {
      setReconnectStatus('reconnecting');
      signalingClientRef.current.reconnectNow().catch(() => {});
    }
    if (coordinatorRef.current) {
      coordinatorRef.current.restartMeshIce();
    }
  }, []);

  return (
    <div>
      {/* Reconnection Banner on Home Screen when network is offline */}
      {currentScreen === 'home' && reconnectStatus !== 'connected' && (
        <ReconnectionBanner
          status={reconnectStatus}
          attempt={reconnectAttempt}
          onRetryNow={handleRetryReconnect}
        />
      )}

      {currentScreen === 'home' ? (
        <HomeScreen
          localIp={localIp}
          isHotspotHost={isHotspotHost}
          discoveredRooms={discoveredRooms}
          discoveredDevices={discoveredDevices}
          onHostCallAndInvite={handleHostCallAndInvite}
          onJoinRoom={(room, pin) => handleJoinRoom(room, pin)}
          onDirectIpConnect={handleDirectIpConnect}
          onCallSingleDevice={handleCallSingleDevice}
          onScanDevicesNow={handleScanDevicesNow}
          isScanningDevices={isScanningDevices}
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
            reconnectStatus={reconnectStatus}
            reconnectAttempt={reconnectAttempt}
            onRetryReconnect={handleRetryReconnect}
            onToggleMute={handleToggleMute}
            onToggleAudioRoute={handleToggleAudioRoute}
            onLeaveCall={handleLeaveCall}
          />
        )
      )}

      {/* Incoming Call Overlay Modal */}
      {pendingInvite && (
        <IncomingCallModal
          invite={pendingInvite}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}
    </div>
  );
};
