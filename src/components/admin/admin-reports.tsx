'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client-api';
import { Flag, Check, Eye } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, fmtDateTime } from './admin-ui';

interface ReportRow {
  id: number;
  status: string;
  reason: string;
  createdAt: string;
  reporter: string;
  kind: 'jam' | 'dm' | 'video';
  message: { id: number; text?: string; title?: string; user?: { username: string }; sender?: { username: string }; author?: { username: string }; jam?: { name: string } } | null;
}

export function AdminReports() {
  const [status, setStatus] = useState('OPEN');
  const extra = useMemo(() => ({ status }), [status]);
  const list = useAdminList<ReportRow>({ path: '/api/admin/reports', extra, per: 20 });

  async function update(id: number, next: string) {
    await api('/api/admin/reports', { method: 'PATCH', body: JSON.stringify({ id, status: next }) });
    list.reload();
  }

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder="Search reports" />
        <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="OPEN">Open</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="">All</option>
        </select>
        <span className="admin-count">{list.total} reports</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>#</th><th>Reporter</th><th>Message</th><th>Reason</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {list.loading && <LoadingRow text="Loading reports…" />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text="No reports found." />}
            {list.rows.map((row) => {
              const messageUser = row.message?.user?.username ?? row.message?.sender?.username ?? row.message?.author?.username ?? 'unknown';
              const messageText = row.kind === 'video' ? `[video] ${row.message?.title || 'Untitled post'}` : row.message?.text || '[voice]';
              return <tr key={row.id}>
                <td className="admin-mono"><Flag size={13} /> {row.id}</td>
                <td>@{row.reporter}</td>
                <td className="admin-ellipsis" title={messageText}>@{messageUser}: {messageText}</td>
                <td>{row.reason}</td>
                <td><Badge tone={row.status === 'OPEN' ? 'red' : row.status === 'RESOLVED' ? 'green' : 'amber'}>{row.status}</Badge></td>
                <td className="admin-dim">{fmtDateTime(row.createdAt)}</td>
                <td className="admin-actions">
                  {row.status === 'OPEN' && <button className="btn-icon" title="Mark reviewed" onClick={() => update(row.id, 'REVIEWED')}><Eye size={14} /></button>}
                  {row.status !== 'RESOLVED' && <button className="btn-icon" title="Resolve" onClick={() => update(row.id, 'RESOLVED')}><Check size={14} /></button>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} pages={list.pages} setPage={list.setPage} />
    </div>
  );
}
