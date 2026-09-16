export function livePublish(to: string | string[], event: string, data: unknown) {
  const g = globalThis as any;
  const io = g.__jaminoLive?.io;
  if (!io) return false;
  const rooms = Array.isArray(to) ? to : [to];
  rooms.forEach((r) => io.to(r).emit(event, data));
  return true;
}

export function liveBroadcast(event: string, data: unknown) {
  const g = globalThis as any;
  const io = g.__jaminoLive?.io;
  if (!io) return false;
  io.emit(event, data);
  return true;
}

export function liveRefreshPresence() {
  const g = globalThis as any;
  if (typeof g.__jaminoLive?.pushPresence === 'function') {
    g.__jaminoLive.pushPresence();
    return true;
  }
  return false;
}

export function invalidateFriendCache(userA: number, userB: number) {
  const g = globalThis as any;
  if (typeof g.__jaminoLive?.invalidateFriendCache === 'function') {
    g.__jaminoLive.invalidateFriendCache(userA, userB);
  }
}