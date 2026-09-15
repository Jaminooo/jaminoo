import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

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

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthorizedError';
  }
}

export function handle<P extends Record<string, string>>(
  fn: (req: Request, ctx: { params: P }) => Promise<Response>
) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      return await fn(req, { params: await ctx.params });
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return err('Not signed in', 401);
      }
      console.error(e);
      return err(e instanceof Error ? e.message : 'Something went wrong', 500);
    }
  };
}