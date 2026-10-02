import { NETWORK_CONSTANTS } from '../constants/network_constants.js';

export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'headset';

export interface AudioEngineConfig {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  highpassFilter?: boolean;
  preferredAudioRoute?: AudioRoute;
}

export class AudioEngineManager {
  private config: AudioEngineConfig;
  private currentRoute: AudioRoute;
  private isMicMuted: boolean = false;

  constructor(config?: AudioEngineConfig) {
    this.config = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      highpassFilter: true,
      preferredAudioRoute: 'speaker',
      ...config,
    };
    this.currentRoute = this.config.preferredAudioRoute || 'speaker';
  }

  /**
   * Generates standard WebRTC getUserMedia audio constraints for optimal offline voice calling.
   */
  public getMediaConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: this.config.echoCancellation,
        noiseSuppression: this.config.noiseSuppression,
        autoGainControl: this.config.autoGainControl,
        channelCount: 1, // Mono saves bandwidth and CPU on mobile
        sampleRate: NETWORK_CONSTANTS.AUDIO_CONSTRAINTS.sampleRate,
      },
      video: false,
    };
  }

  /**
   * Modifies SDP to force Opus codec with voice-optimized settings:
   * - maxaveragebitrate=32000 (32 kbps voice)
   * - stereo=0 (mono)
   * - useinbandfec=1 (forward error correction for packet loss concealment)
   * - usedtx=1 (discontinuous transmission - silence suppression)
   */
  public optimizeVoiceSdp(sdp: string): string {
    const lines = sdp.split('\r\n');
    let mLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('m=audio')) {
        mLineIndex = i;
        break;
      }
    }

    if (mLineIndex === -1) return sdp;

    // Find opus payload type
    let opusPayload: string | null = null;
    for (const line of lines) {
      if (line.includes('a=rtpmap:') && line.includes('opus/48000')) {
        const parts = line.split(' ');
        opusPayload = parts[0].replace('a=rtpmap:', '');
        break;
      }
    }

    if (!opusPayload) return sdp;

    // Add or replace fmtp for opus
    const fmtpLine = `a=fmtp:${opusPayload} maxaveragebitrate=32000;stereo=0;useinbandfec=1;usedtx=1`;
    let fmtpFound = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`a=fmtp:${opusPayload}`)) {
        lines[i] = fmtpLine;
        fmtpFound = true;
        break;
      }
    }

    if (!fmtpFound) {
      lines.splice(mLineIndex + 1, 0, fmtpLine);
    }

    return lines.join('\r\n');
  }

  public setAudioRoute(route: AudioRoute): AudioRoute {
    this.currentRoute = route;
    return this.currentRoute;
  }

  public getCurrentRoute(): AudioRoute {
    return this.currentRoute;
  }

  public setMute(muted: boolean): boolean {
    this.isMicMuted = muted;
    return this.isMicMuted;
  }

  public isMuted(): boolean {
    return this.isMicMuted;
  }
}
