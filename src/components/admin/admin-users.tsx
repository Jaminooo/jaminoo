'use client';

import { useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { ShieldCheck, ShieldOff, Ban, BadgeCheck, Eye, Github } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, AdminModal, fmtDateTime, useSelection, SelectCheckbox, SelectionToolbar } from './admin-ui';

interface UserRow {
  id: number;
  username: string;
  email: string;
  github: boolean;
  avatarId: number;
  profilePhotoId: string | null;
  status: string;
  isAdmin: boolean;
  bannedUntil: string | null;
  bannedReason: string;
  createdAt: string;
  _count: { jams: number; messages: number; dmMessages: number; media: number; sessions: number; reactions: number };
}

interface UserDetail {
  user: {
    id: number;
    username: string;
    email: string;
    github: boolean;
    bio: string;
    status: string;
    statusText: string;
    isAdmin: boolean;
    bannedUntil: string | null;
    bannedReason: string;
    createdAt: string;
    _count: {
      sessions: number;
      jams: number;
      messages: number;
      dmMessages: number;
      media: number;
      reactions: number;
      friendRequestsA: number;
      friendRequestsB: number;
      jamInvitesSent: number;
      jamInvitesReceived: number;
    };
  };
  sessions: { token: string; name: string; device: string; createdAt: string; expiresAt: string }[];
  recentMessages: { id: number; kind: string; text: string; createdAt: string; jam: { id: string; name: string } }[];
}

export function AdminUsers() {
  const t = useTranslations();
  const list = useAdminList<UserRow>({ path: '/api/admin/users', per: 15 });
  const selection = useSelection(list.rows.map((row) => row.id));
  const { confirm, ask, close } = useConfirm();
  const [ban, setBan] = useState<{ ids: number[]; username: string } | null>(null);
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [busy, setBusy] = useState(false);

  async function action(id: number, body: Record<string, unknown>) {
    setBusy(true);
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function confirmBan(u: UserRow) {
    setDays(u.bannedUntil ? '7' : '7');
    setReason(u.bannedReason ?? '');
    setBan({ ids: [u.id], username: `@${u.username}` });
  }

  function confirmBanSelected() {
    setDays('7');
    setReason('');
    setBan({ ids: selection.selectedIds.map(Number), username: t('admin.selected') });
  }

  async function banUsers(ids: number[]) {
    setBusy(true);
    try {
      await Promise.allSettled(ids.map((id) => api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'ban', days: Number(days) || 7, reason }) })));
      selection.clear();
      list.reload();
    } finally {
      setBusy(false);
    }
  }

  function openDetail(id: number) {
    setBusy(true);
    api<UserDetail>(`/api/admin/users/${id}`)
      .then(setDetail)
      .catch((e) => console.error(e))
      .finally(() => setBusy(false));
  }

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.search')} />
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <SelectionToolbar count={selection.count} onClear={selection.clear}>
        <button type="button" className="btn btn-danger pill-sm" disabled={busy} onClick={confirmBanSelected}>
          <Ban size={13} /> {t('admin.bulkBan')}
        </button>
      </SelectionToolbar>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-check-cell">
                <SelectCheckbox checked={selection.allSelected} indeterminate={selection.count > 0 && !selection.allSelected} onChange={() => selection.toggleAll(list.rows.map((row) => row.id))} label={t('admin.selectAll')} />
              </th>
              <th>{t('admin.username')}</th>
              <th>{t('admin.email')}</th>
              <th>{t('admin.joined')}</th>
              <th>{t('admin.role')}</th>
              <th>{t('admin.state')}</th>
              <th>Jams</th>
              <th>Msgs</th>
              <th>Sess</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.noUsers')} />}
            {!list.loading &&
              list.rows.map((u) => (
                <tr key={u.id}>
                  <td className="admin-check-cell">
                    <SelectCheckbox checked={selection.isSelected(u.id)} onChange={() => selection.toggle(u.id)} label={u.username} />
                  </td>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">
                        {u.profilePhotoId ? <Image src={`/api/media/${encodeURIComponent(u.profilePhotoId)}`} alt="" fill unoptimized loading="lazy" /> : <span>{u.username.slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <button className="admin-user-name" onClick={() => openDetail(u.id)}>
                        @{u.username}
                      </button>
                    </div>
                    {u.github && <Github size={13} className="admin-inline-ico" />}
                    <span className="admin-status-dot" style={{ background: statusColor(u.status) }} title={u.status} />
                  </td>
                  <td className="admin-dim">{u.email || '—'}</td>
                  <td className="admin-dim" title={fmtDateTime(u.createdAt)}>
                    {fmtDateTime(u.createdAt)}
                  </td>
                  <td>
                    {u.isAdmin ? <Badge tone="violet">{t('admin.admin')}</Badge> : <Badge tone="steel">{t('admin.user')}</Badge>}
                  </td>
                  <td>
                    {u.bannedUntil ? (
                      <Badge tone="red">⛔ {t('admin.banned')}</Badge>
                    ) : (
                      <Badge tone="green">{t('admin.active')}</Badge>
                    )}
                  </td>
                  <td className="admin-num">{u._count.jams}</td>
                  <td className="admin-num">{u._count.messages + u._count.dmMessages}</td>
                  <td className="admin-num">{u._count.sessions}</td>
                  <td>
                    <div className="admin-row-actions">
                      {!u.isAdmin && !u.bannedUntil && (
                        <button
                          className="btn-icon violet"
                          title={t('admin.promote')}
                          disabled={busy}
                          onClick={() => action(u.id, { action: 'promote' })}
                        >
                          <ShieldCheck size={15} />
                        </button>
                      )}
                      {u.isAdmin && (
                        <button
                          className="btn-icon"
                          title={t('admin.demote')}
                          disabled={busy}
                          onClick={() => ask(t('admin.demote'), t('admin.demoteHint'), () => action(u.id, { action: 'demote' }), false)}
                        >
                          <ShieldOff size={15} />
                        </button>
                      )}
                      {!u.bannedUntil ? (
                        <button className="btn-icon" title={t('admin.ban')} disabled={busy} onClick={() => confirmBan(u)}>
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button
                          className="btn-icon violet"
                          title={t('admin.unban')}
                          disabled={busy}
                          onClick={() => ask(t('admin.unban'), t('admin.unbanConfirm', { username: u.username }), () => action(u.id, { action: 'unban' }), false)}
                        >
                          <BadgeCheck size={15} />
                        </button>
                      )}
                      <button className="btn-icon" title={t('admin.view')} disabled={busy} onClick={() => openDetail(u.id)}>
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={list.page} pages={list.pages} setPage={list.setPage} />

      {ban && (
        <AdminModal
          open
          title={t('admin.banTitle')}
          onClose={() => setBan(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setBan(null)}>
                {t('admin.cancel')}
              </button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => {
                  void banUsers(ban.ids);
                  setBan(null);
                }}
              >
                {t('admin.confirm')}
              </button>
            </>
          }
        >
          <p>{t('admin.banConfirm', { username: ban.username, days })}</p>
          <label className="admin-field">
            <span>{t('admin.banDays')}</span>
            <input type="number" min={1} max={36500} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>{t('admin.banReason')}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.banReason')} />
          </label>
        </AdminModal>
      )}

      {confirm && <ConfirmModal confirm={confirm} close={close} />}

      {detail && (
        <AdminModal
          open
          wide
          title={`@${detail.user.username}`}
          onClose={() => setDetail(null)}
          footer={
            <button className="btn btn-ghost" onClick={() => setDetail(null)}>
              {t('admin.close')}
            </button>
          }
        >
          <div className="admin-detail-grid">
            <div>
              <span className="admin-detail-label">{t('admin.username')}</span>
              <b>@{detail.user.username}</b>
            </div>
            <div>
              <span className="admin-detail-label">{t('admin.email')}</span>
              <b>{detail.user.email || '—'}</b>
            </div>
            <div>
              <span className="admin-detail-label">{t('admin.role')}</span>
              <b>{detail.user.isAdmin ? t('admin.admin') : t('admin.user')}</b>
            </div>
            <div>
              <span className="admin-detail-label">{t('admin.joined')}</span>
              <b>{fmtDateTime(detail.user.createdAt)}</b>
            </div>
            <div>
              <span className="admin-detail-label">{t('admin.sessionsCount')}</span>
              <b>{detail.user._count.sessions}</b>
            </div>
            <div>
              <span className="admin-detail-label">{t('admin.bannedUsers')}</span>
              <b>{detail.user.bannedUntil ? `${detail.user.bannedReason || t('admin.banned')} — ${fmtDateTime(detail.user.bannedUntil)}` : t('admin.active')}</b>
            </div>
            <div>
              <span className="admin-detail-label">Bio</span>
              <b>{detail.user.bio || '—'}</b>
            </div>
            <div>
              <span className="admin-detail-label">{t('admin.status')}</span>
              <b className={statusColor(detail.user.status)}>{detail.user.status}</b>
            </div>
          </div>

          <h4 className="admin-subhead">Sessions</h4>
          <div className="admin-mini-list">
            {detail.sessions.length === 0 && <div className="admin-empty-pad">—</div>}
            {detail.sessions.map((s) => (
              <div key={s.token} className="admin-mini-row">
                <span className="admin-mono">…{s.token.slice(-6)}</span>
                <span className="admin-dim">{s.device || s.name || '—'}</span>
                <span className="admin-dim">{fmtDateTime(s.createdAt)}</span>
              </div>
            ))}
          </div>

          <h4 className="admin-subhead">Recent jam messages</h4>
          <div className="admin-mini-list">
            {detail.recentMessages.length === 0 && <div className="admin-empty-pad">—</div>}
            {detail.recentMessages.map((m) => (
              <div key={m.id} className="admin-mini-row">
                <Badge tone={m.kind === 'VOICE' ? 'amber' : 'steel'}>{m.kind === 'VOICE' ? t('admin.voice') : t('admin.text')}</Badge>
                <span className="admin-ellipsis">{m.text || '🎙'}</span>
                <span className="admin-dim">{m.jam.name}</span>
              </div>
            ))}
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function statusColor(s: string) {
  if (s === 'ONLINE') return 'var(--color-green, #34d399)';
  if (s === 'BUSY') return 'var(--color-red, #f87171)';
  if (s === 'IDLE') return 'var(--color-amber, #fbbf24)';
  return 'var(--color-fog, #94a3b8)';
}
