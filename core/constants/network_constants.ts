/**
 * Network constants for TrueCalling offline calling engine.
 */

export const NETWORK_CONSTANTS = {
  /**
   * Embedded WebSocket signaling port hosted by the room creator.
   */
  SIGNALING_PORT: 45455,

  /**
   * UDP broadcast beacon port for peer/room discovery.
   */
  UDP_BEACON_PORT: 45454,

  /**
   * mDNS (Bonjour / ZeroConf) service type for local network publishing.
   */
  MDNS_SERVICE_TYPE: '_truecall._tcp',

  /**
   * Well-known default gateway IPs when tethered to mobile hotspots.
   */
  HOTSPOT_GATEWAYS: {
    ANDROID_DEFAULT: '192.168.43.1',
    IOS_DEFAULT: '172.20.10.1',
    ROUTER_DEFAULT_1: '192.168.1.1',
    ROUTER_DEFAULT_2: '192.168.0.1',
  },

  /**
   * Beacon broadcasting interval in milliseconds.
   */
  BEACON_INTERVAL_MS: 1500,

  /**
   * Timeout in milliseconds before a room or peer is considered dead.
   */
  HEARTBEAT_TIMEOUT_MS: 6000,

  /**
   * Ping interval for active WebSocket connections.
   */
  PING_INTERVAL_MS: 2500,

  /**
   * WebRTC Voice Configuration.
   */
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1, // Mono saves bandwidth and lowers latency on local Wi-Fi
    sampleRate: 48000,
    sampleSize: 16,
  },
} as const;
