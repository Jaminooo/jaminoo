'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Compass, Globe2, ListVideo, MessageCircle, MessageSquare, UsersRound, Video } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { JamiMascot } from '@/components/jami-mascot';
import { useLocale, useTranslations } from '@/providers/use-translations';

interface IdentityData {
  user: {
    id: number;
    username: string;
    uid: string;
    avatarId: number;
    bio: string;
    github: boolean;
    status: string;
    statusText: string;
    createdAt?: string;
    avatarPhoto: string | null;
  };
  friendsCount: number;
  ownedJams: number;
  jamMsgCount: number;
  mutual: number;
  videoPostCount: number;
  tweetCount: number;
  playlistCount: number;
  jamMemberships: number;
  jamList: { id: string; name: string; kind: string; type: string; createdAt: string }[];
}

export function PublicIdentityView({ userId }: { userId: string }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const [data, setData] = useState<IdentityData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    api<IdentityData>(`/api/users/${encodeURIComponent(userId)}/profile`)
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [userId]);

  if (error) {
    return (
        <main className="moment-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
        <JamiMascot state="404" size={170} />
        <h1>{t('publicIdentity.notFound')}</h1>
        <Link href="/">{t('publicIdentity.back')}</Link>
      </main>
    );
  }
  if (!data) {
    return (
        <main className="moment-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
        <JamiMascot state="wave" size={130} />
        <p>{t('publicIdentity.opening')}</p>
      </main>
    );
  }
  const user = data.user;
  const jamList = data.jamList || [];
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'long' })
    : null;

  return (
    <main className="moment-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <div className="moment-page-brand">
        <span className="wordmark-mark"><Globe2 size={15} /></span> {t('publicIdentity.title')}
      </div>

      <section className="public-identity-card">
        <JaminoAvatar avatarId={user.avatarId} size={84} photo={user.avatarPhoto} name={user.username} />
        <div className="public-identity-copy">
          <span className="public-identity-kicker"><Globe2 size={12} /> {t('publicIdentity.kicker')}</span>
          <h1>@{user.username}</h1>
          <p>{user.bio || t('publicIdentity.fallbackBio')}</p>
          <span className="public-identity-status"><i /> {user.statusText || user.status}</span>
          {joined && <span className="public-identity-date"><CalendarDays size={12} /> {t('publicIdentity.joined', { date: joined })}</span>}
        </div>
        <JamiMascot state="happy" size={92} />
      </section>

      <div className="public-identity-stats">
        <span><UsersRound size={15} /><b>{data.friendsCount}</b> {t('publicIdentity.friends')}</span>
        <span><MessageCircle size={15} /><b>{data.jamMsgCount}</b> {t('publicIdentity.roomMessages')}</span>
        <span><Globe2 size={15} /><b>{data.ownedJams}</b> {t('publicIdentity.worldsHosted')}</span>
        <span><Compass size={15} /><b>{data.jamMemberships}</b> {t('publicIdentity.worldsJoined')}</span>
        <span><Video size={15} /><b>{data.videoPostCount}</b> {t('publicIdentity.videos')}</span>
        <span><MessageSquare size={15} /><b>{data.tweetCount}</b> {t('publicIdentity.posts')}</span>
        <span><ListVideo size={15} /><b>{data.playlistCount}</b> {t('publicIdentity.playlists')}</span>
      </div>

      {jamList.length > 0 && (
        <div className="public-identity-worlds">
        <span className="public-identity-worlds-title"><Compass size={13} /> {t('publicIdentity.hostedWorlds')}</span>
          <div className="public-identity-worlds-list">
            {jamList.map((j) => (
              <span key={j.id} className="public-identity-world-chip">
                <b>{j.kind || 'ROOM'}</b>
                <span>{j.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Link className="moment-back" href="/"><ArrowLeft size={14} /> {t('publicIdentity.explore')}</Link>
    </main>
  );
}
