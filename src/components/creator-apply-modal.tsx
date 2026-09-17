'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeCheck, CheckCircle2, Clock3, ExternalLink, Send, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';

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
  const [application, setApplication] = useState<CreatorApplication | null>(null);
  const [channelName, setChannelName] = useState('');
  const [handle, setHandle] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<{ applications: CreatorApplication[] }>(`/api/creator/apply?hub=${hub}`)
      .then((data) => {
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hub, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ application: CreatorApplication }>('/api/creator/apply', {
        method: 'POST',
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
              <div className="hub-kicker">{isMusic ? 'MUSIC CREATOR' : 'VIDEO CREATOR'}</div>
              <h2 id="creator-modal-title">{isMusic ? 'Build your artist profile' : 'Start your creator channel'}</h2>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close creator form"><X size={18} /></button>
        </header>

        <div className="creator-modal-body">
          <div className="creator-modal-intro">
            <p>Tell us what you want to publish. An admin reviews this once, then your channel can publish inside this hub.</p>
            {isApproved && <span className="creator-status approved"><BadgeCheck size={14} /> Approved creator</span>}
            {isPending && <span className="creator-status pending"><Clock3 size={14} /> Waiting for review</span>}
            {application?.status === 'REJECTED' && <span className="creator-status rejected">Needs another review{application.reviewNote ? ` · ${application.reviewNote}` : ''}</span>}
          </div>

          {loading ? <div className="creator-modal-loading"><span className="admin-loader" /> Loading your application…</div> : (
            <form className="creator-form" onSubmit={submit}>
              <div className="creator-form-grid">
                <label><span>Channel / artist name</span><input required value={channelName} onChange={(event) => setChannelName(event.target.value)} maxLength={80} placeholder={isMusic ? 'Your artist name' : 'Your channel name'} /></label>
                <label><span>Handle</span><input required value={handle} onChange={(event) => setHandle(event.target.value.replace(/^@+/, ''))} maxLength={40} placeholder="creator.handle" /></label>
                <label><span>Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder={isMusic ? 'Pop, hip-hop, electronic…' : 'Gaming, education, lifestyle…'} /></label>
                <label className="creator-form-wide"><span>About your channel</span><textarea required value={bio} onChange={(event) => setBio(event.target.value)} maxLength={700} rows={4} placeholder="What will people find here?" /></label>
                <label className="creator-form-wide"><span>Links <small>one per line</small></span><textarea value={links} onChange={(event) => setLinks(event.target.value)} rows={3} placeholder="https://instagram.com/…\nhttps://youtube.com/…" /></label>
              </div>
              <div className="creator-form-foot">
                <span><ExternalLink size={13} /> You can update this while it is pending.</span>
                <button type="submit" className="btn btn-violet" disabled={saving || isApproved}>{saving ? 'Sending…' : isPending ? 'Update application' : <><Send size={14} /> Send for review</>}</button>
              </div>
            </form>
          )}

          {isApproved && <div className="creator-approved-note"><CheckCircle2 size={20} /><div><b>You are ready to publish.</b><span>Close this window and use Create in the hub to start sharing.</span></div></div>}
        </div>
      </section>
    </div>
  );
}
