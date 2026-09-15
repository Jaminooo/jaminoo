'use client';

import { useTranslations } from 'next-intl';
import { useJamStore } from '@/store/jam-store';
import { useState } from 'react';
import { motion } from 'framer-motion';

export function ProfileCard() {
  const t = useTranslations();
  const store = useJamStore();
  const user = store.me();
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const onSave = () => {
    const ok = store.saveProfile(username, email, bio);
    if (ok) {
      setUsername(user?.username ?? '');
      setEmail(user?.email ?? '');
      setBio(user?.bio ?? '');
    }
  };

  return (
    <div className="field-row">
      <label className="field">
        <span className="field-label">{t('profile.username')}</span>
        <input className="auth-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t('profile.email')}</span>
        <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t('profile.bio')}</span>
        <textarea className="auth-input" rows={3} placeholder={t('profile.bioPlaceholder')} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <button className="btn btn-violet" onClick={onSave}>
        {t('profile.saveChanges')}
      </button>
    </div>
  );
}
