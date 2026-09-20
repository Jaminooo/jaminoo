import { handle, json, err, requireUser } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { fetchLinkPreview, extractFirstUrl } from '@/lib/link-preview';

export const POST = handle(async (req) => {
  const me = await requireUser();
  rateLimit(`link:preview:${me.id}`, 40, 60 * 1000);

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const candidate = url.startsWith('http://') || url.startsWith('https://') ? url : extractFirstUrl(url);
  if (!candidate) return err('Provide a valid link', 400);

  try {
    const preview = await fetchLinkPreview(candidate);
    return json({ preview });
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Could not read this link', 422);
  }
});