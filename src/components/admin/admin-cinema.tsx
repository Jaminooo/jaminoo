'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { Clapperboard, Film, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { EmptyRow, LoadingRow } from './admin-ui';

interface CinemaAdminItem {
  id: number;
  title: string;
  description: string;
  kind: string;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number;
}

export function AdminCinema() {
  const t = useTranslations();
  const [items, setItems] = useState<CinemaAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('MOVIE');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const load = () => {
    setLoading(true);
    api<{ items: CinemaAdminItem[] }>('/api/admin/cinema').then((data) => setItems(data.items)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let externalUrl = url;
      let nextThumbnailUrl = thumbnailUrl;
      if (videoFile) {
        const form = new FormData();
        form.append('file', videoFile); form.append('context', 'cinema');
        const uploaded = await api<{ asset: { id: string } }>('/api/video/assets', { method: 'POST', body: form });
        externalUrl = `/api/media/${uploaded.asset.id}`;
      }
      if (posterFile) {
        const form = new FormData();
        form.append('file', posterFile); form.append('context', 'cinema');
        const uploaded = await api<{ asset: { id: string } }>('/api/video/assets', { method: 'POST', body: form });
        nextThumbnailUrl = `/api/media/${uploaded.asset.id}`;
      }
      await api('/api/admin/cinema', { method: 'POST', body: JSON.stringify({ title, kind, externalUrl, thumbnailUrl: nextThumbnailUrl, durationSec: Number(durationSec || 0), description }) });
      setTitle(''); setUrl(''); setThumbnailUrl(''); setDurationSec(''); setDescription(''); setVideoFile(null); setPosterFile(null);
      toast(t('admin.cinemaPublished'), 'ok');
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try { await api(`/api/admin/cinema/${id}`, { method: 'DELETE' }); setItems((current) => current.filter((item) => item.id !== id)); } catch (error) { toast(error instanceof Error ? error.message : t('admin.removeError'), 'error'); }
  };

  return (
    <div className="admin-cinema-root">
      <form className="admin-card admin-cinema-form" onSubmit={submit}>
        <div className="admin-card-head">
          <div>
            <h3><Clapperboard size={16} /> {t('admin.cinemaCatalogue')}</h3>
            <p className="admin-dim">{t('admin.cinemaCatalogueHint')}</p>
          </div>
        </div>
        <div className="admin-form-grid">
          <label>{t('admin.cinemaTitle')}<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>{t('admin.cinemaType')}<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="MOVIE">{t('admin.movie')}</option><option value="SERIES">{t('admin.series')}</option></select></label>
          <label>{t('admin.directVideoUrl')}<input required={!videoFile} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…/movie.mp4" /></label>
          <label className="admin-file-field"><span><Upload size={13} /> Upload video</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} />{videoFile && <small>{videoFile.name}</small>}</label>
          <label>{t('admin.thumbnailUrl')}<input type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} /></label>
          <label className="admin-file-field"><span><Upload size={13} /> Upload poster</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} />{posterFile && <small>{posterFile.name}</small>}</label>
          <label>{t('admin.durationSeconds')}<input type="number" min="0" value={durationSec} onChange={(event) => setDurationSec(event.target.value)} /></label>
          <label className="admin-form-wide">{t('admin.description')}<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        </div>
        <button className="btn btn-violet" disabled={saving}><Film size={15} /> {saving ? t('admin.publishing') : t('admin.publishTitle')}</button>
      </form>
      <div className="admin-card admin-table-card">
        <div className="admin-card-head"><h3>{t('admin.publishedTitles')}</h3><span className="admin-count">{items.length}</span></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {loading && <LoadingRow text={t('admin.loadingCinema')} />}
              {!loading && items.length === 0 && <EmptyRow text={t('admin.noCinemaTitles')} />}
              {items.map((item) => (
                <tr key={item.id}>
                  <td><div className="admin-cinema-thumb">{item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" fill unoptimized loading="lazy" /> : <Film size={16} />}</div></td>
                  <td><b>{item.title}</b><div className="admin-dim">{item.kind === 'MOVIE' ? t('admin.movie') : t('admin.series')}</div></td>
                  <td className="admin-ellipsis">{item.externalUrl}</td>
                  <td><button className="btn-icon danger" onClick={() => void remove(item.id)} title={t('admin.remove')}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
