import { prisma } from '@/lib/prisma';
import { createSession, parseUserAgent } from '@/lib/session';
import { uidDisplay } from '@/lib/constants';

// GitHub OAuth callback — exchanges the code for an access token,
// then signs in (or creates) the matching Jamino account.
export const GET = async (req: Request) => {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!clientId || !clientSecret || !code) {
    return Response.json({ ok: false, error: 'GitHub OAuth is not configured or the callback is missing a code.' }, { status: 400 });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return Response.json({ ok: false, error: 'GitHub OAuth failed.' }, { status: 401 });

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const gh = (await userRes.json()) as { id: number; login: string; email?: string };
    if (!gh.id) return Response.json({ ok: false, error: 'GitHub identity could not be read.' }, { status: 401 });

    const ghLogin = String(gh.id);
    let user = await prisma.user.findUnique({ where: { githubLogin: ghLogin } });
    if (!user) {
      let username = gh.login?.replace(/[^a-zA-Z0-9_]/g, '') || 'githero';
      let n = 2;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${username}${n++}`;
      }
      user = await prisma.user.create({
        data: {
          username,
          email: gh.email ?? '',
          github: true,
          githubLogin: ghLogin,
          avatarId: Math.floor(Math.random() * 12),
          bio: 'Signed in with GitHub',
        },
      });
    }

    await createSession(user.id, parseUserAgent(req.headers.get('user-agent')));
    return new Response(null, {
      status: 303,
      headers: { Location: '/' },
    });
  } catch (e) {
    console.error('github callback error', e);
    return Response.json({ ok: false, error: 'Something went wrong during GitHub sign-in.' }, { status: 500 });
  }
};