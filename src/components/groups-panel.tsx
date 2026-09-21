'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { connectLive, onLive } from '@/lib/live';
import { loadUnread } from '@/lib/unread';
import { Plus, Globe, Lock, Users as UsersIcon, LogIn, X } from 'lucide-react';

interface GroupCard {
  id: string;
  name: string;
  desc: string;
  avatarId: number;
  isPrivate: boolean;
  myRole: string | null;
  memberCount: number;
  lastActiveAt: string;
}

interface BrowseGroup extends GroupCard {
  owner: { id: number; username: string };
}

export function GroupsPanel() {
  const t = useTranslations();
  const setGroupId = useAppStore((s) => s.setGroupId);
  const [mine, setMine] = useState<GroupCard[]>([]);
  const [browse, setBrowse] = useState<BrowseGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [avatarId, setAvatarId] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ mine: GroupCard[]; browse: BrowseGroup[] }>('/api/groups');
      setMine(d.mine);
      setBrowse(d.browse);
    } catch {}
  }, []);

  useEffect(() => {
    connectLive();
    load();
    loadUnread();
    const offUpdate = onLive('group:update', () => load());
    const offDeleted = onLive('group:deleted', () => load());
    return () => {
      offUpdate();
      offDeleted();
    };
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ group: { id: string } }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name, desc, avatarId, isPrivate }),
      });
      toast(t('groups.created'), 'ok');
      setName('');
      setDesc('');
      setAvatarId(0);
      setIsPrivate(false);
      setShowCreate(false);
      setGroupId(d.group.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const join = async (id: string) => {
    setBusy(true);
    try {
      await api(`/api/groups/${id}/join`, { method: 'POST' });
      toast(t('groups.joined'), 'ok');
      load();
      loadUnread();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const leave = async (id: string) => {
    setBusy(true);
    try {
      await api(`/api/groups/${id}/leave`, { method: 'POST' });
      toast(t('groups.left'), 'ok');
      load();
      loadUnread();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="friends-panel">
      <div className="panel-head-row">
        <div>
          <div className="ch-kicker">{t('groups.kicker')}</div>
          <h2 className="panel-title">{t('groups.title')}</h2>
        </div>
        <div className="panel-head-actions">
          <button type="button" className="btn btn-violet pill-sm" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={15} /> {t('groups.create')}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="create-jam ch-create-group" onSubmit={create}>
          <div className="ch-create-avatars">
            {Array.from({ length: 12 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`avatar-opt${avatarId === i ? ' active' : ''}`}
                onClick={() => setAvatarId(i)}
              >
                <JaminoAvatar avatarId={i} size={38} name={`a${i}`} />
              </button>
            ))}
          </div>
          <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('groups.namePh')} maxLength={40} />
          <input className="auth-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`${t('groups.desc')} (${t('jams.optional')})`} maxLength={160} />
          <div className="type-toggle">
            <button type="button" className={!isPrivate ? 'active' : ''} onClick={() => setIsPrivate(false)} title={t('groups.publicHint')}>
              <Globe size={14} /> {t('groups.public')}
            </button>
            <button type="button" className={isPrivate ? 'active' : ''} onClick={() => setIsPrivate(true)} title={t('groups.privateHint')}>
              <Lock size={14} /> {t('groups.private')}
            </button>
          </div>
          <button type="submit" className="btn btn-violet" disabled={busy || name.trim().length < 2}>
            <Plus size={15} /> {busy ? t('groups.creating') : t('groups.create')}
          </button>
        </form>
      )}

      <div className="ch-col-head">
        <div className="sub-label">{t('groups.myGroups')}</div>
        <span className="ch-count">{mine.length}</span>
      </div>
      <div className="list">
        {mine.length === 0 && <div className="empty-state">{t('groups.noGroupsYet')}</div>}
        {mine.map((g) => (
          <div key={g.id} className="friend-row">
            <div className="avatar-stack">
              <JaminoAvatar avatarId={g.avatarId} size={40} name={g.name} />
            </div>
            <div className="friend-meta">
              <span className="friend-name">
                {g.name}
                {g.isPrivate && <Lock size={12} style={{ marginInlineStart: 6, verticalAlign: 'text-bottom' }} />}
                <span className="ch-role-tag">{t(`groups.role${g.myRole === 'OWNER' ? 'Owner' : g.myRole === 'ADMIN' ? 'Admin' : 'Member'}`)}</span>
              </span>
              <span className="friend-sub">{t('groups.members', { count: g.memberCount })}</span>
            </div>
            <div className="friend-actions">
              <button type="button" className="btn btn-violet pill-sm" onClick={() => setGroupId(g.id)}>
                <LogIn size={14} /> {t('groups.open')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="ch-col-head" style={{ marginTop: 24 }}>
        <div className="sub-label">{t('groups.discover')}</div>
        <UsersIcon size={14} />
      </div>
      <div className="ch-discover-grid">
        {browse.length === 0 && <div className="empty-state ch-discover-empty">{t('groups.discoverEmpty')}</div>}
        {browse.map((g) => {
          const mineRole = mine.find((m) => m.id === g.id)?.myRole ?? null;
          const owned = mineRole === 'OWNER';
          return (
            <div key={g.id} className="ch-discover-card">
              <div className="ch-discover-top">
                <JaminoAvatar avatarId={g.avatarId} size={46} name={g.name} />
                {g.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
              </div>
              <strong>{g.name}</strong>
              <p>{g.desc || '·'}</p>
              <span className="ch-group-meta">
                {t('groups.owner')}: {g.owner.username} · {t('groups.members', { count: g.memberCount })}
              </span>
              <div className="ch-discover-actions">
                {mineRole ? (
                  <>
                    <button type="button" className="btn btn-violet pill-sm" onClick={() => setGroupId(g.id)}>
                      <LogIn size={14} /> {t('groups.open')}
                    </button>
                    {!owned && (
                      <button type="button" className="btn btn-ghost pill-sm" onClick={() => leave(g.id)} disabled={busy}>
                        <X size={14} /> {t('groups.leave')}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="btn btn-violet pill-sm" onClick={() => join(g.id)} disabled={busy}>
                    {t('groups.join')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}