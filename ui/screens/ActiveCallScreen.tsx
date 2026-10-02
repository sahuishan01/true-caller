import React, { useState, useEffect } from 'react';
import { RoomDetails } from '../../core/types/signaling.js';
import { RemotePeerState } from '../../core/webrtc/mesh_coordinator.js';
import { AudioRoute } from '../../core/webrtc/audio_engine.js';
import { ParticipantGrid } from '../components/ParticipantGrid.js';
import { CallControlBar } from '../components/CallControlBar.js';
import { CallStatsModal } from '../components/CallStatsModal.js';
import { QrCodeModal } from '../components/QrCodeModal.js';
import { ReconnectionBanner } from '../components/ReconnectionBanner.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface ActiveCallScreenProps {
  room: RoomDetails;
  localDisplayName: string;
  isHost: boolean;
  isMuted: boolean;
  localAudioLevel: number;
  audioRoute: AudioRoute;
  peers: RemotePeerState[];
  reconnectStatus?: 'connected' | 'reconnecting' | 'offline' | 'reconnect_failed';
  reconnectAttempt?: number;
  onRetryReconnect?: () => void;
  onToggleMute: () => void;
  onToggleAudioRoute: () => void;
  onLeaveCall: () => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  room,
  localDisplayName,
  isHost,
  isMuted,
  localAudioLevel,
  audioRoute,
  peers,
  reconnectStatus = 'connected',
  reconnectAttempt = 1,
  onRetryReconnect,
  onToggleMute,
  onToggleAudioRoute,
  onLeaveCall,
}) => {
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: THEME_TOKENS.colors.bgDark,
        color: THEME_TOKENS.colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        paddingBottom: '100px', // Space for floating CallControlBar
      }}
    >
      {/* Reconnection Status Banner */}
      <ReconnectionBanner
        status={reconnectStatus}
        attempt={reconnectAttempt}
        onRetryNow={onRetryReconnect}
      />

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
          backgroundColor: 'rgba(11, 15, 25, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.headings,
              fontSize: '17px',
              fontWeight: 700,
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
            }}
          >
            {room.hostIp}:{room.port} • {peers.length + 1} ON CALL
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '13px',
              fontWeight: 700,
              color: THEME_TOKENS.colors.accentEmerald,
              padding: '4px 10px',
              borderRadius: THEME_TOKENS.radius.sm,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
            }}
          >
            {formatDuration(callDurationSeconds)}
          </div>
        </div>
      </div>

      {/* Participant Grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ParticipantGrid
          localDisplayName={localDisplayName}
          localIsMuted={isMuted}
          localAudioLevel={localAudioLevel}
          isHost={isHost}
          peers={peers}
        />
      </div>

      {/* Floating Call Controls */}
      <CallControlBar
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        audioRoute={audioRoute}
        onToggleAudioRoute={onToggleAudioRoute}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenQr={() => setShowQrModal(true)}
        onEndCall={onLeaveCall}
      />

      {/* Telemetry Stats Modal */}
      <CallStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        peers={peers}
      />

      {/* Room QR Code Modal */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        room={room}
      />
    </div>
  );
};
