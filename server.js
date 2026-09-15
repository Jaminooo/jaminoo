const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

function getCookie(raw, name) {
  const m = (raw || '').split(';').map((s) => s.trim()).find((p) => p.startsWith(name + '='));
  return m ? m.slice(name.length + 1) : null;
}

const dev = process.env.NODE_ENV === 'development';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

// Map of userId -> Set<socketId> for online presence.
const online = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    path: '/socket.io',
    serveClient: false,
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, nextcb) => {
    try {
      const token = getCookie(socket.handshake.headers.cookie, 'jam_session');
      if (!token) return nextcb(new Error('unauthorized'));
      const session = await prisma.session.findUnique({ where: { token } });
      if (!session || session.expiresAt < new Date()) return nextcb(new Error('unauthorized'));
      socket.data.userId = session.userId;
      socket.data.token = token;
      nextcb();
    } catch (e) {
      console.error('WS auth error:', e && e.message);
      nextcb(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    const set = online.get(userId) || new Set();
    set.add(socket.id);
    online.set(userId, set);
    io.emit('presence:update', { online: [...online.keys()] });

    socket.on('jam:join', (jamId) => {
      if (typeof jamId === 'string' && jamId) socket.join(`jam:${jamId}`);
    });

    socket.on('jam:leave', (jamId) => {
      if (typeof jamId === 'string' && jamId) socket.leave(`jam:${jamId}`);
    });

    socket.on('typing', (d) => {
      if (!d || typeof d !== 'object') return;
      if (d.jam) io.to(`jam:${d.jam}`).emit('typing:update', { jam: d.jam, user: userId, from: socket.id });
      if (d.dm) io.to(`user:${d.dm}`).emit('typing:update', { dm: d.dm, user: userId, from: socket.id });
    });

    socket.on('disconnect', () => {
      const s = online.get(userId);
      if (s) {
        s.delete(socket.id);
        if (s.size === 0) online.delete(userId);
      }
      io.emit('presence:update', { online: [...online.keys()] });
    });
  });

  globalThis.__jaminoLive = { io, prisma, online };

  server.listen(port, () => {
    console.log(`> Jamino live server ready on http://localhost:${port}`);
  });
});