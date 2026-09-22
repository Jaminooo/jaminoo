interface CardSong {
  id: number;
  title: string;
  durationSec: number;
  coverFile?: string | null;
  artist?: { name?: string } | null;
  album?: { id?: number; coverFile?: string | null } | null;
}

export function jamCardPayload(
  jam: {
    id: string;
    name: string;
    desc: string;
    type: 'PUBLIC' | 'PRIVATE';
    closed: boolean;
    ownerId: number;
    currentPlaying: boolean;
    owner?: { id: number; username: string; avatarId: number; profilePhotoId: string | null };
    members?: { userId: number }[];
    currentSong?: CardSong | null;
  },
  viewerId?: number,
) {
  const song = jam.currentSong;
  return {
    id: jam.id,
    name: jam.name,
    desc: jam.desc,
    type: jam.type,
    closed: jam.closed,
    ownerId: jam.ownerId,
    owner: jam.owner
      ? {
          id: jam.owner.id,
          username: jam.owner.username,
          avatarId: jam.owner.avatarId,
          profilePhotoId: jam.owner.profilePhotoId,
        }
      : null,
    members: jam.members?.length ?? 0,
    playing: jam.currentPlaying,
    now: song
      ? {
          id: song.id,
          title: song.title,
          artist: song.artist?.name ?? '',
          coverUrl: song.coverFile
            ? `/api/music/cover/song/${song.id}`
            : song.album?.coverFile && song.album?.id
              ? `/api/music/cover/album/${song.album.id}`
              : null,
          durationSec: song.durationSec,
        }
      : null,
    mine: viewerId != null && jam.ownerId === viewerId,
    inJam: viewerId != null && !!jam.members?.some((m) => m.userId === viewerId),
  };
}