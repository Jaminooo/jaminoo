import { json, err } from '@/lib/api';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export const GET = async () => {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) return err('GitHub OAuth is not configured on this server.', 501);
  const state = randomBytes(16).toString('hex');
  const c = await cookies();
  c.set('jam_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== '0',
    path: '/',
    maxAge: 600,
  });
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  const redirect =
    process.env.GITHUB_REDIRECT_URI?.trim() ||
    (process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/github/callback` : '/api/auth/github/callback');
  url.searchParams.set('redirect_uri', redirect);
  return new Response(null, {
    status: 303,
    headers: { Location: url.toString() },
  });
};