'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { MUSIC_GENRES } from '@/lib/constants';
import { ImagePlus, Loader2, Music2, UploadCloud, X } from 'lucide-react';

export function useUpload(kind: 'audio' | 'cover') {
  const t = useTranslations();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File): Promise<string | null> => {
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const d = await api<{ ok: boolean; fileName: string }>('/api/admin/music/upload', { method: 'POST', body: fd });
      return d.fileName;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('toast.unknownError'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, upload };
}

export function CoverField({
  value,
  onChange,
  previewUrl,
}: {
  value: string;
  onChange: (v: string) => void;
  previewUrl?: string | null;
}) {
  const t = useTranslations();
  const { uploading, error, upload } = useUpload('cover');
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = previewUrl || null;

  const pick = async (f: File | null) => {
    if (!f) return;
    const name = await upload(f);
    if (name) onChange(name);
  };

  return (
    <div className="admin-upload-field">
      <div className={`admin-upload-thumb ${shown ? 'has' : ''}`}>
        {shown ? <img src={shown} alt="" loading="lazy" /> : <ImagePlus size={18} />}
      </div>
      <div className="admin-upload-actions">
        <button className="btn btn-ghost pill-sm" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="spin" size={13} /> : <UploadCloud size={13} />} {t('admin.music.uploadCover')}
        </button>
        {value ? (
          <button className="btn btn-ghost pill-sm" type="button" onClick={() => onChange('')}>
            <X size={13} /> clear
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      {error && <span className="admin-form-error">{error}</span>}
    </div>
  );
}

export function AudioField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations();
  const { uploading, error, upload } = useUpload('audio');
  const inputRef = useRef<HTMLInputElement>(null);

  const notUploaded = value && !value.startsWith('http');

  const pick = async (f: File | null) => {
    if (!f) return;
    const name = await upload(f);
    if (name) onChange(name);
  };

  return (
    <div className="admin-upload-field">
      <div className="admin-audio-file">
        {value ? (
          <>
            <Music2 size={14} />
            <span className="admin-mono">{value}</span>
          </>
        ) : (
          <span className="admin-dim">{t('admin.music.noAudio')}</span>
        )}
      </div>
      <div className="admin-upload-actions">
        <button className="btn btn-ghost pill-sm" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="spin" size={13} /> : <UploadCloud size={13} />} {t('admin.music.uploadAudio')}
        </button>
        {notUploaded ? <span className="admin-dim" style={{ fontSize: 12 }}>{value}</span> : null}
      </div>
      <input ref={inputRef} type="file" accept="audio/*" hidden onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      {error && <span className="admin-form-error">{error}</span>}
      {value?.startsWith('/') && (
        <audio controls src={value} preload="none" style={{ height: 34, marginTop: 6, width: '100%' }} />
      )}
    </div>
  );
}

export function GenreChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const toggle = (g: string) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <div className="admin-genres">
      <div className="admin-chips">
        {MUSIC_GENRES.map((g) => (
          <button key={g} type="button" className={`pill-sm ${value.includes(g) ? 'on' : ''}`} onClick={() => toggle(g)}>
            {g}
          </button>
        ))}
      </div>
      <form
        className="admin-genre-add"
        onSubmit={(e) => {
          e.preventDefault();
          const g = custom.trim();
          if (g && !value.includes(g)) onChange([...value, g]);
          setCustom('');
        }}
      >
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="add custom genre" />
        <button type="submit" className="btn btn-ghost pill-sm">+</button>
      </form>
      {value.filter((g) => !MUSIC_GENRES.includes(g)).map((g) => (
        <span key={g} className="pill-sm on admin-genre-custom">
          {g} <button type="button" onClick={() => toggle(g)}><X size={11} /></button>
        </span>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="admin-form-field">
      <span className="admin-form-label">{label}</span>
      {children}
      {hint ? <span className="admin-form-hint">{hint}</span> : null}
    </label>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="admin-form-row">{children}</div>;
}

export interface Option {
  id: number;
  name: string;
}

export function useOptions(path: string) {
  const [options, setOptions] = useState<Option[]>([]);
  const reload = () => {
    api<{ rows: Option[] }>(`${path}?per=500`)
      .then((d) => setOptions(d.rows))
      .catch(() => {});
  };
  useEffect(reload, [path]);
  return { options, reload };
}

export function SelectLabel({ value, label, onChange, options }: { value: string; label: string; onChange: (v: string) => void; options: ReactNode[] }) {
  return (
    <label className="admin-form-field">
      <span className="admin-form-label">{label}</span>
      <select className="admin-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options}
      </select>
    </label>
  );
}