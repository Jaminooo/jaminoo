'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2, Volume2 } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, fmtDateTime, useSelection, SelectCheckbox, SelectionToolbar } from './admin-ui';
import type { Tone } from './admin-ui';

interface MsgRow {
  key: string;
  kind: 'jam' | 'dm';
  id: number;
  type: string;
  text: string;
  mediaId: string | null;
  createdAt: string;
  senderId: number;
  sender: string;
  target: string;
  reactions: number;
}

function truncate(s: string, n = 80) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function AdminMessages() {
  const t = useTranslations();
  const [kind, setKind] = useState('');
  const extra = useMemo(() => ({ kind }), [kind]);
  const list = useAdminList<MsgRow>({ path: '/api/admin/messages', extra, per: 20 });
  const selection = useSelection(list.rows.map((row) => row.key));
  const { confirm, ask, close } = useConfirm();
  const [busy, setBusy] = useState(false);

  async function del(id: number, kind: string) {
    setBusy(true);
    try {
      await api(`/api/admin/messages/${id}`, { method: 'DELETE', body: JSON.stringify({ kind }) });
      selection.clear();
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function delMany(keys: string[]) {
    setBusy(true);
    try {
      await Promise.allSettled(
        keys.map((key) => {
          const row = list.rows.find((item) => item.key === key);
          return row ? api(`/api/admin/messages/${row.id}`, { method: 'DELETE', body: JSON.stringify({ kind: row.kind }) }) : Promise.resolve();
        })
      );
      selection.clear();
      list.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.search')} />
        <div className="admin-filters">
          <select className="admin-select" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{t('admin.all')}</option>
            <option value="jam">{t('admin.jams')}</option>
            <option value="dm">DM</option>
          </select>
        </div>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <SelectionToolbar count={selection.count} onClear={selection.clear}>
        <button type="button" className="btn btn-danger pill-sm" disabled={busy} onClick={() => ask(t('admin.bulkDelete'), t('admin.deleteMsgConfirm'), () => delMany(selection.selectedIds))}>
          <Trash2 size={13} /> {t('admin.bulkDelete')}
        </button>
      </SelectionToolbar>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-check-cell">
                <SelectCheckbox checked={selection.allSelected} indeterminate={selection.count > 0 && !selection.allSelected} onChange={() => selection.toggleAll(list.rows.map((row) => row.key))} label={t('admin.selectAll')} />
              </th>
              <th>#</th>
              <th>{t('admin.sender')}</th>
              <th>{t('admin.in')}</th>
              <th></th>
              <th>Msg</th>
              <th>{t('admin.reactions')}</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.noMessages')} />}
            {!list.loading &&
              list.rows.map((m) => (
                <tr key={m.key}>
                  <td className="admin-check-cell">
                    <SelectCheckbox checked={selection.isSelected(m.key)} onChange={() => selection.toggle(m.key)} label={m.key} />
                  </td>
                  <td className="admin-mono">{m.key}</td>
                  <td>@{m.sender}</td>
                  <td>
                    {m.kind === 'dm' ? (
                      <Badge tone="violet">DM</Badge>
                    ) : (
                      <Badge tone="steel">{t('admin.jams')}</Badge>
                    )}
                  </td>
                  <td>
                    <Badge tone={m.type === 'VOICE' ? 'amber' : 'steel'}>
                      {m.type === 'VOICE' ? <Volume2 size={11} /> : t('admin.text')}
                    </Badge>
                  </td>
                  <td className="admin-message-preview">
                    {m.text ? truncate(m.text) : m.mediaId ? <audio controls preload="none" src={`/api/media/${encodeURIComponent(m.mediaId)}`} /> : '—'}
                  </td>
                  <td className="admin-num">{m.reactions}</td>
                  <td className="admin-dim" title={fmtDateTime(m.createdAt)}>
                    {fmtDateTime(m.createdAt)}
                  </td>
                  <td>
                    <button
                      className="btn-icon danger"
                      title={t('admin.deleteMsg')}
                      disabled={busy}
                      onClick={() =>
                        ask(
                          t('admin.deleteMsg'),
                          t('admin.deleteMsgConfirm'),
                          () => del(m.id, m.kind)
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={list.page} pages={list.pages} setPage={list.setPage} />
      {confirm && <ConfirmModal confirm={confirm} close={close} />}
    </div>
  );
}
