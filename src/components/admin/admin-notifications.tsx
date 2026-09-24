'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Megaphone, Plus, Trash2, Loader2, Bell, Check } from 'lucide-react';
import { AdminModal, ConfirmModal, useConfirm, fmtDateTime, EmptyRow, LoadingRow } from './admin-ui';
import { WorkspaceErrorState } from '@/components/workspace-feedback';

interface BroadcastRow {
  batchId: string;
  createdAt: string;
  title: string | null;
  message: { fa: string; en: string } | null;
  audience: string | null;
  author: string | null;
  sent: number;
  read: number;
}

interface TargetUser {
  id: number;
  username: string;
}

type Mode = 'all' | 'users' | 'filter';

export function AdminNotifications() {
  const t = useTranslations();
  const [rows, setRows] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [composer, setComposer] = useState(false);
  const { confirm, ask, close } = useConfirm();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  const [title, setTitle] = useState('');
  const [msgFa, setMsgFa] = useState('');
  const [msgEn, setMsgEn] = useState('');
  const [mode, setMode] = useState<Mode>('all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TargetUser[]>([]);
  const [picked, setPicked] = useState<TargetUser[]>([]);
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterAdmins, setFilterAdmins] = useState(false);
  const [filterBanned, setFilterBanned] = useState(false);
  const [country, setCountry] = useState('');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api<{ broadcasts: BroadcastRow[] }>('/api/admin/notifications')
      .then((d) => setRows(d.broadcasts))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const estimateAudience = useCallback(() => {
    if (!composer) return;
    const params = new URLSearchParams({ audience: '1' });
    if (mode === 'all') params.set('all', '1');
    if (mode === 'users' && picked.length) params.set('ids', picked.map((u) => u.id).join(','));
    if (mode === 'filter') {
      if (filterOnline) params.set('online', '1');
      if (filterAdmins) params.set('admins', '1');
      if (filterBanned) params.set('banned', '1');
      if (country.trim()) params.set('country', country.trim());
    }
    setEstimating(true);
    api<{ count: number }>(`/api/admin/notifications?${params}`)
      .then((d) => setEstimate(d.count))
      .catch(() => setEstimate(null))
      .finally(() => setEstimating(false));
  }, [composer, mode, picked, filterOnline, filterAdmins, filterBanned, country]);

  useEffect(() => {
    estimateAudience();
  }, [estimateAudience]);

  const search = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const d = await api<{ rows: TargetUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}&per=8`);
      setResults(d.rows ?? []);
    } catch {
      setResults([]);
    }
  }, [query]);

  const openComposer = () => {
    setTitle('');
    setMsgFa('');
    setMsgEn('');
    setMode('all');
    setQuery('');
    setResults([]);
    setPicked([]);
    setFilterOnline(false);
    setFilterAdmins(false);
    setFilterBanned(false);
    setCountry('');
    setEstimate(null);
    setStatus('');
    setComposer(true);
  };

  const send = async () => {
    if (!msgFa.trim() && !msgEn.trim()) {
      setStatus(t('admin.notif.msgRequired'));
      return;
    }
    if ((estimate ?? 0) <= 0) {
      setStatus(t('admin.notif.noAudience'));
      return;
    }
    setSending(true);
    setStatus('');
    try {
      const body = {
        title: title.trim() || undefined,
        message: { fa: msgFa.trim(), en: msgEn.trim() },
        audience:
          mode === 'users'
            ? { userIds: picked.map((u) => u.id) }
            : mode === 'filter'
              ? { filter: { online: filterOnline, admins: filterAdmins, banned: filterBanned, country: country.trim() || undefined } }
              : { all: true },
      };
      const res = await api<{ ok: boolean; count: number }>('/api/admin/notifications', { method: 'POST', body: JSON.stringify(body) });
      setStatus(t('admin.notif.sent', { n: res.count }));
      setComposer(false);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setStatus(msg || t('admin.notif.sendError'));
    } finally {
      setSending(false);
    }
  };

  const removeBatch = async (row: BroadcastRow) => {
    try {
      await api(`/api/admin/notifications?batch=${encodeURIComponent(row.batchId)}`, { method: 'DELETE' });
      setStatus('');
      load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('admin.loadError'));
    }
  };

  const previewHeading = title.trim() || t('notif.broadcastTitle');
  const previewDetail = msgFa.trim() || msgEn.trim() || t('admin.notif.previewEmpty');

  return (
    <div className="admin-card admin-notif-card">
      <div className="admin-toolbar">
        <span className="admin-count">{t('admin.notif.history')}</span>
        <div className="admin-notif-toolbar-actions">
          <button type="button" className="btn btn-violet pill-sm" onClick={openComposer}>
            <Megaphone size={14} /> {t('admin.notif.send')}
          </button>
        </div>
      </div>

      {status ? <div className="admin-notif-status">{status}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.notif.dateCol')}</th>
              <th>{t('admin.notif.announcement')}</th>
              <th>{t('admin.notif.sentCount')}</th>
              <th>{t('admin.notif.readCount')}</th>
              <th>{t('admin.notif.readRate')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow text={t('admin.loading')} />}
            {!loading && loadError && <tr><td colSpan={6}><WorkspaceErrorState message={t('admin.loadError')} retryLabel={t('admin.refresh')} onRetry={load} /></td></tr>}
            {!loading && !loadError && rows.length === 0 && <EmptyRow text={t('admin.notif.empty')} />}
            {!loading &&
              rows.map((row) => {
                const heading = typeof row.title === 'string' ? row.title : (row.message?.en || row.message?.fa || '').slice(0, 40);
                const rate = row.sent > 0 ? Math.round((row.read / row.sent) * 100) : 0;
                return (
                  <tr key={row.batchId}>
                    <td>{fmtDateTime(row.createdAt)}</td>
                    <td>
                      <div className="admin-jam-name">
                        <strong>{heading || t('notif.broadcastTitle')}</strong>
                        <span>{row.audience || ''}</span>
                        <small>{row.author ? `@${row.author}` : ''}</small>
                      </div>
                    </td>
                    <td>{row.sent}</td>
                    <td>{row.read}</td>
                    <td>{rate}%</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="btn-icon danger"
                          onClick={() =>
                            ask(t('admin.notif.deleteBatch'), t('admin.notif.deleteBatchConfirm'), () => void removeBatch(row))
                          }
                          title={t('admin.notif.deleteBatch')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={composer}
        title={t('admin.notif.compose')}
        onClose={() => setComposer(false)}
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setComposer(false)}>
              {t('admin.cancel')}
            </button>
            <button className="btn btn-violet" onClick={send} disabled={sending}>
              {sending ? <Loader2 className="spin" size={14} /> : <Megaphone size={14} />}
              {t('admin.notif.send')}
            </button>
          </>
        }
      >
        <div className="admin-notif-form">
          <label className="admin-notif-field admin-notif-field-full">
            <span>{t('admin.notif.title')}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('admin.notif.titlePlaceholder')} />
          </label>
          <label className="admin-notif-field">
            <span>{t('admin.notif.messageFa')}</span>
            <textarea value={msgFa} onChange={(e) => setMsgFa(e.target.value)} maxLength={1000} rows={3} placeholder="…" />
          </label>
          <label className="admin-notif-field">
            <span>{t('admin.notif.messageEn')}</span>
            <textarea value={msgEn} onChange={(e) => setMsgEn(e.target.value)} maxLength={1000} rows={3} placeholder="…" />
          </label>

          <div className="admin-notif-field admin-notif-field-full">
            <span>{t('admin.notif.audience')}</span>
            <div className="admin-notif-audience">
              <button type="button" className={`admin-notif-toggle ${mode === 'all' ? 'active' : ''}`} onClick={() => setMode('all')}>
                {t('admin.notif.audienceAll')}
              </button>
              <button type="button" className={`admin-notif-toggle ${mode === 'users' ? 'active' : ''}`} onClick={() => setMode('users')}>
                {t('admin.notif.audienceUsers')}
              </button>
              <button type="button" className={`admin-notif-toggle ${mode === 'filter' ? 'active' : ''}`} onClick={() => setMode('filter')}>
                {t('admin.notif.audienceFilter')}
              </button>
            </div>
          </div>

          {mode === 'users' ? (
            <div className="admin-notif-field admin-notif-field-full">
              <span>{t('admin.notif.selectUsers')}</span>
              <div className="admin-notif-search">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void search();
                    }
                  }}
                  placeholder={t('admin.notif.searchUsers')}
                />
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="admin-notif-result"
                    onClick={() => {
                      setPicked((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
                      setResults((prev) => prev.filter((r) => r.id !== u.id));
                      setQuery('');
                    }}
                  >
                    <Plus size={13} /> @{u.username}
                  </button>
                ))}
              </div>
              {picked.length > 0 ? (
                <div className="admin-notif-chips">
                  {picked.map((u) => (
                    <span key={u.id} className="admin-notif-chip">
                      @{u.username}
                      <button type="button" onClick={() => setPicked((prev) => prev.filter((p) => p.id !== u.id))} aria-label="remove">
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === 'filter' ? (
            <div className="admin-notif-field admin-notif-field-full">
              <span>{t('admin.notif.filters')}</span>
              <div className="admin-notif-checkboxes">
                <label className="admin-notif-check">
                  <input type="checkbox" checked={filterOnline} onChange={(e) => setFilterOnline(e.target.checked)} />
                  {t('admin.notif.filterOnline')}
                </label>
                <label className="admin-notif-check">
                  <input type="checkbox" checked={filterAdmins} onChange={(e) => setFilterAdmins(e.target.checked)} />
                  {t('admin.notif.filterAdmins')}
                </label>
                <label className="admin-notif-check">
                  <input type="checkbox" checked={filterBanned} onChange={(e) => setFilterBanned(e.target.checked)} />
                  {t('admin.notif.filterBanned')}
                </label>
                <input
                  className="admin-notif-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder={t('admin.notif.filterCountry')}
                  maxLength={2}
                />
              </div>
            </div>
          ) : null}

          <div className="admin-notif-field admin-notif-field-full">
            <div className="admin-notif-estimate">
              <Bell size={15} />
              <span>{t('admin.notif.estRecipients')}:</span>
              {estimating ? <Loader2 className="spin" size={14} /> : <b>{estimate ?? '—'}</b>}
            </div>
          </div>

          <div className="admin-notif-preview">
            <span className="admin-notif-preview-label">{t('admin.notif.preview')}</span>
            <div className="notification-item unread">
              <span className="notification-icon amber">
                <Megaphone size={14} />
              </span>
              <span className="notification-copy">
                <span className="notification-text">{previewHeading}</span>
                <span className="notification-detail">{previewDetail}</span>
              </span>
            </div>
          </div>
        </div>
      </AdminModal>

      {confirm && <ConfirmModal confirm={confirm} close={close} />}
    </div>
  );
}
