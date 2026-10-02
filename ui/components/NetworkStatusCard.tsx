import React from 'react';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface NetworkStatusProps {
  ssid?: string;
  localIp: string;
  isHotspotHost: boolean;
  gatewayIp?: string;
  peerCount: number;
}

export const NetworkStatusCard: React.FC<NetworkStatusProps> = ({
  ssid = 'Direct Ad-Hoc / Wi-Fi',
  localIp,
  isHotspotHost,
  gatewayIp,
  peerCount,
}) => {
  return (
    <div
      style={{
        backgroundColor: THEME_TOKENS.colors.bgCard,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
        borderRadius: THEME_TOKENS.radius.lg,
        padding: THEME_TOKENS.spacing.md,
        display: 'flex',
        flexDirection: 'column',
        gap: THEME_TOKENS.spacing.sm,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isHotspotHost
                ? THEME_TOKENS.colors.warningAmber
                : THEME_TOKENS.colors.accentEmerald,
              boxShadow: isHotspotHost
                ? '0 0 10px rgba(245, 158, 11, 0.6)'
                : '0 0 10px rgba(16, 185, 129, 0.6)',
            }}
          />
          <span
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '12px',
              textTransform: 'uppercase',
              color: THEME_TOKENS.colors.textSecondary,
              letterSpacing: '0.05em',
            }}
          >
            {isHotspotHost ? 'HOTSPOT HOST AP' : 'OFFLINE WI-FI CONNECTED'}
          </span>
        </div>

        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: THEME_TOKENS.radius.sm,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: THEME_TOKENS.colors.textPrimary,
          }}
        >
          {peerCount} NEARBY PEERS
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.headings,
            fontSize: '18px',
            fontWeight: 600,
            color: THEME_TOKENS.colors.textPrimary,
          }}
        >
          {ssid}
        </span>
        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '13px',
            color: THEME_TOKENS.colors.accentCyan,
          }}
        >
          {localIp}
        </span>
      </div>

      {gatewayIp && (
        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: THEME_TOKENS.colors.textMuted }}>
          <span style={{ fontFamily: THEME_TOKENS.fonts.labels }}>GATEWAY: {gatewayIp}</span>
        </div>
      )}
    </div>
  );
};
