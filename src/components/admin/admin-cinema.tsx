'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Clapperboard, Eye, EyeOff, Film, Pencil, Plus, Sparkles, Trash2, Tv2, Upload, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import type { QualitySources } from '@/lib/watch-select';
import { connectLive, onLive } from '@/lib/live';
import { Badge, ConfirmModal, EmptyRow, LoadingRow, StatCard, useConfirm } from './admin-ui';

interface CinemaAdminItem {
  id: number;
  title: string;
  description: string;
  kind: string;
  externalUrl: string | null;
  qualitySources: QualitySources;
  episodeCount?: number;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
  visibility: string;
}

type Filter = 'ALL' | 'MOVIE' | 'SERIES' | 'CARTOON';

interface SeriesEpisode {
  id: number; season: number; number: number; title: string; externalUrl: string | null;
  qualitySources: QualitySources; thumbnailUrl: string | null; subtitlesUrl: string | null; durationSec: number;
}

const EMPTY_FORM = { title: '', kind: 'MOVIE', url: '', q720: '', q1080: '', q2160: '', thumbnailUrl: '', subtitlesUrl: '', durationSec: '', description: '', visibility: 'PUBLIC' };

export function AdminCinema() {
  const t = useTranslations();
  const [items, setItems] = useState<CinemaAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [episodesForId, setEpisodesForId] = useState<number | null>(null);
  const [seriesEpisodes, setSeriesEpisodes] = useState<SeriesEpisode[]>([]);
  const [seriesEpisodeForm, setSeriesEpisodeForm] = useState({ season: '1', number: '', title: '', url: '', q720: '', q1080: '', q2160: '', thumbnailUrl: '', subtitlesUrl: '', durationSec: '' });
  const [seriesEpisodeFile, setSeriesEpisodeFile] = useState<File | null>(null);
  const [editingSeriesEpisode, setEditingSeriesEpisode] = useState<number | null>(null);
  const { confirm, ask, close } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api<{ items: CinemaAdminItem[] }>('/api/admin/cinema').then((data) => setItems(data.items)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    connectLive();
    return onLive('cinema:update', () => load());
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => (filter === 'ALL' || item.kind === filter) && (!needle || item.title.toLowerCase().includes(needle)));
  }, [items, filter, q]);

  const stats = useMemo(() => ({
    total: items.length,
    movies: items.filter((i) => i.kind === 'MOVIE').length,
    series: items.filter((i) => i.kind === 'SERIES').length,
    cartoons: items.filter((i) => i.kind === 'CARTOON').length,
    hidden: items.filter((i) => i.visibility === 'HIDDEN').length,
  }), [items]);

  const kindIcon = (kind: string) => (kind === 'MOVIE' ? <Film size={16} /> : kind === 'CARTOON' ? <Sparkles size={16} /> : <Tv2 size={16} />);
  const kindBadge = (kind: string) => (
    <Badge tone={kind === 'MOVIE' ? 'violet' : kind === 'CARTOON' ? 'amber' : 'green'}>
      {kind === 'MOVIE' ? t('admin.movie') : kind === 'CARTOON' ? t('admin.cartoon') : t('admin.series')}
    </Badge>
  );

  const startEdit = (item: CinemaAdminItem) => {
    setEditingId(item.id);
    setForm({ title: item.title, kind: item.kind, url: item.externalUrl || '', q720: item.qualitySources?.['720p'] || '', q1080: item.qualitySources?.['1080p'] || '', q2160: item.qualitySources?.['2160p'] || '', thumbnailUrl: item.thumbnailUrl || '', subtitlesUrl: item.subtitlesUrl || '', durationSec: item.durationSec ? String(item.durationSec) : '', description: item.description || '', visibility: item.visibility });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setVideoFile(null);
    setPosterFile(null);
  };

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('context', 'cinema');
    const uploaded = await api<{ asset: { id: string } }>('/api/video/assets', { method: 'POST', body: fd });
    return `/api/media/${uploaded.asset.id}`;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let externalUrl = form.url;
      let thumbnailUrl = form.thumbnailUrl;
      let subtitlesUrl = form.subtitlesUrl;
      if (videoFile) externalUrl = await uploadFile(videoFile);
      if (posterFile) thumbnailUrl = await uploadFile(posterFile);
      const body = JSON.stringify({
        title: form.title,
        kind: form.kind,
        externalUrl,
        qualitySources: { '720p': form.q720, '1080p': form.q1080, '2160p': form.q2160 },
        thumbnailUrl,
        subtitlesUrl,
        durationSec: Number(form.durationSec || 0),
        description: form.description,
        visibility: form.visibility,
      });
      if (editingId) {
        await api(`/api/admin/cinema/${editingId}`, { method: 'PATCH', body });
        toast(t('admin.cinemaSaved'), 'ok');
      } else {
        await api('/api/admin/cinema', { method: 'POST', body });
        toast(t('admin.cinemaPublished'), 'ok');
      }
      resetForm();
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openSeriesEpisodes = async (item: CinemaAdminItem) => {
    setEpisodesForId(item.id);
    const result = await api<{ episodes: SeriesEpisode[] }>(`/api/admin/cinema/${item.id}/episodes`);
    setSeriesEpisodes(result.episodes || []);
  };

  const editSeriesEpisode = (episode: SeriesEpisode) => {
    setEditingSeriesEpisode(episode.id);
    setSeriesEpisodeForm({ season: String(episode.season), number: String(episode.number), title: episode.title, url: episode.externalUrl || '', q720: episode.qualitySources?.['720p'] || '', q1080: episode.qualitySources?.['1080p'] || '', q2160: episode.qualitySources?.['2160p'] || '', thumbnailUrl: episode.thumbnailUrl || '', subtitlesUrl: episode.subtitlesUrl || '', durationSec: episode.durationSec ? String(episode.durationSec) : '' });
  };

  const saveSeriesEpisode = async (event: FormEvent) => {
    event.preventDefault();
    if (episodesForId === null) return;
    setSaving(true);
    try {
      let externalUrl = seriesEpisodeForm.url;
      if (seriesEpisodeFile) externalUrl = await uploadFile(seriesEpisodeFile);
      const body = JSON.stringify({ season: Number(seriesEpisodeForm.season), number: Number(seriesEpisodeForm.number), title: seriesEpisodeForm.title, externalUrl, qualitySources: { '720p': seriesEpisodeForm.q720, '1080p': seriesEpisodeForm.q1080, '2160p': seriesEpisodeForm.q2160 }, thumbnailUrl: seriesEpisodeForm.thumbnailUrl, subtitlesUrl: seriesEpisodeForm.subtitlesUrl, durationSec: Number(seriesEpisodeForm.durationSec || 0) });
      const url = `/api/admin/cinema/${episodesForId}/episodes`;
      await api(editingSeriesEpisode ? `${url}/${editingSeriesEpisode}` : url, { method: editingSeriesEpisode ? 'PATCH' : 'POST', body });
      setSeriesEpisodeForm({ season: '1', number: '', title: '', url: '', q720: '', q1080: '', q2160: '', thumbnailUrl: '', subtitlesUrl: '', durationSec: '' });
      setSeriesEpisodeFile(null);
      setEditingSeriesEpisode(null);
      await openSeriesEpisodes(items.find((i) => i.id === episodesForId)!);
      load();
    } catch (error) { toast(error instanceof Error ? error.message : t('admin.publishError'), 'error'); }
    finally { setSaving(false); }
  };

  const deleteSeriesEpisode = (episode: SeriesEpisode) => ask(t('admin.remove'), t('admin.animeEpisodeDelConfirm'), () => {
    if (episodesForId === null) return;
    void api(`/api/admin/cinema/${episodesForId}/episodes/${episode.id}`, { method: 'DELETE' }).then(() => openSeriesEpisodes(items.find((i) => i.id === episodesForId)!)).catch((error) => toast(error instanceof Error ? error.message : t('admin.removeError'), 'error'));
  });

  const setVisibility = async (item: CinemaAdminItem, visibility: 'PUBLIC' | 'HIDDEN') => {
    try {
      await api(`/api/admin/cinema/${item.id}`, { method: 'PATCH', body: JSON.stringify({ visibility }) });
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    }
  };

  const remove = (id: number, title: string) => {
    void api(`/api/admin/cinema/${id}`, { method: 'DELETE' })
      .then(() => load())
      .catch((error) => toast(error instanceof Error ? error.message : t('admin.removeError'), 'error'));
  };

  const addSamples = async () => {
    setSaving(true);
    try {
      await api('/api/admin/cinema', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Spider-Man: New Brand',
          kind: 'MOVIE',
          description: 'A brand-new Spider-Man adventure built for the Cinema Hub — ready for a dedicated player soon.',
          externalUrl: '',
          durationSec: 0,
          visibility: 'PUBLIC',
        }),
      });
      await api('/api/admin/cinema', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Spider-Verse: Origins',
          kind: 'SERIES',
          description: 'A series that explores every corner of the Spider-Verse. Episodes arrive with the dedicated player.',
          externalUrl: '',
          durationSec: 0,
          visibility: 'PUBLIC',
        }),
      });
      toast(t('admin.cinemaSamplesAdded'), 'ok');
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-cinema-root">
      <div className="admin-stat-grid">
        <StatCard icon={<Film size={16} />} label={t('admin.movie')} value={stats.movies} tone="violet" />
        <StatCard icon={<Tv2 size={16} />} label={t('admin.series')} value={stats.series} tone="green" />
        <StatCard icon={<Sparkles size={16} />} label={t('admin.cartoon')} value={stats.cartoons} tone="amber" />
        <StatCard icon={<EyeOff size={16} />} label={t('admin.cinemaHidden')} value={stats.hidden} tone="amber" />
        <StatCard icon={<Clapperboard size={16} />} label={t('admin.publishedTitles')} value={stats.total} tone="steel" />
      </div>

      <form className="admin-card admin-cinema-form" onSubmit={submit}>
        <div className="admin-card-head">
          <div>
            <h3>{editingId ? <><Pencil size={15} /> {t('admin.cinemaEditing')}</> : <><Plus size={15} /> {t('admin.cinemaNewTitle')}</>}</h3>
            <p className="admin-dim">{t('admin.cinemaCatalogueHint')}</p>
          </div>
          {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}><X size={14} /> {t('admin.cancel')}</button>}
        </div>
        <div className="admin-form-grid">
          <label>{t('admin.cinemaTitle')}<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>{t('admin.cinemaType')}<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="MOVIE">{t('admin.movie')}</option><option value="SERIES">{t('admin.series')}</option><option value="CARTOON">{t('admin.cartoon')}</option></select></label>
          <label>{t('admin.cinemaVideoOptional')}<input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…/movie.mp4" /></label>
          <label className="admin-file-field"><span><Upload size={13} /> Upload video</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />{videoFile && <small>{videoFile.name}</small>}</label>
          <label>{t('admin.thumbnailUrl')}<input type="url" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} /></label>
          <label className="admin-file-field"><span><Upload size={13} /> Upload poster</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)} />{posterFile && <small>{posterFile.name}</small>}</label>
          <label>{t('admin.cinemaSubtitlesUrl')}<input type="url" value={form.subtitlesUrl} onChange={(e) => setForm({ ...form, subtitlesUrl: e.target.value })} /></label>
          <label>{t('admin.durationSeconds')}<input type="number" min="0" value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: e.target.value })} /></label>
          <label>{t('admin.cinemaVisibility')}<select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="PUBLIC">{t('admin.public')}</option><option value="HIDDEN">{t('admin.cinemaHidden')}</option></select></label>
          <label className="admin-form-wide">{t('admin.description')}<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        </div>
        <div className="admin-form-actions">
          <button className="btn btn-violet" disabled={saving}><Film size={15} /> {saving ? t('admin.publishing') : editingId ? t('admin.cinemaSave') : t('admin.publishTitle')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => void addSamples()} disabled={saving}><Sparkles size={15} /> {t('admin.cinemaSamples')}</button>
        </div>
      </form>

      <div className="admin-card admin-table-card">
        <div className="admin-card-head">
          <h3>{t('admin.publishedTitles')}</h3>
          <span className="admin-count">{filtered.length}</span>
        </div>
        <div className="admin-cinema-filters">
          {(['ALL', 'MOVIE', 'SERIES', 'CARTOON'] as Filter[]).map((value) => (
            <button key={value} type="button" className={`admin-chip ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>
              {value === 'ALL' ? t('admin.cinemaAll') : value === 'MOVIE' ? t('admin.movie') : value === 'SERIES' ? t('admin.series') : t('admin.cartoon')}
            </button>
          ))}
          <input className="admin-cinema-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.cinemaSearch')} />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {loading && <LoadingRow text={t('admin.loadingCinema')} />}
              {!loading && filtered.length === 0 && <EmptyRow text={t('admin.noCinemaTitles')} />}
              {filtered.map((item) => (
                <tr key={item.id} className={item.visibility === 'HIDDEN' ? 'admin-hidden-row' : ''}>
                  <td><div className="admin-cinema-thumb">{item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" fill unoptimized loading="lazy" /> : kindIcon(item.kind)}</div></td>
                  <td><b>{item.title}</b><div className="admin-dim">{kindBadge(item.kind)}{item.visibility === 'HIDDEN' && <Badge tone="amber">{t('admin.cinemaHidden')}</Badge>}</div></td>
                  <td className="admin-ellipsis">{item.description || '—'}</td>
                  <td className="admin-nowrap">{item.externalUrl ? <span className="admin-ok-dot" /> : <span className="admin-pending-dot" />}{item.externalUrl ? 'Video' : 'Soon'}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon" onClick={() => startEdit(item)} title="Edit"><Pencil size={14} /></button>
                      {item.kind === 'SERIES' && <button className="btn-icon" onClick={() => void openSeriesEpisodes(item)} title={t('admin.manageEpisodes')}><Tv2 size={14} /></button>}
                      <button className="btn-icon" onClick={() => void setVisibility(item, item.visibility === 'HIDDEN' ? 'PUBLIC' : 'HIDDEN')} title={item.visibility === 'HIDDEN' ? t('admin.cinemaShow') : t('admin.cinemaHide')}>
                        {item.visibility === 'HIDDEN' ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button className="btn-icon danger" onClick={() => ask(t('admin.remove'), t('admin.cinemaDelConfirm'), () => remove(item.id, item.title))} title={t('admin.remove')}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {episodesForId !== null && (
        <div className="anime-backdrop" onMouseDown={() => setEpisodesForId(null)}>
          <section className="anime-episode-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-card-head">
              <h3><Tv2 size={15} /> {t('admin.manageEpisodes')}</h3>
              <button className="btn-icon" onClick={() => setEpisodesForId(null)}><X size={14} /></button>
            </div>
            <form className="admin-form-grid admin-anime-episode-form" onSubmit={saveSeriesEpisode}>
              <label>{t('admin.animeSeason')}<input type="number" min="1" max="999" required value={seriesEpisodeForm.season} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, season: e.target.value })} /></label>
              <label>{t('admin.animeEpisodeNumber')}<input type="number" min="1" max="9999" required value={seriesEpisodeForm.number} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, number: e.target.value })} /></label>
              <label>{t('admin.animeEpisodeTitle')}<input value={seriesEpisodeForm.title} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, title: e.target.value })} /></label>
              <label>{t('admin.cinemaVideoOptional')}<input type="url" value={seriesEpisodeForm.url} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, url: e.target.value })} /></label>
              <label className="admin-file-field"><span><Upload size={13} /> {t('admin.animeUploadEpisode')}</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setSeriesEpisodeFile(e.target.files?.[0] ?? null)} />{seriesEpisodeFile && <small>{seriesEpisodeFile.name}</small>}</label>
              <label>{t('admin.quality720')}<input type="url" value={seriesEpisodeForm.q720} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, q720: e.target.value })} /></label>
              <label>{t('admin.quality1080')}<input type="url" value={seriesEpisodeForm.q1080} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, q1080: e.target.value })} /></label>
              <label>{t('admin.quality2160')}<input type="url" value={seriesEpisodeForm.q2160} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, q2160: e.target.value })} /></label>
              <label>{t('admin.cinemaSubtitlesUrl')}<input type="url" value={seriesEpisodeForm.subtitlesUrl} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, subtitlesUrl: e.target.value })} /></label>
              <label>{t('admin.durationSeconds')}<input type="number" min="0" value={seriesEpisodeForm.durationSec} onChange={(e) => setSeriesEpisodeForm({ ...seriesEpisodeForm, durationSec: e.target.value })} /></label>
              <div className="admin-form-actions admin-form-wide">
                {editingSeriesEpisode && <button type="button" className="btn btn-ghost" onClick={() => { setEditingSeriesEpisode(null); setSeriesEpisodeForm({ season: '1', number: '', title: '', url: '', q720: '', q1080: '', q2160: '', thumbnailUrl: '', subtitlesUrl: '', durationSec: '' }); }}>{t('admin.cancel')}</button>}
                <button className="btn btn-violet" disabled={saving}>{saving ? t('admin.publishing') : editingSeriesEpisode ? t('admin.animeEpisodeSave') : <><Plus size={14} /> {t('admin.animeEpisodeAdd')}</>}</button>
              </div>
            </form>
            <div className="admin-table-wrap" style={{ marginTop: 14 }}>
              <table className="admin-table"><thead><tr><th>{t('admin.animeSeason')}</th><th>#</th><th>{t('admin.animeEpisodeTitle')}</th><th>Video</th><th /></tr></thead>
                <tbody>{seriesEpisodes.map((episode) => <tr key={episode.id}><td>{episode.season}</td><td>{episode.number}</td><td>{episode.title}</td><td>{episode.externalUrl ? <span className="admin-ok-dot" /> : <span className="admin-pending-dot" />}</td><td><div className="admin-row-actions"><button className="btn-icon" onClick={() => editSeriesEpisode(episode)}><Pencil size={14} /></button><button className="btn-icon danger" onClick={() => deleteSeriesEpisode(episode)}><Trash2 size={14} /></button></div></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {confirm && <ConfirmModal confirm={confirm} close={close} />}
    </div>
  );
}