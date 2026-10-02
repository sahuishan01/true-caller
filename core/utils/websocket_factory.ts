import { WebSocket as NodeWebSocket } from 'ws';

export type UniversalWebSocket = WebSocket | NodeWebSocket;

export function createWebSocket(url: string): UniversalWebSocket {
  if (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') {
    return new window.WebSocket(url);
  }
  return new NodeWebSocket(url);
}
