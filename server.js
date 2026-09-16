const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

function getCookie(raw, name) {
  const m = (raw || '').split(';').map((s) => s.trim()).find((p) => p.startsWith(name + '='));
  return m ? m.slice(name.length + 1) : null;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const selfOrigin = `${proto}://${req.headers.host}`;
  if (origin === selfOrigin) return true;
  const pub = process.env.NEXT_PUBLIC_BASE_URL;
  if (pub) {
    try {
      return origin === new URL(pub).origin;
    } catch {
      return false;
    }
  }
  return false;
}

const dev = process.env.NODE_ENV === 'development';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

// Map of userId -> Set<socketId> for online presence.
const online = new Map();

// Cache of userId -> { at, set } of friend ids (used to scope presence broadcasts).
const friendCache = new Map();

async function friendsOf(userId) {
  const cached = friendCache.get(userId);
  if (cached && Date.now() - cached.at < 30000) return cached.set;
  const rows = await prisma.friendRequest.findMany({
    where: { status: 'FRIENDS', OR: [{ fromId: userId }, { toId: userId }] },
    select: { fromId: true, toId: true },
  });
  const set = new Set();
  for (const r of rows) set.add(r.fromId === userId ? r.toId : r.fromId);
  friendCache.set(userId, { at: Date.now(), set });
  return set;
}

async function pushPresence() {
  const all = [...online.keys()];
  for (const userId of all) {
    const sockets = online.get(userId);
    if (!sockets || sockets.size === 0) continue;
    let list;
    try {
      const friends = await friendsOf(userId);
      list = all.filter((id) => friends.has(id));
    } catch (e) {
      console.error('presence friends error:', e && e.message);
      list = [userId];
    }
    io.to(`user:${userId}`).emit('presence:update', { online: list });
  }
}

let io;

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  io = new Server(server, {
    path: '/socket.io',
    serveClient: false,
    cors: { origin: false, credentials: false },
    allowRequest(req, callback) {
      if (!originAllowed(req)) return callback(null, false);
      callback(null, true);
    },
  });

  io.use(async (socket, nextcb) => {
    try {
      const token = getCookie(socket.handshake.headers.cookie, 'jam_session');
      if (!token) return nextcb(new Error('unauthorized'));
      const session = await prisma.session.findUnique({ where: { token } });
      if (!session || session.expiresAt < new Date()) return nextcb(new Error('unauthorized'));
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) return nextcb(new Error('unauthorized'));
      if (user.bannedUntil && user.bannedUntil > new Date()) return nextcb(new Error('banned'));
      socket.data.userId = session.userId;
      socket.data.isAdmin = !!user.isAdmin;
      socket.data.token = token;
      nextcb();
    } catch (e) {
      console.error('WS auth error:', e && e.message);
      nextcb(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    const livePositionMs = (jam) => {
      if (jam.currentPlaying && jam.currentStartedAt) {
        return jam.currentPosition + (Date.now() - jam.currentStartedAt.getTime());
      }
      return jam.currentPosition;
    };

    const songPayloadJS = (s) => {
      const album = s.album
        ? { id: s.album.id, title: s.album.title, coverUrl: s.album.coverFile ? `/api/music/cover/album/${s.album.id}` : null }
        : null;
      return {
        id: s.id,
        title: s.title,
        artist: s.artist ? { id: s.artist.id, name: s.artist.name, coverFile: s.artist.coverFile || '' } : null,
        feat: JSON.parse(s.featArtistIds || '[]'),
        album,
        trackNo: s.trackNo,
        durationSec: s.durationSec,
        genres: JSON.parse(s.genres || '[]'),
        producer: s.producer,
        label: s.label,
        year: s.year,
        explicit: !!s.explicit,
        featured: !!s.featured,
        lyrics: s.lyrics || '',
        lrc: s.lrc || '',
        hasAudio: !!s.audioFile,
        audioUrl: s.audioFile ? `/api/music/stream/${s.id}` : null,
        audioLink: s.audioLink || null,
        hasCover: !!s.coverFile,
        coverUrl: s.coverFile ? `/api/music/cover/song/${s.id}` : (album ? album.coverUrl : null),
        plays: s.plays,
        createdAt: s.createdAt ? s.createdAt.toISOString() : null,
      };
    };

    const MUSIC_INCLUDE = () => ({
      currentSong: {
        include: {
          artist: true,
          album: { include: { artist: true } },
        },
      },
      queueItems: {
        include: {
          song: { include: { artist: true, album: true } },
          addedByRef: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    });

    const refreshJam = async (jamId) => {
      return prisma.jam.findUnique({ where: { id: jamId }, include: MUSIC_INCLUDE() });
    };

    const broadcastState = (jam) => {
      io.to(`jam:${jam.id}`).emit('music:state', {
        jamId: jam.id,
        now: jam.currentSongId ? songPayloadJS(jam.currentSong) : null,
        playing: jam.currentPlaying,
        positionMs: livePositionMs(jam),
        atMs: Date.now(),
        durationSec: jam.currentSong ? jam.currentSong.durationSec : 0,
      });
    };

    const broadcastQueue = (jam) => {
      io.to(`jam:${jam.id}`).emit('music:queue', {
        jamId: jam.id,
        queue: jam.queueItems.map((qi) => ({
          id: qi.id,
          song: songPayloadJS(qi.song),
          addedBy: { id: qi.addedBy, username: qi.addedByRef ? qi.addedByRef.username : '' },
          createdAt: qi.createdAt.toISOString(),
        })),
      });
    };

    const advanceQueue = async (jamId) => {
      const jam = await refreshJam(jamId);
      if (!jam || !jam.currentSongId) return;
      const next = jam.queueItems.length ? jam.queueItems[0] : null;
      if (next) {
        await prisma.jam.update({
          where: { id: jamId },
          data: { currentSongId: next.songId, currentStartedAt: new Date(), currentPlaying: true, currentPosition: 0 },
        });
        await prisma.jamQueueItem.delete({ where: { id: next.id } });
      } else {
        await prisma.jam.update({ where: { id: jamId }, data: { currentPlaying: false, currentPosition: 0 } });
      }
      const fresh = await refreshJam(jamId);
      if (fresh) {
        broadcastState(fresh);
        broadcastQueue(fresh);
      }
    };

    socket.join(`user:${userId}`);
    if (socket.data.isAdmin) socket.join('admin');

    const set = online.get(userId) || new Set();
    set.add(socket.id);
    online.set(userId, set);
    pushPresence();

    socket.on('music:sync', async (jamId) => {
      if (typeof jamId !== 'string' || !jamId) return;
      try {
        const jam = await refreshJam(jamId);
        if (!jam || jam.kind !== 'MUSIC') return;
        const member = await prisma.jamMember.findUnique({ where: { jamId_userId: { jamId, userId } } });
        if (!member) return;
        broadcastState(jam);
        broadcastQueue(jam);
      } catch (e) {
        console.error('music:sync error:', e && e.message);
      }
    });

    socket.on('music:control', async (d) => {
      if (!d || typeof d !== 'object' || typeof d.jamId !== 'string') return;
      const jamId = d.jamId;
      const action = String(d.action || '');
      try {
        const jam = await prisma.jam.findUnique({ where: { id: jamId }, select: { id: true, ownerId: true, kind: true, members: true } });
        if (!jam || jam.kind !== 'MUSIC') return;
        const isMember = jam.members.some((m) => m.userId === userId);
        if (!isMember) return;
        const canControl = jam.ownerId === userId || !!socket.data.isAdmin;
        const controlActions = ['play', 'pause', 'resume', 'seek', 'skip', 'queue-add', 'queue-remove'];
        if (controlActions.includes(action) && !canControl) return;

        if (action === 'queue-add') {
          const songId = Number(d.songId);
          if (!Number.isInteger(songId) || songId <= 0) return;
          const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
          if (!song) return;
          await prisma.jamQueueItem.create({ data: { jamId, songId, addedBy: userId } });
          const fresh = await refreshJam(jamId);
          if (fresh) {
            broadcastQueue(fresh);
            broadcastState(fresh);
          }
          return;
        }

        if (action === 'queue-remove') {
          const qi = Number(d.qi);
          if (!Number.isInteger(qi) || qi <= 0) return;
          await prisma.jamQueueItem.deleteMany({ where: { id: qi, jamId } });
          const fresh = await refreshJam(jamId);
          if (fresh) broadcastQueue(fresh);
          return;
        }

        const cur = await refreshJam(jamId);
        if (!cur) return;

        if (action === 'play') {
          let songId = Number(d.songId);
          if (songId && Number.isInteger(songId) && songId > 0) {
            const song = await prisma.song.findUnique({ where: { id: songId }, select: { durationSec: true } });
            if (!song) return;
            const position = Math.max(0, Math.min((song.durationSec || 0) * 1000, Number(d.position) || 0));
            await prisma.jam.update({
              where: { id: jamId },
              data: { currentSongId: songId, currentStartedAt: new Date(), currentPlaying: true, currentPosition: position },
            });
          } else if (!cur.currentSongId) {
            const first = cur.queueItems[0];
            if (first) {
              await prisma.jam.update({
                where: { id: jamId },
                data: { currentSongId: first.songId, currentStartedAt: new Date(), currentPlaying: true, currentPosition: 0 },
              });
              await prisma.jamQueueItem.delete({ where: { id: first.id } });
            }
          } else if (!cur.currentPlaying) {
            await prisma.jam.update({
              where: { id: jamId },
              data: { currentPlaying: true, currentStartedAt: new Date() },
            });
          }
        } else if (action === 'pause') {
          if (cur.currentPlaying) {
            await prisma.jam.update({
              where: { id: jamId },
              data: { currentPlaying: false, currentPosition: livePositionMs(cur) },
            });
          }
        } else if (action === 'resume') {
          if (cur.currentSongId && !cur.currentPlaying) {
            await prisma.jam.update({
              where: { id: jamId },
              data: { currentPlaying: true, currentStartedAt: new Date() },
            });
          }
        } else if (action === 'seek') {
          if (cur.currentSongId) {
            const pos = Math.max(0, Math.min((cur.currentSong.durationSec || 0) * 1000, Number(d.position) || 0));
            await prisma.jam.update({
              where: { id: jamId },
              data: { currentPlaying: cur.currentPlaying, currentPosition: pos, currentStartedAt: cur.currentPlaying ? new Date() : cur.currentStartedAt },
            });
          }
        } else if (action === 'skip') {
          await advanceQueue(jamId);
          return;
        } else if (action === 'ended') {
          await advanceQueue(jamId);
          return;
        }

        const fresh = await refreshJam(jamId);
        if (fresh) broadcastState(fresh);
      } catch (e) {
        console.error('music:control error:', e && e.message);
      }
    });

    socket.on('music:ended', async (jamId) => {
      if (typeof jamId !== 'string' || !jamId) return;
      try {
        const member = await prisma.jamMember.findUnique({ where: { jamId_userId: { jamId, userId } } });
        if (!member) return;
        await advanceQueue(jamId);
      } catch (e) {
        console.error('music:ended error:', e && e.message);
      }
    });

    socket.on('jam:join', async (jamId) => {
      if (typeof jamId !== 'string' || !jamId) return;
      try {
        const member = await prisma.jamMember.findUnique({ where: { jamId_userId: { jamId, userId } } });
        if (member) socket.join(`jam:${jamId}`);
        else socket.leave(`jam:${jamId}`);
      } catch (e) {
        console.error('jam:join error:', e && e.message);
      }
    });

    socket.on('jam:leave', (jamId) => {
      if (typeof jamId === 'string' && jamId) socket.leave(`jam:${jamId}`);
    });

    socket.on('typing', async (d) => {
      if (!d || typeof d !== 'object') return;
      if (d.jam && typeof d.jam === 'string') {
        try {
          const member = await prisma.jamMember.findUnique({ where: { jamId_userId: { jamId: d.jam, userId } } });
          if (!member) return;
          io.to(`jam:${d.jam}`).emit('typing:update', { jam: d.jam, user: userId, from: socket.id });
        } catch (e) {
          console.error('typing jam error:', e && e.message);
        }
      }
      if (d.dm && typeof d.dm !== 'object' && Number.isFinite(Number(d.dm))) {
        const otherId = Number(d.dm);
        if (!Number.isInteger(otherId) || otherId === userId) return;
        try {
          const rel = await prisma.friendRequest.findFirst({
            where: { status: 'FRIENDS', OR: [{ fromId: userId, toId: otherId }, { fromId: otherId, toId: userId }] },
          });
          if (!rel) return;
          io.to(`user:${otherId}`).emit('typing:update', { dm: otherId, user: userId, from: socket.id });
        } catch (e) {
          console.error('typing dm error:', e && e.message);
        }
      }
    });

    socket.on('disconnect', () => {
      const s = online.get(userId);
      if (s) {
        s.delete(socket.id);
        if (s.size === 0) online.delete(userId);
      }
      pushPresence();
    });
  });

  globalThis.__jaminoLive = { io, prisma, online };

  server.listen(port, () => {
    console.log(`> Jamino live server ready on http://localhost:${port}`);
  });
});