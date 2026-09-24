'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Disc3, ListMusic, Music2, Play, Sparkles } from 'lucide-react';
import { api } from '@/lib/client-api';
import { artistLabel, type MusicSong } from '@/components/music-player';
import { useTranslations } from '@/providers/use-translations';

export interface MusicArtistCard {
  id: number;
  name: string;
  coverUrl: string | null;
  bio: string;
  country: string;
  genres: string[];
  debutYear: number;
  songCount: number;
  albumCount: number;
}

export interface MusicAlbumCard {
  id: number;
  title: string;
  artist: { id: number; name: string } | null;
  year: number;
  type: string;
  label?: string;
  desc?: string;
  coverUrl: string | null;
  songCount: number;
}

export interface MusicPublicPlaylist {
  id: number;
  name: string;
  desc: string;
  coverUrl: string | null;
  featured: boolean;
  source?: 'curated' | 'community';
  owner?: { id: number; username: string };
  items: { id: number; pos: number; song: MusicSong }[];
}

type BrowseKind = 'artists' | 'albums' | 'singles' | 'playlists';
type Detail = { kind: 'artist' | 'album' | 'song' | 'playlist'; id: number } | null;

interface Props {
  kind: BrowseKind;
  artists: MusicArtistCard[];
  albums: MusicAlbumCard[];
  singles: MusicSong[];
  playlists: MusicPublicPlaylist[];
  activeSongId: number | null;
  playing: boolean;
  onPlay: (song: MusicSong) => void;
}

function Cover({ src, alt }: { src: string | null; alt: string }) {
  return src ? <img className="music-catalog-cover" src={src} alt={alt} loading="lazy" /> : <span className="music-catalog-cover music-catalog-cover-empty"><Music2 size={22} /></span>;
}

function MiniSong({ song, activeSongId, playing, onPlay, onOpen }: { song: MusicSong; activeSongId: number | null; playing: boolean; onPlay: (song: MusicSong) => void; onOpen?: () => void }) {
  const t = useTranslations();
  const active = activeSongId === song.id;
  return <div className={`music-catalog-track ${active ? 'active' : ''}`}><button type="button" className="music-catalog-track-play" onClick={() => onPlay(song)} aria-label={t('musicHub.playSong', { title: song.title })}>{active && playing ? <span className="music-catalog-bars"><i /><i /><i /></span> : <Play size={13} />}</button><button type="button" className="music-catalog-track-info" onClick={() => onOpen?.()}><span><b>{song.title}</b><small>{artistLabel(song) || t('musicHub.unknownArtist')}</small></span></button><em>{song.plays ? t('musicHub.plays', { n: song.plays.toLocaleString() }) : t('musicHub.single')}</em><button type="button" className="music-catalog-track-detail" onClick={() => onOpen?.()} aria-label={t('musicHub.openSong', { title: song.title })}><Disc3 size={13} /></button></div>;
}

function BrowseHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  const t = useTranslations();
  return <div className="music-catalog-heading"><div><div className="hub-kicker">{t('musicHub.catalogLabel')}</div><h2>{title}</h2><p>{subtitle}</p></div><span className="music-catalog-count">{count} {t('musicHub.items')}</span></div>;
}

export function MusicCatalogSections({ kind, artists, albums, singles, playlists, activeSongId, playing, onPlay }: Props) {
  const t = useTranslations();
  const [detail, setDetail] = useState<Detail>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detail) {
      setDetailData(null);
      setLoading(false);
      return;
    }
    if (detail.kind === 'playlist') {
      setDetailData({ playlist: playlists.find((item) => item.id === detail.id) ?? null });
      setLoading(false);
      return;
    }
    setLoading(true);
    setDetailData(null);
    const endpoint = detail.kind === 'artist' ? 'artists' : detail.kind === 'album' ? 'albums' : 'songs';
    let cancelled = false;
    api(`/api/music/${endpoint}/${detail.id}`)
      .then((data) => { if (!cancelled) setDetailData(data); })
      .catch(() => { if (!cancelled) setDetailData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [detail, playlists]);

  if (detail) {
    const subject = detailData?.artist ?? detailData?.album ?? detailData?.song ?? detailData?.playlist;
    const songs: MusicSong[] = detailData?.songs ?? (detail.kind === 'song' && detailData?.song ? [detailData.song] : detailData?.playlist?.items?.map((item: any) => item.song) ?? []);
    if (loading || !subject) return <section className="music-catalog-detail"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setDetail(null)}><ArrowLeft size={14} /> {t('musicHub.backToCatalog')}</button><div className="music-hub-empty"><Sparkles size={22} /><span>{loading ? t('musicHub.loadingPage') : t('musicHub.unavailablePage')}</span></div></section>;
    const pageLabel = detail.kind === 'artist' ? t('musicHub.artistPage') : detail.kind === 'album' ? t('musicHub.albumPage') : detail.kind === 'song' ? t('musicHub.songPage') : t('musicHub.playlistPage');
    return <section className="music-catalog-detail"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setDetail(null)}><ArrowLeft size={14} /> {t('musicHub.backToCatalog')}</button><div className="music-catalog-detail-hero"><Cover src={subject.coverUrl} alt={subject.name ?? subject.title} /><div><div className="hub-kicker">{pageLabel}</div><h2>{subject.name ?? subject.title}</h2><p>{subject.bio ?? subject.desc ?? (subject.artist ? t('musicHub.byArtist', { name: subject.artist.name }) : t('musicHub.musicRelease'))}</p><div className="music-catalog-tags">{subject.genres?.map((genre: string) => <span key={genre}>{genre}</span>)}{subject.type && <span>{subject.type}</span>}{subject.country && <span>{subject.country}</span>}</div></div></div><div className="music-catalog-detail-grid"><div><div className="music-hub-section-head"><h3>{t('musicHub.tracks')}</h3><span className="music-catalog-muted">{t('musicHub.trackCount', { n: songs.length })}</span></div><div className="music-catalog-track-list">{songs.length ? songs.map((song) => <MiniSong key={song.id} song={song} activeSongId={activeSongId} playing={playing} onPlay={onPlay} onOpen={() => setDetail({ kind: 'song', id: song.id })} />) : <div className="music-hub-empty"><Music2 size={20} /><span>{t('musicHub.noTracksPublished')}</span></div>}</div></div>{detail.kind === 'artist' && <div className="music-catalog-related"><div className="music-hub-section-head"><h3>{t('musicNav.albums')}</h3></div><div className="music-catalog-mini-grid">{(detailData.albums ?? []).map((album: MusicAlbumCard) => <button type="button" className="music-catalog-mini-card" key={album.id} onClick={() => setDetail({ kind: 'album', id: album.id })}><Cover src={album.coverUrl} alt={album.title} /><span><b>{album.title}</b><small>{album.year || t('musicHub.release')} · {t('musicHub.trackCount', { n: album.songCount ?? 0 })}</small></span></button>)}</div></div>}</div></section>;
  }

  if (kind === 'artists') return <section className="music-catalog-section"><BrowseHeader title={t('musicHub.artistsTitle')} subtitle={t('musicHub.artistsSub')} count={artists.length} /><div className="music-catalog-card-grid">{artists.map((artist) => <button type="button" className="music-catalog-card music-catalog-artist-card" key={artist.id} onClick={() => setDetail({ kind: 'artist', id: artist.id })}><Cover src={artist.coverUrl} alt={artist.name} /><span className="music-catalog-card-copy"><b>{artist.name}</b><small>{artist.country || t('musicHub.independentArtist')} · {t('musicHub.trackCount', { n: artist.songCount })}</small><em>{artist.genres.slice(0, 2).join(' · ') || t('musicHub.jaminoCreator')}</em></span></button>)}</div></section>;
  if (kind === 'albums') return <section className="music-catalog-section"><BrowseHeader title={t('musicHub.albumsTitle')} subtitle={t('musicHub.albumsSub')} count={albums.length} /><div className="music-catalog-card-grid">{albums.map((album) => <button type="button" className="music-catalog-card" key={album.id} onClick={() => setDetail({ kind: 'album', id: album.id })}><Cover src={album.coverUrl} alt={album.title} /><span className="music-catalog-card-copy"><b>{album.title}</b><small>{album.artist?.name ?? t('musicHub.unknownArtist')} · {album.year || t('musicHub.newRelease')}</small><em>{album.type} · {t('musicHub.trackCount', { n: album.songCount })}</em></span></button>)}</div></section>;
  if (kind === 'singles') return <section className="music-catalog-section"><BrowseHeader title={t('musicHub.singlesTitle')} subtitle={t('musicHub.singlesSub')} count={singles.length} /><div className="music-catalog-track-list">{singles.map((song) => <MiniSong key={song.id} song={song} activeSongId={activeSongId} playing={playing} onPlay={onPlay} onOpen={() => setDetail({ kind: 'song', id: song.id })} />)}</div></section>;
  return <section className="music-catalog-section"><BrowseHeader title={t('musicHub.playlistsTitle')} subtitle={t('musicHub.playlistsSub')} count={playlists.length} /><div className="music-catalog-card-grid">{playlists.map((playlist) => <button type="button" className="music-catalog-card" key={`${playlist.source ?? 'curated'}-${playlist.id}`} onClick={() => setDetail({ kind: 'playlist', id: playlist.id })}><Cover src={playlist.coverUrl} alt={playlist.name} /><span className="music-catalog-card-copy"><b>{playlist.name}</b><small>{t('musicHub.trackCount', { n: playlist.items.length })} · {playlist.owner ? `@${playlist.owner.username}` : playlist.featured ? t('musicHub.featured') : t('musicHub.jaminoSelects')}</small><em>{playlist.desc || t('musicHub.publicPlaylist')}</em></span></button>)}</div></section>;
}
