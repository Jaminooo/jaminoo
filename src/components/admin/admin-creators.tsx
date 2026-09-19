'use client';

import { useState } from 'react';
import { BadgeCheck, Check, RotateCcw, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, fmtDateTime, useSelection, SelectCheckbox, SelectionToolbar } from './admin-ui';

interface CreatorRow {
  id: number;
  hub: 'VIDEO' | 'MUSIC';
  channelName: string;
  handle: string;
  bio: string;
  category: string;
  links: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string;
  createdAt: string;
  user: { id: number; username: string; email: string };
}

export function AdminCreators() {
  const t = useTranslations();
  const [status, setStatus] = useState('PENDING');
  const [hub, setHub] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const list = useAdminList<CreatorRow>({ path: '/api/admin/creators', extra: { status, hub }, per: 15 });
  const selection = useSelection(list.rows.map((row) => row.id));

  const review = async (row: CreatorRow, nextStatus: CreatorRow['status']) => {
    setSaving(row.id);
    try {
      await api('/api/admin/creators', { method: 'PATCH', body: JSON.stringify({ id: row.id, status: nextStatus }) });
      list.reload();
    } finally {
      setSaving(null);
    }
  };

  const reviewMany = async (nextStatus: CreatorRow['status']) => {
    await Promise.allSettled(selection.selectedIds.map((id) => api('/api/admin/creators', { method: 'PATCH', body: JSON.stringify({ id: Number(id), status: nextStatus }) })));
    selection.clear();
    list.reload();
  };

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.searchCreators')} />
        <select className="admin-select" value={status} onChange={(event) => { setStatus(event.target.value); list.setPage(1); }}>
          <option value="PENDING">{t('admin.pending')}</option>
          <option value="APPROVED">{t('admin.approved')}</option>
          <option value="REJECTED">{t('admin.rejected')}</option>
          <option value="">{t('admin.allStatuses')}</option>
        </select>
        <select className="admin-select" value={hub} onChange={(event) => { setHub(event.target.value); list.setPage(1); }}>
          <option value="">{t('admin.allHubs')}</option>
          <option value="VIDEO">{t('admin.video')}</option>
          <option value="MUSIC">{t('admin.musicLabel')}</option>
        </select>
        <span className="admin-count">{t('admin.applicationsCount', { n: list.total })}</span>
      </div>
      <SelectionToolbar count={selection.count} onClear={selection.clear}>
        <button type="button" className="btn btn-violet pill-sm" onClick={() => void reviewMany('APPROVED')}><Check size={13} /> {t('admin.bulkApprove')}</button>
        <button type="button" className="btn btn-danger pill-sm" onClick={() => void reviewMany('REJECTED')}><X size={13} /> {t('admin.bulkReject')}</button>
      </SelectionToolbar>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th className="admin-check-cell"><SelectCheckbox checked={selection.allSelected} indeterminate={selection.count > 0 && !selection.allSelected} onChange={() => selection.toggleAll(list.rows.map((row) => row.id))} label={t('admin.selectAll')} /></th><th>{t('admin.channel')}</th><th>{t('admin.user')}</th><th>{t('admin.workspace')}</th><th>{t('admin.category')}</th><th>{t('admin.joined')}</th><th>{t('admin.status')}</th><th>{t('admin.actions')}</th></tr></thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loadingApplications')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.noCreatorApplications')} />}
            {!list.loading && list.rows.map((row) => (
              <tr key={row.id}>
                <td className="admin-check-cell"><SelectCheckbox checked={selection.isSelected(row.id)} onChange={() => selection.toggle(row.id)} label={row.channelName} /></td>
                <td><div className="admin-jam-name"><strong>{row.channelName}</strong><span>@{row.handle}</span><small>{row.bio}</small></div></td>
                <td><strong>@{row.user.username}</strong><div className="admin-dim">{row.user.email || t('admin.noEmail')}</div></td>
                <td><Badge tone={row.hub === 'VIDEO' ? 'violet' : 'amber'}>{row.hub}</Badge></td>
                <td>{row.category || <span className="admin-dim">—</span>}</td>
                <td>{fmtDateTime(row.createdAt)}</td>
                <td><Badge tone={row.status === 'APPROVED' ? 'green' : row.status === 'REJECTED' ? 'red' : 'amber'}>{statusLabel(t, row.status)}</Badge></td>
                <td><div className="admin-row-actions">
                  {row.status !== 'APPROVED' && <button className="btn-icon violet" disabled={saving === row.id} onClick={() => review(row, 'APPROVED')} title={t('admin.approve')}><Check size={15} /></button>}
                  {row.status !== 'REJECTED' && <button className="btn-icon danger" disabled={saving === row.id} onClick={() => review(row, 'REJECTED')} title={t('admin.reject')}><X size={15} /></button>}
                  {row.status !== 'PENDING' && <button className="btn-icon" disabled={saving === row.id} onClick={() => review(row, 'PENDING')} title={t('admin.reopen')}><RotateCcw size={15} /></button>}
                  {row.status === 'APPROVED' && <BadgeCheck size={15} className="admin-dim" />}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} pages={list.pages} setPage={list.setPage} />
    </div>
  );
}

function statusLabel(t: (key: string) => string, status: CreatorRow['status']) {
  const keys: Record<CreatorRow['status'], string> = {
    PENDING: 'admin.pending',
    APPROVED: 'admin.approved',
    REJECTED: 'admin.rejected',
  };

  return t(keys[status]);
}
