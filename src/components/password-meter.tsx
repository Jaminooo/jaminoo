'use client';

import { useTranslations } from '@/providers/use-translations';

export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.max(0, Math.min(5, s));
}

export function PasswordMeter({ value }: { value: string }) {
  const t = useTranslations();
  if (!value) return null;
  const score = passwordScore(value);
  const pct = score * 20;

  const labels = [
    { min: 0, key: t('auth.pwWeak'), color: '#e5484d' },
    { min: 2, key: t('auth.pwFair'), color: '#f76b15' },
    { min: 3, key: t('auth.pwGood'), color: '#f5a623' },
    { min: 4, key: t('auth.pwStrong'), color: '#5cb70a' },
    { min: 5, key: t('auth.pwVeryStrong'), color: '#30a46c' },
  ];

  const level = labels.filter((l) => score >= l.min).pop() ?? labels[0];

  return (
    <div className="pw-meter" style={{ marginTop: 6 }}>
      <div className="pw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="pw-fill" style={{ width: `${pct}%`, background: level.color }} />
      </div>
      <span className="pw-label" style={{ color: level.color }}>{level.key}</span>
    </div>
  );
}