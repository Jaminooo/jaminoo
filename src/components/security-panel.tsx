'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { WorkspaceErrorState } from '@/components/workspace-feedback';
import { Monitor, Smartphone, Tablet, Shield, Loader2 } from 'lucide-react';

interface Session {
  suffix: string;
  name: string;
  device: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function SecurityPanel() {
  const t = useTranslations();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const d = await api<{ sessions: Session[] }>('/api/auth/sessions');
      setSessions(d.sessions);
    } catch {
      setLoadError(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const revoke = async (suffix: string, current: boolean) => {
    try {
      await api('/api/auth/sessions', { method: 'DELETE', body: JSON.stringify({ suffix }) });
      toast(current ? t('toast.loggedOut') : t('toast.revoked'));
      if (current) { window.location.reload(); return; }
      setSessions((p) => p.filter((s) => s.suffix !== suffix));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const icon = (device: string) => {
    if (/android|ios|mobile/i.test(device)) return <Smartphone size={18} />;
    if (/tablet|ipad/i.test(device)) return <Tablet size={18} />;
    return <Monitor size={18} />;
  };

  return (
    <>
      <header className="pane-head">
        <div>
          <h2 className="pane-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={22} /> {t('security.title')}</h2>
          <p className="pane-sub">{t('security.subtitle')}</p>
        </div>
      </header>

      {loading ? (
        <div className="security-sessions-loading" aria-busy="true" role="status">
          <Loader2 className="spin" size={18} />
          <span>{t('admin.loading')}</span>
        </div>
      ) : loadError ? (
        <WorkspaceErrorState message={t('security.loadError')} retryLabel={t('admin.refresh')} onRetry={() => void load()} />
      ) : (
        <div className="security-session-list">
          {sessions.map((s) => (
            <div key={s.suffix} className={`security-session-card ${s.current ? 'is-current' : ''}`}>
              <div className="security-session-icon">{icon(s.device)}</div>
              <div className="security-session-copy">
                <div className="security-session-name">{s.name || 'Browser'}</div>
                <div className="security-session-meta">{s.device}{s.createdAt ? ` · ${t('security.lastSeen', { time: timeAgo(s.createdAt) })}` : ''}</div>
              </div>
              {s.current ? (
                <span className="badge badge-violet">{t('security.current')}</span>
              ) : (
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => revoke(s.suffix, false)}>
                  {t('security.revoke')}
                </button>
              )}
            </div>
          ))}
          {sessions.length <= 1 && sessions.length > 0 && (
            <p className="security-session-hint">{t('security.noOtherSessions')}</p>
          )}
          {sessions.length === 0 && <div className="empty-state">{t('security.noSessions')}</div>}
        </div>
      )}
    </>
  );
}
