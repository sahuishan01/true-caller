import React from 'react';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface ReconnectionBannerProps {
  status: 'connected' | 'reconnecting' | 'offline' | 'reconnect_failed';
  attempt?: number;
  maxAttempts?: number;
  onRetryNow?: () => void;
}

export const ReconnectionBanner: React.FC<ReconnectionBannerProps> = ({
  status,
  attempt = 1,
  maxAttempts = 5,
  onRetryNow,
}) => {
  if (status === 'connected') return null;

  const getBannerDetails = () => {
    switch (status) {
      case 'offline':
        return {
          bg: 'rgba(239, 68, 68, 0.9)',
          color: '#FFFFFF',
          icon: '⚠️',
          text: 'Wi-Fi / Local Network Disconnected. Waiting for reconnection...',
          showRetry: false,
        };
      case 'reconnecting':
        return {
          bg: 'rgba(6, 182, 212, 0.9)',
          color: '#080C14',
          icon: '🔄',
          text: `Connection lost. Auto-reconnecting to group mesh (Attempt ${attempt}/${maxAttempts})...`,
          showRetry: true,
        };
      case 'reconnect_failed':
        return {
          bg: 'rgba(245, 158, 11, 0.9)',
          color: '#080C14',
          icon: '⚠️',
          text: 'Could not automatically reconnect to group. Tap Retry to reconnect.',
          showRetry: true,
        };
    }
  };

  const details = getBannerDetails();

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 500,
        backgroundColor: details.bg,
        color: details.color,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        fontFamily: THEME_TOKENS.fonts.headings,
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{details.icon}</span>
        <span>{details.text}</span>
      </div>

      {details.showRetry && onRetryNow && (
        <button
          onClick={onRetryNow}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 0, 0.3)',
            borderRadius: THEME_TOKENS.radius.sm,
            padding: '4px 10px',
            color: 'inherit',
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          RETRY NOW
        </button>
      )}
    </div>
  );
};
