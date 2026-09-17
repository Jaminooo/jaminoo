'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Headphones, Loader2, PlaySquare, Radio, RefreshCw, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useAppStore } from '@/store/app-store';

interface NowPayload {
  friends: { id: number; username: string; avatarId: number; avatarPhoto: string | null; status: string; statusText: string }[];
  jams: { id: string; name: string; kind: string; desc: string; members: number; owner: { username: string; avatarId: number; avatarPhoto: string | null } }[];
  posts: { id: number; title: string; description: string; kind: string; author: { id: number; username: string; avatarId: number; avatarPhoto: string | null }; likes: number; comments: number }[];
  songs: { id: number; title: string; artist: { name: string } | null; coverUrl: string | null; plays: number }[];
}

export function NowFeed() {
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const setRoomId = useAppStore((state) => state.setRoomId);
  const [data, setData] = useState<NowPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<NowPayload>('/api/now').then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openJam = (id: string) => {
    setProduct('community');
    setTab('jams');
    setRoomId(id);
  };

  return (
    <section className="now-feed">
      <header className="now-feed-head">
        <div><div className="hub-kicker"><span className="landing-pulse" /> NOW FEED</div><h2>What is happening now?</h2><p>Jump into a live room, follow the energy or continue a sound your people are playing.</p></div>
        <button type="button" className="btn btn-ghost pill-sm" onClick={load} disabled={loading}>{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh</button>
      </header>
      {loading && !data ? <div className="now-feed-loading"><Loader2 size={18} className="spin" /> Loading your live map…</div> : <div className="now-feed-grid">
        <article className="now-feed-card now-feed-people"><div className="now-feed-card-head"><span className="now-feed-icon"><UsersRound size={16} /></span><div><b>Your people</b><small>{data?.friends.length ?? 0} active friends</small></div></div>{data?.friends.length ? <div className="now-people-row">{data.friends.slice(0, 6).map((friend) => <button key={friend.id} type="button" className="now-person" onClick={() => { setProduct('community'); setTab('friends'); }}><JaminoAvatar avatarId={friend.avatarId} size={34} photo={friend.avatarPhoto} name={friend.username} /><span>@{friend.username}</span><i /></button>)}</div> : <p className="now-empty">Your friends will appear here when they are around.</p>}</article>
        <article className="now-feed-card now-feed-rooms"><div className="now-feed-card-head"><span className="now-feed-icon violet"><Radio size={16} /></span><div><b>Live rooms</b><small>{data?.jams.length ?? 0} public spaces</small></div></div>{data?.jams.length ? <div className="now-room-list">{data.jams.slice(0, 3).map((jam) => <button key={jam.id} type="button" className="now-room-row" onClick={() => openJam(jam.id)}><span><strong>{jam.name}</strong><small>{jam.owner.username} · {jam.members} inside</small></span><span className="now-kind">{jam.kind}</span></button>)}</div> : <p className="now-empty">No open room yet. Create the first one.</p>}</article>
        <article className="now-feed-card now-feed-sound"><div className="now-feed-card-head"><span className="now-feed-icon pink"><Headphones size={16} /></span><div><b>Sound of the moment</b><small>Most played in the network</small></div></div>{data?.songs.slice(0, 3).map((song) => <button key={song.id} type="button" className="now-song-row" onClick={() => setProduct('music')}><span className="now-song-cover">{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <Headphones size={14} />}</span><span><strong>{song.title}</strong><small>{song.artist?.name ?? 'Unknown artist'} · {song.plays} plays</small></span></button>)}</article>
        <article className="now-feed-card now-feed-posts"><div className="now-feed-card-head"><span className="now-feed-icon blue"><PlaySquare size={16} /></span><div><b>Fresh from creators</b><small>Latest posts from Video Hub</small></div></div>{data?.posts.slice(0, 3).map((post) => <button key={post.id} type="button" className="now-post-row" onClick={() => setProduct('video')}><span><strong>{post.title || post.description || 'New creator post'}</strong><small>@{post.author.username} · {post.likes} likes · {post.comments} comments</small></span><span>{post.kind}</span></button>)}</article>
      </div>}
      <div className="now-feed-footer"><Activity size={14} /> One connected account, live services and rooms.</div>
    </section>
  );
}
