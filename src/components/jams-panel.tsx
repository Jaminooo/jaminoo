'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { api } from '@/lib/client-api';
import { connectLive, onLive } from '@/lib/live';
import { toast } from '@/components/toast';
import { Plus, Radio, Globe, Lock, Users as UsersIcon, Music2, Mail, Check, X, Ban } from 'lucide-react';

interface JamCard {
  id: string;
  name: string;
  desc: string;
  type: 'PUBLIC' | 'PRIVATE';
  ownerId: number;
  closed: boolean;
  members: number;
  lastActive: string;
}

interface InviteItem {
  id: number;
  jamId: string;
  jamName: string;
  members: number;
  createdAt: string;
  from: { id: number; username: string; avatarId: number; avatarPhoto: string | null };
}

interface InviteUser {
  id: number;
  username: string;
  avatarId: number;
  uid: string;
  avatarPhoto?: string | null;
}

export function JamsPanel({ onEnter }: { onEnter: (id: string) => void }) {
  const t = useTranslations();
  const [jams, setJams] = useState<JamCard[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [friends, setFriends] = useState<InviteUser[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);

  const load = () => api<{ jams: JamCard[] }>('/api/jams').then((d) => setJams(d.jams)).catch(() => {});
  const loadInvites = () => api<{ invites: InviteItem[] }>('/api/invites').then((d) => setInvites(d.invites)).catch(() => {});

  useEffect(() => {
    load();
    loadInvites();
    connectLive();
    const offJam = onLive('jam:update', () => load());
    const offInvite = onLive('jam-invite', () => loadInvites());
    return () => {
      offJam();
      offInvite();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = async () => {
    setShowCreate(true);
    const f = await api<{ friends: { id: number; username: string; avatarId: number; uid: string }[] }>('/api/friends').catch(() => null);
    setFriends(f?.friends ?? []);
  };

  const respondInvite = async (id: number, action: 'accept' | 'decline') => {
    try {
      await api(`/api/invites/${id}`, { method: 'POST', body: JSON.stringify({ action }) });
      if (action === 'accept') toast(t('jams.joinedJam'));
      loadInvites();
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  return (
    <>
      <header className="pane-head">
        <div>
          <h2 className="pane-title">{t('jams.allJams')}</h2>
          <p className="pane-sub">{t('panel.jamsSub')}</p>
        </div>
        <button type="button" className="btn btn-violet" onClick={openCreate}>
          <Plus size={16} /> {t('jams.createJam')}
        </button>
      </header>

      {invites.length > 0 && (
        <section className="card invites-card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={16} /> {t('jams.pendingInvites', { count: invites.length })}
          </h3>
          <div className="list">
            {invites.map((inv) => (
              <div key={inv.id} className="friend-row" style={{ gap: 10 }}>
                <JaminoAvatar avatarId={inv.from.avatarId} size={36} photo={inv.from.avatarPhoto} name={inv.from.username} />
                <div className="friend-meta">
                  <div className="friend-name" style={{ fontSize: 13 }}>{inv.from.username}</div>
                  <div className="friend-id" style={{ fontSize: 11 }}>{inv.jamName} · {t('jams.members', { count: inv.members })}</div>
                </div>
                <div className="friend-actions">
                  <button type="button" className="btn-icon violet" onClick={() => respondInvite(inv.id, 'accept')} title={t('friends.accept')}>
                    <Check size={16} />
                  </button>
                  <button type="button" className="btn-icon danger" onClick={() => respondInvite(inv.id, 'decline')} title={t('friends.decline')}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showCreate && <CreateJam onDone={load} onClose={() => setShowCreate(false)} friends={friends} />}

      {jams.length === 0 ? (
        <div className="empty-state" style={{ padding: 48 }}>{t('jams.noJamsYet')}</div>
      ) : (
        <div className="jam-grid">
          {jams.map((j) => (
            <button key={j.id} type="button" className="jam-card" onClick={() => onEnter(j.id)}>
              <div className="jam-card-top">
                <span className="jam-icon">
                  <Radio size={20} />
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {j.type === 'PRIVATE' ? <Lock size={14} style={{ color: 'var(--color-fog)' }} /> : <Globe size={14} style={{ color: 'var(--color-fog)' }} />}
                  {j.closed && <Ban size={14} style={{ color: 'var(--color-fog)' }} />}
                </div>
              </div>
              <div className="jam-name">{j.name}</div>
              <div className="jam-desc">{j.desc || ' '}</div>
              <div className="jam-meta">
                <span>
                  <UsersIcon size={13} /> {t('jams.members', { count: j.members })}
                </span>
                <span>
                  <Music2 size={13} /> {t('jams.lastActive')} · {new Date(j.lastActive).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function CreateJam({ onDone, onClose, friends }: { onDone: () => void; onClose: () => void; friends: InviteUser[] }) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [inviteIds, setInviteIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (name.trim().length < 2) return toast(t('jams.jamName'), 'error');
    setBusy(true);
    try {
      const r = await api<{ jam: { id: string } }>('/api/jams', { method: 'POST', body: JSON.stringify({ name, desc, type }) });
      for (const fid of inviteIds) {
        await api(`/api/jams/${r.jam.id}/invite`, { method: 'POST', body: JSON.stringify({ userId: fid }) }).catch(() => {});
      }
      toast(t('toast.jamCreated'));
      onDone();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ padding: 24, marginBottom: 24 }}>
      <div className="pane-head" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, color: '#fff' }}>{t('jams.createJam')}</h3>
        <button type="button" className="btn-icon" onClick={onClose}>×</button>
      </div>
      <div className="pair">
        <div className="field">
          <span className="field-label">{t('jams.jamName')}</span>
          <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">
            {t('jams.jamDesc')} <span className="opt">({t('jams.optional')})</span>
          </span>
          <input className="auth-input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>
      <div className="seg" style={{ marginTop: 14, maxWidth: 320 }}>
        <button type="button" className={`seg-btn ${type === 'PUBLIC' ? 'active' : ''}`} onClick={() => setType('PUBLIC')}>
          {t('jams.public')}
        </button>
        <button type="button" className={`seg-btn ${type === 'PRIVATE' ? 'active' : ''}`} onClick={() => setType('PRIVATE')}>
          {t('jams.private')}
        </button>
      </div>
      <p className="pane-sub" style={{ marginTop: 8 }}>
        {type === 'PUBLIC' ? t('jams.publicHint') : t('jams.privateHint')}
      </p>

      {friends.length > 0 && (
        <>
          <div className="pane-sub" style={{ marginTop: 16, marginBottom: 10 }}>{t('jams.inviteFriends')}</div>
          <div className="friend-row" style={{ flexWrap: 'wrap' }}>
            {friends.map((f) => {
              const on = inviteIds.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`friend-row ${on ? 'active' : ''}`}
                  style={{ borderColor: on ? 'var(--color-violet)' : undefined, cursor: 'pointer' }}
                  onClick={() => setInviteIds((p) => {
                    const n = new Set(p);
                    if (n.has(f.id)) n.delete(f.id);
                    else n.add(f.id);
                    return n;
                  })}
                >
                  <JaminoAvatar avatarId={f.avatarId} size={32} photo={f.avatarPhoto} name={f.username} />
                  <span className="friend-name" style={{ fontSize: 13 }}>{f.username}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button type="button" className="btn btn-violet" style={{ marginTop: 18 }} onClick={create} disabled={busy}>
        {busy ? '…' : t('jams.createJam')}
      </button>
    </section>
  );
}