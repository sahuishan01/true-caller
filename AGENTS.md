# AGENTS.md - TrueCalling Project Context & Architecture

## Project Overview
**TrueCalling** is a cross-platform, fully offline group voice calling solution for **Android and iOS** operating over local **Wi-Fi** and **Mobile Hotspots** without requiring internet, cellular data, or external cloud infrastructure.

## Architecture
- **Topology**: Full peer-to-peer WebRTC mesh for 2–8 participants.
- **Embedded Local Signaling**:
  - The room creator hosts an in-process HTTP and WebSocket server on `0.0.0.0:45455`.
  - Exposes `GET /health` and `GET /room-info` for instant gateway probing.
  - Relays SDP Offers, SDP Answers, ICE Candidates, Mute State, and Presence events.
- **Dual Zero-Config Discovery**:
  - **mDNS / Bonjour**: Service `_truecall._tcp` on port `45455` with TXT records.
  - **UDP Subnet Broadcast**: Port `45454` periodically sending `RoomBeaconPacket` to `255.255.255.255` and local subnet broadcast.
  - **Gateway Fast-Probe**: Automatically probes default gateway (`192.168.43.1` on Android hotspot, `172.20.10.1` on iOS hotspot) for instant detection under 50ms.
  - **QR Code Fallback**: Direct offline join URI `truecall://join?ip=...&port=...&roomId=...`.
- **Media Pipeline**:
  - WebRTC Audio Track with Opus codec (48kHz mono, DTX, FEC).
  - Hardware Acoustic Echo Cancellation (AEC3), Automatic Gain Control (AGC), and Noise Suppression (NS).
  - Deterministic negotiation tie-breaker (`myPeerId < remotePeerId`) to eliminate SDP offer/answer glare.
- **Platform Layers**:
  - **Android**: `CallForegroundService` with persistent ongoing notification (`phoneCall|microphone`), `WifiLock(WIFI_MODE_FULL_LOW_LATENCY)`, `MulticastLock`, `AudioManager.MODE_IN_COMMUNICATION`.
  - **iOS**: `AudioSessionManager` configuring `AVAudioSession` category `.playAndRecord` with mode `.voiceChat`, `UIBackgroundModes: ["audio", "voip"]`, and `NSLocalNetworkUsageDescription`.
- **UI System**:
  - Dark glassmorphic palette (`#080C14`), Space Mono for telemetry and status labels, Inter for typography.
  - Real-time speaking indicators and audio level meters.

## Key Directory Structure
- `core/`: Network constants, types, signaling server/client, UDP beacon, mDNS helper, WebRTC mesh coordinator, and audio engine.
- `platform/android/`: AndroidManifest, CallForegroundService, NetworkLockHelper, AudioManagerHelper.
- `platform/ios/`: Info.plist, AudioSessionManager, AppDelegate.
- `ui/`: Design tokens, NetworkStatusCard, DiscoveredRoomsList, ParticipantGrid, CallControlBar, CallStatsModal, QrCodeModal, HomeScreen, ActiveCallScreen.
- `tests/`: Automated unit and integration test suite (`bun test`).
