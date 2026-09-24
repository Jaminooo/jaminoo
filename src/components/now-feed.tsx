'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Headphones, Loader2, PlaySquare, Radio, RefreshCw, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { WorkspaceErrorState } from '@/components/workspace-feedback';

interface NowPayload {
  friends: { id: number; username: string; avatarId: number; avatarPhoto: string | null; status: string; statusText: string }[];
  jams: { id: string; name: string; kind: string; desc: string; members: number; owner: { username: string; avatarId: number; avatarPhoto: string | null } }[];
  posts: { id: number; title: string; description: string; kind: string; author: { id: number; username: string; avatarId: number; avatarPhoto: string | null }; likes: number; comments: number }[];
  songs: { id: number; title: string; artist: { name: string } | null; coverUrl: string | null; plays: number }[];
}

const kindLabel = (t: (key: string) => string, kind: string) => t(`jams.kind${kind.charAt(0)}${kind.slice(1).toLowerCase()}`);

export function NowFeed() {
  const t = useTranslations();
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const setRoomId = useAppStore((state) => state.setRoomId);
  const [data, setData] = useState<NowPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setData(await api<NowPayload>('/api/now'));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
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
        <div>
          <div className="ch-kicker">{t('feed.kicker')}</div>
          <h2 className="pane-title">{t('feed.title')}</h2>
          <p className="pane-sub">{t('feed.subtitle')}</p>
        </div>
        <button type="button" className="btn btn-violet pill-sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {t('feed.refresh')}
        </button>
      </header>
      {loading && !data ? (
        <div className="now-feed-loading"><Loader2 size={18} className="spin" /> {t('feed.loading')}</div>
      ) : loadError && !data ? (
        <WorkspaceErrorState message={t('feed.loadError')} retryLabel={t('admin.refresh')} onRetry={() => void load()} />
      ) : (
        <>
        {loadError && <WorkspaceErrorState message={t('feed.loadError')} retryLabel={t('admin.refresh')} onRetry={() => void load()} />}
        <div className="now-feed-grid">
          <article className="now-feed-card now-feed-people">
            <div className="now-feed-card-head">
              <span className="now-feed-icon"><UsersRound size={16} /></span>
              <div><b>{t('feed.peopleTitle')}</b><small>{t('feed.peopleSub', { n: data?.friends.length ?? 0 })}</small></div>
            </div>
            {data?.friends.length ? (
              <div className="now-people-row">
                {data.friends.slice(0, 6).map((friend) => (
                  <button key={friend.id} type="button" className="now-person" onClick={() => { setProduct('community'); setTab('friends'); }}>
                    <JaminoAvatar avatarId={friend.avatarId} size={34} photo={friend.avatarPhoto} name={friend.username} />
                    <span>@{friend.username}</span>
                    <i />
                  </button>
                ))}
              </div>
            ) : (
              <p className="now-empty">{t('feed.peopleEmpty')}</p>
            )}
          </article>

          <article className="now-feed-card now-feed-rooms">
            <div className="now-feed-card-head">
              <span className="now-feed-icon violet"><Radio size={16} /></span>
              <div><b>{t('feed.roomsTitle')}</b><small>{t('feed.roomsSub', { n: data?.jams.length ?? 0 })}</small></div>
            </div>
            {data?.jams.length ? (
              <div className="now-room-list">
                {data.jams.slice(0, 3).map((jam) => (
                  <button key={jam.id} type="button" className="now-room-row" onClick={() => openJam(jam.id)}>
                    <span><strong>{jam.name}</strong><small>{jam.owner.username} · {t('feed.inside', { n: jam.members })}</small></span>
                    <span className="now-kind">{kindLabel(t, jam.kind)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="now-empty">{t('feed.roomsEmpty')}</p>
            )}
          </article>

          <article className="now-feed-card now-feed-sound">
            <div className="now-feed-card-head">
              <span className="now-feed-icon pink"><Headphones size={16} /></span>
              <div><b>{t('feed.soundTitle')}</b><small>{t('feed.soundSub')}</small></div>
            </div>
            {data?.songs.length ? (
              data.songs.slice(0, 3).map((song) => (
                <button key={song.id} type="button" className="now-song-row" onClick={() => setProduct('music')}>
                  <span className="now-song-cover">{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <Headphones size={14} />}</span>
                  <span><strong>{song.title}</strong><small>{song.artist?.name ?? t('feed.unknownArtist')} · {t('feed.plays', { n: song.plays })}</small></span>
                </button>
              ))
            ) : (
              <p className="now-empty">{t('feed.soundEmpty')}</p>
            )}
          </article>

          <article className="now-feed-card now-feed-posts">
            <div className="now-feed-card-head">
              <span className="now-feed-icon blue"><PlaySquare size={16} /></span>
              <div><b>{t('feed.postsTitle')}</b><small>{t('feed.postsSub')}</small></div>
            </div>
            {data?.posts.length ? (
              data.posts.slice(0, 3).map((post) => (
                <button key={post.id} type="button" className="now-post-row" onClick={() => setProduct('video')}>
                  <span><strong>{post.title || post.description || t('feed.newPost')}</strong><small>@{post.author.username} · {t('feed.likes', { n: post.likes })} · {t('feed.comments', { n: post.comments })}</small></span>
                  <span>{post.kind}</span>
                </button>
              ))
            ) : (
              <p className="now-empty">{t('feed.postsEmpty')}</p>
            )}
          </article>
        </div>
        </>
      )}
      <div className="now-feed-footer"><Activity size={14} /> {t('feed.footer')}</div>
    </section>
  );
}
