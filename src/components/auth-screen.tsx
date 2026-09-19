'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { PasswordMeter } from '@/components/password-meter';
import { SECURITY_QUESTIONS } from '@/lib/constants';

export function AuthScreen() {
  const { authView, setAuthView } = useAppStore();

  return (
    <div className="auth-shell">
      <AuthBrand />
      <div className="auth-card">
        <motion.div
          key={authView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {authView === 'login' && <LoginForm onSwitch={setAuthView} />}
          {authView === 'signup' && <SignupForm onSwitch={setAuthView} />}
          {authView === 'forgot' && <ForgotForm onSwitch={setAuthView} />}
        </motion.div>
      </div>
    </div>
  );
}

function AuthBrand() {
  const t = useTranslations();
  return (
    <div className="auth-brand">
      <div className="wordmark">
        <span className="wordmark-mark">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3 5 21" />
            <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
          </svg>
        </span>
        {t('brand.name')}
      </div>
      <h1 className="auth-brand-title gradient-text">
        {t('brand.tagline')}
        <br />
        <em>{t('brand.taglineEm')}</em>
      </h1>
      <p className="auth-brand-sub">{t('auth.signInSub')}</p>
      <div className="auth-brand-cards">
        <div className="mini-card">
          <span className="mini-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span>{t('friends.search')}</span>
        </div>
        <div className="mini-card">
          <span className="mini-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </span>
          <span>{t('panel.jamsSub')}</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: (v: 'login' | 'signup' | 'forgot') => void }) {
  const t = useTranslations();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubEnabled, setGithubEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>('/api/auth/github/status')
      .then((d) => setGithubEnabled(d.enabled))
      .catch(() => setGithubEnabled(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', username, password }) });
      window.location.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="auth-card-title">{t('auth.welcomeBack')}</h2>
      <p className="auth-card-sub">{t('auth.signInSub')}</p>
      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <span className="field-label">{t('auth.username')}</span>
          <input className="auth-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label className="field">
          <span className="field-label">{t('auth.password')}</span>
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <div style={{ textAlign: 'right' }}>
          <button type="button" className="link-btn" onClick={() => onSwitch('forgot')}>
            {t('auth.forgotPassword')}
          </button>
        </div>
        <button type="submit" className="btn btn-violet btn-block" disabled={loading}>
          {loading ? '…' : t('auth.signIn')}
        </button>
        <div className="or-divider">
          <span>{t('auth.or')}</span>
        </div>
        {githubEnabled !== false && (
          <button type="button" className="btn btn-social btn-block" onClick={() => (window.location.href = '/api/auth/github')}>
            <span className="gh-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </span>
            {t('auth.github')}
          </button>
        )}
      </form>
      <p className="auth-switch">
        {t('auth.newHere')}{' '}
        <button className="link-btn" onClick={() => onSwitch('signup')}>
          {t('auth.createAccount')}
        </button>
      </p>
    </>
  );
}

function SignupForm({ onSwitch }: { onSwitch: (v: 'login' | 'signup' | 'forgot') => void }) {
  const t = useTranslations();
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '', questionId: 0, answer: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast(t('toast.shortPassword'), 'error');
    if (form.password !== form.password2) return toast(t('toast.noMatch'), 'error');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) return toast(t('toast.invalidUsername'), 'error');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast(t('toast.invalidEmail'), 'error');
    if (!form.answer.trim()) return toast(t('toast.unknownError'), 'error');
    setLoading(true);
    try {
      await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          questionId: form.questionId,
          answer: form.answer,
        }),
      });
      window.location.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="auth-card-title">{t('auth.createAccountTitle')}</h2>
      <p className="auth-card-sub">{t('auth.createAccountSub')}</p>
      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <span className="field-label">{t('auth.username')}</span>
          <input className="auth-input" type="text" value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="username" />
        </label>
        <div className="pair">
          <label className="field">
            <span className="field-label">
              {t('auth.email')} <span className="opt">({t('auth.emailOptional')})</span>
            </span>
            <input className="auth-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t('auth.answer')}</span>
            <input className="auth-input" type="text" value={form.answer} onChange={(e) => set('answer', e.target.value)} placeholder={t('auth.secretAnswer')} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">{t('auth.password')}</span>
          <input className="auth-input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
          <PasswordMeter value={form.password} />
        </label>
        <label className="field">
          <span className="field-label">{t('profile.confirmPassword')}</span>
          <input className="auth-input" type="password" value={form.password2} onChange={(e) => set('password2', e.target.value)} autoComplete="new-password" />
        </label>
        <label className="field">
          <span className="field-label">{t('auth.securityQuestion')}</span>
          <select className="auth-input" value={form.questionId} onChange={(e) => set('questionId', parseInt(e.target.value, 10))}>
            {SECURITY_QUESTIONS.map((q, i) => (
              <option key={q} value={i}>
                {q}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-violet btn-block" disabled={loading}>
          {loading ? '…' : t('auth.createAccount')}
        </button>
      </form>
      <p className="auth-switch">
        {t('auth.signInInstead')}{' '}
        <button className="link-btn" onClick={() => onSwitch('login')}>
          {t('auth.signInButton')}
        </button>
      </p>
    </>
  );
}

function ForgotForm({ onSwitch }: { onSwitch: (v: 'login' | 'signup' | 'forgot') => void }) {
  const t = useTranslations();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    setLoading(true);
    try {
      const res = await api<{ username: string; question: string }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'forgot-question', username }),
      });
      setQuestion(res.question);
      setStep(2);
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (newPass.length < 8) return toast(t('toast.shortPassword'), 'error');
    if (newPass !== newPass2) return toast(t('toast.noMatch'), 'error');
    setLoading(true);
    try {
      await api('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'forgot-reset', username, answer, newPassword: newPass }),
      });
      window.location.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="auth-card-title">{t('auth.resetTitle')}</h2>
      <p className="auth-card-sub">{t('auth.resetSub')}</p>
      {step === 1 ? (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <label className="field">
            <span className="field-label">{t('auth.username')}</span>
            <input className="auth-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-violet btn-block" disabled={loading}>
            {loading ? '…' : t('auth.continue')}
          </button>
        </form>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            reset();
          }}
        >
          <div className="question-chip">
            <strong>{question}</strong>
          </div>
          <label className="field">
            <span className="field-label">{t('auth.answer')}</span>
            <input className="auth-input" type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t('profile.newPassword')}</span>
            <input className="auth-input" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            <PasswordMeter value={newPass} />
          </label>
          <label className="field">
            <span className="field-label">{t('profile.confirmPassword')}</span>
            <input className="auth-input" type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-violet btn-block" disabled={loading}>
            {loading ? '…' : t('auth.setNewPassword')}
          </button>
        </form>
      )}
      <p className="auth-switch">
        {t('auth.remembered')}{' '}
        <button className="link-btn" onClick={() => onSwitch('login')}>
          {t('auth.signInButton')}
        </button>
      </p>
    </>
  );
}
