'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Film, Grid2X2, ListPlus, Palette, Pencil, Plus, Star, Trash2, Tv2, Upload, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { connectLive, onLive } from '@/lib/live';
import { Badge, ConfirmModal, EmptyRow, LoadingRow, StatCard, useConfirm } from './admin-ui';
import { animePayload, ANIME_TYPES, ANIME_STATUSES } from '@/lib/anime';
import type { QualitySources } from '@/lib/watch-select';

interface AnimeAdminItem {
  id: number;
  slug: string;
  title: string;
  original: string;
  overview: string;
  coverUrl: string | null;
  trailerUrl: string;
  type: string;
  status: string;
  year: number;
  episodes: number;
  rating: number;
  genres: string[];
  studio: string;
  colorFrom: number;
  colorTo: number;
  visibility: string;
  episodeCount?: number;
}

interface EpisodeAdminItem {
  id: number;
  season: number;
  number: number;
  title: string;
  slug: string;
  externalUrl: string | null;
  qualitySources: QualitySources;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  original: '',
  type: 'TV',
  status: 'FINISHED',
  year: '',
  episodes: '',
  rating: '',
  studio: '',
  genres: '',
  coverUrl: '',
  trailerUrl: '',
  overview: '',
  colorFrom: '260',
  colorTo: '340',
  visibility: 'PUBLIC',
};

export function AdminAnime() {
  const t = useTranslations();
  const [items, setItems] = useState<AnimeAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [episodesOpenId, setEpisodesOpenId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeAdminItem[]>([]);
  const [epLoading, setEpLoading] = useState(false);
  const [epForm, setEpForm] = useState({ season: '1', number: '', title: '', slug: '', url: '', q720: '', q1080: '', q2160: '', thumbnailUrl: '', subtitlesUrl: '', durationSec: '' });
  const [epFile, setEpFile] = useState<File | null>(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState<number | null>(null);
  const { confirm, ask, close } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (filterType) params.set('type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    if (filterVisibility) params.set('visibility', filterVisibility);
    api<{ items: AnimeAdminItem[] }>(`/api/admin/anime?${params.toString()}`)
      .then((data) => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus, filterType, filterVisibility, q]);
  useEffect(load, [load]);
  useEffect(() => {
    connectLive();
    return onLive('anime:update', () => load());
  }, [load]);

  const filtered = items;

  const stats = useMemo(
    () => ({
      total: items.length,
      series: items.filter((i) => i.type === 'TV').length,
      movies: items.filter((i) => i.type === 'MOVIE').length,
      hidden: items.filter((i) => i.visibility === 'HIDDEN').length,
      episodes: items.reduce((sum, a) => sum + (a.episodeCount ?? 0), 0),
    }),
    [items]
  );

  const startEdit = (item: AnimeAdminItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      original: item.original,
      type: item.type,
      status: item.status,
      year: item.year ? String(item.year) : '',
      episodes: item.episodes ? String(item.episodes) : '',
      rating: item.rating ? String(item.rating) : '',
      studio: item.studio,
      genres: item.genres.join(', '),
      coverUrl: item.coverUrl || '',
      trailerUrl: item.trailerUrl || '',
      overview: item.overview,
      colorFrom: String(item.colorFrom ?? 260),
      colorTo: String(item.colorTo ?? 340),
      visibility: item.visibility,
    });
    setCoverFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
  };

  const uploadCover = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('context', 'anime');
    const uploaded = await api<{ asset: { id: string; url: string } }>('/api/video/assets', { method: 'POST', body: fd });
    return uploaded.asset.url;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let coverUrl = form.coverUrl;
      if (coverFile) coverUrl = await uploadCover(coverFile);
      const body = JSON.stringify({
        title: form.title,
        slug: form.slug,
        original: form.original,
        type: form.type,
        status: form.status,
        year: Number(form.year || 0),
        episodes: Number(form.episodes || 0),
        rating: Number(form.rating || 0),
        studio: form.studio,
        genres: form.genres ? form.genres.split(',').map((g) => g.trim()).filter(Boolean) : [],
        coverFile: coverUrl,
        trailerUrl: form.trailerUrl,
        overview: form.overview,
        colorFrom: Number(form.colorFrom || 260),
        colorTo: Number(form.colorTo || 340),
        visibility: form.visibility,
      });
      if (editingId) {
        await api(`/api/admin/anime/${editingId}`, { method: 'PATCH', body });
        toast(t('admin.animeSaved'), 'ok');
      } else {
        await api('/api/admin/anime', { method: 'POST', body });
        toast(t('admin.animePublished'), 'ok');
      }
      resetForm();
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setVisibility = async (item: AnimeAdminItem, visibility: 'PUBLIC' | 'HIDDEN') => {
    try {
      await api(`/api/admin/anime/${item.id}`, { method: 'PATCH', body: JSON.stringify({ visibility }) });
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    }
  };

  const remove = (id: number, title: string) =>
    ask(t('admin.remove'), t('admin.animeDelConfirm'), () => {
      void api(`/api/admin/anime/${id}`, { method: 'DELETE' })
        .then(() => load())
        .catch((error) => toast(error instanceof Error ? error.message : t('admin.removeError'), 'error'));
    });

  const openEpisodes = async (item: AnimeAdminItem) => {
    setEpisodesOpenId(item.id);
    setEpisodes([]);
    setEpLoading(true);
    try {
      const data = await api<{ episodes: EpisodeAdminItem[] }>(`/api/admin/anime/${item.id}/episodes`);
      setEpisodes(data.episodes || []);
    } catch {
      setEpisodes([]);
    } finally {
      setEpLoading(false);
    }
  };
  const closeEpisodes = () => setEpisodesOpenId(null);

  const resetEpForm = () => {
    setEpForm({ season: '1', number: '', title: '', slug: '', url: '', q720: '', q1080: '', q2160: '', thumbnailUrl: '', subtitlesUrl: '', durationSec: '' });
    setEpFile(null);
    setEditingEpisodeId(null);
  };

  const startEditEpisode = (episode: EpisodeAdminItem) => {
    setEditingEpisodeId(episode.id);
    setEpForm({
      season: String(episode.season || 1), number: String(episode.number), title: episode.title,
      slug: episode.slug, url: episode.externalUrl || '', q720: episode.qualitySources?.['720p'] || '',
      q1080: episode.qualitySources?.['1080p'] || '', q2160: episode.qualitySources?.['2160p'] || '',
      thumbnailUrl: episode.thumbnailUrl || '', subtitlesUrl: episode.subtitlesUrl || '',
      durationSec: episode.durationSec ? String(episode.durationSec) : '',
    });
    setEpFile(null);
  };

  const uploadEpisodeVideo = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('context', 'anime');
    const uploaded = await api<{ asset: { url: string } }>('/api/video/assets', { method: 'POST', body: fd });
    return uploaded.asset.url;
  };

  const submitEpisode = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const externalUrl = epFile ? await uploadEpisodeVideo(epFile) : epForm.url;
      const body = JSON.stringify({
        season: Number(epForm.season || 1),
        number: Number(epForm.number || 0),
        title: epForm.title,
        slug: epForm.slug,
        externalUrl,
        qualitySources: { '720p': epForm.q720, '1080p': epForm.q1080, '2160p': epForm.q2160 },
        thumbnailUrl: epForm.thumbnailUrl,
        subtitlesUrl: epForm.subtitlesUrl,
        durationSec: Number(epForm.durationSec || 0),
      });
      const url = `/api/admin/anime/${episodesOpenId}/episodes`;
      await api(editingEpisodeId ? `${url}/${editingEpisodeId}` : url, { method: editingEpisodeId ? 'PATCH' : 'POST', body });
      toast(editingEpisodeId ? t('admin.animeEpisodeSaved') : t('admin.animeEpisodeAdded'), 'ok');
      resetEpForm();
      openEpisodes(items.find((i) => i.id === episodesOpenId)!);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.publishError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeEpisode = (id: number) =>
    ask(t('admin.remove'), t('admin.animeEpisodeDelConfirm'), () => {
      void api(`/api/admin/anime/${episodesOpenId}/episodes/${id}`, { method: 'DELETE' })
        .then(() => openEpisodes(items.find((i) => i.id === episodesOpenId)!))
        .catch((error) => toast(error instanceof Error ? error.message : t('admin.removeError'), 'error'));
    });

  return (
    <div className="admin-anime-root">
      <div className="admin-stat-grid">
        <StatCard icon={<Tv2 size={16} />} label={t('admin.series')} value={stats.series} tone="green" />
        <StatCard icon={<Film size={16} />} label={t('admin.movie')} value={stats.movies} tone="violet" />
        <StatCard icon={<Star size={16} />} label={t('admin.animeEpisodes')} value={stats.episodes} tone="amber" />
        <StatCard icon={<EyeOff size={16} />} label={t('admin.cinemaHidden')} value={stats.hidden} tone="amber" />
        <StatCard icon={<Grid2X2 size={16} />} label={t('admin.publishedTitles')} value={stats.total} tone="steel" />
      </div>

      <form className="admin-card admin-anime-form animate-fade" onSubmit={submit}>
        <div className="admin-card-head">
          <div>
            <h3>{editingId ? <><Pencil size={15} /> {t('admin.animeEditing')}</> : <><Plus size={15} /> {t('admin.animeNewTitle')}</>}</h3>
            <p className="admin-dim">{t('admin.animeCatalogueHint')}</p>
          </div>
          {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}><X size={14} /> {t('admin.cancel')}</button>}
        </div>
        <div className="admin-form-grid">
          <label>{t('admin.animeTitle')}<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>{t('admin.animeSlug')}<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="cowboy-bebop" /></label>
          <label>{t('admin.animeOriginal')}<input value={form.original} onChange={(e) => setForm({ ...form, original: e.target.value })} /></label>
          <label>{t('admin.animeType')}<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{ANIME_TYPES.map((v) => <option key={v} value={v}>{t(`admin.animeType_${v.toLowerCase()}`)}</option>)}</select></label>
          <label>{t('admin.animeStatus')}<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{ANIME_STATUSES.map((v) => <option key={v} value={v}>{t(`admin.animeStatus_${v.toLowerCase()}`)}</option>)}</select></label>
          <label>{t('admin.animeYear')}<input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
          <label>{t('admin.animeEpisodes')}<input type="number" min="0" value={form.episodes} onChange={(e) => setForm({ ...form, episodes: e.target.value })} /></label>
          <label>{t('admin.animeRating')}<input type="number" min="0" max="10" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></label>
          <label>{t('admin.animeStudio')}<input value={form.studio} onChange={(e) => setForm({ ...form, studio: e.target.value })} /></label>
          <label>{t('admin.animeGenres')}<input value={form.genres} onChange={(e) => setForm({ ...form, genres: e.target.value })} placeholder="Action, Sci-Fi, …" /></label>
          <label className="admin-file-field"><span><Palette size={13} /> Cover</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />{coverFile && <small>{coverFile.name}</small>}</label>
          {form.coverUrl && <label>{t('admin.animeCoverUrl')}<input type="url" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} /></label>}
          <label>{t('admin.animeTrailer')}<input type="url" value={form.trailerUrl} onChange={(e) => setForm({ ...form, trailerUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" /></label>
          <label style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><span style={{ fontSize: 12 }}>Colors</span><div style={{ display: 'flex', gap: 8 }}><input type="number" min="0" max="360" value={form.colorFrom} onChange={(e) => setForm({ ...form, colorFrom: e.target.value })} /><input type="number" min="0" max="360" value={form.colorTo} onChange={(e) => setForm({ ...form, colorTo: e.target.value })} /></div></label>
          <label>{t('admin.cinemaVisibility')}<select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="PUBLIC">{t('admin.public')}</option><option value="HIDDEN">{t('admin.cinemaHidden')}</option></select></label>
          <label className="admin-form-wide">{t('admin.animeOverview')}<textarea rows={3} value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} /></label>
        </div>
        <div className="admin-form-actions">
          <button className="btn btn-violet" disabled={saving}><Film size={15} /> {saving ? t('admin.publishing') : editingId ? t('admin.animeSave') : t('admin.publishTitle')}</button>
          {editingId && <button type="button" className="btn btn-ghost" onClick={() => void openEpisodes(items.find((i) => i.id === editingId)!)}><ListPlus size={15} /> {t('admin.animeEpisodes')}</button>}
        </div>
      </form>

      <div className="admin-card admin-table-card">
        <div className="admin-card-head">
          <h3>{t('admin.publishedTitles')}</h3>
          <span className="admin-count">{filtered.length}</span>
        </div>
        <div className="admin-cinema-filters">
          <input className="admin-cinema-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.animeSearch')} />
          <select className="admin-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter anime type">
            <option value="">All types</option>{ANIME_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select className="admin-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter anime status">
            <option value="">All statuses</option>{ANIME_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select className="admin-select" value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value)} aria-label="Filter anime visibility">
            <option value="">All visibility</option><option value="PUBLIC">PUBLIC</option><option value="HIDDEN">HIDDEN</option>
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {loading && <LoadingRow text={t('admin.loadingAnime')} />}
              {!loading && filtered.length === 0 && <EmptyRow text={t('admin.noAnimeTitles')} />}
              {filtered.map((item) => (
                <tr key={item.id} className={item.visibility === 'HIDDEN' ? 'admin-hidden-row' : ''}>
                  <td>
                    <div className="admin-cinema-thumb">
                      {item.coverUrl ? <Image src={item.coverUrl} alt="" fill unoptimized loading="lazy" /> : <Film size={16} />}
                    </div>
                  </td>
                  <td>
                    <b>{item.title}</b>
                    <div className="admin-dim">
                      <Badge tone={item.type === 'MOVIE' ? 'violet' : 'green'}>{item.type === 'MOVIE' ? t('admin.movie') : t('admin.series')}</Badge>
                      {item.visibility === 'HIDDEN' && <Badge tone="amber">{t('admin.cinemaHidden')}</Badge>}
                    </div>
                  </td>
                  <td className="admin-ellipsis">{item.studio || '—'}</td>
                  <td className="admin-nowrap">{item.rating ? `★ ${item.rating.toFixed(1)}` : '—'}</td>
                  <td className="admin-nowrap">{item.episodeCount ?? 0} eps</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon" onClick={() => startEdit(item)} title="Edit"><Pencil size={14} /></button>
                      <button className="btn-icon" onClick={() => void setVisibility(item, item.visibility === 'HIDDEN' ? 'PUBLIC' : 'HIDDEN')} title={item.visibility === 'HIDDEN' ? t('admin.cinemaShow') : t('admin.cinemaHide')}>
                        {item.visibility === 'HIDDEN' ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button className="btn-icon" onClick={() => remove(item.id, item.title)} title={t('admin.remove')}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {episodesOpenId !== null && (
        <div className="anime-backdrop" style={{ backdropFilter: 'blur(16px)' }} onMouseDown={closeEpisodes}>
          <section className="anime-episode-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-card-head">
              <h3><ListPlus size={15} /> {t('admin.animeEpisodes')}</h3>
              <button className="btn-icon" onClick={closeEpisodes}><X size={14} /></button>
            </div>

            <form className="admin-form-grid admin-anime-episode-form" onSubmit={submitEpisode}>
              <label>{t('admin.animeSeason')}<input type="number" min="1" max="999" required value={epForm.season} onChange={(e) => setEpForm({ ...epForm, season: e.target.value })} /></label>
              <label>{t('admin.animeEpisodeNumber')}<input type="number" min="1" max="9999" required value={epForm.number} onChange={(e) => setEpForm({ ...epForm, number: e.target.value })} /></label>
              <label>{t('admin.animeEpisodeTitle')}<input value={epForm.title} onChange={(e) => setEpForm({ ...epForm, title: e.target.value })} /></label>
              <label>{t('admin.animeEpisodeSlug')}<input value={epForm.slug} onChange={(e) => setEpForm({ ...epForm, slug: e.target.value })} /></label>
              <label>{t('admin.animeVideoOptional')}<input type="url" value={epForm.url} onChange={(e) => setEpForm({ ...epForm, url: e.target.value })} placeholder="https://?/ep01.mp4" /></label>
              <label className="admin-file-field"><span><Upload size={13} /> {t('admin.animeUploadEpisode')}</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setEpFile(e.target.files?.[0] ?? null)} />{epFile && <small>{epFile.name}</small>}</label>
              <label>{t('admin.quality720')}<input type="url" value={epForm.q720} onChange={(e) => setEpForm({ ...epForm, q720: e.target.value })} /></label>
              <label>{t('admin.quality1080')}<input type="url" value={epForm.q1080} onChange={(e) => setEpForm({ ...epForm, q1080: e.target.value })} /></label>
              <label>{t('admin.quality2160')}<input type="url" value={epForm.q2160} onChange={(e) => setEpForm({ ...epForm, q2160: e.target.value })} /></label>
              <label>{t('admin.thumbnailUrl')}<input type="url" value={epForm.thumbnailUrl} onChange={(e) => setEpForm({ ...epForm, thumbnailUrl: e.target.value })} /></label>
              <label>{t('admin.cinemaSubtitlesUrl')}<input type="url" value={epForm.subtitlesUrl} onChange={(e) => setEpForm({ ...epForm, subtitlesUrl: e.target.value })} /></label>
              <label>{t('admin.durationSeconds')}<input type="number" min="0" value={epForm.durationSec} onChange={(e) => setEpForm({ ...epForm, durationSec: e.target.value })} /></label>
              <div className="admin-form-actions admin-form-wide">
                {editingEpisodeId && <button type="button" className="btn btn-ghost" onClick={resetEpForm}>{t('admin.cancel')}</button>}
                <button className="btn btn-violet pill-sm" disabled={saving}>
                  {saving ? t('admin.publishing') : editingEpisodeId ? <><Pencil size={14} /> {t('admin.animeEpisodeSave')}</> : <><Plus size={14} /> {t('admin.animeEpisodeAdd')}</>}
                </button>
              </div>
            </form>

            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.animeSeason')}</th>
                    <th>#</th>
                    <th>{t('admin.animeEpisodeTitle')}</th>
                    <th>{t('admin.animeEpisodeSlug')}</th>
                    <th>{t('admin.durationSeconds')}</th>
                    <th><span className="admin-dim">URL</span></th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {epLoading && <LoadingRow text={t('admin.loadingAnime')} />}
                  {!epLoading && episodes.length === 0 && <EmptyRow text={t('admin.noAnimeTitles')} />}
                  {episodes.map((ep) => (
                    <tr key={ep.id}>
                      <td>{ep.season || 1}</td>
                      <td>{ep.number}</td>
                      <td className="admin-ellipsis">{ep.title || `Episode ${ep.number}`}</td>
                      <td className="admin-dim">{ep.slug || '—'}</td>
                      <td className="admin-nowrap">{ep.durationSec ? `${Math.floor(ep.durationSec / 60)}:${String(Math.floor(ep.durationSec % 60)).padStart(2, '0')}` : '—'}</td>
                      <td className="admin-ellipsis">{ep.externalUrl ? <span className="admin-ok-dot" /> : <span className="admin-pending-dot" />}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button className="btn-icon" onClick={() => startEditEpisode(ep)} title="Edit"><Pencil size={14} /></button>
                          <button className="btn-icon danger" onClick={() => removeEpisode(ep.id)} title={t('admin.remove')}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {confirm && <ConfirmModal confirm={confirm} close={close} />}
    </div>
  );
}
