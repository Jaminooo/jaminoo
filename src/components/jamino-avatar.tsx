'use client';

const AVATAR_PAL = [
  ['#7c5cff', '#4b2fd1'],
  ['#3b82f6', '#1d4ed8'],
  ['#14b8a6', '#0e7490'],
  ['#f472b6', '#db2777'],
  ['#f59e0b', '#d97706'],
  ['#22c55e', '#15803d'],
  ['#06b6d4', '#0284c7'],
  ['#a855f7', '#7e22ce'],
  ['#f97316', '#ea580c'],
  ['#0ea5e9', '#0369a1'],
  ['#ef4444', '#b91c1c'],
  ['#64748b', '#334155'],
];

function face(avatarId: number): React.ReactNode {
  const v = ((avatarId % 4) + 4) % 4;
  if (v === 1) {
    return (
      <>
        <rect x="21" y="23" width="22" height="7" rx="3.5" fill="#fff" />
        <path d="M25 42 q7 6 14 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (v === 2) {
    return (
      <>
        <circle cx="27" cy="26" r="2.6" fill="#fff" />
        <circle cx="37" cy="26" r="2.6" fill="#fff" />
        <path d="M26 36 q6 5 12 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (v === 3) {
    return (
      <>
        <path d="M24 27 q3 -4 6 0 q3 4 6 0 q3 -4 6 0" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M28 40 q4 4 8 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <circle cx="27" cy="26" r="2.6" fill="#fff" />
      <circle cx="37" cy="26" r="2.6" fill="#fff" />
      <path d="M25 38 q7 7 14 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  );
}

export function JaminoAvatar({ avatarId, size = 32 }: { avatarId: number; size?: number }) {
  const i = Math.max(0, avatarId % AVATAR_PAL.length);
  const [c1, c2] = AVATAR_PAL[i];
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ display: 'inline-block', width: size, height: size, borderRadius: 8, overflow: 'hidden', lineHeight: 0 }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`ag-${i}-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#ag-${i}-${size})`} />
        <circle cx="32" cy="26" r="11" fill="rgba(255,255,255,0.22)" />
        <circle cx="32" cy="54" r="16" fill="rgba(255,255,255,0.14)" />
        {face(avatarId)}
      </svg>
    </span>
  );
}