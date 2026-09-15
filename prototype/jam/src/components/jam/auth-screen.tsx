'use client';

import { useTranslations } from 'next-intl';
'use client';

import { motion } from 'framer-motion';
import { useJamStore } from '@/store/jam-store';

interface AuthScreenProps {
  onLogin: () => void;
  onSwitchView: (view: 'login' | 'signup' | 'forgot') => void;
  t: ReturnType<typeof useTranslations>;
}

export function AuthScreen({ onLogin, onSwitchView, t }: AuthScreenProps) {
  const store = useJamStore();
  const [formLogin, setFormLogin] = useFormStore();
  const [formSignup, setFormSignup] = useFormStore();
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotNewPass2, setForgotNewPass2] = useState('');
  const [forgotUser, setForgotUser] = useState<{ id: number; username: string; question: string } | null>(null);

  const onLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = store.login(formLogin.username, formLogin.password);
    if (ok) onLogin();
  };

  const onSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = store.signup(formSignup.username, formSignup.email, formSignup.password, formSignup.question, formSignup.answer);
    if (ok) onLogin();
  };

  const onGithubLogin = () => {
    store.githubLogin();
    setTimeout(onLogin, 120);
  };

  const onForgotNext = () => {
    const user = store.forgotUsername(forgotUsername);
    if (!user) return;
    setForgotUser({ id: user.id, username: user.username, question: user.question || '' });
    setForgotStep(2);
  };

  const onForgotReset = () => {
    const ok = store.forgotReset(forgotAnswer, forgotNewPass, forgotNewPass2);
    if (ok) {
      setForgotStep(1);
      setForgotUsername('');
      setForgotAnswer('');
      setForgotNewPass('');
      setForgotNewPass2('');
      setForgotUser(null);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="wordmark">
          <span className="wordmark-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 3 5 21" />
              <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
            </svg>
          </span>
          {t('brand.name')}
        </div>
        <h1 className="auth-brand-title gradient-text">
          {t('brand.tagline')}<br /><em>{t('brand.taglineEm')}</em>
        </h1>
        <p className="auth-brand-sub">{t('auth.signInSub')}</p>
        <div className="auth-brand-cards">
          <div className="mini-card">
            <span className="mini-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span>{t('jams.jamsSub')}</span>
          </div>
          <div className="mini-card">
            <span className="mini-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </span>
            <span>{t('auth.signInSub')}</span>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-view" style={{ display: 'block' }}>
          <h2 className="auth-card-title">{t('auth.welcomeBack')}</h2>
          <p className="auth-card-sub">{t('auth.signInSub')}</p>
          <form onSubmit={onLoginSubmit} className="auth-form">
            <label className="field">
              <span className="field-label">{t('auth.username')}</span>
              <input className="auth-input" type="text" placeholder={t('auth.username')} value={formLogin.username} onChange={(e) => setFormLogin('username', e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">{t('auth.password')}</span>
              <input className="auth-input" type="password" placeholder="••••••••" value={formLogin.password} onChange={(e) => setFormLogin('password', e.target.value)} />
            </label>
            <div style={{ textAlign: 'right' }}>
              <button type="button" className="link-btn" onClick={() => onSwitchView('forgot')}>
                {t('auth.forgotPassword')}
              </button>
            </div>
            <button type="submit" className="btn btn-violet btn-block">{t('auth.signIn')}</button>
            <div className="or-divider"><span>{t('auth.or')}</span></div>
            <button type="button" className="btn btn-social btn-block" onClick={onGithubLogin}>
              <span className="gh-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </span>
              {t('auth.github')}
            </button>
          </form>
          <p className="auth-switch">
            {t('auth.newHere')} <button className="link-btn" onClick={() => onSwitchView('signup')}>{t('auth.createAccount')}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

interface FormState {
  username: string;
  email: string;
  password: string;
  password2?: string;
  question?: string;
  answer?: string;
}

function useFormStore() {
  const [form, setForm] = useState<FormState>({ username: '', email: '', password: '', password2: '', question: '', answer: '' });
  const set = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  return [form, set] as const;
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const signupSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  password2: z.string(),
  question: z.string(),
  answer: z.string().min(1),
});

export const ERROR_MESSAGES: Record<string, string> = {
  required: 'This field is required.',
  username: 'Username must be 3-20 characters of letters, numbers, underscores.',
  usernameTaken: 'Username already taken.',
  email: 'Invalid email address.',
  password: 'Password must be at least 6 characters.',
  passwordMismatch: 'Passwords do not match.',
  answer: 'Please provide an answer.',
};
