import React from 'react';
import { RoomDetails } from '../../core/types/signaling.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface DiscoveredRoomsListProps {
  rooms: RoomDetails[];
  onJoinRoom: (room: RoomDetails) => void;
  isScanning: boolean;
}

export const DiscoveredRoomsList: React.FC<DiscoveredRoomsListProps> = ({
  rooms,
  onJoinRoom,
  isScanning,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: THEME_TOKENS.spacing.sm }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '12px',
            color: THEME_TOKENS.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          DISCOVERED ROOMS ON LAN
        </span>
        {isScanning && (
          <span
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.accentEmerald,
              animation: 'pulse 1.5s infinite',
            }}
          >
            SCANNING...
          </span>
        )}
      </div>

      {rooms.length === 0 ? (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: `1px dashed ${THEME_TOKENS.colors.borderSubtle}`,
            borderRadius: THEME_TOKENS.radius.md,
            padding: THEME_TOKENS.spacing.lg,
            textAlign: 'center',
            color: THEME_TOKENS.colors.textMuted,
            fontSize: '13px',
          }}
        >
          No active rooms found on this Wi-Fi / Hotspot.
          <br />
          <span style={{ fontSize: '11px', fontFamily: THEME_TOKENS.fonts.labels }}>
            Make sure other devices are connected to the same hotspot or router.
          </span>
        </div>
      ) : (
        rooms.map((room) => (
          <div
            key={room.roomId}
            onClick={() => onJoinRoom(room)}
            style={{
              backgroundColor: THEME_TOKENS.colors.bgCard,
              border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
              borderRadius: THEME_TOKENS.radius.md,
              padding: THEME_TOKENS.spacing.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: THEME_TOKENS.fonts.headings,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: THEME_TOKENS.colors.textPrimary,
                  }}
                >
                  {room.name}
                </span>
                {room.hasPin && (
                  <span
                    style={{
                      fontFamily: THEME_TOKENS.fonts.labels,
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: THEME_TOKENS.colors.warningAmber,
                    }}
                  >
                    LOCKED
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '12px',
                  color: THEME_TOKENS.colors.textMuted,
                  marginTop: '2px',
                }}
              >
                Host: {room.hostIp}:{room.port}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '12px',
                  color: THEME_TOKENS.colors.accentCyan,
                }}
              >
                {room.participantCount} / {room.maxParticipants} PEERS
              </span>
              <button
                style={{
                  backgroundColor: THEME_TOKENS.colors.accentEmerald,
                  color: '#000',
                  border: 'none',
                  borderRadius: THEME_TOKENS.radius.sm,
                  padding: '6px 14px',
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                JOIN
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
