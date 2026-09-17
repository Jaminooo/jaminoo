'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Clapperboard, Film, Trash2 } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
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
  const [items, setItems] = useState<CinemaAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('MOVIE');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    setLoading(true);
    api<{ items: CinemaAdminItem[] }>('/api/admin/cinema').then((data) => setItems(data.items)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/admin/cinema', { method: 'POST', body: JSON.stringify({ title, kind, externalUrl: url, thumbnailUrl, durationSec: Number(durationSec || 0), description }) });
      setTitle(''); setUrl(''); setThumbnailUrl(''); setDurationSec(''); setDescription('');
      toast('Cinema title published.', 'ok');
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not publish title.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try { await api(`/api/admin/cinema/${id}`, { method: 'DELETE' }); setItems((current) => current.filter((item) => item.id !== id)); } catch (error) { toast(error instanceof Error ? error.message : 'Could not remove title.', 'error'); }
  };

  return <div className="admin-cinema-root"><form className="admin-card admin-cinema-form" onSubmit={submit}><div className="admin-card-head"><div><h3><Clapperboard size={16} /> Cinema catalogue</h3><p className="admin-dim">Only these titles can be selected inside Movie Jams.</p></div></div><div className="admin-form-grid"><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="MOVIE">Movie</option><option value="SERIES">Series</option></select></label><label>Direct video URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…/movie.mp4" /></label><label>Thumbnail URL<input type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} /></label><label>Duration seconds<input type="number" min="0" value={durationSec} onChange={(event) => setDurationSec(event.target.value)} /></label><label className="admin-form-wide">Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><button className="btn btn-violet" disabled={saving}><Film size={15} /> {saving ? 'Publishing…' : 'Publish title'}</button></form><div className="admin-card admin-table-card"><div className="admin-card-head"><h3>Published titles</h3><span className="admin-count">{items.length}</span></div><div className="admin-table-wrap"><table className="admin-table"><tbody>{loading && <LoadingRow text="Loading cinema…" />}{!loading && items.length === 0 && <EmptyRow text="No Cinema titles yet." />}{items.map((item) => <tr key={item.id}><td><b>{item.title}</b><div className="admin-dim">{item.kind}</div></td><td className="admin-ellipsis">{item.externalUrl}</td><td><button className="btn-icon danger" onClick={() => void remove(item.id)} title="Remove"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></div></div>;
}
