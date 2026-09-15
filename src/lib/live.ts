'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let subs = new Map<string, Set<(data: any) => void>>();

export function connectLive(): Socket | null {
  if (socket) return socket;
  socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true });
  socket.onAny((event, data) => {
    subs.get(event)?.forEach((cb) => cb(data));
  });
  return socket;
}

export function disconnectLive() {
  socket?.disconnect();
  socket = null;
}

export function liveConnected() {
  return !!socket?.connected;
}

export function emitLive(event: string, data?: any) {
  if (socket?.connected) socket.emit(event, data);
}

export function onLive(event: string, cb: (data: any) => void): () => void {
  if (!subs.has(event)) subs.set(event, new Set());
  subs.get(event)!.add(cb);
  return () => {
    subs.get(event)?.delete(cb);
  };
}