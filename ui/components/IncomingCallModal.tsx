import React, { useEffect } from 'react';
import { CallInvitePayload } from '../../core/types/signaling.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface IncomingCallModalProps {
  invite: CallInvitePayload;
  onAccept: (invite: CallInvitePayload) => void;
  onDecline: (invite: CallInvitePayload) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  invite,
  onAccept,
  onDecline,
}) => {
  // Play synthesizer ringtone on mount using Web Audio API
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let ringInterval: any = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();

        const playRingPattern = () => {
          if (!audioCtx || audioCtx.state === 'closed') return;

          // Gentle VoIP two-tone ringtone
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(480, audioCtx.currentTime); // B4

          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 1.2);
          osc2.stop(audioCtx.currentTime + 1.2);
        };

        playRingPattern();
        ringInterval = setInterval(playRingPattern, 2500);
      }
    } catch {}

    return () => {
      if (ringInterval) clearInterval(ringInterval);
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch {}
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 13, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: THEME_TOKENS.spacing.md,
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: THEME_TOKENS.colors.bgCard,
          border: `1px solid ${THEME_TOKENS.colors.accentEmerald}`,
          borderRadius: THEME_TOKENS.radius.lg,
          padding: THEME_TOKENS.spacing.xl,
          maxWidth: '420px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: THEME_TOKENS.spacing.lg,
          boxShadow: '0 20px 50px rgba(16, 185, 129, 0.25)',
          animation: 'scaleIn 0.25s ease-out',
        }}
      >
        {/* Pulsing Phone Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: THEME_TOKENS.radius.full,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: `2px solid ${THEME_TOKENS.colors.accentEmerald}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: THEME_TOKENS.colors.speakingGlow,
          }}
        >
          📞
        </div>

        {/* Call Info */}
        <div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: THEME_TOKENS.colors.accentEmerald,
              marginBottom: '6px',
            }}
          >
            INCOMING GROUP CALL
          </div>

          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.headings,
              fontSize: '22px',
              fontWeight: 800,
              color: THEME_TOKENS.colors.textPrimary,
              marginBottom: '4px',
            }}
          >
            {invite.roomName}
          </div>

          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.body,
              fontSize: '14px',
              color: THEME_TOKENS.colors.textSecondary,
            }}
          >
            Invited by <strong style={{ color: THEME_TOKENS.colors.textPrimary }}>{invite.hostDisplayName}</strong>
          </div>

          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textMuted,
              marginTop: '4px',
            }}
          >
            Host IP: {invite.hostIp}:{invite.port}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            width: '100%',
            justifyContent: 'center',
            marginTop: '8px',
          }}
        >
          {/* Decline Button */}
          <button
            onClick={() => onDecline(invite)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${THEME_TOKENS.colors.dangerRose}`,
              borderRadius: THEME_TOKENS.radius.md,
              padding: '14px',
              color: THEME_TOKENS.colors.dangerRose,
              fontFamily: THEME_TOKENS.fonts.headings,
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            ✕ Decline
          </button>

          {/* Accept Button */}
          <button
            onClick={() => onAccept(invite)}
            style={{
              flex: 1.2,
              backgroundColor: THEME_TOKENS.colors.accentEmerald,
              border: 'none',
              borderRadius: THEME_TOKENS.radius.md,
              padding: '14px',
              color: '#080C14',
              fontFamily: THEME_TOKENS.fonts.headings,
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
            }}
          >
            ✓ Accept & Join
          </button>
        </div>
      </div>
    </div>
  );
};
