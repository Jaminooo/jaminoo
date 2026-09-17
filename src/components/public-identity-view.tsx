'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe2, MessageCircle, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { JamiMascot } from '@/components/jami-mascot';

export function PublicIdentityView({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => { api<{ user: any; friendsCount: number; ownedJams: number; jamMsgCount: number }>(`/api/users/${encodeURIComponent(userId)}/profile`).then(setData).catch(() => setError(true)); }, [userId]);
  if (error) return <main className="moment-page"><JamiMascot state="404" size={170} /><h1>Profile not found</h1><Link href="/">Back to Jamino</Link></main>;
  if (!data) return <main className="moment-page"><JamiMascot state="wave" size={130} /><p>Opening identity…</p></main>;
  const user = data.user;
  return <main className="moment-page"><div className="moment-page-brand"><span className="wordmark-mark"><Globe2 size={15} /></span> Jamino identity</div><section className="public-identity-card"><JaminoAvatar avatarId={user.avatarId} size={84} photo={user.avatarPhoto} name={user.username} /><div className="public-identity-copy"><span className="public-identity-kicker"><Globe2 size={12} /> PUBLIC PROFILE</span><h1>@{user.username}</h1><p>{user.bio || 'A Jamino member making space for good moments.'}</p><span className="public-identity-status"><i /> {user.statusText || user.status}</span></div><JamiMascot state="happy" size={92} /></section><div className="public-identity-stats"><span><UsersRound size={15} /><b>{data.friendsCount}</b> friends</span><span><MessageCircle size={15} /><b>{data.jamMsgCount}</b> room messages</span><span><Globe2 size={15} /><b>{data.ownedJams}</b> worlds hosted</span></div><Link className="moment-back" href="/"><ArrowLeft size={14} /> Explore Jamino</Link></main>;
}
