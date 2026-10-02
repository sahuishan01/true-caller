import React, { useState } from 'react';
import { DiscoveredDevice, RoomDetails } from '../../core/types/signaling.js';
import { NetworkStatusCard } from '../components/NetworkStatusCard.js';
import { DiscoveredRoomsList } from '../components/DiscoveredRoomsList.js';
import { DiscoveredDevicesList } from '../components/DiscoveredDevicesList.js';
import { CreateGroupModal } from '../components/CreateGroupModal.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface HomeScreenProps {
  localIp: string;
  isHotspotHost: boolean;
  discoveredRooms: RoomDetails[];
  discoveredDevices: DiscoveredDevice[];
  onHostCallAndInvite: (
    roomName: string,
    pin: string | undefined,
    invitedDevices: DiscoveredDevice[]
  ) => void;
  onJoinRoom: (room: RoomDetails, pin?: string) => void;
  onDirectIpConnect: (ip: string, port?: number) => void;
  onCallSingleDevice: (device: DiscoveredDevice) => void;
  onScanDevicesNow?: () => void;
  isScanningDevices?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  localIp,
  isHotspotHost,
  discoveredRooms,
  discoveredDevices,
  onHostCallAndInvite,
  onJoinRoom,
  onDirectIpConnect,
  onCallSingleDevice,
  onScanDevicesNow,
  isScanningDevices = false,
}) => {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(
    new Set()
  );
  const [directIpInput, setDirectIpInput] = useState('');

  const toggleSelectDevice = (deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const selectAllDevices = () => {
    setSelectedDeviceIds(new Set(discoveredDevices.map((d) => d.deviceId)));
  };

  const deselectAllDevices = () => {
    setSelectedDeviceIds(new Set());
  };

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
        maxWidth: '560px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
        }}
      >
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
            TRUE
            <span style={{ color: THEME_TOKENS.colors.accentEmerald }}>
              CALLING
            </span>
          </div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textMuted,
            }}
          >
            OFFLINE P2P GROUP VOICE MESH
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
        peerCount={discoveredDevices.length}
      />

      {/* Primary Action Button - Explicit Group Creation */}
      <button
        onClick={() => setShowCreateGroupModal(true)}
        style={{
          backgroundColor: THEME_TOKENS.colors.accentEmerald,
          color: '#080C14',
          border: 'none',
          borderRadius: THEME_TOKENS.radius.lg,
          padding: '16px',
          fontFamily: THEME_TOKENS.fonts.headings,
          fontSize: '15px',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.15s ease',
        }}
      >
        <span>
          {selectedDeviceIds.size > 0
            ? `+ CREATE GROUP & INVITE (${selectedDeviceIds.size})`
            : '+ CREATE GROUP CALL'}
        </span>
      </button>

      {/* Discovered Devices on Network */}
      <DiscoveredDevicesList
        devices={discoveredDevices}
        selectedDeviceIds={selectedDeviceIds}
        onToggleSelectDevice={toggleSelectDevice}
        onSelectAll={selectAllDevices}
        onDeselectAll={deselectAllDevices}
        onCallDevice={onCallSingleDevice}
        onScanNow={onScanDevicesNow}
        isScanning={isScanningDevices}
      />

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

      {/* Explicit Group Creation Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          discoveredDevices={discoveredDevices}
          initialSelectedDeviceIds={selectedDeviceIds}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateAndInvite={(roomName, pin, invitedDevices) => {
            setShowCreateGroupModal(false);
            onHostCallAndInvite(roomName, pin, invitedDevices);
          }}
        />
      )}
    </div>
  );
};
