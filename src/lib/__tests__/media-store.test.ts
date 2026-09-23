import { describe, expect, it } from 'vitest';
import { DB_MEDIA_MAX_BYTES, shouldPersistMediaBytes } from '../media-store';

describe('shouldPersistMediaBytes', () => {
  it('persists small images', () => {
    expect(shouldPersistMediaBytes(1024, 'image/png')).toBe(true);
    expect(shouldPersistMediaBytes(DB_MEDIA_MAX_BYTES, 'image/jpeg')).toBe(true);
  });

  it('persists voice notes', () => {
    expect(shouldPersistMediaBytes(1024 * 500, 'audio/webm')).toBe(true);
  });

  it('skips oversized payloads (videos/music)', () => {
    expect(shouldPersistMediaBytes(DB_MEDIA_MAX_BYTES + 1, 'image/png')).toBe(false);
    expect(shouldPersistMediaBytes(50 * 1024 * 1024, 'video/mp4')).toBe(false);
  });

  it('never mirrors video mime even when small', () => {
    expect(shouldPersistMediaBytes(1024, 'video/mp4')).toBe(false);
  });

  it('skips empty payloads', () => {
    expect(shouldPersistMediaBytes(0, 'image/png')).toBe(false);
  });
});