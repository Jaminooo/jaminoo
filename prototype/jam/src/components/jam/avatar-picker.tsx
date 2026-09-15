'use client';

import { useTranslations } from 'next-intl';
import { avatarSVG } from '@/components/jam/jam-avatar';

interface Props {
  currentId: number;
  onChange: (id: number) => void;
}

export function AvatarPicker({ currentId, onChange }: Props) {
  const t = useTranslations();
  return (
    <div className="avatar-picker">
      {Array.from({ length: 12 }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={`avatar-opt ${i === currentId ? 'selected' : ''}`}
          onClick={() => onChange(i)}
          title={t('profile.avatar') + ' ' + (i + 1)}
          aria-label={t('profile.avatar') + ' ' + (i + 1)}
          dangerouslySetInnerHTML={{ __html: avatarSVG(i, 'ap-' + i) }}
        />
      ))}
    </div>
  );
}
