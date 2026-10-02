#!/usr/bin/env bun
/**
 * CLI Runner & Local Node Simulator for TrueCalling offline calling.
 *
 * Usage:
 *   bun run core/cli/run_node.ts host [--name "My Room"] [--pin 1234] [--port 45455]
 *   bun run core/cli/run_node.ts join [--name "Bob"] [--ip 127.0.0.1] [--port 45455] [--pin 1234]
 *   bun run core/cli/run_node.ts scan
 */

import { LocalSignalingServer } from '../signaling/signaling_server.js';
import { SignalingClient } from '../signaling/signaling_client.js';
import { UdpBeaconBroadcaster, UdpBeaconListener } from '../discovery/udp_beacon.js';
import { GatewayFastProbe } from '../discovery/gateway_probe.js';
import { WebRtcMeshCoordinator } from '../webrtc/mesh_coordinator.js';
import { NETWORK_CONSTANTS } from '../constants/network_constants.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

function parseArg(key: string, defaultValue: string): string {
  const index = args.indexOf(`--${key}`);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return defaultValue;
}

async function runHost() {
  const roomName = parseArg('name', 'Offline Lounge');
  const port = parseInt(parseArg('port', NETWORK_CONSTANTS.SIGNALING_PORT.toString()), 10);
  const pin = parseArg('pin', '');
  const hostId = `host-${Date.now().toString(36)}`;

  console.log(`[TrueCalling CLI] Starting Host on port ${port}...`);
  console.log(`[TrueCalling CLI] Room Name: "${roomName}" | PIN: ${pin ? 'Configured' : 'None (Open)'}`);

  const server = new LocalSignalingServer({
    roomId: `room-${Date.now().toString(36)}`,
    roomName,
    hostPeerId: hostId,
    hostDisplayName: 'Room Host',
    hostIp: '0.0.0.0',
    port,
    pin: pin || undefined,
  });

  const roomDetails = await server.start();
  console.log(`[TrueCalling CLI] Signaling Server listening at ws://0.0.0.0:${port}/ws`);
  console.log(`[TrueCalling CLI] Fast-probe available at http://0.0.0.0:${port}/room-info`);

  // Start UDP broadcast beacon
  const broadcaster = new UdpBeaconBroadcaster(roomDetails);
  await broadcaster.start();
  console.log(`[TrueCalling CLI] UDP Beacon broadcasting on port ${NETWORK_CONSTANTS.UDP_BEACON_PORT}...`);
  console.log(`[TrueCalling CLI] Host is ready. Press Ctrl+C to stop.\n`);

  process.on('SIGINT', async () => {
    console.log('\n[TrueCalling CLI] Shutting down host...');
    await broadcaster.stop();
    await server.stop();
    process.exit(0);
  });
}

async function runJoin() {
  const displayName = parseArg('name', `User-${Math.floor(Math.random() * 1000)}`);
  const ip = parseArg('ip', '127.0.0.1');
  const port = parseInt(parseArg('port', NETWORK_CONSTANTS.SIGNALING_PORT.toString()), 10);
  const pin = parseArg('pin', '');
  const peerId = `client-${Date.now().toString(36)}`;

  console.log(`[TrueCalling CLI] Connecting to ${ip}:${port} as "${displayName}"...`);

  const client = new SignalingClient(peerId, displayName, 'android', pin || undefined);
  const coordinator = new WebRtcMeshCoordinator(client);

  coordinator.on('meshReady', (room) => {
    console.log(`[TrueCalling CLI] Connected to Room: "${room.name}" (Host: ${room.hostIp}:${room.port})`);
  });

  coordinator.on('peerAdded', (peer) => {
    console.log(`[TrueCalling CLI] + Peer Connected: ${peer.profile.displayName} (${peer.profile.id})`);
  });

  coordinator.on('peerRemoved', (peerId) => {
    console.log(`[TrueCalling CLI] - Peer Disconnected: ${peerId}`);
  });

  coordinator.on('audioLevelUpdated', (peerId, level, isSpeaking) => {
    if (isSpeaking) {
      console.log(`[TrueCalling CLI] 🎙️ ${peerId} is speaking (level: ${level.toFixed(2)})`);
    }
  });

  try {
    await client.connect(ip, port);
    console.log(`[TrueCalling CLI] In call! Press Ctrl+C to leave.\n`);
  } catch (err: any) {
    console.error(`[TrueCalling CLI] Failed to connect:`, err.message);
    process.exit(1);
  }

  process.on('SIGINT', () => {
    console.log('\n[TrueCalling CLI] Leaving call...');
    coordinator.leaveMesh();
    process.exit(0);
  });
}

async function runScan() {
  console.log('[TrueCalling CLI] Scanning LAN and Hotspot gateways for active rooms...');

  // 1. Gateway probe
  const probe = new GatewayFastProbe();
  const foundByGateway = await probe.probeAllGateways();
  if (foundByGateway.length > 0) {
    console.log(`\n[Gateway Probe] Found ${foundByGateway.length} room(s) on hotspot gateways:`);
    for (const r of foundByGateway) {
      console.log(`  • "${r.name}" at ${r.hostIp}:${r.port} (${r.participantCount} peers)`);
    }
  } else {
    console.log('[Gateway Probe] No active rooms responding on default hotspot gateways.');
  }

  // 2. UDP Beacon Listener
  console.log(`\n[UDP Beacon] Listening on port ${NETWORK_CONSTANTS.UDP_BEACON_PORT} (5s scan)...`);
  const listener = new UdpBeaconListener();
  listener.on('roomUpdated', (room, isNew) => {
    if (isNew) {
      console.log(`  [Beacon] Discovered "${room.name}" from ${room.hostIp}:${room.port}`);
    }
  });

  await listener.start();
  await new Promise((r) => setTimeout(r, 5000));
  await listener.stop();

  const rooms = listener.getActiveRooms();
  console.log(`\nScan complete. Total active rooms: ${rooms.length}`);
  process.exit(0);
}

function showHelp() {
  console.log(`
TrueCalling - Fully Offline Group Calling CLI

Commands:
  host   Host a call and start embedded signaling server & UDP beacons
         --name <room_name>    Name of the room (default: "Offline Lounge")
         --port <port>         Signaling port (default: 45455)
         --pin  <pin>          Optional PIN code

  join   Join an existing call on LAN or hotspot
         --ip   <host_ip>      Host IP address (default: 127.0.0.1)
         --port <port>         Signaling port (default: 45455)
         --name <name>         Your display name
         --pin  <pin>          Room PIN if protected

  scan   Scan the local network for beacons and probe hotspot gateways
`);
}

switch (command) {
  case 'host':
    runHost();
    break;
  case 'join':
    runJoin();
    break;
  case 'scan':
    runScan();
    break;
  default:
    showHelp();
    break;
}
