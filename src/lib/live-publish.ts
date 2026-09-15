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