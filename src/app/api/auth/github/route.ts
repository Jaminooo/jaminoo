import { json, err } from '@/lib/api';

export const GET = async () => {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) return err('GitHub OAuth is not configured on this server.', 501);
  const state = Math.random().toString(36).slice(2);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/github/callback` : '/api/auth/github/callback');
  return new Response(null, {
    status: 303,
    headers: { Location: url.toString() },
  });
};