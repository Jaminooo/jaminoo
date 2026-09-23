import { prisma } from '@/lib/prisma';
import { createSession, parseUserAgent } from '@/lib/session';
import { cookies } from 'next/headers';

// Google OAuth callback — exchanges the code for a token, reads the profile,
// then signs in (or creates) the matching Jamino account. Mirrors the GitHub
// flow: identity is matched only through the provider's stable id.
export const GET = async (req: Request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const c = await cookies();
  const storedState = c.get('jam_oauth_state')?.value;
  c.delete('jam_oauth_state');

  if (!clientId || !clientSecret || !code) {
    return Response.json({ ok: false, error: 'Google OAuth is not configured or the callback is missing a code.' }, { status: 400 });
  }
  if (!state || !storedState || state !== storedState) {
    return Response.json({ ok: false, error: 'Invalid OAuth state.' }, { status: 400 });
  }

  try {
    const redirect = googleRedirectUri();
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return Response.json({ ok: false, error: 'Google OAuth failed.' }, { status: 401 });

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const profile = (await userRes.json()) as { sub?: string; email?: string; name?: string };
    if (!profile.sub) return Response.json({ ok: false, error: 'Google identity could not be read.' }, { status: 401 });

    const googleLogin = profile.sub;
    let user = await prisma.user.findUnique({ where: { googleLogin } });
    if (!user) {
      const base = profile.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') || 'googler';
      let username = base.slice(0, 20) || 'googler';
      let n = 2;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${base.slice(0, 18)}${n++}`;
      }
      user = await prisma.user.create({
        data: {
          username,
          email: profile.email ?? '',
          google: true,
          googleLogin,
          avatarId: Math.floor(Math.random() * 12),
          bio: 'Signed in with Google',
        },
      });
    }
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return Response.json({ ok: false, error: 'This account is banned.' }, { status: 403 });
    }

    await createSession(user.id, parseUserAgent(req.headers.get('user-agent')));
    return new Response(null, {
      status: 303,
      headers: { Location: '/' },
    });
  } catch (e) {
    console.error('google callback error', e);
    return Response.json({ ok: false, error: 'Something went wrong during Google sign-in.' }, { status: 500 });
  }
};

function googleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    (process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/google`
      : '/api/auth/callback/google')
  );
}