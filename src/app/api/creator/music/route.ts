import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { MUSIC_AUDIO_MAX, MUSIC_COVER_MAX, deleteMusicFile, isAcceptedAudioMime, saveAudioBuf, saveCoverBuf, sniffCoverMime } from '@/lib/music';

function safeUrl(value: unknown, max = 1800) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim().slice(0, max);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : '';
  } catch {
    return '';
  }
}

async function requireApprovedMusicCreator(userId: number) {
  const application = await prisma.creatorApplication.findUnique({ where: { userId_hub: { userId, hub: 'MUSIC' } }, select: { status: true, channelName: true } });
  return application?.status === 'APPROVED' ? application : null;
}

export const POST = handle(async (req) => {
  const me = await requireUser();
  const creator = await requireApprovedMusicCreator(me.id);
  if (!creator) return err('Creator approval is required before publishing music', 403);
  const isMultipart = (req.headers.get('content-type') ?? '').includes('multipart/form-data');
  let body: Record<string, any> = {};
  let audioFile: File | null = null;
  let coverFile: File | null = null;
  if (isMultipart) {
    const form = await req.formData();
    body = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string'));
    const audio = form.get('audioFile');
    const cover = form.get('coverFile');
    audioFile = audio instanceof File && audio.size > 0 ? audio : null;
    coverFile = cover instanceof File && cover.size > 0 ? cover : null;
  } else {
    body = await req.json().catch(() => ({}));
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
  const artistName = (typeof body.artistName === 'string' ? body.artistName.trim().slice(0, 120) : '') || creator.channelName;
  const albumTitle = typeof body.albumTitle === 'string' ? body.albumTitle.trim().slice(0, 200) : '';
  const audioLink = safeUrl(body.audioLink);
  const coverLink = safeUrl(body.coverLink, 1200);
  if (!title) return err('Track title is required');
  if (!artistName) return err('Artist name is required');
  if (!audioLink && !audioFile) return err('Upload an audio file or add a public HTTPS audio URL');

  if (audioFile) {
    if (audioFile.size > MUSIC_AUDIO_MAX) return err('Audio file is too large (max 40 MB)');
    if (!isAcceptedAudioMime(audioFile.type)) return err('Only mp3, wav, ogg, m4a, aac or flac audio is allowed');
  }
  if (coverFile) {
    if (coverFile.size > MUSIC_COVER_MAX) return err('Cover file is too large (max 5 MB)');
    const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
    if (!sniffCoverMime(coverBuffer)) return err('Only jpg, png or webp covers are allowed');
  }

  let audioFileName = '';
  let coverFileName = '';
  try {
    if (audioFile) audioFileName = saveAudioBuf(Buffer.from(await audioFile.arrayBuffer()), audioFile.name);
    if (coverFile) coverFileName = saveCoverBuf(Buffer.from(await coverFile.arrayBuffer()), coverFile.name);

    const artist = await prisma.artist.upsert({
      where: { name: artistName },
      create: { name: artistName, coverFile: coverFileName || coverLink, bio: `Music creator on Jamino.` },
      update: coverFileName || coverLink ? { coverFile: coverFileName || coverLink } : {},
    });

    let albumId: number | null = null;
    if (albumTitle) {
      const existingAlbum = await prisma.album.findFirst({ where: { title: albumTitle, artistId: artist.id } });
      const album = existingAlbum
        ? await prisma.album.update({ where: { id: existingAlbum.id }, data: coverFileName || coverLink ? { coverFile: coverFileName || coverLink } : {} })
        : await prisma.album.create({ data: { title: albumTitle, artistId: artist.id, type: 'ALBUM', year: Number(body.year) || new Date().getFullYear(), coverFile: coverFileName || coverLink } });
      albumId = album.id;
    }

    const song = await prisma.song.create({
      data: {
        title,
        artistId: artist.id,
        albumId,
        durationSec: Math.max(0, Number(body.durationSec) || 0),
        genres: JSON.stringify(Array.isArray(body.genres) ? body.genres.slice(0, 8) : []),
        producer: typeof body.producer === 'string' ? body.producer.trim().slice(0, 120) : '',
        lyrics: typeof body.lyrics === 'string' ? body.lyrics.slice(0, 12000) : '',
        audioFile: audioFileName,
        audioLink: audioFileName ? '' : audioLink,
        coverFile: coverFileName || coverLink,
        featured: false,
      },
      include: { artist: { select: { id: true, name: true, coverFile: true } }, album: { select: { id: true, title: true, coverFile: true } } },
    });

    return json({ ok: true, song: songPayload(song) }, 201);
  } catch (error) {
    if (audioFileName) deleteMusicFile(audioFileName);
    if (coverFileName) deleteMusicFile(coverFileName);
    throw error;
  }
});
