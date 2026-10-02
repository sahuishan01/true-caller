import http from 'http';
import { NETWORK_CONSTANTS } from '../constants/network_constants.js';
import { RoomDetails } from '../types/signaling.js';

export class GatewayFastProbe {
  private candidateIps: string[];

  constructor(customGatewayIp?: string) {
    this.candidateIps = [
      ...(customGatewayIp ? [customGatewayIp] : []),
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.ANDROID_DEFAULT,
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.IOS_DEFAULT,
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.ROUTER_DEFAULT_1,
      NETWORK_CONSTANTS.HOTSPOT_GATEWAYS.ROUTER_DEFAULT_2,
    ];
    // Deduplicate
    this.candidateIps = Array.from(new Set(this.candidateIps));
  }

  /**
   * Probes a specific IP on the TrueCalling signaling port.
   */
  public probeIp(ip: string, port: number = NETWORK_CONSTANTS.SIGNALING_PORT, timeoutMs: number = 700): Promise<RoomDetails | null> {
    return new Promise((resolve) => {
      const req = http.get(
        {
          hostname: ip,
          port: port,
          path: '/room-info',
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const room = JSON.parse(data) as RoomDetails;
              if (room.roomId && room.name) {
                // Ensure hostIp matches the probed IP if host advertised 0.0.0.0
                if (room.hostIp === '0.0.0.0' || !room.hostIp) {
                  room.hostIp = ip;
                }
                resolve(room);
                return;
              }
              resolve(null);
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => {
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Fast-probes all known hotspot gateways concurrently.
   */
  public async probeAllGateways(port: number = NETWORK_CONSTANTS.SIGNALING_PORT): Promise<RoomDetails[]> {
    const probePromises = this.candidateIps.map((ip) => this.probeIp(ip, port));
    const results = await Promise.all(probePromises);
    return results.filter((room): room is RoomDetails => room !== null);
  }
}
