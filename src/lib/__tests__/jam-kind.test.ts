import { describe, it, expect } from 'vitest';
import { normalizeJamKind, isJamKind, CREATABLE_JAM_KINDS } from '../jam-kind';

describe('normalizeJamKind', () => {
  it('accepts creatable kinds case-insensitively and trims', () => {
    expect(normalizeJamKind('music')).toBe('MUSIC');
    expect(normalizeJamKind('MOVIE')).toBe('MOVIE');
    expect(normalizeJamKind('  anime ')).toBe('ANIME');
  });

  it('falls back to MUSIC for unknown, empty, legacy and non-string values', () => {
    for (const value of ['', '  ', 'CHAT', 'HANGOUT', 'VIDEO', 42, null, undefined, { kind: 'MOVIE' }]) {
      expect(normalizeJamKind(value)).toBe('MUSIC');
    }
  });

  it('only exposes creatable kinds', () => {
    expect(CREATABLE_JAM_KINDS).toEqual(['MUSIC', 'MOVIE', 'ANIME']);
  });
});

describe('isJamKind', () => {
  it('accepts every schema kind and rejects the rest', () => {
    expect(isJamKind('CHAT')).toBe(true);
    expect(isJamKind('MOVIE')).toBe(true);
    expect(isJamKind('MUSIC')).toBe(true);
    expect(isJamKind('HANGOUT')).toBe(true);
    expect(isJamKind('ANIME')).toBe(true);
    expect(isJamKind('VIDEO')).toBe(false);
    expect(isJamKind('music')).toBe(false);
  });
});