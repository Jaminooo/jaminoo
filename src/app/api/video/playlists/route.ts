import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeVideoPost } from '@/lib/video-post';

// Real database-backed video playlists (replaces the localStorage-only phase-one UI).
// Playlists are private to their owner; items hold explicit posts.

function parseItems(value: unknown) {
  const values = Array.isArray(value) ? value : [];
  return values
    .map((item) => {
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch {
          return {};
        }
      }
      return typeof item === 'object' && item !== null ? item : {};
    })
    .filter((item: any) => Number.isInteger(Number(item.postId)) && Number(item.postId) > 0)
    .map((item: any) => ({ postId: Number(item.postId), note: typeof item.note === 'string' ? item.note.slice(0, 240) : '' }));
}

function serialize(playlist: any) {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    createdAt: playlist.createdAt.toISOString(),
    items: playlist.items
      .filter((item: any) => item.post && item.post.visibility === 'PUBLIC')
      .map((item: any) => ({
        id: item.id,
        postId: item.postId,
        note: item.note,
        post: item.post ? serializeVideoPost({ ...item.post, likes: [], saves: [], _count: { likes: 0, saves: 0, comments: 0 } }) : null,
      })),
  };
}

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const playlistId = Number(new URL(req.url).searchParams.get('playlistId') ?? 0);
  if (Number.isInteger(playlistId) && playlistId > 0) {
    const playlist = await prisma.videoPlaylist.findFirst({
      where: { id: playlistId, userId: me.id },
      include: {
        items: {
          orderBy: { pos: 'asc' },
          include: {
            post: { include: { author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } } } },
          },
        },
      },
    });
    if (!playlist) return err('Playlist not found', 404);
    return json({ playlist: serialize(playlist) });
  }
  const playlists = await prisma.videoPlaylist.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
  return json({
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      count: playlist._count.items,
      createdAt: playlist.createdAt.toISOString(),
    })),
  });
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 300) : '';
  const postId = Number(body.postId ?? 0);
  if (name.length < 1) return err('Give your playlist a name');
  const playlist = await prisma.videoPlaylist.create({
    data: {
      userId: me.id,
      name,
      description,
      ...(Number.isInteger(postId) && postId > 0
        ? { items: { create: [{ postId, pos: 0 }] } }
        : {}),
    },
    include: { _count: { select: { items: true } } },
  });
  return json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      count: playlist._count.items,
      createdAt: playlist.createdAt.toISOString(),
    },
  }, 201);
});

export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const playlistId = Number(body.playlistId);
  const action = typeof body.action === 'string' ? body.action : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 300) : '';
  if (!Number.isInteger(playlistId) || playlistId <= 0) return err('Invalid playlist');
  const playlist = await prisma.videoPlaylist.findUnique({ where: { id: playlistId }, select: { id: true, userId: true } });
  if (!playlist || playlist.userId !== me.id) return err('Playlist not found', 404);

  if (action === 'add' || action === 'remove') {
    const postId = Number(body.postId);
    if (!Number.isInteger(postId) || postId <= 0) return err('Invalid post');
    const post = await prisma.videoPost.findFirst({ where: { id: postId, visibility: 'PUBLIC' }, select: { id: true } });
    if (!post) return err('Post not found', 404);
    if (action === 'add') {
      const items = await prisma.videoPlaylistItem.count({ where: { playlistId } });
      if (items >= 200) return err('This playlist is full');
      await prisma.videoPlaylistItem.upsert({
        where: { playlistId_postId: { playlistId, postId } },
        create: { playlistId, postId, pos: items },
        update: {},
      });
      return json({ added: true });
    }
    await prisma.videoPlaylistItem.deleteMany({ where: { playlistId, postId } });
    return json({ added: false });
  }

  if (action === 'rename') {
    if (name.length < 1) return err('Give your playlist a name');
    await prisma.videoPlaylist.update({ where: { id: playlistId }, data: { name, description } });
    return json({ renamed: true });
  }

  return err('Unknown playlist action');
});

export const DELETE = handle(async (req: Request) => {
  const me = await requireUser();
  const playlistId = Number(new URL(req.url).searchParams.get('playlistId') ?? 0);
  if (!Number.isInteger(playlistId) || playlistId <= 0) return err('Invalid playlist');
  const playlist = await prisma.videoPlaylist.findUnique({ where: { id: playlistId }, select: { id: true, userId: true } });
  if (!playlist || playlist.userId !== me.id) return err('Playlist not found', 404);
  await prisma.videoPlaylist.delete({ where: { id: playlistId } });
  return json({ ok: true });
});
