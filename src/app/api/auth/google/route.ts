import { err } from '@/lib/api';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

// Google OAuth start — builds the consent URL and stashes a CSRF state cookie.
export const GET = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return err('Google OAuth is not configured on this server.', 501);
  const state = randomBytes(16).toString('hex');
  const c = await cookies();
  c.set('jam_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== '0',
    path: '/',
    maxAge: 600,
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', googleRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return new Response(null, {
    status: 303,
    headers: { Location: url.toString() },
  });
};

// Must match a redirect URI registered in the Google Cloud Console.
function googleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    (process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/google`
      : '/api/auth/callback/google')
  );
}