'use client';

import { useEffect, useState } from 'react';
import { Search, UserRound, Music2, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { type MusicSong } from '@/components/music-player';

interface UserResult { id: number; username: string; bio: string; avatarId: number; avatarPhoto: string | null; friend?: boolean; }

export function GlobalSearch() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [songs, setSongs] = useState<MusicSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const setProduct = useAppStore((state) => state.setProduct);
  const setProfileUserId = useAppStore((state) => state.setProfileUserId);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    const term = query.trim();
    let active = true;
    if (!open || term.length < 2) {
      setUsers([]);
      setSongs([]);
      setLoading(false);
      setSearchError(false);
      return () => { active = false; };
    }

    setUsers([]);
    setSongs([]);
    setLoading(true);
    setSearchError(false);
    const timer = window.setTimeout(() => {
      Promise.all([
        api<{ users: UserResult[] }>(`/api/users/search?q=${encodeURIComponent(term)}`),
        api<{ songs: MusicSong[] }>(`/api/music/search?q=${encodeURIComponent(term)}`),
      ])
        .then(([userData, musicData]) => {
          if (!active) return;
          setUsers(userData.users);
          setSongs(musicData.songs);
        })
        .catch(() => {
          if (!active) return;
          setSearchError(true);
        })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const openSong = (songId: number) => {
    setProduct('music');
    window.history.pushState({}, '', `/?hub=music&song=${songId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setOpen(false);
  };

  const termTooShort = query.trim().length < 2;
  const hasResults = users.length > 0 || songs.length > 0;

  return (
    <div className="global-search">
      <button type="button" className="btn btn-ghost pill-sm global-search-trigger" onClick={() => setOpen(true)} title={t('search.open')} aria-label={t('search.open')}>
        <Search size={15} /><kbd>⌘K</kbd>
      </button>
      {open && (
        <div className="global-search-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="global-search-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="global-search-input">
              <Search size={16} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search.placeholder')} />
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label={t('modal.close')}><X size={16} /></button>
            </div>
            {termTooShort ? <div className="global-search-hint">{t('search.hint')}</div> : (
              <div className="global-search-results" aria-live="polite" aria-busy={loading}>
                {loading && <div className="global-search-hint">{t('search.loading')}</div>}
                {!loading && searchError && <div className="global-search-hint" role="alert">{t('search.error')}</div>}
                {!loading && !searchError && users.length > 0 && <section><div className="global-search-section"><UserRound size={14} /> {t('search.people')}</div>{users.map((user) => <button type="button" className="global-search-result" key={user.id} onClick={() => { setProduct('community'); setProfileUserId(user.id); setOpen(false); }}><UserRound size={16} /><span><b>@{user.username}</b><small>{user.bio || t('search.member')}</small></span></button>)}</section>}
                {!loading && !searchError && songs.length > 0 && <section><div className="global-search-section"><Music2 size={14} /> {t('search.music')}</div>{songs.map((song) => <button type="button" className="global-search-result" key={song.id} onClick={() => openSong(song.id)}><Music2 size={16} /><span><b>{song.title}</b><small>{song.artist?.name ?? t('search.unknownArtist')}</small></span></button>)}</section>}
                {!loading && !searchError && !hasResults && <div className="global-search-hint">{t('search.empty')}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
