import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const HUBS = new Set(['VIDEO', 'MUSIC']);

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseLinks(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n|,/)
      : [];
  return values.map((item) => clean(item, 240)).filter(Boolean).slice(0, 5);
}

function payload(application: any) {
  if (!application) return null;
  let links: string[] = [];
  try {
    const parsed = JSON.parse(application.links || '[]');
    if (Array.isArray(parsed)) links = parsed.filter((item) => typeof item === 'string');
  } catch {}
  return {
    id: application.id,
    hub: application.hub,
    channelName: application.channelName,
    handle: application.handle,
    bio: application.bio,
    category: application.category,
    links,
    status: application.status,
    reviewNote: application.reviewNote,
    createdAt: application.createdAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
  };
}

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const requestedHub = (new URL(req.url).searchParams.get('hub') ?? '').toUpperCase();
  const applications = await prisma.creatorApplication.findMany({
    where: { userId: me.id, ...(HUBS.has(requestedHub) ? { hub: requestedHub } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return json({ applications: applications.map(payload) });
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const hub = typeof body.hub === 'string' ? body.hub.toUpperCase() : '';
  const channelName = clean(body.channelName, 80);
  const handleName = clean(body.handle, 40).replace(/^@+/, '');
  const bio = clean(body.bio, 700);
  const category = clean(body.category, 80);
  const links = parseLinks(body.links);

  if (!HUBS.has(hub)) return err('Choose a valid creator hub');
  if (channelName.length < 2) return err('Channel name must be at least 2 characters');
  if (!/^[a-zA-Z0-9._-]{2,40}$/.test(handleName)) return err('Handle can use letters, numbers, dot, dash and underscore');
  if (bio.length > 700 || category.length > 80) return err('Creator information is too long');

  const existing = await prisma.creatorApplication.findUnique({
    where: { userId_hub: { userId: me.id, hub } },
  });
  if (existing?.status === 'APPROVED') return err('This creator profile is already approved', 409);

  const application = await prisma.creatorApplication.upsert({
    where: { userId_hub: { userId: me.id, hub } },
    create: {
      userId: me.id,
      hub,
      channelName,
      handle: handleName,
      bio,
      category,
      links: JSON.stringify(links),
    },
    update: {
      channelName,
      handle: handleName,
      bio,
      category,
      links: JSON.stringify(links),
      status: 'PENDING',
      reviewNote: '',
      reviewerId: null,
      reviewedAt: null,
    },
  });
  return json({ application: payload(application) }, 201);
});

export const PUT = handle(async (req: Request) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const hub = typeof body.hub === 'string' ? body.hub.toUpperCase() : '';
  const channelName = clean(body.channelName, 80);
  const handleName = clean(body.handle, 40).replace(/^@+/, '');
  const bio = clean(body.bio, 700);
  const category = clean(body.category, 80);
  const links = parseLinks(body.links);

  if (!HUBS.has(hub)) return err('Choose a valid creator hub');
  if (channelName.length < 2) return err('Channel name must be at least 2 characters');
  if (!/^[a-zA-Z0-9._-]{2,40}$/.test(handleName)) return err('Handle can use letters, numbers, dot, dash and underscore');

  const existing = await prisma.creatorApplication.findUnique({
    where: { userId_hub: { userId: me.id, hub } },
  });
  if (!existing || existing.status !== 'APPROVED') return err('An approved creator profile is required', 409);

  const application = await prisma.creatorApplication.update({
    where: { id: existing.id },
    data: { channelName, handle: handleName, bio, category, links: JSON.stringify(links) },
  });
  return json({ application: payload(application) });
});
