'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeCheck, CheckCircle2, Clock3, ExternalLink, Send, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { WorkspaceErrorState } from '@/components/workspace-feedback';

export type CreatorHub = 'VIDEO' | 'MUSIC';

interface CreatorApplication {
  id: number;
  hub: CreatorHub;
  channelName: string;
  handle: string;
  bio: string;
  category: string;
  links: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export function CreatorApplyModal({ hub, open, onClose, onSubmitted }: { hub: CreatorHub; open: boolean; onClose: () => void; onSubmitted?: (application: CreatorApplication) => void }) {
  const t = useTranslations();
  const [application, setApplication] = useState<CreatorApplication | null>(null);
  const [channelName, setChannelName] = useState('');
  const [handle, setHandle] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api<{ applications: CreatorApplication[] }>(`/api/creator/apply?hub=${hub}`);
      const current = data.applications[0] ?? null;
      setApplication(current);
      if (current) {
        setChannelName(current.channelName);
        setHandle(current.handle);
        setCategory(current.category);
        setBio(current.bio);
        setLinks(current.links.join('\n'));
      } else {
        setChannelName('');
        setHandle('');
        setCategory('');
        setBio('');
        setLinks('');
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [hub]);

  useEffect(() => {
    if (!open) return;
    void loadApplication();
  }, [hub, open, loadApplication]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ application: CreatorApplication }>('/api/creator/apply', {
        method: isApproved ? 'PUT' : 'POST',
        body: JSON.stringify({ hub, channelName, handle, category, bio, links }),
      });
      setApplication(data.application);
      onSubmitted?.(data.application);
      toast('Creator application sent for review.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not submit application.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const isMusic = hub === 'MUSIC';
  const isApproved = application?.status === 'APPROVED';
  const isPending = application?.status === 'PENDING';

  return (
    <div className="creator-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="creator-modal" role="dialog" aria-modal="true" aria-labelledby="creator-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="creator-modal-head">
          <div className="creator-modal-title-wrap">
            <span className="creator-modal-icon"><Sparkles size={18} /></span>
            <div>
              <div className="hub-kicker">{t(isMusic ? 'creatorApply.musicKicker' : 'creatorApply.videoKicker')}</div>
              <h2 id="creator-modal-title">{t(isMusic ? 'creatorApply.musicTitle' : 'creatorApply.videoTitle')}</h2>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('creatorApply.close')}><X size={18} /></button>
        </header>

        <div className="creator-modal-body">
          <div className="creator-modal-intro">
            <p>{t('creatorApply.intro')}</p>
            {isApproved && <span className="creator-status approved"><BadgeCheck size={14} /> {t('creatorApply.approved')}</span>}
            {isPending && <span className="creator-status pending"><Clock3 size={14} /> {t('creatorApply.pending')}</span>}
            {application?.status === 'REJECTED' && <span className="creator-status rejected">{t('creatorApply.rejected')}{application.reviewNote ? ` · ${application.reviewNote}` : ''}</span>}
          </div>

          {loading ? <div className="creator-modal-loading"><span className="admin-loader" /> {t('creatorApply.loading')}</div> : loadError ? <WorkspaceErrorState message={t('toast.unknownError')} retryLabel={t('admin.refresh')} onRetry={() => void loadApplication()} /> : (
            <form className="creator-form" onSubmit={submit}>
              <div className="creator-form-grid">
                <label><span>{t('creatorApply.channelName')}</span><input required value={channelName} onChange={(event) => setChannelName(event.target.value)} maxLength={80} placeholder={t(isMusic ? 'creatorApply.musicNamePlaceholder' : 'creatorApply.videoNamePlaceholder')} /></label>
                <label><span>{t('creatorApply.handle')}</span><input required value={handle} onChange={(event) => setHandle(event.target.value.replace(/^@+/, ''))} maxLength={40} placeholder="creator.handle" /></label>
                <label><span>{t('creatorApply.category')}</span><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder={t(isMusic ? 'creatorApply.musicCategoryPlaceholder' : 'creatorApply.videoCategoryPlaceholder')} /></label>
                <label className="creator-form-wide"><span>{t('creatorApply.bio')}</span><textarea required value={bio} onChange={(event) => setBio(event.target.value)} maxLength={700} rows={4} placeholder={t('creatorApply.bioPlaceholder')} /></label>
                <label className="creator-form-wide"><span>{t('creatorApply.links')} <small>{t('creatorApply.onePerLine')}</small></span><textarea value={links} onChange={(event) => setLinks(event.target.value)} rows={3} placeholder={t('creatorApply.linksPlaceholder')} /></label>
              </div>
              <div className="creator-form-foot">
                <span><ExternalLink size={13} /> {t('creatorApply.updatePending')}</span>
                <button type="submit" className="btn btn-violet" disabled={saving}>{saving ? t('creatorApply.saving') : isApproved ? t('creatorApply.saveProfile') : isPending ? t('creatorApply.updateApplication') : <><Send size={14} /> {t('creatorApply.sendForReview')}</>}</button>
              </div>
            </form>
          )}

          {isApproved && <div className="creator-approved-note"><CheckCircle2 size={20} /><div><b>{t('creatorApply.readyTitle')}</b><span>{t('creatorApply.readyBody')}</span></div></div>}
        </div>
      </section>
    </div>
  );
}
