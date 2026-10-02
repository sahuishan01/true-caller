import { TypedEventEmitter } from '../utils/event_emitter.js';
import { NETWORK_CONSTANTS } from '../constants/network_constants.js';
import {
  DiscoveredDevice,
  CallInvitePayload,
  CallInviteResponsePayload,
  DevicePresenceStatus,
} from '../types/signaling.js';

export interface DeviceDiscoveryEvents {
  deviceDiscovered: (device: DiscoveredDevice) => void;
  deviceUpdated: (device: DiscoveredDevice) => void;
  deviceLost: (deviceId: string) => void;
  incomingInvite: (invite: CallInvitePayload) => void;
}

export class DeviceDiscoveryManager extends TypedEventEmitter {
  private localDevice: DiscoveredDevice;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private scanTimer: any = null;
  private pruneTimer: any = null;
  private isScanning: boolean = false;

  constructor(localDevice: Partial<DiscoveredDevice> = {}) {
    super();
    this.localDevice = {
      deviceId:
        localDevice.deviceId ||
        `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      displayName: localDevice.displayName || 'Offline Device',
      ip: localDevice.ip || '127.0.0.1',
      port: localDevice.port || NETWORK_CONSTANTS.SIGNALING_PORT,
      deviceType: localDevice.deviceType || 'android',
      status: localDevice.status || 'available',
      currentRoomName: localDevice.currentRoomName,
      lastSeen: Date.now(),
    };
  }

  public updateLocalProfile(updates: Partial<DiscoveredDevice>): void {
    Object.assign(this.localDevice, updates);
    this.localDevice.lastSeen = Date.now();
  }

  public getLocalProfile(): DiscoveredDevice {
    return { ...this.localDevice };
  }

  public getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public registerDiscoveredDevice(device: DiscoveredDevice): void {
    if (device.deviceId === this.localDevice.deviceId) return;
    const isNew = !this.discoveredDevices.has(device.deviceId);
    device.lastSeen = device.lastSeen || Date.now();
    this.discoveredDevices.set(device.deviceId, device);

    if (isNew) {
      this.emit('deviceDiscovered', device);
    } else {
      this.emit('deviceUpdated', device);
    }
  }

  public startDiscovery(intervalMs: number = 3000): void {
    if (this.isScanning) return;
    this.isScanning = true;

    this.scanNetwork();
    this.scanTimer = setInterval(() => {
      this.scanNetwork();
    }, intervalMs);

    this.pruneTimer = setInterval(() => {
      this.pruneStaleDevices();
    }, 2000);
  }

  public stopDiscovery(): void {
    this.isScanning = false;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  public pruneStaleDevices(maxAgeMs: number = 7000): void {
    const now = Date.now();
    for (const [id, dev] of this.discoveredDevices.entries()) {
      if (now - dev.lastSeen > maxAgeMs) {
        this.discoveredDevices.delete(id);
        this.emit('deviceLost', id);
      }
    }
  }

  /**
   * Probe an IP for device-info endpoint
   */
  public async probeDevice(
    ip: string,
    port: number = NETWORK_CONSTANTS.SIGNALING_PORT
  ): Promise<DiscoveredDevice | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const res = await fetch(`http://${ip}:${port}/device-info`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const dev = (await res.json()) as DiscoveredDevice;
        if (dev && dev.deviceId && dev.deviceId !== this.localDevice.deviceId) {
          dev.ip = ip;
          dev.port = port;
          this.registerDiscoveredDevice(dev);
          return dev;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Scan local subnet and well-known gateways
   */
  public async scanNetwork(): Promise<void> {
    const targets: string[] = [
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.ANDROID_DEFAULT,
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.IOS_DEFAULT,
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.ROUTER_DEFAULT_1,
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.ROUTER_DEFAULT_2,
    ];

    if (this.localDevice.ip && this.localDevice.ip !== '127.0.0.1') {
      const parts = this.localDevice.ip.split('.');
      if (parts.length === 4) {
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
        const myHostNum = parseInt(parts[3], 10);

        // Scan nearby IPs in a window around my IP + common range
        const candidateHostNums = new Set<number>();
        candidateHostNums.add(1); // Gateway
        for (let i = 2; i <= 25; i++) candidateHostNums.add(i);
        for (let offset = -8; offset <= 8; offset++) {
          const num = myHostNum + offset;
          if (num > 1 && num < 255) candidateHostNums.add(num);
        }

        for (const num of candidateHostNums) {
          targets.push(`${subnet}.${num}`);
        }
      }
    }

    // Deduplicate and filter out our own local IP
    const uniqueTargets = Array.from(new Set(targets)).filter(
      (ip) => ip !== this.localDevice.ip
    );

    // Probe in concurrent chunks of 10 to be gentle on mobile battery & socket limits
    const CHUNK_SIZE = 10;
    for (let i = 0; i < uniqueTargets.length; i += CHUNK_SIZE) {
      const chunk = uniqueTargets.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map((ip) => this.probeDevice(ip, this.localDevice.port))
      );
    }
  }

  /**
   * Send a call invite to a target device
   */
  public async sendCallInvite(
    targetIp: string,
    invite: CallInvitePayload,
    port: number = NETWORK_CONSTANTS.SIGNALING_PORT
  ): Promise<CallInviteResponsePayload> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`http://${targetIp}:${port}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return (await res.json()) as CallInviteResponsePayload;
      }
      return {
        inviteId: invite.inviteId,
        fromDeviceId: '',
        fromDisplayName: '',
        accepted: false,
        reason: `HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        inviteId: invite.inviteId,
        fromDeviceId: '',
        fromDisplayName: '',
        accepted: false,
        reason: err.message || 'Network unreachable',
      };
    }
  }
}
