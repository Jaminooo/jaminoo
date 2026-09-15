'use client';

export const AVATAR_PRESETS: { name: string; colors: [string, string] }[] = [
  { name: 'Red', colors: ['#ef4444', '#b91c1c'] },
  { name: 'Orange', colors: ['#f97316', '#c2410c'] },
  { name: 'Amber', colors: ['#eab308', '#a16207'] },
  { name: 'Lime', colors: ['#84cc16', '#4d7c0f'] },
  { name: 'Green', colors: ['#22c55e', '#15803d'] },
  { name: 'Teal', colors: ['#14b8a6', '#0f766e'] },
  { name: 'Cyan', colors: ['#06b6d4', '#0891b2'] },
  { name: 'Blue', colors: ['#3b82f6', '#1d4ed8'] },
  { name: 'Violet', colors: ['#8b5cf6', '#6d28d9'] },
  { name: 'Fuchsia', colors: ['#d946ef', '#a21caf'] },
  { name: 'Pink', colors: ['#ec4899', '#be185d'] },
  { name: 'Slate', colors: ['#64748b', '#334155'] },
];

export function JaminoAvatar({
  avatarId,
  size = 32,
  photo,
  name,
}: {
  avatarId: number;
  size?: number;
  photo?: string | null;
  name?: string;
}) {
  const i = Math.max(0, avatarId % AVATAR_PRESETS.length);
  const [c1, c2] = AVATAR_PRESETS[i].colors;
  const letter = (name || AVATAR_PRESETS[i].name).trim().charAt(0).toUpperCase() || '♪';
  const fs = Math.round(size * 0.44);
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ display: 'inline-block', width: size, height: size, borderRadius: size * 0.25, overflow: 'hidden', lineHeight: 0 }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={size} height={size} style={{ display: 'block', objectFit: 'cover' }} />
      ) : (
        <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <defs>
            <linearGradient id={`ag-${i}-${size}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={c1} />
              <stop offset="1" stopColor={c2} />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#ag-${i}-${size})`} />
          <circle cx="32" cy="32" r="24" fill="rgba(255,255,255,0.16)" />
          <circle cx="32" cy="32" r="17" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <text
            x="32"
            y="34"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fs}
            fontWeight={800}
            fill="#fff"
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
            style={{ letterSpacing: '-0.02em' }}
          >
            {letter}
          </text>
        </svg>
      )}
    </span>
  );
}