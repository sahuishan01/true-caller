import React from 'react';
import { AudioRoute } from '../../core/webrtc/audio_engine.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface CallControlBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  audioRoute: AudioRoute;
  onToggleAudioRoute: () => void;
  onOpenStats: () => void;
  onOpenQr: () => void;
  onEndCall: () => void;
}

export const CallControlBar: React.FC<CallControlBarProps> = ({
  isMuted,
  onToggleMute,
  audioRoute,
  onToggleAudioRoute,
  onOpenStats,
  onOpenQr,
  onEndCall,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
        borderRadius: THEME_TOKENS.radius.full,
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 50,
      }}
    >
      {/* Mute Button */}
      <button
        onClick={onToggleMute}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isMuted ? THEME_TOKENS.colors.dangerRose : 'rgba(255, 255, 255, 0.1)',
          color: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontFamily: THEME_TOKENS.fonts.labels,
          fontSize: '10px',
          fontWeight: 700,
          transition: 'all 0.15s ease',
        }}
      >
        <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
      </button>

      {/* Audio Route Selector (Speaker vs Earpiece vs Bluetooth) */}
      <button
        onClick={onToggleAudioRoute}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontFamily: THEME_TOKENS.fonts.labels,
          fontSize: '9px',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        <span>{audioRoute}</span>
      </button>

      {/* Network Stats Inspector */}
      <button
        onClick={onOpenStats}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          color: THEME_TOKENS.colors.accentCyan,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontFamily: THEME_TOKENS.fonts.labels,
          fontSize: '11px',
        }}
      >
        STATS
      </button>

      {/* Show Room QR / Invite */}
      <button
        onClick={onOpenQr}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          color: THEME_TOKENS.colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontFamily: THEME_TOKENS.fonts.labels,
          fontSize: '11px',
        }}
      >
        QR
      </button>

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: THEME_TOKENS.colors.dangerRose,
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontFamily: THEME_TOKENS.fonts.labels,
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
        }}
      >
        END
      </button>
    </div>
  );
};
