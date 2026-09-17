'use client';

import { useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2, Pencil, Disc3 } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, AdminModal } from '../admin-ui';
import { Field, Row, CoverField, useOptions } from './music-common';
import { ALBUM_TYPES } from '@/lib/constants';

interface AlbumRow {
  id: number;
  title: string;
  artistId: number;
  artist: string;
  year: number;
  type: string;
  label: string;
  desc: string;
  coverFile: string;
  coverUrl: string | null;
  songs: number;
}

export function AdminMusicAlbums() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AlbumRow | null>(null);
  const [form, setForm] = useState<any>({ title: '', artistId: 0, year: new Date().getFullYear(), type: 'ALBUM', label: '', desc: '', coverFile: '' });
  const [saving, setSaving] = useState(false);
  const { confirm, ask, close } = useConfirm();
  const artists = useOptions('/api/admin/music/artists');

  const list = useAdminList<AlbumRow>({ path: '/api/admin/music/albums', per: 15 });

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', artistId: artists.options[0]?.id ?? 0, year: new Date().getFullYear(), type: 'ALBUM', label: '', desc: '', coverFile: '' });
    setOpen(true);
  };
  const openEdit = (a: AlbumRow) => {
    setEditing(a);
    setForm({ title: a.title, artistId: a.artistId, year: a.year, type: a.type, label: a.label, desc: a.desc, coverFile: a.coverFile });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim() || !form.artistId) return;
    setSaving(true);
    try {
      if (editing) await api(`/api/admin/music/albums/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      else await api('/api/admin/music/albums', { method: 'POST', body: JSON.stringify(form) });
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
      await api(`/api/admin/music/albums/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.music.searchAlbums')} />
        <button className="btn btn-violet" onClick={openNew}>+ {t('admin.music.addAlbum')}</button>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.music.album')}</th>
              <th>{t('admin.music.artist')}</th>
              <th>{t('admin.music.type')}</th>
              <th>{t('admin.music.yearLabel')}</th>
              <th>{t('admin.music.label')}</th>
              <th>{t('admin.music.songs')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.music.noAlbums')} />}
            {!list.loading &&
              list.rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="admin-artist-cell">
                      <div className="admin-upload-thumb small">
                        {a.coverUrl ? <Image src={a.coverUrl} alt="" fill unoptimized loading="lazy" /> : <Disc3 size={14} />}
                      </div>
                      <b>{a.title}</b>
                    </div>
                  </td>
                  <td>@{a.artist}</td>
                  <td><Badge tone={a.type === 'SINGLE' ? 'green' : a.type === 'EP' ? 'amber' : 'violet'}>{a.type.toLowerCase()}</Badge></td>
                  <td className="admin-num">{a.year || '—'}</td>
                  <td>{a.label || '—'}</td>
                  <td className="admin-num">{a.songs}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon violet" onClick={() => openEdit(a)} title={t('admin.music.edit')}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon danger" onClick={() => ask(t('admin.music.deleteAlbum'), t('admin.music.deleteAlbumConfirm', { title: a.title }), () => del(a.id))}>
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
        title={editing ? t('admin.music.editAlbum') : t('admin.music.addAlbum')}
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
            <Field label={t('admin.music.title')}>
              <input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={t('admin.music.artist')}>
              <select className="admin-input" value={form.artistId} onChange={(e) => setForm({ ...form, artistId: Number(e.target.value) })}>
                <option value={0}>—</option>
                {artists.options.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.type')}>
              <select className="admin-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ALBUM_TYPES.map((ty) => (
                  <option key={ty} value={ty}>{ty.toLowerCase()}</option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.music.yearLabel')}>
              <input className="admin-input" type="number" min={1900} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </Field>
            <Field label={t('admin.music.label')}>
              <input className="admin-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
          </Row>
          <Row>
            <Field label={t('admin.music.desc')}>
              <textarea className="admin-input admin-textarea" rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
            </Field>
            <Field label={t('admin.music.cover')}>
              <CoverField value={form.coverFile} onChange={(coverFile) => setForm({ ...form, coverFile })} previewUrl={editing?.coverUrl} />
            </Field>
          </Row>
        </div>
      </AdminModal>
    </div>
  );
}