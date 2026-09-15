export const SECURITY_QUESTIONS = [
  'What city were you born in?',
  'What is the name of your first pet?',
  'What elementary school did you attend?',
  'What is your mother\u2019s maiden name?',
  'What was the make of your first car?',
  'What is your favorite book?',
];

export const MAX_PROFILE_MEDIA = 5;
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const U_ID_PREFIX = 'JM';

export function uidDisplay(id: number) {
  return U_ID_PREFIX + '-' + String(id).padStart(4, '0');
}

export function parseUid(raw: string): number | null {
  const m = raw.trim().toUpperCase().match(new RegExp(`^${U_ID_PREFIX}-?(\\d{1,6})$`));
  return m ? parseInt(m[1], 10) : /^(\d{1,6})$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : null;
}