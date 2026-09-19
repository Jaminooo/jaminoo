'use client';

import { io, Socket } from 'socket.io-client';

export type LiveStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';
type Listener = (data: any) => void;
let socket: Socket | null = null;
let subs = new Map<string, Set<Listener>>();
let connectCallbacks = new Set<() => void>();
let statusCallbacks = new Set<(status: LiveStatus) => void>();
let status: LiveStatus = 'idle';
let pending: Array<{ event: string; data: any }> = [];

function setStatus(next: LiveStatus) {
  status = next;
  statusCallbacks.forEach((cb) => cb(next));
}

function flushPending() {
  if (!socket?.connected || pending.length === 0) return;
  const queued = pending;
  pending = [];
  queued.forEach(({ event, data }) => socket?.emit(event, data));
}

export function connectLive(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;
  setStatus(navigator.onLine ? 'connecting' : 'offline');
  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 700,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.25,
    timeout: 10000,
  });
  socket.onAny((event, data) => subs.get(event)?.forEach((cb) => cb(data)));
  socket.on('connect', () => {
    setStatus('connected');
    flushPending();
    connectCallbacks.forEach((cb) => cb());
  });
  socket.on('disconnect', () => setStatus(navigator.onLine ? 'reconnecting' : 'offline'));
  socket.io.on('reconnect_attempt', () => setStatus(navigator.onLine ? 'reconnecting' : 'offline'));
  socket.on('connect_error', () => setStatus(navigator.onLine ? 'error' : 'offline'));
  window.addEventListener('online', () => {
    if (socket && !socket.connected) { setStatus('reconnecting'); socket.connect(); }
  });
  window.addEventListener('offline', () => setStatus('offline'));
  return socket;
}

export function disconnectLive() {
  socket?.disconnect();
  socket = null;
  pending = [];
  setStatus('idle');
}

export function liveConnected() { return !!socket?.connected; }
export function liveSocketId() { return socket?.id ?? null; }
export function liveStatus() { return status; }

export function emitLive(event: string, data?: any) {
  if (socket?.connected) socket.emit(event, data);
}

export function emitWhenConnected(event: string, data?: any) {
  if (socket?.connected) socket.emit(event, data);
  else if (socket) pending.push({ event, data });
}

export function onLiveConnect(cb: () => void): () => void {
  connectCallbacks.add(cb);
  if (socket?.connected) cb();
  return () => connectCallbacks.delete(cb);
}

export function onLiveStatus(cb: (next: LiveStatus) => void): () => void {
  statusCallbacks.add(cb);
  cb(status);
  return () => statusCallbacks.delete(cb);
}

export function onLive(event: string, cb: Listener): () => void {
  if (!subs.has(event)) subs.set(event, new Set());
  subs.get(event)!.add(cb);
  return () => subs.get(event)?.delete(cb);
}
