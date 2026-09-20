'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { Shield, LogIn, Eye, EyeOff, Terminal } from 'lucide-react';

export default function SuperLoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/super-login', {
        method: 'POST',
        body: JSON.stringify({ action: 'login', username, password }),
      });
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.notAdminText'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="super-login-root">
      <div className="super-login-glow" />
      <main className="super-login-main">
        <div className="super-login-card">
          <div className="super-login-head">
            <span className="super-login-mark">
              <Shield size={22} />
            </span>
            <h1>{t('super.title')}</h1>
            <p>{t('super.subtitle')}</p>
          </div>

          <form className="super-login-form" onSubmit={submit}>
            <label>
              <span>{t('super.username')}</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin"
                autoComplete="username"
                required
              />
            </label>
            <label style={{ position: 'relative' }}>
              <span>{t('super.password')}</span>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('super.passwordPlaceholder')}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="super-login-pw"
                aria-label={showPw ? t('super.hide') : t('super.show')}
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>
            {error ? <div className="super-login-error">{error}</div> : null}
            <button type="submit" className="btn btn-violet super-login-submit" disabled={loading}>
              {loading ? (
                <span className="super-login-loading" />
              ) : (
                <>
                  <LogIn size={15} /> {t('super.login')}
                </>
              )}
            </button>
          </form>

          <div className="super-login-footer">
            <Terminal size={13} />
            <span>{t('super.hint')}</span>
          </div>

          <div className="super-login-back">
            <Link href="/">{t('admin.backToApp')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
