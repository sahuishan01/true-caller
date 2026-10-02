# TrueCalling 🎙️

**Fully Offline Cross-Platform Group Calling over Wi-Fi & Hotspot for Android and iOS.**

TrueCalling enables low-latency (<25ms), high-fidelity group voice calls in environments with zero cellular coverage and zero internet access (camping trips, airplanes, disaster response, underground facilities, or ad-hoc local gatherings).

---

## Key Features

- **Zero-Internet Operability**: Operates entirely over local network subnets without cloud signaling, STUN, or TURN servers.
- **Hotspot & Offline Wi-Fi Support**:
  - One device acts as a Mobile Hotspot (Android SoftAP or iOS Personal Hotspot).
  - Or all devices join an offline Wi-Fi router.
- **Cross-Platform Parity**: Full interoperability between Android and iOS.
- **Multi-Path Discovery**:
  - **mDNS / Bonjour**: Zero-configuration discovery (`_truecall._tcp`).
  - **UDP Broadcast Beacon**: Subnet beacon on port `45454` for networks with multicast restrictions.
  - **Gateway Fast-Probe**: Instant discovery (<50ms) by querying the hotspot gateway directly (`192.168.43.1` / `172.20.10.1`).
  - **QR Code Fallback**: Optical room join for zero-leak network configurations.
- **WebRTC Full Mesh Audio**:
  - Opus codec @ 32 kbps with Forward Error Correction (FEC) and Discontinuous Transmission (DTX).
  - Hardware Acoustic Echo Cancellation (AEC3), Automatic Gain Control (AGC), and Noise Suppression (NS).
  - Glare-free deterministic offer/answer negotiation tie-breaker.
- **Background Execution**:
  - **Android**: Foreground service with ongoing call notification (`FOREGROUND_SERVICE_TYPE_PHONE_CALL | FOREGROUND_SERVICE_TYPE_MICROPHONE`), `WifiLock(WIFI_MODE_FULL_LOW_LATENCY)`, and `WakeLock`.
  - **iOS**: `AVAudioSession` category `.playAndRecord` with mode `.voiceChat` and `UIBackgroundModes: ["audio", "voip"]`.

---

## Architecture

```
[ Device A (Host / Hotspot) ] <----------------- Local Wi-Fi / Hotspot -----------------> [ Device B (Client) ]
  ├── Embedded WebSocket Server (:45455)                                                      │
  │     ├── /health & /room-info (HTTP Fast-Probe)                                            │
  │     └── /ws (SDP / ICE / Presence Relay) <------------------------------------------------┤
  ├── UDP Beacon Broadcaster (:45454) ------ Broadcast (255.255.255.255) -------------------->│
  ├── mDNS Service Publisher (_truecall._tcp) ------------------------------------------------>│
  │                                                                                           │
  └── WebRTC Peer Connection <============ Direct P2P SRTP Audio Mesh ======================> WebRTC Peer Connection
```

---

## Verification & Testing

```bash
# Run unit & integration test suite
bun test

# Run strict TypeScript typecheck
bun run typecheck
```
