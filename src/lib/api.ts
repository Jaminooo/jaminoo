import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { RateLimitError } from '@/lib/rate-limit';
import { ensureAdmins } from '@/lib/admin';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function ok(data: unknown) {
  return json(data);
}

export function err(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin() {
  await ensureAdmins();
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (!user.isAdmin) {
    const e = new Error('Admin only');
    (e as any).adminOnly = true;
    throw e;
  }
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthorizedError';
  }
}

export function forbidden(message = 'Forbidden') {
  const e = new Error(message);
  (e as any).adminOnly = true;
  return e;
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const self = new URL(req.url).origin;
  if (origin === self) return true;
  const pub = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (pub) {
    try {
      if (origin === new URL(pub).origin) return true;
    } catch {}
  }
  return false;
}

const UNLESS_GET = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function handle<P extends Record<string, string>>(
  fn: (req: Request, ctx: { params: P }) => Promise<Response>
) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const method = req.method.toUpperCase();
      if (UNLESS_GET.includes(method) && !originAllowed(req)) return err('Forbidden', 403);
      return await fn(req, { params: await ctx.params });
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return err('Not signed in', 401);
      }
      if (e instanceof BadRequestError) {
        return err(e.message, 400);
      }
      if (e instanceof RateLimitError) {
        return err(e.message, 429);
      }
      if ((e as any)?.adminOnly) {
        return err('Forbidden', 403);
      }
      console.error(e);
      return err('Something went wrong', 500);
    }
  };
}