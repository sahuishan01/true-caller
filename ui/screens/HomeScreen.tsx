import React, { useState } from 'react';
import { RoomDetails } from '../../core/types/signaling.js';
import { NetworkStatusCard } from '../components/NetworkStatusCard.js';
import { DiscoveredRoomsList } from '../components/DiscoveredRoomsList.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface HomeScreenProps {
  localIp: string;
  isHotspotHost: boolean;
  discoveredRooms: RoomDetails[];
  onHostCall: (roomName: string, pin?: string) => void;
  onJoinRoom: (room: RoomDetails, pin?: string) => void;
  onDirectIpConnect: (ip: string, port?: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  localIp,
  isHotspotHost,
  discoveredRooms,
  onHostCall,
  onJoinRoom,
  onDirectIpConnect,
}) => {
  const [showHostDialog, setShowHostDialog] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('Offline Group');
  const [pinInput, setPinInput] = useState('');
  const [directIpInput, setDirectIpInput] = useState('');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: THEME_TOKENS.colors.bgDark,
        color: THEME_TOKENS.colors.textPrimary,
        padding: THEME_TOKENS.spacing.md,
        display: 'flex',
        flexDirection: 'column',
        gap: THEME_TOKENS.spacing.lg,
        maxWidth: '540px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.headings,
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: THEME_TOKENS.colors.textPrimary,
            }}
          >
            TRUE<span style={{ color: THEME_TOKENS.colors.accentEmerald }}>CALLING</span>
          </div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textMuted,
            }}
          >
            ZERO-INTERNET • CROSS-PLATFORM MESH
          </div>
        </div>

        <div
          style={{
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: THEME_TOKENS.radius.full,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${THEME_TOKENS.colors.borderActive}`,
            color: THEME_TOKENS.colors.accentEmerald,
          }}
        >
          OFFLINE LAN ACTIVE
        </div>
      </div>

      {/* Network Status Card */}
      <NetworkStatusCard
        localIp={localIp}
        isHotspotHost={isHotspotHost}
        peerCount={discoveredRooms.reduce((acc, r) => acc + r.participantCount, 0)}
      />

      {/* Primary Action Button */}
      <button
        onClick={() => setShowHostDialog(true)}
        style={{
          backgroundColor: THEME_TOKENS.colors.accentEmerald,
          color: '#080C14',
          border: 'none',
          borderRadius: THEME_TOKENS.radius.lg,
          padding: '16px',
          fontFamily: THEME_TOKENS.fonts.headings,
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.15s ease',
        }}
      >
        <span>+ HOST GROUP CALL</span>
      </button>

      {/* Discovered Rooms Feed */}
      <DiscoveredRoomsList
        rooms={discoveredRooms}
        onJoinRoom={(room) => onJoinRoom(room)}
        isScanning={true}
      />

      {/* Direct IP Connect Fallback */}
      <div
        style={{
          marginTop: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
          borderRadius: THEME_TOKENS.radius.md,
          padding: THEME_TOKENS.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: THEME_TOKENS.fonts.labels,
            fontSize: '11px',
            color: THEME_TOKENS.colors.textMuted,
            textTransform: 'uppercase',
          }}
        >
          DIRECT GATEWAY / IP CONNECT
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g. 192.168.43.1 or 172.20.10.1"
            value={directIpInput}
            onChange={(e) => setDirectIpInput(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: '#0F172A',
              border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
              borderRadius: THEME_TOKENS.radius.sm,
              padding: '8px 12px',
              color: '#FFF',
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => directIpInput && onDirectIpConnect(directIpInput)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#FFF',
              border: 'none',
              borderRadius: THEME_TOKENS.radius.sm,
              padding: '8px 16px',
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            CONNECT
          </button>
        </div>
      </div>

      {/* Host Call Dialog Modal */}
      {showHostDialog && (
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
          onClick={() => setShowHostDialog(false)}
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
              gap: THEME_TOKENS.spacing.md,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontFamily: THEME_TOKENS.fonts.headings,
                fontSize: '18px',
                fontWeight: 700,
                color: THEME_TOKENS.colors.textPrimary,
              }}
            >
              Configure Group Call
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontFamily: THEME_TOKENS.fonts.labels, fontSize: '11px', color: THEME_TOKENS.colors.textMuted }}>
                ROOM NAME
              </label>
              <input
                type="text"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                style={{
                  backgroundColor: '#1E293B',
                  border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
                  borderRadius: THEME_TOKENS.radius.sm,
                  padding: '10px 12px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontFamily: THEME_TOKENS.fonts.labels, fontSize: '11px', color: THEME_TOKENS.colors.textMuted }}>
                OPTIONAL PIN (LEAVE BLANK FOR OPEN JOIN)
              </label>
              <input
                type="password"
                placeholder="4-digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{
                  backgroundColor: '#1E293B',
                  border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
                  borderRadius: THEME_TOKENS.radius.sm,
                  padding: '10px 12px',
                  color: '#FFF',
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => setShowHostDialog(false)}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: THEME_TOKENS.colors.textSecondary,
                  border: 'none',
                  borderRadius: THEME_TOKENS.radius.md,
                  padding: '12px',
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowHostDialog(false);
                  onHostCall(roomNameInput, pinInput || undefined);
                }}
                style={{
                  flex: 1,
                  backgroundColor: THEME_TOKENS.colors.accentEmerald,
                  color: '#080C14',
                  border: 'none',
                  borderRadius: THEME_TOKENS.radius.md,
                  padding: '12px',
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                START ROOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
