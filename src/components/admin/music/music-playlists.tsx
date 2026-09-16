'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2, Pencil, Star, ChevronUp, ChevronDown, Search, Plus, X, ListMusic } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, AdminModal } from '../admin-ui';
import { CoverField, Field, Row } from './music-common';

interface PlaylistRow {
  id: number;
  name: string;
  desc: string;
  coverFile: string;
  coverUrl: string | null;
  featured: boolean;
  songs: number;
}

interface SongLite {
  id: number;
  title: string;
  artist: { name: string } | null;
  coverUrl: string | null;
}

export function AdminMusicPlaylists() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlaylistRow | null>(null);
  const [form, setForm] = useState<any>({ name: '', desc: '', coverFile: '', featured: false });
  const [songIds, setSongIds] = useState<number[]>([]);
  const [songs, setSongs] = useState<SongLite[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SongLite[]>([]);
  const [saving, setSaving] = useState(false);
  const { confirm, ask, close } = useConfirm();

  const list = useAdminList<PlaylistRow>({ path: '/api/admin/music/playlists', per: 15 });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', desc: '', coverFile: '', featured: false });
    setSongIds([]);
    setSongs([]);
    setOpen(true);
  };

  const openEdit = useCallback((p: PlaylistRow) => {
    setEditing(p);
    setForm({ name: p.name, desc: p.desc, coverFile: p.coverFile ?? '', featured: p.featured });
    api<{ playlist: any; songs: SongLite[] }>(`/api/admin/music/playlists/${p.id}`)
      .then((d) => {
        setSongs(d.songs);
        setSongIds(d.songs.map((s) => s.id));
      })
      .catch(() => {});
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || editing) return;
    setSongIds([]);
    setSongs([]);
  }, [open, editing]);

  const doSearch = async () => {
    if (!q.trim()) return setResults([]);
    const d = await api<{ songs: SongLite[] }>(`/api/music/search?q=${encodeURIComponent(q.trim())}`).catch(() => null);
    setResults(d?.songs ?? []);
  };

  const toggleSong = (s: SongLite) => {
    if (songIds.includes(s.id)) {
      setSongIds((old) => old.filter((x) => x !== s.id));
      setSongs((old) => old.filter((x) => x.id !== s.id));
    } else {
      setSongIds((old) => [...old, s.id]);
      setSongs((old) => [...old, s]);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= songIds.length) return;
    const next = [...songIds];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSongIds(next);
    const ns = [...songs];
    [ns[idx], ns[target]] = [ns[target], ns[idx]];
    setSongs(ns);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, songIds };
      if (editing) await api(`/api/admin/music/playlists/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/music/playlists', { method: 'POST', body: JSON.stringify(body) });
      setOpen(false);
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    try {
      await api(`/api/admin/music/playlists/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.music.searchPlaylists')} />
        <button className="btn btn-violet" onClick={openNew}>+ {t('admin.music.addPlaylist')}</button>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.music.playlist')}</th>
              <th>{t('admin.music.songs')}</th>
              <th>{t('admin.music.featured')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.music.noPlaylists')} />}
            {!list.loading &&
              list.rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-artist-cell">
                      <div className="admin-upload-thumb small">
                        {p.coverUrl ? <img src={p.coverUrl} alt="" loading="lazy" /> : <ListMusic size={14} />}
                      </div>
                      <div>
                        <b>{p.name}</b>
                        {p.desc && <div className="admin-dim admin-ellipsis" style={{ maxWidth: 240 }}>{p.desc}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="admin-num">{p.songs}</td>
                  <td>{p.featured ? <Star size={14} className="star-on" /> : '—'}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon violet" onClick={() => openEdit(p)} title={t('admin.music.edit')}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon danger" onClick={() => ask(t('admin.music.deletePlaylist'), t('admin.music.deletePlaylistConfirm', { name: p.name }), () => del(p.id))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={list.page} pages={list.pages} setPage={list.setPage} />
      {confirm && <ConfirmModal confirm={confirm} close={close} />}

      <AdminModal
        open={open}
        title={editing ? t('admin.music.editPlaylist') : t('admin.music.addPlaylist')}
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>{t('admin.cancel')}</button>
            <button className="btn btn-violet" disabled={saving} onClick={save}>{saving ? t('admin.loading') : t('admin.save')}</button>
          </>
        }
      >
        <div className="admin-form">
          <Row>
            <Field label={t('admin.music.name')}>
              <input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t('admin.music.cover')}>
              <CoverField value={form.coverFile} onChange={(coverFile) => setForm({ ...form, coverFile })} previewUrl={editing?.coverUrl} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.desc')}>
              <textarea className="admin-input admin-textarea" rows={2} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
            </Field>
            <Field label={t('admin.music.featured')}>
              <div className="admin-checks">
                <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> {t('admin.music.featured')}</label>
              </div>
            </Field>
          </Row>

          <div className="admin-subhead">{t('admin.music.playlistSongs')} ({songIds.length})</div>
          <form
            className="admin-search admin-playlist-search"
            onSubmit={(e) => {
              e.preventDefault();
              doSearch();
            }}
          >
            <Search size={16} className="admin-search-icon" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.music.searchToAdd')} />
            <button type="submit" className="btn btn-violet pill-sm">{t('admin.search')}</button>
          </form>
          {results.length > 0 && (
            <div className="admin-playlist-results">
              {results.map((s) => (
                <button key={s.id} type="button" className={`admin-playlist-result ${songIds.includes(s.id) ? 'in' : ''}`} onClick={() => toggleSong(s)}>
                  <span className="admin-playlist-art">{s.coverUrl ? <img src={s.coverUrl} alt="" /> : <ListMusic size={12} />}</span>
                  <span className="admin-playlist-meta">
                    <b>{s.title}</b>
                    <em>{s.artist?.name ?? ''}</em>
                  </span>
                  {songIds.includes(s.id) ? <X size={13} /> : <Plus size={13} />}
                </button>
              ))}
            </div>
          )}
          <div className="admin-playlist-list">
            {songs.map((s, i) => (
              <div key={s.id} className="admin-playlist-row">
                <span className="admin-playlist-order">{i + 1}</span>
                <span className="admin-playlist-art">{s.coverUrl ? <img src={s.coverUrl} alt="" /> : <ListMusic size={12} />}</span>
                <span className="admin-playlist-meta">
                  <b>{s.title}</b>
                  <em>{s.artist?.name ?? ''}</em>
                </span>
                <button type="button" className="btn-icon" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={14} /></button>
                <button type="button" className="btn-icon" onClick={() => move(i, 1)} disabled={i === songs.length - 1}><ChevronDown size={14} /></button>
                <button type="button" className="btn-icon danger" onClick={() => toggleSong(s)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </AdminModal>
    </div>
  );
}