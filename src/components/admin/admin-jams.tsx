'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { LockKeyhole, Globe, DoorClosed, DoorOpen, Trash2 } from 'lucide-react';
import { useAdminList, SearchBar, Pager, LoadingRow, EmptyRow, Badge, ConfirmModal, useConfirm, fmtDateTime } from './admin-ui';
import type { Tone } from './admin-ui';

interface JamRow {
  id: string;
  name: string;
  desc: string;
  kind: string;
  type: 'PUBLIC' | 'PRIVATE';
  closed: boolean;
  createdAt: string;
  ownerId: number;
  owner: { username: string };
  _count: { members: number; messages: number; invites: number };
}

function kindTone(kind: string): Tone {
  if (kind === 'MOVIE') return 'violet';
  if (kind === 'MUSIC') return 'green';
  if (kind === 'HANGOUT') return 'amber';
  return 'steel';
}

export function AdminJams() {
  const t = useTranslations();
  const [kind, setKind] = useState('');
  const [type, setType] = useState('');
  const [state, setState] = useState('');

  const extra = useMemo(() => ({ kind, type, state }), [kind, type, state]);
  const list = useAdminList<JamRow>({ path: '/api/admin/jams', extra, per: 15 });
  const { confirm, ask, close } = useConfirm();
  const [busy, setBusy] = useState(false);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      await api(`/api/admin/jams/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    setBusy(true);
    try {
      await api(`/api/admin/jams/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const filters: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }[] = [
    {
      label: t('admin.jamKind'),
      value: kind,
      onChange: setKind,
      options: [
        { v: '', l: t('admin.all') },
        { v: 'CHAT', l: 'Chat' },
        { v: 'MOVIE', l: 'Movie' },
        { v: 'MUSIC', l: 'Music' },
        { v: 'HANGOUT', l: 'Hangout' },
      ],
    },
    {
      label: t('admin.jamType'),
      value: type,
      onChange: setType,
      options: [
        { v: '', l: t('admin.all') },
        { v: 'PUBLIC', l: 'Public' },
        { v: 'PRIVATE', l: 'Private' },
      ],
    },
    {
      label: t('admin.state'),
      value: state,
      onChange: setState,
      options: [
        { v: '', l: t('admin.all') },
        { v: 'open', l: t('admin.openJams') },
        { v: 'closed', l: t('admin.status') },
      ],
    },
  ];

  return (
    <div className="admin-card admin-table-card">
      <div className="admin-toolbar">
        <SearchBar value={list.q} onChange={list.setQ} onSearch={() => list.setQuery(list.q.trim())} placeholder={t('admin.search')} />
        <div className="admin-filters">
          {filters.map((f) => (
            <select key={f.label} className="admin-select" value={f.value} onChange={(e) => f.onChange(e.target.value)}>
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          ))}
        </div>
        <span className="admin-count">{t('admin.items', { n: list.total })}</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.jamName')}</th>
              <th>{t('admin.owner')}</th>
              <th>{t('admin.jamKind')}</th>
              <th>{t('admin.jamType')}</th>
              <th>{t('admin.members')}</th>
              <th>{t('admin.jamMessages')}</th>
              <th>{t('admin.status')}</th>
              <th>{t('admin.joined')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.loading && <LoadingRow text={t('admin.loading')} />}
            {!list.loading && list.rows.length === 0 && <EmptyRow text={t('admin.noJams')} />}
            {!list.loading &&
              list.rows.map((j) => (
                <tr key={j.id}>
                  <td>
                    <div className="admin-jam-name">
                      <b>{j.name}</b>
                      <span className="admin-mono">#{j.id}</span>
                    </div>
                    {j.desc ? <div className="admin-dim admin-ellipsis" style={{ maxWidth: 220 }}>{j.desc}</div> : null}
                  </td>
                  <td>@{j.owner.username}</td>
                  <td>
                    <Badge tone={kindTone(j.kind)}>{j.kind.toLowerCase()}</Badge>
                  </td>
                  <td>
                    {j.type === 'PUBLIC' ? <Badge tone="steel"><Globe size={11} /> public</Badge> : <Badge tone="amber"><LockKeyhole size={11} /> private</Badge>}
                  </td>
                  <td className="admin-num">{j._count.members}</td>
                  <td className="admin-num">{j._count.messages}</td>
                  <td>
                    {j.closed ? <Badge tone="red"><DoorClosed size={11} /> {t('admin.close')}</Badge> : <Badge tone="green"><DoorOpen size={11} /> {t('admin.open')}</Badge>}
                  </td>
                  <td className="admin-dim" title={fmtDateTime(j.createdAt)}>
                    {fmtDateTime(j.createdAt)}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className={`btn-icon ${j.closed ? 'violet' : ''}`}
                        title={j.closed ? t('admin.open') : t('admin.close')}
                        disabled={busy}
                        onClick={() => patch(j.id, { closed: !j.closed })}
                      >
                        {j.closed ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
                      </button>
                      <button
                        className="btn-icon danger"
                        title={t('admin.deleteJam')}
                        disabled={busy}
                        onClick={() =>
                          ask(t('admin.deleteJam'), t('admin.deleteJamConfirm', { name: j.name }), () => del(j.id))
                        }
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