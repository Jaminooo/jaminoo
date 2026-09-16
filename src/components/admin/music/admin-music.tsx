'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Music2, Disc3, Mic2, ListMusic, Star, PlayCircle } from 'lucide-react';
import { Badge, StatCard, LoadingRow, EmptyRow } from '../admin-ui';
import { AdminMusicSongs } from './music-songs';
import { AdminMusicArtists } from './music-artists';
import { AdminMusicAlbums } from './music-albums';
import { AdminMusicPlaylists } from './music-playlists';

type Sub = 'overview' | 'songs' | 'artists' | 'albums' | 'playlists';

const SUBS: { id: Sub; icon: typeof Music2; key: string }[] = [
  { id: 'overview', icon: Music2, key: 'admin.music.overview' },
  { id: 'songs', icon: PlayCircle, key: 'admin.music.songs' },
  { id: 'artists', icon: Mic2, key: 'admin.music.artists' },
  { id: 'albums', icon: Disc3, key: 'admin.music.albums' },
  { id: 'playlists', icon: ListMusic, key: 'admin.music.playlists' },
];

interface Details {
  stats: { songs: number; artists: number; albums: number; playlists: number; totalPlays: number };
  recent: { id: number; title: string; artist: string; plays: number; featured: boolean; createdAt: string }[];
}

export function AdminMusic() {
  const t = useTranslations();
  const [sub, setSub] = useState<Sub>('overview');
  const [d, setD] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api<Details>('/api/admin/music')
      .then(setD)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="admin-music-root">
      <div className="admin-subnav">
        {SUBS.map(({ id, icon: Icon, key }) => (
          <button key={id} className={`admin-subnav-item ${sub === id ? 'active' : ''}`} onClick={() => setSub(id)}>
            <Icon size={16} />
            {t(key)}
          </button>
        ))}
      </div>

      {sub === 'overview' && (
        <div className="admin-music-overview">
          <div className="admin-stats-grid admin-stats-grid-5">
            <StatCard icon={<Music2 size={16} />} label={t('admin.music.songs')} value={d?.stats.songs ?? '—'} tone="violet" />
            <StatCard icon={<Mic2 size={16} />} label={t('admin.music.artists')} value={d?.stats.artists ?? '—'} tone="amber" />
            <StatCard icon={<Disc3 size={16} />} label={t('admin.music.albums')} value={d?.stats.albums ?? '—'} tone="green" />
            <StatCard icon={<ListMusic size={16} />} label={t('admin.music.playlists')} value={d?.stats.playlists ?? '—'} tone="steel" />
            <StatCard icon={<PlayCircle size={16} />} label={t('admin.music.totalPlays')} value={d?.stats.totalPlays ?? '—'} tone="red" />
          </div>

          <div className="admin-card">
            <div className="admin-card-head">
              <h3>{t('admin.music.recentlyAdded')}</h3>
              <Badge tone="green">{t('admin.music.library')}</Badge>
            </div>
            {loading ? (
              <div className="admin-loading-pad"><span className="admin-loader" /></div>
            ) : !d?.recent.length ? (
              <EmptyRow text={t('admin.music.noSongs')} />
            ) : (
              <table className="admin-table">
                <tbody>
                  {d!.recent.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.title}</b> <span className="admin-dim">{s.artist}</span></td>
                      <td className="admin-num">{s.plays} plays</td>
                      <td>{s.featured ? <Star size={14} className="star-on" /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="admin-hint-card">
            <p>{t('admin.music.hint')}</p>
          </div>
        </div>
      )}

      {sub === 'songs' && !loading && <AdminMusicSongs />}
      {sub === 'artists' && !loading && <AdminMusicArtists />}
      {sub === 'albums' && !loading && <AdminMusicAlbums />}
      {sub === 'playlists' && !loading && <AdminMusicPlaylists />}
    </div>
  );
}