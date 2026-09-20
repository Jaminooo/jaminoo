import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'MUSIC';
import { MUSIC_AUDIO_MAX, MUSIC_COVER_MAX, isAcceptedAudioMime, sniffCoverMime, saveCoverBuf, saveAudioBuf } from '@/lib/music';

export const POST = handle(async (req: Request) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const form = await req.formData();
  const file = form.get('file');
  const kind = (form.get('kind') ?? 'cover').toString();
  if (!(file instanceof File)) return err('No file provided');
  if (file.size === 0) return err('Empty file');

  if (kind === 'audio') {
    if (file.size > MUSIC_AUDIO_MAX) return err('File too large (max 40 MB)');
    if (!isAcceptedAudioMime(file.type)) return err('Only mp3, wav, ogg, m4a, aac, flac allowed');
    const buf = Buffer.from(await file.arrayBuffer());
    const fileName = saveAudioBuf(buf, file.name);
    return json({ ok: true, fileName, type: 'audio' });
  }

  if (kind === 'cover') {
    if (file.size > MUSIC_COVER_MAX) return err('File too large (max 5 MB)');
    const buf = Buffer.from(await file.arrayBuffer());
    if (!sniffCoverMime(buf)) return err('Only jpg, png, webp covers allowed');
    const fileName = saveCoverBuf(buf, file.name);
    return json({ ok: true, fileName, type: 'cover' });
  }

  return err('Unknown upload kind');
});