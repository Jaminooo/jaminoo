'use client';

import { useMemo, useState } from 'react';
import { Download, Search, ShieldCheck } from 'lucide-react';
import type { AdminEvent } from './admin-panel';
import { Badge, fmtDateTime } from './admin-ui';

export function AdminAudit({ events }: { events: AdminEvent[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const filtered = useMemo(() => events.filter((event) => {
    const matchesType = type === 'ALL' || event.type === type;
    const haystack = `${event.text} ${JSON.stringify(event.meta ?? {})}`.toLowerCase();
    return matchesType && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }), [events, query, type]);
  const download = () => {
    const body = filtered.map((event) => `${new Date(event.at).toISOString()}\t${event.type}\t${event.text}`).join('\n');
    const blob = new Blob([`time\ttype\taction\n${body}`], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `jamino-audit-${new Date().toISOString().slice(0, 10)}.tsv`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="admin-card admin-table-card admin-audit-card">
    <div className="admin-toolbar"><div className="admin-audit-heading"><ShieldCheck size={18} /><span><b>Audit log</b><small>Every recent moderation and control-center action</small></span></div><div className="admin-audit-tools"><label className="admin-audit-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions…" /></label><select className="admin-select" value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">All event types</option>{[...new Set(events.map((event) => event.type))].map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" className="btn btn-ghost pill-sm" onClick={download}><Download size={14} /> Export</button></div></div>
    <div className="admin-audit-count">{filtered.length} visible events · in-memory stream retains the latest {events.length}</div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Type</th><th>Action</th><th>Metadata</th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={4} className="admin-empty-cell">No audit events match this filter.</td></tr> : filtered.map((event, index) => <tr key={`${event.at}-${index}`}><td className="admin-dim admin-nowrap">{fmtDateTime(new Date(event.at))}</td><td><Badge tone={event.type === 'error' ? 'red' : event.type === 'ok' ? 'green' : event.type === 'warn' ? 'amber' : 'violet'}>{event.type}</Badge></td><td className="admin-ellipsis">{event.text}</td><td className="admin-mono admin-ellipsis">{event.meta ? JSON.stringify(event.meta) : '—'}</td></tr>)}</tbody></table></div>
  </div>;
}
