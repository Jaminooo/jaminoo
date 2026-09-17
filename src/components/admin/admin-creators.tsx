'use client';

import { useState } from 'react';
import { BadgeCheck, Check, RotateCcw, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, fmtDateTime } from './admin-ui';

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
  const [status, setStatus] = useState('PENDING');
  const [hub, setHub] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const list = useAdminList<CreatorRow>({ path: '/api/admin/creators', extra: { status, hub }, per: 15 });

  const review = async (row: CreatorRow, nextStatus: CreatorRow['status']) => {
    setSaving(row.id);
    try {
      await api('/api/admin/creators', { method: 'PATCH', body: JSON.stringify({ id: row.id, status: nextStatus }) });
      list.reload();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder="Search channel, handle or user…" />
        <select className="admin-select" value={status} onChange={(event) => { setStatus(event.target.value); list.setPage(1); }}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All statuses</option>
        </select>
        <select className="admin-select" value={hub} onChange={(event) => { setHub(event.target.value); list.setPage(1); }}>
          <option value="">All hubs</option>
          <option value="VIDEO">Video</option>
          <option value="MUSIC">Music</option>
        </select>
        <span className="admin-count">{list.total} applications</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Channel</th><th>User</th><th>Hub</th><th>Category</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.loading && <LoadingRow text="Loading applications…" />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text="No creator applications match these filters." />}
            {!list.loading && list.rows.map((row) => (
              <tr key={row.id}>
                <td><div className="admin-jam-name"><strong>{row.channelName}</strong><span>@{row.handle}</span><small>{row.bio}</small></div></td>
                <td><strong>@{row.user.username}</strong><div className="admin-dim">{row.user.email || 'No email'}</div></td>
                <td><Badge tone={row.hub === 'VIDEO' ? 'violet' : 'amber'}>{row.hub}</Badge></td>
                <td>{row.category || <span className="admin-dim">—</span>}</td>
                <td>{fmtDateTime(row.createdAt)}</td>
                <td><Badge tone={row.status === 'APPROVED' ? 'green' : row.status === 'REJECTED' ? 'red' : 'amber'}>{row.status}</Badge></td>
                <td><div className="admin-row-actions">
                  {row.status !== 'APPROVED' && <button className="btn-icon violet" disabled={saving === row.id} onClick={() => review(row, 'APPROVED')} title="Approve"><Check size={15} /></button>}
                  {row.status !== 'REJECTED' && <button className="btn-icon danger" disabled={saving === row.id} onClick={() => review(row, 'REJECTED')} title="Reject"><X size={15} /></button>}
                  {row.status !== 'PENDING' && <button className="btn-icon" disabled={saving === row.id} onClick={() => review(row, 'PENDING')} title="Reopen"><RotateCcw size={15} /></button>}
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
