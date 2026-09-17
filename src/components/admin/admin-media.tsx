'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Trash2, Volume2, ImageIcon, ExternalLink } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, formatBytes, fmtDateTime } from './admin-ui';
import type { Tone } from './admin-ui';

interface MediaRow {
  id: string;
  kind: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
  userId: number;
  user: { username: string };
}

export function AdminMedia() {
  const t = useTranslations();
  const [kind, setKind] = useState('');
  const extra = useMemo(() => ({ kind }), [kind]);
  const list = useAdminList<MediaRow>({ path: '/api/admin/media', extra, per: 15 });
  const { confirm, ask, close } = useConfirm();
  const [busy, setBusy] = useState(false);

  async function del(id: string) {
    setBusy(true);
    try {
      await api(`/api/admin/media/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function tone(k: string): Tone {
    return k === 'VOICE' ? 'amber' : 'green';
  }

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.search')} />
        <div className="admin-filters">
          <select className="admin-select" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{t('admin.all')}</option>
            <option value="IMAGE">{t('admin.image')}</option>
            <option value="VOICE">{t('admin.voice')}</option>
          </select>
        </div>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('admin.file')}</th>
              <th>{t('admin.file')}</th>
              <th>{t('admin.size')}</th>
              <th>{t('admin.username')}</th>
              <th>{t('admin.joined')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.noMedia')} />}
            {!list.loading &&
              list.rows.map((f) => (
                <tr key={f.id}>
                  <td className="admin-mono">{f.id}</td>
                  <td>
                    <Badge tone={tone(f.kind)}>
                      {f.kind === 'VOICE' ? <Volume2 size={11} /> : <ImageIcon size={11} />} {f.kind}
                    </Badge>
                  </td>
                  <td className="admin-ellipsis" style={{ maxWidth: 240 }} title={f.filename}>
                    {f.filename}
                  </td>
                  <td>
                    <span title={f.mime}>{formatBytes(f.size)}</span>
                  </td>
                  <td>@{f.user.username}</td>
                  <td className="admin-dim" title={fmtDateTime(f.createdAt)}>
                    {fmtDateTime(f.createdAt)}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <a className="btn-icon" href={`/api/media/${f.id}`} target="_blank" rel="noreferrer" title="open">
                        <ExternalLink size={15} />
                      </a>
                      <button
                        className="btn-icon danger"
                        title={t('admin.deleteMedia')}
                        disabled={busy}
                        onClick={() => ask(t('admin.deleteMedia'), t('admin.deleteMediaConfirm'), () => del(f.id))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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