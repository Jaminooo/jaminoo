'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Copy, LockKeyhole, Music2, Radio, Sparkles, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { TopRightControls } from '@/components/top-controls';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { fallbackCover } from '@/lib/music-catalog';

type Preview = {
  id: string;
  name: string;
  desc: string;
  type: 'PUBLIC' | 'PRIVATE';
  kind: string;
  closed: boolean;
  members: number;
  owner: { username: string; avatarId: number; profilePhotoId: string | null };
  now: { id: number; title: string; artist: string; coverUrl: string | null } | null;
};

type AuthInfo = { user: { id: number; username: string; isGuest?: boolean } } | null;

export default function JoinJamPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations();
  const router = useRouter();
  const setRoomId = useAppStore((s) => s.setRoomId);
  const [jamId, setJamId] = useState('');
  const [state, setState] = useState('loading');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [auth, setAuth] = useState<AuthInfo>(null);
  const [errMsg, setErrMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const ran = useRef(false);
  const authRef = useRef<AuthInfo>(null);
  const autoJoinedRef = useRef(false);

  const load = async () => {
    setState('loading');
    setErrMsg('');
    try {
      const [p, u] = await Promise.all([
        api<{ jam: Preview }>(`/api/jams/${jamId}/preview`).then((d) => d.jam),
        api<AuthInfo>('/api/auth').catch(() => null),
      ]);
      setPreview(p);
      setAuth(u);
      authRef.current = u;
      setState('ready');
    } catch (err) {
      setState('error');
      setErrMsg(err instanceof Error ? err.message : '');
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void params.then((p) => setJamId(p.id));
  }, [params]);

  useEffect(() => {
    if (jamId) void load();
  }, [jamId]);

  useEffect(() => {
    // Signed-in (non-guest) users enter the jam directly — no extra click needed.
    if (state !== 'ready' || !preview) return;
    if (!auth?.user || auth.user.isGuest) return;
    if (preview.closed) return;
    if (preview.type === 'PRIVATE' && !auth?.user) return;
    if (autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    void openAsMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, preview, auth]);

  const openAsMember = async () => {
    if (!jamId || joining) return;
    setJoining(true);
    setErrMsg('');
    try {
      await api(`/api/jams/${jamId}/join`, { method: 'POST' });
      enterRoom();
    } catch (err) {
      setState('error');
      setErrMsg(err instanceof Error ? err.message : '');
      setJoining(false);
    }
  };

  const joinAsGuest = async () => {
    if (!jamId || joining) return;
    const clean = name.trim();
    if (clean.length < 2) return;
    setJoining(true);
    setErrMsg('');
    try {
      await api(`/api/jams/${jamId}/guest`, { method: 'POST', body: JSON.stringify({ name: clean }) });
      enterRoom();
    } catch (err) {
      setState('error');
      setErrMsg(err instanceof Error ? err.message : '');
      setJoining(false);
    }
  };

  const enterRoom = () => {
    useAppStore.getState().setProduct('community');
    setRoomId(jamId);
    setState('joined');
    window.setTimeout(() => router.push('/'), 600);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const signedIn = !!auth?.user;
  const isGuestUser = !!auth?.user?.isGuest;
  const showGuestForm = !signedIn || isGuestUser;
  const privateBlocked = preview?.type === 'PRIVATE' && !signedIn;
  const coverUrl = preview?.now?.coverUrl || fallbackCover(preview ? preview.members + 3 : 1);

  return (
    <main className="join-page">
      <div className="join-ambient join-ambient-one" />
      <div className="join-ambient join-ambient-two" />
      <TopRightControls />
      <header className="join-header">
        <button type="button" className="join-brand" onClick={() => router.push('/')}>
          <span className="wordmark-mark"><Radio size={16} /></span><b>Jamino</b>
        </button>
        <button type="button" className="join-back" onClick={() => router.push('/')}><ArrowLeft size={15} /> {t('join.back')}</button>
      </header>

      <section className="join-layout">
        <div className="join-intro">
          <span className="join-kind-icon"><Music2 size={27} /></span>
          <div className="join-overline">{t('join.preview')}</div>
          <h1>{preview?.name || t('join.loading')}</h1>
          <p className="join-description">{preview?.desc || t('join.loadingHint')}</p>
          {preview && (
            <>
              <div className="join-meta-row">
                <span><UsersRound size={15} /> {t('join.members', { count: preview.members })}</span>
                <span><Music2 size={15} /> {t('join.music')}</span>
                <span>{preview.type === 'PRIVATE' ? <LockKeyhole size={15} /> : <Radio size={15} />} {preview.type === 'PRIVATE' ? t('join.private') : t('join.public')}</span>
              </div>
              <div className="join-now-playing">
                <div className="join-cover"><img src={coverUrl} alt="" loading="lazy" /></div>
                <span>
                  <small>{preview.now ? t('jams.nowPlaying') : t('jams.waitingForDJ')}</small>
                  <b>{preview.now?.title ?? ''}</b>
                  <em>{preview.now?.artist ?? ''}</em>
                </span>
              </div>
            </>
          )}
          <div className="join-host">
            {preview && <JaminoAvatar avatarId={preview.owner.avatarId} size={38} photo={preview.owner.profilePhotoId} name={preview.owner.username} />}
            <span><small>{t('join.hostedBy', { name: preview?.owner.username || 'Jamino' })}</small><b>{t('join.ready')}</b></span>
          </div>
          <div className="join-safe"><CheckCircle2 size={16} /><span>{t('join.safe')}</span></div>
        </div>

        <div className="join-action-card">
          {state === 'loading' && (
            <div className="join-state">
              <span className="join-spinner" />
              <h2>{t('join.loading')}</h2>
              <p>{t('join.loadingHint')}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="join-state">
              <div className="join-state-icon error"><AlertCircle size={24} /></div>
              <h2>{preview ? t('join.failed') : t('join.notFound')}</h2>
              <p>{errMsg}</p>
              <button type="button" className="btn btn-violet join-primary-action" onClick={load}>{t('join.retry')}</button>
            </div>
          )}

          {state === 'joined' && (
            <div className="join-state">
              <div className="join-state-icon success"><CheckCircle2 size={24} /></div>
              <h2>{t('join.joined')}</h2>
              <p>{t('join.opening')}</p>
            </div>
          )}

          {state === 'ready' && preview && (
            <>
              {preview.closed ? (
                <div className="join-state">
                  <div className="join-state-icon error"><Sparkles size={24} /></div>
                  <h2>{t('join.closed')}</h2>
                  <p>{t('join.notFound')}</p>
                  <button type="button" className="btn btn-ghost join-primary-action" onClick={() => router.push('/')}>{t('join.goHome')}</button>
                </div>
              ) : privateBlocked ? (
                <div className="join-state">
                  <div className="join-state-icon error"><LockKeyhole size={24} /></div>
                  <h2>{t('join.signIn')}</h2>
                  <p>{t('join.signInHint')}</p>
                  <button type="button" className="btn btn-violet join-primary-action" onClick={() => router.push('/')}>{t('join.signIn')}</button>
                </div>
              ) : showGuestForm ? (
                <div className="join-state">
                  <div className="join-state-icon"><Music2 size={24} /></div>
                  <h2>{t('join.guestTitle')}</h2>
                  <p>{t('join.guestHint')}</p>
                  {isGuestUser && (
                    <button type="button" className="btn btn-violet join-primary-action" onClick={openAsMember} disabled={joining}>
                      {t('join.openSet')}
                    </button>
                  )}
                  {!isGuestUser && (
                    <>
                      <input
                        className="auth-input join-guest-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 2 && void joinAsGuest()}
                        placeholder={t('join.guestName')}
                        maxLength={20}
                        autoFocus
                      />
                      <button type="button" className="btn btn-violet join-primary-action" onClick={joinAsGuest} disabled={joining || name.trim().length < 2}>
                        {joining ? t('join.guestJoining') : t('join.guestJoin')}
                      </button>
                      <button type="button" className="btn btn-ghost join-secondary-action" onClick={() => router.push('/')}>{t('join.signIn')}</button>
                    </>
                  )}
                </div>
              ) : (
                <div className="join-state">
                  <div className="join-state-icon success"><CheckCircle2 size={24} /></div>
                  <h2>{t('join.ready')}</h2>
                  <p>{t('join.inviteOnly')}</p>
                  <button type="button" className="btn btn-violet join-primary-action" onClick={openAsMember} disabled={joining}>
                    {joining ? t('join.guestJoining') : t('join.joinNow')}
                  </button>
                  <span className="join-as-mine">@{auth.user.username}</span>
                </div>
              )}
            </>
          )}

          {preview && !preview.closed && (
            <div className="join-card-footer">
              <button type="button" onClick={copyLink}><Copy size={13} /> {copied ? t('join.copied') : t('join.copyLink')}</button>
              {preview.now && <span>{t('jams.nowPlaying')}</span>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}