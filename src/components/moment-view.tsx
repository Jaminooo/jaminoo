'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe2, Link2, Sparkles, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JamiMascot } from '@/components/jami-mascot';

export function MomentView({ momentId }: { momentId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => { api<{ moment: any }>(`/api/moments/${encodeURIComponent(momentId)}`).then((result) => setData(result.moment)).catch(() => setError(true)); }, [momentId]);
  if (error) return <main className="moment-page"><JamiMascot state="404" size={170} /><h1>Moment not found</h1><Link href="/">Back to Jamino</Link></main>;
  if (!data) return <main className="moment-page"><JamiMascot state="wave" size={130} /><p>Opening this moment…</p></main>;
  return <main className="moment-page"><div className="moment-page-glow" /><div className="moment-page-brand"><span className="wordmark-mark"><Sparkles size={15} /></span> Jamino</div><section className="moment-card"><div className="moment-card-kicker"><Globe2 size={13} /> LIVE MOMENT · {data.jam.kind}</div><h1>{data.title}</h1><p>{data.note || data.jam.desc || 'A shared moment from Jamino.'}</p><div className="moment-card-meta"><span><UsersRound size={14} /> {data.snapshot?.memberCount ?? 0} people inside</span><span>@{data.user.username}</span><span>{new Date(data.createdAt).toLocaleString()}</span></div><div className="moment-card-actions"><Link className="btn btn-violet" href={`/join/${data.jam.id}`}><UsersRound size={15} /> Join this world</Link><button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(window.location.href)}><Link2 size={15} /> Copy link</button></div></section><Link className="moment-back" href="/"><ArrowLeft size={14} /> Explore Jamino</Link></main>;
}
