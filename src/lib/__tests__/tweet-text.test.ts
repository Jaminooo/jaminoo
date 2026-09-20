import { describe, it, expect } from 'vitest';
import { extractMentions, extractHashtags } from '../tweet';

describe('extractMentions', () => {
  it('collects usernames after @', () => {
    expect(extractMentions('Hi @julie and @omar')).toEqual(['julie', 'omar']);
  });

  it('ignores inline @ inside words and emails', () => {
    expect(extractMentions('a@b.com stays, abc@tag check')).toEqual([]);
  });

  it('deduplicates repeated mentions', () => {
    expect(extractMentions('@sam @sam again @sam')).toEqual(['sam']);
  });

  it('caps at 15 mentions', () => {
    const text = Array.from({ length: 20 }, (_, i) => `@user${i}`).join(' ');
    expect(extractMentions(text).length).toBe(15);
  });

  it('drops empty runs and punctuation-only tokens', () => {
    expect(extractMentions('@  @!')).toEqual([]);
  });
});

describe('extractHashtags', () => {
  it('collects tags after #', () => {
    expect(extractHashtags('#webdev and #NextJS')).toEqual(['webdev', 'NextJS']);
  });

  it('does not match hashes mid-token or pure numbers edges', () => {
    expect(extractHashtags('version#2 keep')).toEqual([]);
  });

  it('deduplicates and trims', () => {
    expect(extractHashtags('#news there #news again, #sports')).toEqual(['news', 'sports']);
  });

  it('caps at 15 hashtags', () => {
    const text = Array.from({ length: 20 }, (_, i) => `#h${i}`).join(' ');
    expect(extractHashtags(text).length).toBe(15);
  });
});