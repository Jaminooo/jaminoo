'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Theme = 'dark' | 'light' | 'system' | 'anime';

const themes: { value: Theme; icon: React.ComponentType<{ size?: number; className?: string }>; labelKey: string }[] = [
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
  { value: 'anime', icon: Sparkles, labelKey: 'theme.anime' },
];

export function JamThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('theme');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="theme-switcher">
      {themes.map(({ value, icon: Icon, labelKey }) => (
        <button
          key={value}
          className={`theme-btn ${theme === value ? 'active' : ''}`}
          onClick={() => setTheme(value)}
          aria-label={t(labelKey)}
          title={t(labelKey)}
        >
          <Icon size={16} />
          <span>{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
