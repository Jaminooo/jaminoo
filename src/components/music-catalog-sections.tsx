'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Disc3, ListMusic, Music2, Play, Sparkles } from 'lucide-react';
import { api } from '@/lib/client-api';
import { artistLabel, type MusicSong } from '@/components/music-player';

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
  const active = activeSongId === song.id;
  return <div className={`music-catalog-track ${active ? 'active' : ''}`}><button type="button" className="music-catalog-track-play" onClick={() => onPlay(song)} aria-label={`Play ${song.title}`}>{active && playing ? <span className="music-catalog-bars"><i /><i /><i /></span> : <Play size={13} />}</button><button type="button" className="music-catalog-track-info" onClick={() => onOpen?.()}><span><b>{song.title}</b><small>{artistLabel(song) || 'Unknown artist'}</small></span></button><em>{song.plays ? `${song.plays.toLocaleString()} plays` : 'Single'}</em><button type="button" className="music-catalog-track-detail" onClick={() => onOpen?.()} aria-label={`Open ${song.title}`}><Disc3 size={13} /></button></div>;
}

function BrowseHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  return <div className="music-catalog-heading"><div><div className="hub-kicker">JAMINO CATALOG</div><h2>{title}</h2><p>{subtitle}</p></div><span className="music-catalog-count">{count} items</span></div>;
}

export function MusicCatalogSections({ kind, artists, albums, singles, playlists, activeSongId, playing, onPlay }: Props) {
  const [detail, setDetail] = useState<Detail>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detail) {
      setDetailData(null);
      return;
    }
    if (detail.kind === 'playlist') {
      setDetailData({ playlist: playlists.find((item) => item.id === detail.id) ?? null });
      return;
    }
    setLoading(true);
    const endpoint = detail.kind === 'artist' ? 'artists' : detail.kind === 'album' ? 'albums' : 'songs';
    api(`/api/music/${endpoint}/${detail.id}`)
      .then(setDetailData)
      .catch(() => setDetailData(null))
      .finally(() => setLoading(false));
  }, [detail, playlists]);

  if (detail) {
    const subject = detailData?.artist ?? detailData?.album ?? detailData?.song ?? detailData?.playlist;
    const songs: MusicSong[] = detailData?.songs ?? (detail.kind === 'song' && detailData?.song ? [detailData.song] : detailData?.playlist?.items?.map((item: any) => item.song) ?? []);
    if (loading || !subject) return <section className="music-catalog-detail"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setDetail(null)}><ArrowLeft size={14} /> Back to catalog</button><div className="music-hub-empty"><Sparkles size={22} /><span>{loading ? 'Loading page…' : 'This catalog page is not available.'}</span></div></section>;
    return <section className="music-catalog-detail"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setDetail(null)}><ArrowLeft size={14} /> Back to catalog</button><div className="music-catalog-detail-hero"><Cover src={subject.coverUrl} alt={subject.name ?? subject.title} /><div><div className="hub-kicker">{detail.kind.toUpperCase()} PAGE</div><h2>{subject.name ?? subject.title}</h2><p>{subject.bio ?? subject.desc ?? (subject.artist ? `By ${subject.artist.name}` : 'A Jamino music release.')}</p><div className="music-catalog-tags">{subject.genres?.map((genre: string) => <span key={genre}>{genre}</span>)}{subject.type && <span>{subject.type}</span>}{subject.country && <span>{subject.country}</span>}</div></div></div><div className="music-catalog-detail-grid"><div><div className="music-hub-section-head"><h3>Tracks</h3><span className="music-catalog-muted">{songs.length} tracks</span></div><div className="music-catalog-track-list">{songs.length ? songs.map((song) => <MiniSong key={song.id} song={song} activeSongId={activeSongId} playing={playing} onPlay={onPlay} onOpen={() => setDetail({ kind: 'song', id: song.id })} />) : <div className="music-hub-empty"><Music2 size={20} /><span>No tracks published yet.</span></div>}</div></div>{detail.kind === 'artist' && <div className="music-catalog-related"><div className="music-hub-section-head"><h3>Albums</h3></div><div className="music-catalog-mini-grid">{(detailData.albums ?? []).map((album: MusicAlbumCard) => <button type="button" className="music-catalog-mini-card" key={album.id} onClick={() => setDetail({ kind: 'album', id: album.id })}><Cover src={album.coverUrl} alt={album.title} /><span><b>{album.title}</b><small>{album.year || 'Release'} · {album.songCount ?? 0} tracks</small></span></button>)}</div></div>}</div></section>;
  }

  if (kind === 'artists') return <section className="music-catalog-section"><BrowseHeader title="Artists" subtitle="Meet the people shaping the Jamino sound." count={artists.length} /><div className="music-catalog-card-grid">{artists.map((artist) => <button type="button" className="music-catalog-card music-catalog-artist-card" key={artist.id} onClick={() => setDetail({ kind: 'artist', id: artist.id })}><Cover src={artist.coverUrl} alt={artist.name} /><span className="music-catalog-card-copy"><b>{artist.name}</b><small>{artist.country || 'Independent artist'} · {artist.songCount} tracks</small><em>{artist.genres.slice(0, 2).join(' · ') || 'Jamino creator'}</em></span></button>)}</div></section>;
  if (kind === 'albums') return <section className="music-catalog-section"><BrowseHeader title="Albums & EPs" subtitle="Full worlds, collected in one place." count={albums.length} /><div className="music-catalog-card-grid">{albums.map((album) => <button type="button" className="music-catalog-card" key={album.id} onClick={() => setDetail({ kind: 'album', id: album.id })}><Cover src={album.coverUrl} alt={album.title} /><span className="music-catalog-card-copy"><b>{album.title}</b><small>{album.artist?.name ?? 'Unknown artist'} · {album.year || 'New release'}</small><em>{album.type} · {album.songCount} tracks</em></span></button>)}</div></section>;
  if (kind === 'singles') return <section className="music-catalog-section"><BrowseHeader title="Singles" subtitle="One-track stories from the community." count={singles.length} /><div className="music-catalog-track-list">{singles.map((song) => <MiniSong key={song.id} song={song} activeSongId={activeSongId} playing={playing} onPlay={onPlay} onOpen={() => setDetail({ kind: 'song', id: song.id })} />)}</div></section>;
  return <section className="music-catalog-section"><BrowseHeader title="Community playlists" subtitle="Curated collections from the Jamino music team and public playlists from creators." count={playlists.length} /><div className="music-catalog-card-grid">{playlists.map((playlist) => <button type="button" className="music-catalog-card" key={`${playlist.source ?? 'curated'}-${playlist.id}`} onClick={() => setDetail({ kind: 'playlist', id: playlist.id })}><Cover src={playlist.coverUrl} alt={playlist.name} /><span className="music-catalog-card-copy"><b>{playlist.name}</b><small>{playlist.items.length} tracks · {playlist.owner ? `by @${playlist.owner.username}` : playlist.featured ? 'Featured' : 'Jamino Selects'}</small><em>{playlist.desc || 'A public Jamino playlist'}</em></span></button>)}</div></section>;
}
