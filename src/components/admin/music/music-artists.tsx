'use client';

import { useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2, Pencil, Disc3 } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, ConfirmModal, useConfirm, AdminModal } from '../admin-ui';
import { Field, Row, GenreChips, CoverField } from './music-common';

interface ArtistRow {
  id: number;
  name: string;
  coverFile: string;
  coverUrl: string | null;
  bio: string;
  country: string;
  genres: string[];
  debutYear: number;
  songs: number;
  albums: number;
}

export function AdminMusicArtists() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ArtistRow | null>(null);
  const [form, setForm] = useState<any>({ name: '', coverFile: '', bio: '', country: '', genres: [], debutYear: 0 });
  const [saving, setSaving] = useState(false);
  const { confirm, ask, close } = useConfirm();

  const list = useAdminList<ArtistRow>({ path: '/api/admin/music/artists', per: 15 });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', coverFile: '', bio: '', country: '', genres: [], debutYear: new Date().getFullYear() });
    setOpen(true);
  };
  const openEdit = (a: ArtistRow) => {
    setEditing(a);
    setForm({ name: a.name, coverFile: a.coverFile, bio: a.bio, country: a.country, genres: [...a.genres], debutYear: a.debutYear });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (editing) await api(`/api/admin/music/artists/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      else await api('/api/admin/music/artists', { method: 'POST', body: JSON.stringify(form) });
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
      await api(`/api/admin/music/artists/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.music.searchArtists')} />
        <button className="btn btn-violet" onClick={openNew}>+ {t('admin.music.addArtist')}</button>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.music.artist')}</th>
              <th>{t('admin.music.country')}</th>
              <th>{t('admin.music.genres')}</th>
              <th>{t('admin.music.debutYear')}</th>
              <th>{t('admin.music.songs')}</th>
              <th>{t('admin.music.albums')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.music.noArtists')} />}
            {!list.loading &&
              list.rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="admin-artist-cell">
                      <div className="admin-upload-thumb small">
                        {a.coverUrl ? <img src={a.coverUrl} alt="" loading="lazy" /> : <Disc3 size={14} />}
                      </div>
                      <div>
                        <b>{a.name}</b>
                        {a.bio && <div className="admin-dim admin-ellipsis" style={{ maxWidth: 240 }}>{a.bio}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{a.country || '—'}</td>
                  <td>
                    <div className="admin-genre-cells">
                      {a.genres.slice(0, 3).map((g) => <span key={g} className="pill-sm">{g}</span>)}
                    </div>
                  </td>
                  <td className="admin-num">{a.debutYear || '—'}</td>
                  <td className="admin-num">{a.songs}</td>
                  <td className="admin-num">{a.albums}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon violet" onClick={() => openEdit(a)} title={t('admin.music.edit')}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon danger" onClick={() => ask(t('admin.music.deleteArtist'), t('admin.music.deleteArtistConfirm', { name: a.name, songs: a.songs }), () => del(a.id))}>
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
        title={editing ? t('admin.music.editArtist') : t('admin.music.addArtist')}
        onClose={() => setOpen(false)}
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
            <Field label={t('admin.music.country')}>
              <input className="admin-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label={t('admin.music.debutYear')}>
              <input className="admin-input" type="number" min={1900} value={form.debutYear} onChange={(e) => setForm({ ...form, debutYear: Number(e.target.value) })} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.bio')}>
              <textarea className="admin-input admin-textarea" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.genres')}>
              <GenreChips value={form.genres} onChange={(genres) => setForm({ ...form, genres })} />
            </Field>
            <Field label={t('admin.music.profileImage')}>
              <CoverField value={form.coverFile} onChange={(coverFile) => setForm({ ...form, coverFile })} previewUrl={editing?.coverUrl} />
            </Field>
          </Row>
        </div>
      </AdminModal>
    </div>
  );
}