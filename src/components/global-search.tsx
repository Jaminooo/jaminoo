'use client';

import { useEffect, useState } from 'react';
import { Search, UserRound, Music2, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { type MusicSong } from '@/components/music-player';

interface UserResult {
  id: number;
  username: string;
  bio: string;
  avatarId: number;
  avatarPhoto: string | null;
  friend?: boolean;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [songs, setSongs] = useState<MusicSong[]>([]);
  const setProduct = useAppStore((state) => state.setProduct);
  const setProfileUserId = useAppStore((state) => state.setProfileUserId);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setUsers([]);
      setSongs([]);
      return;
    }
    const timer = window.setTimeout(() => {
      Promise.all([
        api<{ users: UserResult[] }>(`/api/users/search?q=${encodeURIComponent(query.trim())}`),
        api<{ songs: MusicSong[] }>(`/api/music/search?q=${encodeURIComponent(query.trim())}`),
      ]).then(([userData, musicData]) => {
        setUsers(userData.users);
        setSongs(musicData.songs);
      }).catch(() => {});
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const openSong = (songId: number) => {
    setProduct('music');
    window.history.pushState({}, '', `/?hub=music&song=${songId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setOpen(false);
  };

  return (
    <div className="global-search">
      <button type="button" className="btn btn-ghost pill-sm" onClick={() => setOpen(true)} title="Search" aria-label="Search"><Search size={15} /></button>
      {open && <div className="global-search-backdrop" onMouseDown={() => setOpen(false)}>
        <div className="global-search-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="global-search-input"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, music…" /><button type="button" className="btn-icon" onClick={() => setOpen(false)}><X size={16} /></button></div>
          {query.trim().length < 2 ? <div className="global-search-hint">Search across your connected Jamino services.</div> : <div className="global-search-results">
            {users.length > 0 && <section><div className="global-search-section"><UserRound size={14} /> People</div>{users.map((user) => <button type="button" className="global-search-result" key={user.id} onClick={() => { setProduct('community'); setProfileUserId(user.id); setOpen(false); }}><UserRound size={16} /><span><b>@{user.username}</b><small>{user.bio || 'Jamino member'}</small></span></button>)}</section>}
            {songs.length > 0 && <section><div className="global-search-section"><Music2 size={14} /> Music</div>{songs.map((song) => <button type="button" className="global-search-result" key={song.id} onClick={() => openSong(song.id)}><Music2 size={16} /><span><b>{song.title}</b><small>{song.artist?.name ?? 'Unknown artist'}</small></span></button>)}</section>}
            {users.length === 0 && songs.length === 0 && <div className="global-search-hint">No results yet.</div>}
          </div>}
        </div>
      </div>}
    </div>
  );
}
