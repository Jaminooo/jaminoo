'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { JaminoAvatar, AVATAR_PRESETS } from '@/components/jamino-avatar';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { uidDisplay } from '@/store/app-store';
import { MAX_PROFILE_MEDIA } from '@/lib/constants';
import { Copy, Check, Lock, Upload, X, Star } from 'lucide-react';

interface MediaItem {
  id: string;
  mime: string;
  size: number;
  createdAt: string;
  url: string;
  isProfile: boolean;
}

export function ProfilePanel() {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const setMe = useAppStore((s) => s.setMe);
  const [username, setUsername] = useState(me?.username ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [copied, setCopied] = useState(false);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    api<{ media: MediaItem[] }>('/api/media').then((d) => setMedia(d.media)).catch(() => {});
  }, []);

  if (!me) return null;

  const saveDetails = async () => {
    try {
      const res = await api<{ user: typeof me }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ username, email, bio }),
      });
      setMe(res.user);
      toast(t('toast.saved'));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const pickAvatar = async (avatarId: number) => {
    try {
      await api('/api/profile/avatar', { method: 'PATCH', body: JSON.stringify({ avatarId }) });
      await api('/api/profile/photo', { method: 'DELETE' }).catch(() => {});
      setMe({ ...me, avatarId, avatarPhoto: null });
      setMedia((p) => p.map((m) => ({ ...m, isProfile: false })));
      toast(t('toast.avatarUpdated'));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const setProfile = async (id: string) => {
    try {
      const res = await api<{ avatarPhoto: string }>('/api/profile/photo', {
        method: 'POST',
        body: JSON.stringify({ mediaId: id }),
      });
      setMe({ ...me, avatarPhoto: res.avatarPhoto });
      setMedia((p) => p.map((m) => ({ ...m, isProfile: m.id === id })));
      toast(t('toast.avatarUpdated'));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const clearProfile = async () => {
    try {
      await api('/api/profile/photo', { method: 'DELETE' });
      setMe({ ...me, avatarPhoto: null });
      setMedia((p) => p.map((m) => ({ ...m, isProfile: false })));
      toast(t('toast.avatarUpdated'));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(uidDisplay(me.id));
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    toast(t('toast.copy', { id: uidDisplay(me.id) }));
    setTimeout(() => setCopied(false), 1600);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast(t('toast.shortPassword'), 'error');
    if (pw.next !== pw.confirm) return toast(t('toast.noMatch'), 'error');
    try {
      await api('/api/profile/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }) });
      toast(t('toast.passwordChanged'));
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast(err instanceof Error ? (err.message === 'Current password is wrong' ? t('toast.wrongPassword') : err.message) : t('toast.unknownError'), 'error');
    }
  };

  const upload = async (files: FileList | File[]) => {
    const remaining = MAX_PROFILE_MEDIA - media.length;
    if (remaining <= 0) return toast(t('media.dropHint'), 'error');
    const list = Array.from(files).slice(0, remaining);
    for (const f of list) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await api<{ media: MediaItem }>('/api/media', { method: 'POST', body: fd });
        setMedia((p) => [res.media, ...p]);
      } catch (err) {
        toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
      }
    }
  };

  const removeMedia = async (id: string) => {
    try {
      await api(`/api/media/${id}`, { method: 'DELETE' });
      setMedia((p) => p.filter((m) => m.id !== id));
      if (me.avatarPhoto?.endsWith(`/${id}`)) {
        setMe({ ...me, avatarPhoto: null });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  return (
    <>
      <header className="pane-head">
        <div>
          <h2 className="pane-title">{t('panel.profile')}</h2>
          <p className="pane-sub">{t('panel.profileSub')}</p>
        </div>
      </header>

      <div className="grid-2">
        {/* Avatar card */}
        <section className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 4 }}>{t('profile.avatar')}</h3>
          <p className="pane-sub" style={{ marginTop: 0, marginBottom: 16 }}>{t('profile.avatarHint')}</p>
          <div className="avatar-preview" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <JaminoAvatar avatarId={me.avatarId} size={64} photo={me.avatarPhoto} name={me.username} />
            <div style={{ fontSize: 13, color: 'var(--color-fog)', display: 'grid', gap: 8 }}>
              <span>{me.avatarPhoto ? t('media.photoActive') : t('media.presetActive')}</span>
              {me.avatarPhoto && (
                <button type="button" className="btn btn-ghost pill-sm" style={{ width: 'max-content' }} onClick={clearProfile}>
                  {t('media.clearPhoto')}
                </button>
              )}
            </div>
          </div>
          <div className="avatar-picker">
            {AVATAR_PRESETS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                className={`avatar-opt ${!me.avatarPhoto && me.avatarId === i ? 'selected' : ''}`}
                onClick={() => pickAvatar(i)}
                title={p.name}
              >
                <JaminoAvatar avatarId={i} size={64} name={p.name} />
                <span className="avatar-opt-label">{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Details card */}
        <section className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 16 }}>{t('profile.details')}</h3>
          <div className="field" style={{ marginBottom: 14 }}>
            <span className="field-label">
              {t('profile.myId')} <span style={{ opacity: 0.6, fontWeight: 400 }}>— {t('profile.idHint')}</span>
            </span>
            <div className="id-row">
              <span className="id-code">{uidDisplay(me.id)}</span>
              <button type="button" className="btn-icon" onClick={copyId} title="Copy">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <span className="field-label">{t('auth.username')}</span>
            <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <span className="field-label">{t('auth.email')}</span>
            <input className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <span className="field-label">{t('profile.bio')}</span>
            <textarea className="auth-input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('profile.bioPlaceholder')} rows={2} style={{ resize: 'none' }} />
          </div>
          <button type="button" className="btn btn-violet" onClick={saveDetails}>
            {t('profile.saveChanges')}
          </button>
        </section>
      </div>

      <div className="grid-2" style={{ marginTop: 0 }}>
        {/* Password */}
        <section className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={16} /> {t('profile.changePassword')}
          </h3>
          {me.github ? (
            <p className="pane-sub" style={{ marginTop: 0 }}>{t('toast.passwordChangedGitHub')}</p>
          ) : (
            <form onSubmit={changePassword} className="auth-form">
              <div className="field">
                <span className="field-label">{t('profile.currentPassword')}</span>
                <input className="auth-input" type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="field">
                <span className="field-label">{t('profile.newPassword')}</span>
                <input className="auth-input" type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
              </div>
              <div className="field">
                <span className="field-label">{t('profile.confirmPassword')}</span>
                <input className="auth-input" type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-ghost">
                {t('profile.saveChanges')}
              </button>
            </form>
          )}
        </section>

        {/* Media */}
        <section className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} /> {t('media.profilePhotos')}
          </h3>
          <div className="media-card">
            <div
              className={`media-dropzone ${dragOver ? 'active' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
              }}
            >
              <Upload size={18} />
              <span style={{ fontSize: 13 }}>{t('media.dropHint')}</span>
              <span className="media-hint">
                {t('media.photosCount', { current: media.length, max: MAX_PROFILE_MEDIA })}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
                e.target.value = '';
              }}
            />
            {media.length > 0 && (
              <div className="media-grid">
                {media.map((m) => (
                  <div key={m.id} className="media-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" />
                    <button
                      type="button"
                      className={`media-set ${m.isProfile ? 'active' : ''}`}
                      onClick={() => (m.isProfile ? clearProfile() : setProfile(m.id))}
                      title={t('media.setAsPhoto')}
                    >
                      <Star size={12} fill={m.isProfile ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" className="media-remove" onClick={() => removeMedia(m.id)} title={t('media.removePhoto')}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}