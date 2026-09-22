import { handle, json, err } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

// GET /api/jams/[id]/preview — public preview for invite links and guest join page.
export const GET = handle(async (_req, { params }: Ctx) => {
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, desc: true, type: true, kind: true, closed: true, ownerId: true, currentSongId: true },
  });
  if (!jam) return err('Not found', 404);

  const [memberCount, owner, currentSong] = await Promise.all([
    prisma.jamMember.count({ where: { jamId: jam.id } }),
    prisma.user.findUnique({
      where: { id: jam.ownerId },
      select: { username: true, avatarId: true, profilePhotoId: true, isGuest: true },
    }),
    prisma.song.findUnique({
      where: { id: jam.currentSongId ?? -1 },
      select: {
        id: true,
        title: true,
        durationSec: true,
        coverFile: true,
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true, coverFile: true } },
      },
    }),
  ]);

  return json({
    jam: {
      id: jam.id,
      name: jam.name,
      desc: jam.desc,
      type: jam.type,
      kind: jam.kind,
      closed: jam.closed,
      ownerId: jam.ownerId,
      members: memberCount,
      owner: owner
        ? { username: owner.username, avatarId: owner.avatarId, profilePhotoId: owner.profilePhotoId }
        : { username: '', avatarId: 1, profilePhotoId: null },
      now: currentSong
        ? {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist?.name ?? '',
            coverUrl: currentSong.coverFile
              ? `/api/music/cover/song/${currentSong.id}`
              : currentSong.album?.coverFile
                ? `/api/music/cover/album/${currentSong.album.id}`
                : null,
          }
        : null,
    },
  });
});