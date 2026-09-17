const buckets = new Map<string, number[]>();

export class RateLimitError extends Error {
  constructor(message = 'Too many attempts, please slow down') {
    super(message);
    this.name = 'RateLimitError';
  }
}

const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    if (buckets.size > MAX_KEYS) prune();
    throw new RateLimitError();
  }
  arr.push(now);
  buckets.set(key, arr);
}

export function rateLimitByIp(req: Request, limit: number, windowMs: number) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return rateLimit(`ip:${ip}`, limit, windowMs);
}

export function rateLimitByUser(req: Request, userId: unknown, limit: number, windowMs: number) {
  return rateLimit(`user:${String(userId)}`, limit, windowMs);
}

export function clearRateLimits() {
  buckets.clear();
}

function prune() {
  const now = Date.now();
  for (const [k, v] of buckets) {
    const fresh = v.filter((t) => now - t < 5 * 60 * 1000);
    if (fresh.length === 0) buckets.delete(k);
    else if (fresh.length !== v.length) buckets.set(k, fresh);
  }
}