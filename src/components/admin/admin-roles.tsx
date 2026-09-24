'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Star, Trash2, UserPlus, Users, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { connectLive, onLive } from '@/lib/live';
import { Badge, ConfirmModal, EmptyRow, LoadingRow, StatCard, useConfirm } from './admin-ui';
import { HUB_ADMIN_SCOPES } from '@/lib/roles-shared';
import { WorkspaceErrorState } from '@/components/workspace-feedback';

interface RoleRow {
  id: number;
  userId: number;
  username: string;
  email: string;
  isAdmin: boolean;
  role: string;
  scope: string;
  createdAt: string;
}

interface UserRow {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export function AdminRoles() {
  const t = useTranslations();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [me, setMe] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [grantUser, setGrantUser] = useState('');
  const [grantScope, setGrantScope] = useState('ANIME');
  const [grantLoading, setGrantLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const { confirm, ask, close } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api<{ roles: RoleRow[]; me: { username: string } }>('/api/admin/roles')
      .then((d) => {
        setRoles(d.roles);
        setMe(d.me.username);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    connectLive();
    return onLive('admin:event', () => load());
  }, [load]);

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    try {
      const data = await api<{ rows: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`);
      setSearchResults(data.rows || []);
      setSearchOpen(true);
    } catch {
      setSearchResults([]);
      setSearchOpen(false);
    }
  };

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantLoading(true);
    try {
      const user = searchResults.find((u) => u.username === grantUser) ?? (await resolveByUsername(grantUser));
      if (!user) throw new Error('User not found');
      await api('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, role: 'HUB', scope: grantScope }),
      });
      toast(t('admin.rolesGranted'), 'ok');
      setGrantUser('');
      setSearchResults([]);
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('admin.rolesError'), 'error');
    } finally {
      setGrantLoading(false);
    }
  };

  async function resolveByUsername(username: string): Promise<UserRow | null> {
    try {
      const data = await api<{ rows: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(username)}&per=10`);
      return data.rows.find((u) => u.username === username) ?? null;
    } catch {
      return null;
    }
  }

  const revoke = (userId: number) =>
    ask(t('admin.remove'), t('admin.rolesRevokeConfirm'), () => {
      void api(`/api/admin/roles?userId=${userId}`, { method: 'DELETE' })
        .then(() => load())
        .catch((error) => toast(error instanceof Error ? error.message : t('admin.rolesError'), 'error'));
    });

  const stats = useMemo(() => {
    const supers = roles.filter((r) => r.role === 'SUPER').length;
    const hubs = roles.filter((r) => r.role === 'HUB').length;
    const byScope = HUB_ADMIN_SCOPES.reduce(
      (acc, s) => {
        acc[s] = roles.filter((r) => r.role === 'HUB' && r.scope === s).length;
        return acc;
      },
      {} as Record<string, number>
    );
    return { supers, hubs, byScope };
  }, [roles]);

  const scopeLabel = (scope: string) => (scope === 'ALL' ? t('admin.rolesAll') : scope ? t(`admin.rolesScope_${scope.toLowerCase()}`) : '—');

  return (
    <div className="admin-roles-root">
      <div className="admin-stat-grid">
        <StatCard icon={<Shield size={16} />} label={t('admin.rolesSuper')} value={stats.supers} tone="violet" />
        <StatCard icon={<Users size={16} />} label={t('admin.rolesHub')} value={stats.hubs} tone="green" />
        <StatCard icon={<Star size={16} />} label={t('admin.publishedTitles')} value={roles.length} tone="steel" />
      </div>

      <div className="admin-card admin-roles-form">
        <div className="admin-card-head">
          <div>
            <h3>
              <UserPlus size={15} /> {t('admin.rolesGrant')}
            </h3>
            <p className="admin-dim">{t('admin.rolesGrantHint')}</p>
          </div>
        </div>
        <form onSubmit={grant} style={{ display: 'grid', gridTemplateColumns: '220px 160px auto', gap: 12, alignItems: 'end' }}>
          <label>{t('admin.rolesUsername')}
            <input
              value={grantUser}
              onChange={(e) => { setGrantUser(e.target.value); void searchUsers(e.target.value); }}
              placeholder="username"
              required
            />
          </label>
          <label>{t('admin.rolesScope')}
            <select value={grantScope} onChange={(e) => setGrantScope(e.target.value)}>
              {HUB_ADMIN_SCOPES.map((s) => (
                <option key={s} value={s}>{t(`admin.rolesScope_${s.toLowerCase()}`)}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-violet" disabled={grantLoading}>
            <ShieldAlert size={14} /> {t('admin.rolesGrant')}
          </button>
        </form>
        {searchOpen && (
          <div className="admin-user-picker">
            {searchResults.map((u) => (
              <button
                key={u.id}
                type="button"
                className="friend-row"
                onClick={() => { setGrantUser(u.username); setSearchOpen(false); setSearchResults([]); }}
              >
                <span>{u.username}</span>
                <small>{u.email}</small>
              </button>
            ))}
            {searchResults.length === 0 && <span className="admin-dim" style={{ padding: 6 }}>{t('admin.rolesNoUser')}</span>}
          </div>
        )}
      </div>

      <div className="admin-card admin-table-card">
        <div className="admin-card-head">
          <h3>{t('admin.rolesList')}</h3>
          <span className="admin-count">{roles.length}</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.username')}</th>
                <th>{t('admin.email')}</th>
                <th>{t('admin.rolesRole')}</th>
                <th>{t('admin.rolesScope')}</th>
                <th><span className="admin-dim">{t('admin.joined')}</span></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && <LoadingRow text={t('admin.loading')} />}
              {!loading && loadError && <tr><td colSpan={6}><WorkspaceErrorState message={t('admin.loadError')} retryLabel={t('admin.refresh')} onRetry={load} /></td></tr>}
              {!loading && !loadError && roles.length === 0 && <EmptyRow text={t('admin.rolesEmpty')} />}
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.username}</b>
                    {r.isAdmin && <Badge tone="violet">SUPER</Badge>}
                  </td>
                  <td className="admin-ellipsis">{r.email || '—'}</td>
                  <td className="admin-nowrap">{r.role}</td>
                  <td className="admin-nowrap">{scopeLabel(r.scope)}</td>
                  <td className="admin-dim">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon danger" onClick={() => revoke(r.userId)} title={t('admin.remove')}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirm && <ConfirmModal confirm={confirm} close={close} />}
    </div>
  );
}
