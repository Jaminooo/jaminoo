'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Compass, Globe2, ListVideo, MessageCircle, MessageSquare, UsersRound, Video } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { JamiMascot } from '@/components/jami-mascot';

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
  const [data, setData] = useState<IdentityData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<IdentityData>(`/api/users/${encodeURIComponent(userId)}/profile`)
      .then(setData)
      .catch(() => setError(true));
  }, [userId]);

  if (error) {
    return (
      <main className="moment-page">
        <JamiMascot state="404" size={170} />
        <h1>Profile not found</h1>
        <Link href="/">Back to Jamino</Link>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="moment-page">
        <JamiMascot state="wave" size={130} />
        <p>Opening identity…</p>
      </main>
    );
  }
  const user = data.user;
  const jamList = data.jamList || [];
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long' })
    : null;

  return (
    <main className="moment-page">
      <div className="moment-page-brand">
        <span className="wordmark-mark"><Globe2 size={15} /></span> Jamino identity
      </div>

      <section className="public-identity-card">
        <JaminoAvatar avatarId={user.avatarId} size={84} photo={user.avatarPhoto} name={user.username} />
        <div className="public-identity-copy">
          <span className="public-identity-kicker"><Globe2 size={12} /> PUBLIC PROFILE</span>
          <h1>@{user.username}</h1>
          <p>{user.bio || 'A Jamino member making space for good moments.'}</p>
          <span className="public-identity-status"><i /> {user.statusText || user.status}</span>
          {joined && <span className="public-identity-date"><CalendarDays size={12} /> Joined {joined}</span>}
        </div>
        <JamiMascot state="happy" size={92} />
      </section>

      <div className="public-identity-stats">
        <span><UsersRound size={15} /><b>{data.friendsCount}</b> friends</span>
        <span><MessageCircle size={15} /><b>{data.jamMsgCount}</b> room messages</span>
        <span><Globe2 size={15} /><b>{data.ownedJams}</b> worlds hosted</span>
        <span><Compass size={15} /><b>{data.jamMemberships}</b> worlds joined</span>
        <span><Video size={15} /><b>{data.videoPostCount}</b> videos</span>
        <span><MessageSquare size={15} /><b>{data.tweetCount}</b> posts</span>
        <span><ListVideo size={15} /><b>{data.playlistCount}</b> playlists</span>
      </div>

      {jamList.length > 0 && (
        <div className="public-identity-worlds">
          <span className="public-identity-worlds-title"><Compass size={13} /> Hosted worlds</span>
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

      <Link className="moment-back" href="/"><ArrowLeft size={14} /> Explore Jamino</Link>
    </main>
  );
}