import React from 'react';
import { RemotePeerState } from '../../core/webrtc/mesh_coordinator.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface CallStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  peers: RemotePeerState[];
}

export const CallStatsModal: React.FC<CallStatsModalProps> = ({ isOpen, onClose, peers }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: THEME_TOKENS.spacing.md,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0F172A',
          border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
          borderRadius: THEME_TOKENS.radius.lg,
          padding: THEME_TOKENS.spacing.lg,
          maxWidth: '440px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: THEME_TOKENS.spacing.md,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '13px',
              color: THEME_TOKENS.colors.accentCyan,
              letterSpacing: '0.05em',
            }}
          >
            REALTIME CALL TELEMETRY
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: THEME_TOKENS.colors.textMuted,
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            [CLOSE]
          </button>
        </div>

        {/* Global WebRTC Audio Stats */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: THEME_TOKENS.radius.md,
            padding: THEME_TOKENS.spacing.sm,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '11px',
          }}
        >
          <div>
            <div style={{ color: THEME_TOKENS.colors.textMuted }}>CODEC</div>
            <div style={{ color: THEME_TOKENS.colors.textPrimary, fontWeight: 700 }}>Opus 48kHz (Mono)</div>
          </div>
          <div>
            <div style={{ color: THEME_TOKENS.colors.textMuted }}>TARGET BITRATE</div>
            <div style={{ color: THEME_TOKENS.colors.textPrimary, fontWeight: 700 }}>32 kbps (VAD DTX)</div>
          </div>
          <div>
            <div style={{ color: THEME_TOKENS.colors.textMuted }}>PROCESSING</div>
            <div style={{ color: THEME_TOKENS.colors.accentEmerald, fontWeight: 700 }}>AEC3 + AGC + NS</div>
          </div>
          <div>
            <div style={{ color: THEME_TOKENS.colors.textMuted }}>TOPOLOGY</div>
            <div style={{ color: THEME_TOKENS.colors.textPrimary, fontWeight: 700 }}>Full P2P Mesh (LAN)</div>
          </div>
        </div>

        {/* Per-Peer Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textSecondary,
            }}
          >
            PEER CONNECTIONS ({peers.length})
          </span>

          {peers.length === 0 ? (
            <div style={{ fontSize: '12px', color: THEME_TOKENS.colors.textMuted }}>
              No peers connected yet.
            </div>
          ) : (
            peers.map((peer) => (
              <div
                key={peer.profile.id}
                style={{
                  border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
                  borderRadius: THEME_TOKENS.radius.sm,
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '11px',
                }}
              >
                <div>
                  <div style={{ color: THEME_TOKENS.colors.textPrimary, fontWeight: 700 }}>
                    {peer.profile.displayName}
                  </div>
                  <div style={{ color: THEME_TOKENS.colors.textMuted, fontSize: '10px' }}>
                    State: {peer.connectionState.toUpperCase()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: THEME_TOKENS.colors.accentEmerald }}>
                    RTT: {peer.rttMs ?? '<15'}ms
                  </div>
                  <div style={{ color: THEME_TOKENS.colors.textMuted, fontSize: '10px' }}>
                    Loss: {peer.packetLossPercent ?? 0}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
