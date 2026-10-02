import React from 'react';
import { DiscoveredDevice } from '../../core/types/signaling.js';
import { THEME_TOKENS } from '../theme/tokens.js';

export interface DiscoveredDevicesListProps {
  devices: DiscoveredDevice[];
  selectedDeviceIds: Set<string>;
  onToggleSelectDevice: (deviceId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCallDevice: (device: DiscoveredDevice) => void;
  onScanNow?: () => void;
  isScanning?: boolean;
}

export const DiscoveredDevicesList: React.FC<DiscoveredDevicesListProps> = ({
  devices,
  selectedDeviceIds,
  onToggleSelectDevice,
  onSelectAll,
  onDeselectAll,
  onCallDevice,
  onScanNow,
  isScanning = false,
}) => {
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'android':
        return '🤖';
      case 'ios':
        return '🍎';
      case 'desktop':
        return '💻';
      default:
        return '📱';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return {
          text: 'AVAILABLE',
          color: THEME_TOKENS.colors.accentEmerald,
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'in_call':
        return {
          text: 'IN CALL',
          color: THEME_TOKENS.colors.warningAmber,
          bg: 'rgba(245, 158, 11, 0.12)',
        };
      case 'hosting':
        return {
          text: 'HOSTING',
          color: THEME_TOKENS.colors.accentCyan,
          bg: 'rgba(6, 182, 212, 0.12)',
        };
      default:
        return {
          text: 'ONLINE',
          color: THEME_TOKENS.colors.textMuted,
          bg: 'rgba(100, 116, 139, 0.12)',
        };
    }
  };

  const allSelected = devices.length > 0 && selectedDeviceIds.size === devices.length;

  return (
    <div
      style={{
        backgroundColor: THEME_TOKENS.colors.bgCard,
        borderRadius: THEME_TOKENS.radius.lg,
        border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
        padding: THEME_TOKENS.spacing.md,
        display: 'flex',
        flexDirection: 'column',
        gap: THEME_TOKENS.spacing.md,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: THEME_TOKENS.colors.textSecondary,
            }}
          >
            DEVICES ON NETWORK ({devices.length})
          </div>
          {isScanning && (
            <span
              style={{
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '10px',
                color: THEME_TOKENS.colors.accentCyan,
                animation: 'pulse 1.5s infinite',
              }}
            >
              • SCANNING...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {devices.length > 0 && (
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: THEME_TOKENS.colors.accentCyan,
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              {allSelected ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>
          )}

          {onScanNow && (
            <button
              onClick={onScanNow}
              disabled={isScanning}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
                borderRadius: THEME_TOKENS.radius.sm,
                color: THEME_TOKENS.colors.textSecondary,
                fontFamily: THEME_TOKENS.fonts.labels,
                fontSize: '11px',
                padding: '4px 8px',
                cursor: isScanning ? 'wait' : 'pointer',
              }}
            >
              ↻ SCAN
            </button>
          )}
        </div>
      </div>

      {/* Device List */}
      {devices.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: THEME_TOKENS.radius.md,
            border: `1px dashed ${THEME_TOKENS.colors.borderSubtle}`,
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.headings,
              fontSize: '13px',
              fontWeight: 600,
              color: THEME_TOKENS.colors.textPrimary,
              marginBottom: '4px',
            }}
          >
            Searching for nearby devices
          </div>
          <div
            style={{
              fontFamily: THEME_TOKENS.fonts.labels,
              fontSize: '11px',
              color: THEME_TOKENS.colors.textMuted,
            }}
          >
            Devices running TrueCalling on this Wi-Fi / Hotspot will show up here automatically.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {devices.map((device) => {
            const isSelected = selectedDeviceIds.has(device.deviceId);
            const badge = getStatusBadge(device.status);

            return (
              <div
                key={device.deviceId}
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected
                    ? `1px solid ${THEME_TOKENS.colors.borderActive}`
                    : `1px solid ${THEME_TOKENS.colors.borderSubtle}`,
                  borderRadius: THEME_TOKENS.radius.md,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Checkbox and Device Info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                  onClick={() => onToggleSelectDevice(device.deviceId)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectDevice(device.deviceId)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: THEME_TOKENS.colors.accentEmerald,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div style={{ fontSize: '20px' }}>{getDeviceIcon(device.deviceType)}</div>

                  <div>
                    <div
                      style={{
                        fontFamily: THEME_TOKENS.fonts.headings,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: THEME_TOKENS.colors.textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {device.displayName}
                      <span
                        style={{
                          fontFamily: THEME_TOKENS.fonts.labels,
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: THEME_TOKENS.radius.full,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.text}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: THEME_TOKENS.fonts.labels,
                        fontSize: '11px',
                        color: THEME_TOKENS.colors.textMuted,
                        marginTop: '2px',
                      }}
                    >
                      {device.ip}:{device.port}
                      {device.currentRoomName ? ` • Room: ${device.currentRoomName}` : ''}
                    </div>
                  </div>
                </div>

                {/* Direct Action Button */}
                <button
                  onClick={() => onCallDevice(device)}
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${THEME_TOKENS.colors.accentEmerald}`,
                    borderRadius: THEME_TOKENS.radius.sm,
                    color: THEME_TOKENS.colors.accentEmerald,
                    fontFamily: THEME_TOKENS.fonts.labels,
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  CALL
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
