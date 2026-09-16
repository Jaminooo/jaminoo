'use client';

import { useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2 } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, fmtDateTime } from './admin-ui';

interface SessionRow {
  token: string;
  suffix: string;
  name: string;
  device: string;
  createdAt: string;
  expiresAt: string;
  userId: number;
  username: string;
}

export function AdminSessions() {
  const t = useTranslations();
  const list = useAdminList<SessionRow>({ path: '/api/admin/sessions', per: 20 });
  const { confirm, ask, close } = useConfirm();
  const [busy, setBusy] = useState(false);

  async function revoke(token: string) {
    setBusy(true);
    try {
      await api(`/api/admin/sessions/${token}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.search')} />
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.suffix')}</th>
              <th>{t('admin.username')}</th>
              <th>{t('admin.device')}</th>
              <th>Name</th>
              <th>{t('admin.status')}</th>
              <th>{t('admin.joined')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.noSessions')} />}
            {!list.loading &&
              list.rows.map((s) => {
                const expired = new Date(s.expiresAt).getTime() < Date.now();
                return (
                  <tr key={s.token}>
                    <td className="admin-mono">…{s.suffix}</td>
                    <td>@{s.username}</td>
                    <td>{s.device || '—'}</td>
                    <td className="admin-dim">{s.name || '—'}</td>
                    <td>{expired ? <Badge tone="red">{t('admin.close')}</Badge> : <Badge tone="green">{t('admin.active')}</Badge>}</td>
                    <td className="admin-dim" title={fmtDateTime(s.createdAt)}>
                      {fmtDateTime(s.createdAt)}
                    </td>
                    <td>
                      <button
                        className="btn-icon danger"
                        title={t('admin.revoke')}
                        disabled={busy}
                        onClick={() => ask(t('admin.revoke'), t('admin.revokeConfirm'), () => revoke(s.token))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pager page={list.page} pages={list.pages} setPage={list.setPage} />
      {confirm && <ConfirmModal confirm={confirm} close={close} />}
    </div>
  );
}