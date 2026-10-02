import React from 'react';
import { RemotePeerState } from '../../core/webrtc/mesh_coordinator.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface ParticipantGridProps {
  localDisplayName: string;
  localIsMuted: boolean;
  localAudioLevel: number;
  isHost: boolean;
  peers: RemotePeerState[];
}

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  localDisplayName,
  localIsMuted,
  localAudioLevel,
  isHost,
  peers,
}) => {
  const isLocalSpeaking = localAudioLevel > 0.15 && !localIsMuted;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: THEME_TOKENS.spacing.md,
        width: '100%',
        padding: THEME_TOKENS.spacing.md,
      }}
    >
      {/* Local Participant Card */}
      <div
        style={{
          backgroundColor: THEME_TOKENS.colors.bgCard,
          border: `1.5px solid ${
            isLocalSpeaking ? THEME_TOKENS.colors.accentEmerald : THEME_TOKENS.colors.borderSubtle
          }`,
          borderRadius: THEME_TOKENS.radius.lg,
          padding: THEME_TOKENS.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          boxShadow: isLocalSpeaking ? THEME_TOKENS.colors.speakingGlow : 'none',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: isHost ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isHost ? THEME_TOKENS.colors.warningAmber : THEME_TOKENS.colors.textSecondary,
          }}
        >
          {isHost ? 'HOST (YOU)' : 'YOU'}
        </div>

        {/* Avatar Ring */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${
              localIsMuted
                ? THEME_TOKENS.colors.dangerRose
                : isLocalSpeaking
                ? THEME_TOKENS.colors.accentEmerald
                : 'transparent'
            }`,
            color: THEME_TOKENS.colors.textPrimary,
            fontSize: '22px',
            fontWeight: 700,
            marginTop: '12px',
          }}
        >
          {localDisplayName.slice(0, 2).toUpperCase()}
        </div>

        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.headings,
            fontSize: '14px',
            fontWeight: 600,
            color: THEME_TOKENS.colors.textPrimary,
          }}
        >
          {localDisplayName}
        </span>

        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '11px',
            color: localIsMuted ? THEME_TOKENS.colors.dangerRose : THEME_TOKENS.colors.accentEmerald,
          }}
        >
          {localIsMuted ? 'MUTED' : isLocalSpeaking ? 'SPEAKING' : 'READY'}
        </span>
      </div>

      {/* Remote Peers Cards */}
      {peers.map((peer) => {
        const isSpeaking = peer.audioLevel > 0.15 && !peer.profile.isMuted;
        const initial = peer.profile.displayName.slice(0, 2).toUpperCase();

        return (
          <div
            key={peer.profile.id}
            style={{
              backgroundColor: THEME_TOKENS.colors.bgCard,
              border: `1.5px solid ${
                isSpeaking ? THEME_TOKENS.colors.accentEmerald : THEME_TOKENS.colors.borderSubtle
              }`,
              borderRadius: THEME_TOKENS.radius.lg,
              padding: THEME_TOKENS.spacing.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isSpeaking ? THEME_TOKENS.colors.speakingGlow : 'none',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: THEME_TOKENS.colors.accentCyan,
                textTransform: 'uppercase',
              }}
            >
              {peer.profile.deviceType}
            </div>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${
                  peer.profile.isMuted
                    ? THEME_TOKENS.colors.dangerRose
                    : isSpeaking
                    ? THEME_TOKENS.colors.accentEmerald
                    : 'transparent'
                }`,
                color: THEME_TOKENS.colors.textPrimary,
                fontSize: '22px',
                fontWeight: 700,
                marginTop: '12px',
              }}
            >
              {initial}
            </div>

            <span
              style={{
                fontFamily: THEME_TOKENS.fonts.headings,
                fontSize: '14px',
                fontWeight: 600,
                color: THEME_TOKENS.colors.textPrimary,
              }}
            >
              {peer.profile.displayName}
            </span>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '11px',
                  color: peer.profile.isMuted
                    ? THEME_TOKENS.colors.dangerRose
                    : isSpeaking
                    ? THEME_TOKENS.colors.accentEmerald
                    : THEME_TOKENS.colors.textMuted,
                }}
              >
                {peer.profile.isMuted ? 'MUTED' : isSpeaking ? 'SPEAKING' : 'IDLE'}
              </span>

              {peer.rttMs !== undefined && (
                <span
                  style={{
                    fontFamily: THEME_TOKENS.fonts.labels,
                    fontSize: '10px',
                    color: THEME_TOKENS.colors.textMuted,
                  }}
                >
                  • {peer.rttMs}ms
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
