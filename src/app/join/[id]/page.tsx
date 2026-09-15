'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { Radio } from 'lucide-react';

export default function JoinJamPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations();
  const router = useRouter();
  const setRoomId = useAppStore((s) => s.setRoomId);
  const [state, setState] = useState<'loading' | 'joined' | 'auth' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const p = await params;
      const id = p.id;
      try {
        await api<{ user: unknown }>('/api/auth');
      } catch {
        setState('auth');
        return;
      }
      try {
        await api(`/api/jams/${id}/join`, { method: 'POST' });
        setRoomId(id);
        setState('joined');
      } catch (err) {
        setState('error');
        setErrMsg(err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '');
      }
    })();
  }, [params, setRoomId]);

  useEffect(() => {
    if (state === 'joined') {
      const id = setTimeout(() => router.push('/'), 900);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  return (
    <div className="screen">
      <div className="bg-grid" />
      <div className="bg-halo" />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 32 }}>
          <div className="jam-icon" style={{ width: 56, height: 56, margin: '0 auto 16px' }}>
            <Radio size={24} />
          </div>
          {state === 'loading' && <div className="pane-sub">{t('join.loading')}</div>}
          {state === 'joined' && (
            <>
              <h2 className="friend-name" style={{ fontSize: 20, marginBottom: 6 }}>{t('join.joined')}</h2>
              <div className="pane-sub">{t('join.opening')}</div>
            </>
          )}
          {state === 'auth' && (
            <>
              <h2 className="friend-name" style={{ fontSize: 20, marginBottom: 6 }}>{t('join.signIn')}</h2>
              <div className="pane-sub" style={{ marginBottom: 16 }}>{t('join.signInHint')}</div>
              <button type="button" className="btn btn-violet" onClick={() => router.push('/')}>
                {t('join.goHome')}
              </button>
            </>
          )}
          {state === 'error' && (
            <>
              <h2 className="friend-name" style={{ fontSize: 20, marginBottom: 6 }}>{t('join.failed')}</h2>
              <div className="pane-sub" style={{ marginBottom: 16 }}>{errMsg || t('toast.unknownError')}</div>
              <button type="button" className="btn btn-violet" onClick={() => router.push('/')}>
                {t('join.goHome')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}