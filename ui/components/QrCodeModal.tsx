import React from 'react';
import { RoomDetails } from '../../core/types/signaling.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomDetails | null;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, room }) => {
  if (!isOpen || !room) return null;

  // Standard TrueCalling offline join URI
  const joinUri = `truecall://join?ip=${encodeURIComponent(room.hostIp)}&port=${room.port}&roomId=${encodeURIComponent(room.roomId)}&name=${encodeURIComponent(room.name)}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
          maxWidth: '380px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: THEME_TOKENS.spacing.md,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '13px',
              color: THEME_TOKENS.colors.accentEmerald,
              letterSpacing: '0.05em',
            }}
          >
            SCAN TO JOIN CALL
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

        {/* QR Code Container */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: THEME_TOKENS.radius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '200px',
            height: '200px',
            boxShadow: '0 0 24px rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Fallback QR representation */}
          <div style={{ textAlign: 'center', color: '#000', fontFamily: THEME_TOKENS.fonts.labels, fontSize: '11px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>[QR CODE MATRIX]</div>
            <div>{room.name}</div>
            <div style={{ color: '#475569', fontSize: '10px', marginTop: '4px' }}>
              {room.hostIp}:{room.port}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.headings,
              fontSize: '16px',
              fontWeight: 600,
              color: THEME_TOKENS.colors.textPrimary,
            }}
          >
            {room.name}
          </div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textMuted,
              marginTop: '4px',
              wordBreak: 'break-all',
            }}
          >
            Direct URI: {joinUri}
          </div>
        </div>
      </div>
    </div>
  );
};
