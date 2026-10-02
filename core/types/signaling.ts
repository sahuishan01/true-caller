/**
 * Type definitions for offline signaling and WebRTC mesh state.
 */

export interface PeerProfile {
  id: string;
  displayName: string;
  deviceType: 'android' | 'ios' | 'desktop';
  isHost: boolean;
  isMuted: boolean;
  joinedAt: number;
}

export interface RoomDetails {
  roomId: string;
  name: string;
  hostId: string;
  hostIp: string;
  port: number;
  hasPin: boolean;
  participantCount: number;
  maxParticipants: number;
  createdAt: number;
}

export type SignalingMessageType =
  | 'JOIN_REQUEST'
  | 'JOIN_ACCEPTED'
  | 'JOIN_REJECTED'
  | 'ROOM_STATE'
  | 'PEER_JOINED'
  | 'PEER_LEFT'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'MUTE_STATUS'
  | 'AUDIO_LEVEL'
  | 'PING'
  | 'PONG'
  | 'CALL_INVITE'
  | 'CALL_INVITE_RESPONSE'
  | 'RECONNECT_REQUEST'
  | 'LEAVE_ROOM';

export interface SignalingMessage<T = unknown> {
  type: SignalingMessageType;
  fromPeerId: string;
  toPeerId?: string; // If undefined, broadcast to all peers in the room
  payload: T;
  timestamp: number;
}

export interface JoinRequestPayload {
  displayName: string;
  deviceType: 'android' | 'ios' | 'desktop';
  pin?: string;
}

export interface JoinAcceptedPayload {
  assignedPeerId: string;
  room: RoomDetails;
  existingPeers: PeerProfile[];
}

export interface JoinRejectedPayload {
  reason: 'INVALID_PIN' | 'ROOM_FULL' | 'REJECTED_BY_HOST';
}

export interface SdpPayload {
  sdp: string;
  sdpType: 'offer' | 'answer';
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface MuteStatusPayload {
  isMuted: boolean;
}

export interface AudioLevelPayload {
  level: number; // 0.0 to 1.0
  isSpeaking: boolean;
}

export interface RoomBeaconPacket {
  protocol: 'truecall-v1';
  roomId: string;
  roomName: string;
  hostPeerId: string;
  hostIp: string;
  port: number;
  hasPin: boolean;
  participantCount: number;
  timestamp: number;
}

export type DevicePresenceStatus = 'available' | 'in_call' | 'hosting';

export interface DiscoveredDevice {
  deviceId: string;
  displayName: string;
  ip: string;
  port: number;
  deviceType: 'android' | 'ios' | 'desktop';
  status: DevicePresenceStatus;
  currentRoomName?: string;
  lastSeen: number;
}

export interface DeviceBeaconPacket {
  protocol: 'truecall-device-v1';
  deviceId: string;
  displayName: string;
  ip: string;
  port: number;
  deviceType: 'android' | 'ios' | 'desktop';
  status: DevicePresenceStatus;
  currentRoomName?: string;
  timestamp: number;
}

export interface CallInvitePayload {
  inviteId: string;
  hostPeerId: string;
  hostDisplayName: string;
  hostIp: string;
  port: number;
  roomId: string;
  roomName: string;
  pin?: string;
  timestamp: number;
}

export interface CallInviteResponsePayload {
  inviteId: string;
  fromDeviceId: string;
  fromDisplayName: string;
  accepted: boolean;
  reason?: string;
}

