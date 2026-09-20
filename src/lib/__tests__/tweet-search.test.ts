import { describe, it, expect } from 'vitest';
import { parseTweetQuery } from '../tweet-search';

describe('parseTweetQuery', () => {
  it('keeps free text intact when there are no operators', () => {
    const q = parseTweetQuery('   hello world   ');
    expect(q.text).toBe('hello world');
    expect(q.hasFilters).toBe(false);
  });

  it('parses every supported operator', () => {
    const q = parseTweetQuery('from:ada since:2026-01-01 until:2026-02-01 min_faves:50 filter:media hello');
    expect(q.from).toBe('ada');
    expect(q.since?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(q.until?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(q.minFaves).toBe(50);
    expect(q.mediaOnly).toBe(true);
    expect(q.text).toBe('hello');
    expect(q.hasFilters).toBe(true);
  });

  it('is case-insensitive and strips operators from the text', () => {
    const q = parseTweetQuery('FROM:Bert Filter:Media #cats');
    expect(q.from).toBe('bert');
    expect(q.mediaOnly).toBe(true);
    expect(q.text).toBe('#cats');
  });

  it('handles operator-like words inside free text without over-matching', () => {
    const q = parseTweetQuery('the from:in person');
    expect(q.from).toBe('in');
    expect(q.text).toBe('the person');
  });

  it('parses filter:links and to:', () => {
    const q = parseTweetQuery('to:bob filter:links https://example.com');
    expect(q.to).toBe('bob');
    expect(q.linksOnly).toBe(true);
    expect(q.text).toContain('https://example.com');
    expect(q.text).not.toContain('to:bob');
  });

  it('ignores invalid dates instead of poisoning the query', () => {
    const q = parseTweetQuery('since:2026-99-99 keepme');
    expect(q.since).toBeUndefined();
    expect(q.text).toBe('keepme');
  });

  it('ignores zero min_faves', () => {
    const q = parseTweetQuery('min_faves:0 things');
    expect(q.minFaves).toBeUndefined();
    expect(q.text).toBe('things');
  });

  it('marks multi-operator queries and drops repeated operator tokens', () => {
    const q = parseTweetQuery('from:a from:b');
    expect(q.from).toBe('b');
    expect(q.hasFilters).toBe(true);
    expect(q.text).toBe('');
  });
});