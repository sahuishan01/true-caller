import React, { useState } from 'react';
import { DiscoveredDevice } from '../../core/types/signaling.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface CreateGroupModalProps {
  discoveredDevices: DiscoveredDevice[];
  initialSelectedDeviceIds: Set<string>;
  onClose: () => void;
  onCreateAndInvite: (
    roomName: string,
    pin: string | undefined,
    invitedDevices: DiscoveredDevice[]
  ) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  discoveredDevices,
  initialSelectedDeviceIds,
  onClose,
  onCreateAndInvite,
}) => {
  const [roomName, setRoomName] = useState('Offline Group');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedDeviceIds)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDevice = (deviceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleStartGroup = () => {
    if (!roomName.trim()) return;
    setIsSubmitting(true);
    const invitedDevices = discoveredDevices.filter((d) =>
      selectedIds.has(d.deviceId)
    );
    onCreateAndInvite(
      roomName.trim(),
      usePin && pin.trim().length > 0 ? pin.trim() : undefined,
      invitedDevices
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 13, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: THEME_TOKENS.spacing.md,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: THEME_TOKENS.colors.bgCard,
          border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
          borderRadius: THEME_TOKENS.radius.lg,
          padding: THEME_TOKENS.spacing.lg,
          maxWidth: '460px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: THEME_TOKENS.spacing.md,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: THEME_TOKENS.fonts.headings,
                fontSize: '18px',
                fontWeight: 700,
                color: THEME_TOKENS.colors.textPrimary,
              }}
            >
              Create Group Call
            </div>
            <div
              style={{
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '11px',
                color: THEME_TOKENS.colors.textMuted,
              }}
            >
              HOST IN-PROCESS & INVITE NETWORK PEERS
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: THEME_TOKENS.colors.textSecondary,
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Room Name Input */}
        <div>
          <label
            style={{
              display: 'block',
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textSecondary,
              marginBottom: '6px',
            }}
          >
            GROUP / ROOM NAME
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Offline Lounge, Sync 1"
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
              borderRadius: THEME_TOKENS.radius.sm,
              padding: '10px 12px',
              color: THEME_TOKENS.colors.textPrimary,
              fontFamily: THEME_TOKENS.fonts.headings,
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* PIN Protection Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '11px',
                color: THEME_TOKENS.colors.textSecondary,
              }}
            >
              PROTECT WITH PIN
            </span>
            <input
              type="checkbox"
              checked={usePin}
              onChange={(e) => setUsePin(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: THEME_TOKENS.colors.accentEmerald,
              }}
            />
          </div>

          {usePin && (
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 4-digit PIN"
              maxLength={8}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
                borderRadius: THEME_TOKENS.radius.sm,
                padding: '10px 12px',
                color: THEME_TOKENS.colors.textPrimary,
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '14px',
                letterSpacing: '0.2em',
                outline: 'none',
              }}
            />
          )}
        </div>

        {/* Select Devices to Invite */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '11px',
                color: THEME_TOKENS.colors.textSecondary,
              }}
            >
              INVITE NETWORK DEVICES ({selectedIds.size} SELECTED)
            </label>
            <span
              style={{
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '10px',
                color: THEME_TOKENS.colors.accentEmerald,
              }}
            >
              {discoveredDevices.length} available
            </span>
          </div>

          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: THEME_TOKENS.radius.sm,
              border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {discoveredDevices.length === 0 ? (
              <div
                style={{
                  fontFamily: THEME_TOKENS.fonts.labels,
                  fontSize: '11px',
                  color: THEME_TOKENS.colors.textMuted,
                  textAlign: 'center',
                  padding: '16px 8px',
                }}
              >
                No other devices found on this Wi-Fi yet. You can still create the group and peers can join via room discovery or QR code.
              </div>
            ) : (
              discoveredDevices.map((dev) => {
                const isSelected = selectedIds.has(dev.deviceId);
                return (
                  <div
                    key={dev.deviceId}
                    onClick={() => toggleDevice(dev.deviceId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: THEME_TOKENS.radius.sm,
                      backgroundColor: isSelected
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDevice(dev.deviceId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        accentColor: THEME_TOKENS.colors.accentEmerald,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: THEME_TOKENS.fonts.headings,
                          fontSize: '13px',
                          color: THEME_TOKENS.colors.textPrimary,
                        }}
                      >
                        {dev.displayName}
                      </div>
                      <div
                        style={{
                          fontFamily: THEME_TOKENS.fonts.labels,
                          fontSize: '10px',
                          color: THEME_TOKENS.colors.textMuted,
                        }}
                      >
                        {dev.ip} • {dev.deviceType.toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
              borderRadius: THEME_TOKENS.radius.sm,
              padding: '12px',
              color: THEME_TOKENS.colors.textSecondary,
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>

          <button
            onClick={handleStartGroup}
            disabled={isSubmitting || !roomName.trim()}
            style={{
              flex: 2,
              backgroundColor: THEME_TOKENS.colors.accentEmerald,
              border: 'none',
              borderRadius: THEME_TOKENS.radius.sm,
              padding: '12px',
              color: '#080C14',
              fontFamily: THEME_TOKENS.fonts.headings,
              fontWeight: 700,
              fontSize: '13px',
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            {isSubmitting
              ? 'INVITING & STARTING...'
              : selectedIds.size > 0
              ? `START & INVITE (${selectedIds.size})`
              : 'START GROUP CALL'}
          </button>
        </div>
      </div>
    </div>
  );
};
