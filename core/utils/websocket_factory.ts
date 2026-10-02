export type UniversalWebSocket = WebSocket;

export function createWebSocket(url: string): UniversalWebSocket {
  if (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') {
    return new window.WebSocket(url);
  }
  const WS = (globalThis as any).WebSocket;
  if (WS) {
    return new WS(url);
  }
  throw new Error('WebSocket is not supported in this environment');
}
