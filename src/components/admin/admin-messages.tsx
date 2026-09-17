'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2, Volume2 } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, fmtDateTime } from './admin-ui';
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
  const { confirm, ask, close } = useConfirm();
  const [busy, setBusy] = useState(false);

  async function del(id: number, kind: string) {
    setBusy(true);
    try {
      await api(`/api/admin/messages/${id}`, { method: 'DELETE', body: JSON.stringify({ kind }) });
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
        <div className="admin-filters">
          <select className="admin-select" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{t('admin.all')}</option>
            <option value="jam">{t('admin.jams')}</option>
            <option value="dm">DM</option>
          </select>
        </div>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
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
                  <td className="admin-ellipsis">{m.text ? truncate(m.text) : m.mediaId ? '🎙' : '—'}</td>
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