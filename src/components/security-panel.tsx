'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { Monitor, Smartphone, Tablet, Globe, Shield } from 'lucide-react';

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

  const load = async () => {
    try {
      const d = await api<{ sessions: Session[] }>('/api/auth/sessions');
      setSessions(d.sessions);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-fog)' }}>...</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {sessions.map((s) => (
            <div key={s.suffix} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, opacity: s.current ? 1 : 0.92 }}>
              <div style={{ color: s.current ? 'var(--color-violet)' : 'var(--color-fog)' }}>{icon(s.device)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name || 'Browser'}</div>
                <div style={{ fontSize: 12, color: 'var(--color-fog)', marginTop: 2 }}>{s.device}{s.createdAt ? ` · ${t('security.lastSeen', { time: timeAgo(s.createdAt) })}` : ''}</div>
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
          {sessions.length <= 1 && (
            <p className="pane-sub" style={{ marginTop: 12 }}>{t('security.noOtherSessions')}</p>
          )}
        </div>
      )}
    </>
  );
}