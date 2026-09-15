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

function faceSVG(v: number): string {
  if (v === 1) {
    return `<rect x="21" y="23" width="22" height="7" rx="3.5" fill="#fff"/><path d="M25 42 q7 6 14 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  if (v === 2) {
    return `<circle cx="27" cy="26" r="2.6" fill="#fff"/><circle cx="37" cy="26" r="2.6" fill="#fff"/><path d="M26 36 q6 5 12 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  if (v === 3) {
    return `<path d="M24 27 q3 -4 6 0 q3 4 6 0 q3 -4 6 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M28 40 q4 4 8 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  return `<circle cx="27" cy="26" r="2.6" fill="#fff"/><circle cx="37" cy="26" r="2.6" fill="#fff"/><path d="M25 38 q7 7 14 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
}

export function avatarSVG(id: number, idx: string): string {
  const i = Math.max(0, id % AVATAR_PAL.length);
  const [c1, c2] = AVATAR_PAL[i];
  const gid = `ag-${idx}`;
  const face = faceSVG(id % 4);
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="64" height="64" fill="url(#${gid})"/>
    <circle cx="32" cy="26" r="11" fill="rgba(255,255,255,0.22)"/>
    <circle cx="32" cy="54" r="16" fill="rgba(255,255,255,0.14)"/>
    ${face}
  </svg>`;
}

export function avatarEl(id: number, avatarId: number, size: string): string {
  return `<span class="avatar ${size}">${avatarSVG(avatarId || 0, String(id))}${size === 'avatar-56' ? `<img src="" alt="" style="display:none" data-avatar-id="${id}" />` : ''}</span>`;
}
