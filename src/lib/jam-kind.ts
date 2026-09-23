// Jam kinds a user can create from the hubs (music rooms, cinema parties, anime parties).
export const CREATABLE_JAM_KINDS = ['MUSIC', 'MOVIE', 'ANIME'] as const;
export type CreatableJamKind = (typeof CREATABLE_JAM_KINDS)[number];

// All kinds the schema supports (legacy kinds are read-only survivors).
export const ALL_JAM_KINDS = ['CHAT', 'MOVIE', 'MUSIC', 'HANGOUT', 'ANIME'] as const;
export type JamKind = (typeof ALL_JAM_KINDS)[number];

/**
 * Normalize a client-supplied kind to one of the creatable kinds.
 * Anything unknown/empty falls back to MUSIC so old clients stay compatible.
 */
export function normalizeJamKind(value: unknown): CreatableJamKind {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if ((CREATABLE_JAM_KINDS as readonly string[]).includes(upper)) return upper as CreatableJamKind;
  }
  return 'MUSIC';
}

export function isJamKind(value: unknown): value is JamKind {
  return typeof value === 'string' && (ALL_JAM_KINDS as readonly string[]).includes(value);
}