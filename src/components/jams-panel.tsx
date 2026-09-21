'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { loadUnread } from '@/lib/unread';
import { Plus, Radio, Globe, Lock, Users as UsersIcon, Music2, Check, X, Hammer, Film, Tv2, LogIn, Copy } from 'lucide-react';
import { JAM_KINDS } from '@/lib/constants';

interface JamRow {
  id: string;
  name: string;
  desc: string;
  type: 'PUBLIC' | 'PRIVATE';
  kind: string;
  ownerId: number;
  closed: boolean;
  createdAt: string;
  members: number;
  lastActive: string;
}

interface BrowseJam {
  id: string;
  name: string;
  desc: string;
  kind: string;
  ownerId: number;
  owner: { id: number; username: string; avatarId: number; profilePhotoId?: string | null };
  members: number;
  mine: boolean;
  inJam: boolean;
}

interface InviteItem {
  id: number;
  jamId: string;
  jamName: string;
  members: number;
  createdAt: string;
  from: { id: number; username: string; avatarId: number; avatarPhoto?: string | null };
}

const KIND_ICON: Record<string, React.ReactNode> = {
  CHAT: <Hammer size={13} />,
  MOVIE: <Film size={13} />,
  MUSIC: <Music2 size={13} />,
  ANIME: <Tv2 size={13} />,
  HANGOUT: <UsersIcon size={13} />,
};

export function JamsPanel({ onEnter }: { onEnter: (id: string) => void }) {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const [jams, setJams] = useState<JamRow[]>([]);
  const [browse, setBrowse] = useState<BrowseJam[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'mine' | 'browse'>('mine');
  const [kindF, setKindF] = useState<string>('ALL');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [jtype, setJtype] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [jkind, setJkind] = useState<string>('CHAT');
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [my, br, inv] = await Promise.all([
        api<{ jams: JamRow[] }>('/api/jams'),
        api<{ jams: BrowseJam[] }>('/api/jams/browse'),
        api<{ invites: InviteItem[] }>('/api/invites'),
      ]);
      setJams(my.jams);
      setBrowse(br.jams);
      setInvites(inv.invites);
    } catch {}
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
      loadAll();
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
        loadAll();
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
        body: JSON.stringify({ name, desc, type: jtype, kind: jkind }),
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
        <h2 className="panel-title">{t('panel.jams')}</h2>
        <div className="panel-head-actions">
          <div className="view-toggle">
            <button type="button" className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>{t('jams.allJams')}</button>
            <button type="button" className={view === 'browse' ? 'active' : ''} onClick={() => setView('browse')}>{t('jams.browse')}</button>
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
              <div className="friend-info">
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
          <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('jams.jamName')} maxLength={40} />
          <input className="auth-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`${t('jams.jamDesc')} (${t('jams.optional')})`} maxLength={120} />
          <div className="type-toggle">
            <button type="button" className={jtype === 'PUBLIC' ? 'active' : ''} onClick={() => setJtype('PUBLIC')}>
              <Globe size={14} /> {t('jams.public')}
            </button>
            <button type="button" className={jtype === 'PRIVATE' ? 'active' : ''} onClick={() => setJtype('PRIVATE')}>
              <Lock size={14} /> {t('jams.private')}
            </button>
          </div>
          <div className="kind-row">
            <span className="sub-label">{t('jams.kind')}</span>
            <div className="kind-toggle">
              {JAM_KINDS.map((k) => (
                <button key={k} type="button" className={jkind === k ? 'active' : ''} onClick={() => setJkind(k)}>
                  {KIND_ICON[k]} {t(`jams.kind${k.charAt(0)}${k.slice(1).toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-violet" disabled={busy || name.trim().length < 2}>
            <Radio size={15} /> {t('jams.createJam')}
          </button>
        </form>
      )}

      {view === 'mine' ? (
        <>
          {jams.length === 0 && !showCreate && <div className="empty-state">{t('jams.noJamsYet')}</div>}
          {jams.map((j) => (
            <button key={j.id} type="button" className="friend-row" onClick={() => !j.closed && onEnter(j.id)}>
              <div className="jam-icon" style={{ width: 40, height: 40 }}>
                {j.type === 'PRIVATE' ? <Lock size={16} /> : <Globe size={16} />}
              </div>
              <div className="friend-info">
                <span className="friend-name">
                  {j.name}
                  {j.closed && <span className="closed-tag" style={{ marginInlineStart: 6 }}>{t('room.closed')}</span>}
                </span>
                <span className="friend-sub">
                  {KIND_ICON[j.kind]} {t((`jams.kind${j.kind.charAt(0)}${j.kind.slice(1).toLowerCase()}`) as any)} · {t('jams.members', { count: j.members })}
                </span>
              </div>
              <span className="friend-sub" style={{ marginInlineStart: 'auto' }}>
                {j.closed ? t('room.closed') : t('jams.openJam')}
              </span>
            </button>
          ))}
        </>
      ) : (
        <>
          <div className="kind-row" style={{ marginBottom: 12 }}>
            <div className="kind-toggle">
              <button type="button" className={kindF === 'ALL' ? 'active' : ''} onClick={() => setKindF('ALL')}>
                {t('jams.allJams')}
              </button>
              {JAM_KINDS.map((k) => (
                <button key={k} type="button" className={kindF === k ? 'active' : ''} onClick={() => setKindF(k)}>
                  {KIND_ICON[k]} {t(`jams.kind${k.charAt(0)}${k.slice(1).toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
          {browse.filter((j) => kindF === 'ALL' || j.kind === kindF).length === 0 && <div className="empty-state">{t('jams.browseEmpty')}</div>}
          {browse.filter((j) => kindF === 'ALL' || j.kind === kindF).map((j) => (
            <div key={j.id} className="friend-row">
              <JaminoAvatar avatarId={j.owner.avatarId} size={40} photo={j.owner.profilePhotoId ? `/api/media/${j.owner.profilePhotoId}` : null} name={j.owner.username} />
              <div className="friend-info">
                <span className="friend-name">
                  {j.name}
                  {KIND_ICON[j.kind] && <span style={{ marginInlineStart: 6 }}>{KIND_ICON[j.kind]}</span>}
                </span>
                <span className="friend-sub">{j.owner.username} · {t('jams.members', { count: j.members })}</span>
              </div>
              <span className="friend-sub" style={{ marginInlineStart: 'auto' }}>
                {j.mine ? (
                  <button type="button" className="btn btn-violet pill-sm" onClick={() => onEnter(j.id)}>
                    <LogIn size={14} /> {t('jams.openJam')}
                  </button>
                ) : j.inJam ? (
                  <button type="button" className="btn btn-violet pill-sm" onClick={() => onEnter(j.id)}>
                    <LogIn size={14} /> {t('jams.inJam')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-violet pill-sm" onClick={() => join(j.id)} disabled={busy}>
                    {t('jams.joinJam')}
                  </button>
                )}
                <button type="button" className="btn-icon" style={{ marginInlineStart: 6 }} onClick={() => copyLink(j.id)} title={t('jams.copyLink')}>
                  <Copy size={14} />
                </button>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}