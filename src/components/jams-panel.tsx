'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { loadUnread } from '@/lib/unread';
import { fallbackCover } from '@/lib/music-catalog';
import { Plus, Globe, Lock, Users as UsersIcon, Music2, Check, X, LogIn, Copy } from 'lucide-react';
import type { ReactNode } from 'react';

interface NowPreview {
  id: number;
  title: string;
  artist: string;
  coverUrl: string | null;
  durationSec: number;
}

interface JamRow {
  id: string;
  name: string;
  desc: string;
  type: 'PUBLIC' | 'PRIVATE';
  closed: boolean;
  ownerId: number;
  role: string;
  members: number;
  playing: boolean;
  now: NowPreview | null;
  owner: { id: number; username: string; avatarId: number; profilePhotoId?: string | null } | null;
  lastActive: string;
  mine?: boolean;
  inJam?: boolean;
}

interface InviteItem {
  id: number;
  jamId: string;
  jamName: string;
  members: number;
  createdAt: string;
  from: { id: number; username: string; avatarId: number; avatarPhoto?: string | null };
}

function CoverArt({ now, seed }: { now: NowPreview | null; seed: number }) {
  const src = now?.coverUrl || fallbackCover(seed);
  return (
    <div className="jamset-cover">
      {now ? <img src={src} alt="" loading="lazy" /> : <Music2 size={18} />}
    </div>
  );
}

function CardShell({ children, jam, onOpen, action }: { children?: ReactNode; jam: JamRow; onOpen: () => void; action?: ReactNode }) {
  const t = useTranslations();
  return (
    <div className="jamset-card" onClick={() => !jam.closed && onOpen()}>
      <div className="jamset-top">
        <span className={`jamset-live ${jam.playing ? 'on' : ''}`}>
          <i />
          {jam.playing ? t('jams.live') : t('jams.waiting')}
        </span>
        {jam.type === 'PRIVATE' ? <Lock size={13} /> : <Globe size={13} />}
      </div>
      <div className="jamset-name">{jam.name}</div>
      {jam.desc && <div className="jamset-desc">{jam.desc}</div>}
      <div className="jamset-now">
        <CoverArt now={jam.now} seed={jam.ownerId + 1} />
        <div className="jamset-now-meta">
          <span className="jamset-now-label">{jam.playing ? t('jams.nowPlaying') : t('jams.nextUp')}</span>
          <b>{jam.now?.title ?? t('jams.waitingForDJ')}</b>
          <span>{jam.now?.artist ?? ''}</span>
        </div>
      </div>
      <div className="jamset-foot">
        <span className="jamset-owner">
          {jam.owner && <JaminoAvatar avatarId={jam.owner.avatarId} size={20} photo={jam.owner.profilePhotoId ? `/api/media/${jam.owner.profilePhotoId}` : null} name={jam.owner.username} />}
          {jam.owner ? t('jams.hostedBy', { name: jam.owner.username }) : t('jams.hostedBy', { name: '' })}
        </span>
        <span className="jamset-members">
          <UsersIcon size={13} /> {t('jams.members', { count: jam.members })}
        </span>
      </div>
      {action && <div className="jamset-action" onClick={(e) => e.stopPropagation()}>{action}</div>}
      {children}
    </div>
  );
}

export function JamsPanel({ onEnter }: { onEnter: (id: string) => void }) {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const [mine, setMine] = useState<JamRow[]>([]);
  const [browse, setBrowse] = useState<JamRow[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'mine' | 'browse'>('mine');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [jtype, setJtype] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [my, br, inv] = await Promise.all([
        api<{ jams: JamRow[] }>('/api/jams'),
        api<{ jams: JamRow[] }>('/api/jams/browse'),
        api<{ invites: InviteItem[] }>('/api/invites'),
      ]);
      setMine(my.jams);
      setBrowse(br.jams);
      setInvites(inv.invites);
    } catch {
      setMine([]);
      setBrowse([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadUnread();
  }, [loadAll]);

  const join = async (id: string) => {
    setBusy(true);
    try {
      await api(`/api/jams/${id}/join`, { method: 'POST' });
      toast(t('jams.joinedJam'), 'ok');
      await loadAll();
      loadUnread();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const respond = async (inviteId: number, action: 'accept' | 'decline') => {
    try {
      await api(`/api/invites/${inviteId}`, { method: 'POST', body: JSON.stringify({ action }) });
      if (action === 'accept') {
        toast(t('jams.joinedJam'), 'ok');
        await loadAll();
      }
      setInvites((p) => p.filter((i) => i.id !== inviteId));
      loadUnread();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ jam: { id: string } }>('/api/jams', {
        method: 'POST',
        body: JSON.stringify({ name, desc, type: jtype }),
      });
      toast(t('toast.jamCreated'), 'ok');
      setName('');
      setDesc('');
      setShowCreate(false);
      onEnter(d.jam.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${id}`);
      toast(t('toast.copiedLink'), 'ok');
    } catch {}
  };

  return (
    <div className="friends-panel">
      <div className="panel-head-row">
        <div>
          <div className="panel-title">{t('panel.jams')}</div>
          <div className="pane-sub">{t('panel.jamsSub')}</div>
        </div>
        <div className="panel-head-actions">
          <div className="view-toggle">
            <button type="button" className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>{t('jams.mySets')}</button>
            <button type="button" className={view === 'browse' ? 'active' : ''} onClick={() => setView('browse')}>{t('jams.explore')}</button>
          </div>
          <button type="button" className="btn btn-violet pill-sm" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={15} /> {t('jams.createJam')}
          </button>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="invites-box">
          <div className="sub-label">{t('jams.pendingInvites', { count: invites.length })}</div>
          {invites.map((i) => (
            <div key={i.id} className="invite-row">
              <JaminoAvatar avatarId={i.from.avatarId} size={32} photo={i.from.avatarPhoto} name={i.from.username} />
              <div className="friend-meta">
                <span className="friend-name">{i.jamName}</span>
                <span className="friend-sub">{i.from.username} · {t('jams.members', { count: i.members })}</span>
              </div>
              <button type="button" className="btn btn-violet pill-sm" onClick={() => respond(i.id, 'accept')}>
                <Check size={14} /> {t('friends.accept')}
              </button>
              <button type="button" className="btn btn-ghost pill-sm" onClick={() => respond(i.id, 'decline')}>
                <X size={14} /> {t('friends.decline')}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <form className="create-jam" onSubmit={create}>
          <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('jams.jamName')} maxLength={40} autoFocus />
          <input className="auth-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`${t('jams.jamDesc')} (${t('jams.optional')})`} maxLength={120} />
          <div className="type-toggle">
            <button type="button" className={jtype === 'PUBLIC' ? 'active' : ''} onClick={() => setJtype('PUBLIC')}>
              <Globe size={14} /> {t('jams.public')}
            </button>
            <button type="button" className={jtype === 'PRIVATE' ? 'active' : ''} onClick={() => setJtype('PRIVATE')}>
              <Lock size={14} /> {t('jams.private')}
            </button>
          </div>
          <button type="submit" className="btn btn-violet" disabled={busy || name.trim().length < 2}>
            <Music2 size={15} /> {t('jams.createJam')}
          </button>
        </form>
      )}

      {loading ? (
        <div className="jamset-grid">
          {[0, 1, 2].map((i) => <div key={i} className="jamset-card jamset-skeleton" />)}
        </div>
      ) : view === 'mine' ? (
        <>
          {mine.length === 0 && !showCreate && <div className="empty-state">{t('jams.noJamsYet')}</div>}
          <div className="jamset-grid">
            {mine.map((j) => (
              <CardShell key={j.id} jam={j} onOpen={() => onEnter(j.id)}>
                <div className="jamset-foot" style={{ marginTop: 'auto' }}>
                  <span className={`jamset-role-tag ${j.role === 'HOST' ? 'host' : j.role === 'MINI_HOST' ? 'mini' : ''}`}>
                    {j.role === 'HOST' ? t('jams.roleHost') : j.role === 'MINI_HOST' ? t('jams.roleCoHost') : t('jams.roleMember')}
                  </span>
                  <span className="jamset-live-note">{t('jams.tapToOpen')}</span>
                </div>
              </CardShell>
            ))}
          </div>
        </>
      ) : (
        <>
          {browse.length === 0 && (
            <div className="empty-state">
              <p>{t('jams.browseEmpty')}</p>
              <button type="button" className="btn btn-violet pill-sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> {t('jams.createJam')}
              </button>
            </div>
          )}
          <div className="jamset-grid">
            {browse.map((j) => (
              <CardShell
                key={j.id}
                jam={j}
                onOpen={() => onEnter(j.id)}
                action={
                  <span className="jamset-actions">
                    <button type="button" className="btn-icon" onClick={() => copyLink(j.id)} title={t('jams.copyLink')}>
                      <Copy size={14} />
                    </button>
                    {j.mine || j.inJam ? (
                      <button type="button" className="btn btn-violet pill-sm" onClick={() => onEnter(j.id)}>
                        <LogIn size={14} /> {t('jams.openJam')}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-violet pill-sm" onClick={() => join(j.id)} disabled={busy}>
                        {t('jams.joinJam')}
                      </button>
                    )}
                  </span>
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}