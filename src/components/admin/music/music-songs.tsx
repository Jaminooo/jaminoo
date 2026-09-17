'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Star, Trash2, Pencil, PlayCircle } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, AdminModal, fmtDateTime } from '../admin-ui';
import type { Tone } from '../admin-ui';
import { Field, Row, GenreChips, CoverField, AudioField, useOptions, SelectLabel } from './music-common';

interface SongRow {
  id: number;
  title: string;
  artist: { id: number; name: string } | null;
  feat: { id: number; name: string }[];
  album: { id: number; title: string } | null;
  trackNo: number;
  durationSec: number;
  genres: string[];
  producer: string;
  label: string;
  year: number;
  explicit: boolean;
  featured: boolean;
  lyrics: string;
  lrc: string;
  hasAudio: boolean;
  audioUrl: string | null;
  audioLink: string | null;
  audioFileName: string;
  coverFileName: string;
  coverUrl: string | null;
  plays: number;
  createdAt: string;
}

const EMPTY: any = {
  title: '',
  artistId: 0,
  featArtistIds: [],
  albumId: '',
  trackNo: 0,
  durationSec: 0,
  genres: [],
  producer: '',
  label: '',
  year: 0,
  explicit: false,
  featured: false,
  lyrics: '',
  lrc: '',
  coverFile: '',
  audioFile: '',
  audioLink: '',
};

export function AdminMusicSongs() {
  const t = useTranslations();
  const [artistFilter, setArtistFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [genre, setGenre] = useState('');
  const [featured, setFeatured] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SongRow | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<SongRow | null>(null);
  const { confirm, ask, close } = useConfirm();

  const artists = useOptions('/api/admin/music/artists');
  const albums = useOptions('/api/admin/music/albums');

  const extra = useMemo(
    () => ({ artistId: artistFilter, albumId: albumFilter, genre, featured: featured ? (featured === '1' ? '1' : '0') : '' }),
    [artistFilter, albumFilter, genre, featured]
  );
  const list = useAdminList<SongRow>({ path: '/api/admin/music/songs', extra, per: 15 });

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, ...(artists.options[0] ? { artistId: artists.options[0].id } : {}) });
    setOpen(true);
  };
  const openEdit = (s: SongRow) => {
    setEditing(s);
    setForm({
      title: s.title,
      artistId: s.artist?.id ?? 0,
      featArtistIds: s.feat.map((f) => f.id),
      albumId: s.album?.id ?? '',
      trackNo: s.trackNo,
      durationSec: s.durationSec,
      genres: [...s.genres],
      producer: s.producer,
      label: s.label,
      year: s.year,
      explicit: s.explicit,
      featured: s.featured,
      lyrics: s.lyrics,
      lrc: s.lrc,
      coverFile: s.coverFileName ?? '',
      audioFile: s.audioFileName ?? '',
      audioLink: s.audioLink ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim()) return;
    if (!form.artistId) return;
    setSaving(true);
    try {
      const body = { ...form, featArtistIds: form.featArtistIds, coverFile: form.coverFile, audioFile: form.audioFile };
      if (editing) await api(`/api/admin/music/songs/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/music/songs', { method: 'POST', body: JSON.stringify(body) });
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
      await api(`/api/admin/music/songs/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const albumOptions = albums.options.filter((a) => !form.artistId || (a as any).artistId === form.artistId);

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.music.searchSongs')} />
        <div className="admin-filters">
          <select className="admin-select" value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}>
            <option value="">{t('admin.music.allArtists')}</option>
            {artists.options.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select className="admin-select" value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)}>
            <option value="">{t('admin.music.allAlbums')}</option>
            {albums.options.map((a) => (
              <option key={a.id} value={(a as any).id}>{(a as any).title}</option>
            ))}
          </select>
          <select className="admin-select" value={featured} onChange={(e) => setFeatured(e.target.value)}>
            <option value="">{t('admin.all')}</option>
            <option value="1">{t('admin.music.featured')}</option>
            <option value="0">{t('admin.music.notFeatured')}</option>
          </select>
        </div>
        <button className="btn btn-violet" onClick={openNew}>
          + {t('admin.music.addSong')}
        </button>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.music.title')}</th>
              <th>{t('admin.music.artist')}</th>
              <th>{t('admin.music.album')}</th>
              <th>{t('admin.music.duration')}</th>
              <th>{t('admin.music.genres')}</th>
              <th>{t('admin.music.plays')}</th>
              <th>{t('admin.music.featured')}</th>
              <th>{t('admin.music.audio')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.music.noSongs')} />}
            {!list.loading &&
              list.rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="admin-jam-name">
                      <b>{s.title}</b>
                      {s.explicit && <span className="badge-explicit">E</span>}
                    </div>
                    {s.feat.length > 0 && <div className="admin-dim">{s.feat.map((f) => f.name).join(', ')}</div>}
                  </td>
                  <td>@{s.artist?.name}</td>
                  <td>{s.album?.title ?? '—'}</td>
                  <td className="admin-num">{Math.floor(s.durationSec / 60)}:{String(s.durationSec % 60).padStart(2, '0')}</td>
                  <td>
                    <div className="admin-genre-cells">
                      {s.genres.slice(0, 3).map((g) => (
                        <span key={g} className="pill-sm">{g}</span>
                      ))}
                    </div>
                  </td>
                  <td className="admin-num">{s.plays}</td>
                  <td>{s.featured ? <Star size={14} className="star-on" /> : '—'}</td>
                  <td>
                    {s.hasAudio ? (
                      <button className="btn-icon green" title="preview" onClick={() => setPreview(s)}>
                        <PlayCircle size={15} />
                      </button>
                    ) : s.audioLink ? (
                      <span className="pill-sm">link</span>
                    ) : (
                      <Badge tone="red">{t('admin.music.noAudio')}</Badge>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon violet" onClick={() => openEdit(s)} title={t('admin.music.edit')}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon danger" onClick={() => ask(t('admin.music.deleteSong'), t('admin.music.deleteConfirm', { title: s.title }), () => del(s.id))}>
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

      {preview && preview.audioUrl && (
        <AdminModal open title={preview.title} onClose={() => setPreview(null)}>
          <audio controls src={preview.audioUrl} autoPlay style={{ width: '100%' }} />
          <p className="admin-dim">{preview.artist?.name}{preview.album ? ` · ${preview.album.title}` : ''}</p>
        </AdminModal>
      )}

      <AdminModal
        open={open}
        title={editing ? t('admin.music.editSong') : t('admin.music.addSong')}
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>{t('admin.cancel')}</button>
            <button className="btn btn-violet" disabled={saving} onClick={save}>
              {saving ? t('admin.loading') : t('admin.save')}
            </button>
          </>
        }
      >
        <div className="admin-form">
          <Row>
            <Field label={t('admin.music.title')}>
              <input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Song title" />
            </Field>
            <Field label={t('admin.music.artist')}>
              <select className="admin-input" value={form.artistId} onChange={(e) => setForm({ ...form, artistId: Number(e.target.value), albumId: '' })}>
                <option value={0}>—</option>
                {artists.options.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.featArtists')}>
              <div className="admin-chips">
                {artists.options
                  .filter((a) => a.id !== form.artistId)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`pill-sm ${form.featArtistIds.includes(a.id) ? 'on' : ''}`}
                      onClick={() =>
                        setForm({
                          ...form,
                          featArtistIds: form.featArtistIds.includes(a.id) ? form.featArtistIds.filter((x: number) => x !== a.id) : [...form.featArtistIds, a.id],
                        })
                      }
                    >
                      {a.name}
                    </button>
                  ))}
              </div>
            </Field>
            <Field label={t('admin.music.album')}>
              <select className="admin-input" value={form.albumId} onChange={(e) => setForm({ ...form, albumId: e.target.value })}>
                <option value="">—</option>
                {albumOptions.map((a) => (
                  <option key={a.id} value={a.id}>{(a as any).title}</option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.trackNo')}>
              <input className="admin-input" type="number" min={0} value={form.trackNo} onChange={(e) => setForm({ ...form, trackNo: Number(e.target.value) })} />
            </Field>
            <Field label={t('admin.music.duration')}>
              <input className="admin-input" type="number" min={0} value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: Number(e.target.value) })} placeholder="seconds" />
            </Field>
            <Field label={t('admin.music.year')}>
              <input className="admin-input" type="number" min={0} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.producer')}>
              <input className="admin-input" value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} />
            </Field>
            <Field label={t('admin.music.label')}>
              <input className="admin-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.genres')}>
              <GenreChips value={form.genres} onChange={(genres) => setForm({ ...form, genres })} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.audio')}>
              <AudioField value={form.audioFile} onChange={(audioFile) => setForm({ ...form, audioFile })} />
            </Field>
            <Field label={t('admin.music.audioLink')}>
              <input className="admin-input" value={form.audioLink} onChange={(e) => setForm({ ...form, audioLink: e.target.value })} placeholder="https://…" />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.cover')}>
              <CoverField value={form.coverFile} onChange={(coverFile) => setForm({ ...form, coverFile })} previewUrl={editing?.coverUrl} />
            </Field>
            <Field label={t('admin.music.explicit')}>
              <div className="admin-checks">
                <label><input type="checkbox" checked={form.explicit} onChange={(e) => setForm({ ...form, explicit: e.target.checked })} /> {t('admin.music.explicit')}</label>
                <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> {t('admin.music.featured')}</label>
              </div>
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.lyrics')} hint={t('admin.music.lyricsHint')}>
              <textarea className="admin-input admin-textarea" rows={5} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} placeholder="Plain lyrics…" />
            </Field>
            <Field label={t('admin.music.lrc')} hint={t('admin.music.lrcHint')}>
              <textarea className="admin-input admin-textarea" rows={5} value={form.lrc} onChange={(e) => setForm({ ...form, lrc: e.target.value })} placeholder="[00:12.34] line…" style={{ direction: 'ltr' }} />
            </Field>
          </Row>
        </div>
      </AdminModal>
    </div>
  );
}