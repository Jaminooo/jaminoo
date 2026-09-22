import { describe, expect, it } from 'vitest';
import {
  FACET_TYPES,
  MAX_FACETS,
  buildFacetSegments,
  normalizeFacets,
  parseFacets,
  reflowFacets,
  stringifyFacets,
  toggleStyle,
} from '@/lib/tweet-facets';
import type { TweetFacet } from '@/lib/tweet-facets';

const TEXT = 'سلام دنیا today 🚀 тест';

describe('parseFacets', () => {
  it('accepts an array', () => {
    expect(parseFacets([{ s: 0, e: 4, t: 'b' }])).toEqual([{ s: 0, e: 4, t: 'b' }]);
  });
  it('accepts a JSON string', () => {
    expect(parseFacets('[{ "s": 1, "e": 3, "t": "i" }]')).toEqual([{ s: 1, e: 3, t: 'i' }]);
  });
  it('returns [] for garbage input', () => {
    expect(parseFacets(null)).toEqual([]);
    expect(parseFacets(undefined)).toEqual([]);
    expect(parseFacets('not json')).toEqual([]);
    expect(parseFacets('{"s":0}')).toEqual([]);
    expect(parseFacets('[{bad]')).toEqual([]);
  });
});

describe('normalizeFacets', () => {
  const text = '0123456789';
  it('keeps valid facets of all five types', () => {
    const out = normalizeFacets([
      { s: 0, e: 1, t: 'b' },
      { s: 1, e: 2, t: 'i' },
      { s: 2, e: 3, t: 'u' },
      { s: 3, e: 4, t: 'st' },
      { s: 4, e: 5, t: 'sp' },
    ], text.length);
    expect(out.map((r) => r.t).sort()).toEqual(['b', 'i', 'sp', 'st', 'u']);
  });
  it('drops unknown style types (including colour)', () => {
    expect(normalizeFacets([{ s: 0, e: 2, t: 'junk' }], text.length)).toEqual([]);
    expect(normalizeFacets([{ s: 0, e: 2, t: 'c' }], text.length)).toEqual([]);
  });
  it('clamps offsets to the text length', () => {
    expect(normalizeFacets([{ s: -5, e: 100, t: 'b' }], text.length)).toEqual([{ s: 0, e: 10, t: 'b' }]);
    expect(normalizeFacets([{ s: 2, e: 99, t: 'i' }], text.length)).toEqual([{ s: 2, e: 10, t: 'i' }]);
  });
  it('drops empty and reversed ranges', () => {
    expect(normalizeFacets([{ s: 4, e: 4, t: 'b' }], text.length)).toEqual([]);
    expect(normalizeFacets([{ s: 5, e: 2, t: 'b' }], text.length)).toEqual([]);
  });
  it('drops extra unknown properties (XSS vectors)', () => {
    const out = normalizeFacets(
      [{ s: 0, e: 3, t: 'b', color: 'red', id: 42, html: '<script>alert(1)</script>' }],
      text.length,
    );
    expect(out).toEqual([{ s: 0, e: 3, t: 'b' }]);
  });
  it('accepts a JSON string with hostile payloads and strips __proto__', () => {
    const out = normalizeFacets('[{ "s": 0, "e": 2, "t": "b", "__proto__": { "polluted": true } }]', text.length);
    expect(out).toEqual([{ s: 0, e: 2, t: 'b' }]);
  });
  it('caps the number of facets', () => {
    const many = Array.from({ length: MAX_FACETS + 20 }, (_, i) => ({ s: i * 2, e: i * 2 + 1, t: 'b' as const }));
    expect(normalizeFacets(many, (MAX_FACETS + 20) * 2).length).toBe(MAX_FACETS);
  });
  it('normalizes a raw JSON string that is not an array', () => {
    expect(normalizeFacets('"garbage"', text.length)).toEqual([]);
  });
  it('normalizes a raw JSON string through normalizeFacets', () => {
    expect(normalizeFacets('[{ "s": 1, "e": 3, "t": "i" }, { "s": 9, "e": 9, "t": "b" }]', text.length))
      .toEqual([{ s: 1, e: 3, t: 'i' }]);
  });
});

describe('stringifyFacets', () => {
  it('serializes and drops empty ranges', () => {
    expect(stringifyFacets([{ s: 0, e: 2, t: 'b' }, { s: 3, e: 3, t: 'i' }]))
      .toBe('[{"s":0,"e":2,"t":"b"}]');
  });
});

describe('toggleStyle', () => {
  it('adds a style over the selection', () => {
    expect(toggleStyle([], 'b', 1, 5)).toEqual([{ s: 1, e: 5, t: 'b' }]);
  });
  it('removes a style when the selection is fully covered', () => {
    expect(toggleStyle([{ s: 0, e: 6, t: 'b' }], 'b', 1, 5)).toEqual([
      { s: 0, e: 1, t: 'b' },
      { s: 5, e: 6, t: 'b' },
    ]);
  });
  it('removes a style entirely when the selection matches its bounds', () => {
    expect(toggleStyle([{ s: 1, e: 5, t: 'b' }], 'b', 1, 5)).toEqual([]);
  });
  it('keeps other styles intact while toggling', () => {
    const base: TweetFacet[] = [
      { s: 0, e: 10, t: 'i' },
      { s: 2, e: 8, t: 'b' },
    ];
    expect(toggleStyle(base, 'b', 4, 6)).toEqual([
      { s: 0, e: 10, t: 'i' },
      { s: 2, e: 4, t: 'b' },
      { s: 6, e: 8, t: 'b' },
    ]);
  });
  it('does nothing for an empty selection', () => {
    expect(toggleStyle([{ s: 0, e: 4, t: 'b' }], 'i', 2, 2)).toEqual([{ s: 0, e: 4, t: 'b' }]);
  });
  it('chaining keeps both styles on the overlap and removes on toggle-off', () => {
    let ranges: ReturnType<typeof toggleStyle> = [];
    ranges = toggleStyle(ranges, 'b', 0, 4); // bold "abcd"
    ranges = toggleStyle(ranges, 'i', 2, 6); // italic "cdef" — overlap keeps both
    expect(ranges).toEqual([
      { s: 0, e: 4, t: 'b' },
      { s: 2, e: 6, t: 'i' },
    ]);
    ranges = toggleStyle(ranges, 'b', 0, 4); // remove bold over [0,4)
    expect(ranges).toEqual([{ s: 2, e: 6, t: 'i' }]);
  });
  it('merges adjacent similar toggles', () => {
    let ranges: ReturnType<typeof toggleStyle> = [];
    ranges = toggleStyle(ranges, 'b', 0, 2);
    ranges = toggleStyle(ranges, 'b', 2, 4);
    expect(ranges).toEqual([{ s: 0, e: 4, t: 'b' }]);
  });
});

describe('reflowFacets', () => {
  it('shifts ranges when typing inside text (common prefix)', () => {
    const prev = 'hello world';
    const next = 'hello WIDE world';
    const ranges: TweetFacet[] = [{ s: 6, e: 11, t: 'b' }];
    const out = reflowFacets(prev, next, ranges);
    expect(out).toEqual([{ s: 11, e: 16, t: 'b' }]);
    expect(next.slice(out[0].s, out[0].e)).toBe('world');
  });
  it('keeps ranges unchanged when appending at the end', () => {
    const prev = 'hello world';
    const next = 'hello world!!!';
    expect(reflowFacets(prev, next, [{ s: 0, e: 11, t: 'b' }])).toEqual([{ s: 0, e: 11, t: 'b' }]);
  });
  it('adjusts ranges when deleting a middle chunk', () => {
    const prev = 'hello WIDE world';
    const next = 'hello world';
    const ranges: TweetFacet[] = [{ s: 11, e: 16, t: 'b' }];
    const out = reflowFacets(prev, next, ranges);
    expect(out).toEqual([{ s: 6, e: 11, t: 'b' }]);
    expect(next.slice(out[0].s, out[0].e)).toBe('world');
  });
  it('drops ranges fully deleted by the edit', () => {
    const prev = 'abcdef';
    const next = 'a';
    expect(reflowFacets(prev, next, [{ s: 1, e: 4, t: 'b' }])).toEqual([]);
  });
  it('drops zero-length ranges passed in', () => {
    expect(reflowFacets('abc', 'abc', [{ s: 2, e: 2, t: 'u' }])).toEqual([]);
  });
  it('keeps styled prefix stable when appending behind Persian text', () => {
    const prev = 'سلام';
    const next = 'سلام هستم';
    expect(reflowFacets(prev, next, [{ s: 0, e: 4, t: 'st' }])).toEqual([{ s: 0, e: 4, t: 'st' }]);
  });
  it('handles emoji surrogate pairs (astral) as UTF-16 units', () => {
    const prev = '🚀 test';
    const next = '🚀 big test';
    const ranges: TweetFacet[] = [{ s: 3, e: 7, t: 'b' }];
    const out = reflowFacets(prev, next, ranges);
    expect(out).toEqual([{ s: 7, e: 11, t: 'b' }]);
    expect(next.slice(out[0].s, out[0].e)).toBe('test');
  });
});

describe('text vs facets independence', () => {
  it('facets never add to the plain text character count', () => {
    const text = 'سلام 🚀 hello';
    expect(text.length).toBe(13); // 4 Persian + space + surrogate pair + space + 5 ASCII
    const ranges: TweetFacet[] = [{ s: 5, e: 13, t: 'sp' }];
    expect(ranges.length).toBeLessThan(text.length);
  });
  it('rendering input can never be treated as HTML by the facet model', () => {
    const hostile = `hello <script>alert('x')</script>`;
    const ranges: TweetFacet[] = [{ s: 6, e: 14, t: 'b' }];
    expect(reflowFacets(hostile, hostile + '!', ranges)).toEqual([{ s: 6, e: 14, t: 'b' }]);
  });
});

describe('buildFacetSegments', () => {
  const text = 'hello world';

  it('returns no segments when there are no facets', () => {
    expect(buildFacetSegments(text, [])).toEqual([]);
  });

  it('covers the whole text with plain segments around styled runs', () => {
    const segs = buildFacetSegments(text, [{ s: 6, e: 11, t: 'b' }]);
    expect(segs).toEqual([
      { start: 0, end: 6, styles: [] },
      { start: 6, end: 11, styles: ['b'] },
    ]);
  });

  it('nests overlapping styles into a single segment instead of duplicating text', () => {
    // bold and spoiler over the SAME range: this used to render the text twice.
    const segs = buildFacetSegments(text, [
      { s: 0, e: 11, t: 'b' },
      { s: 0, e: 11, t: 'sp' },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 11, styles: ['b', 'sp'] },
    ]);
    const covered = segs.reduce((sum, s) => sum + (s.end - s.start), 0);
    expect(covered).toBe(text.length);
  });

  it('splits at every boundary of partial overlaps', () => {
    const segs = buildFacetSegments(text, [
      { s: 0, e: 5, t: 'b' },
      { s: 3, e: 8, t: 'i' },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 3, styles: ['b'] },
      { start: 3, end: 5, styles: ['b', 'i'] },
      { start: 5, end: 8, styles: ['i'] },
      { start: 8, end: 11, styles: [] },
    ]);
  });

  it('splits when a style is fully contained in another', () => {
    const segs = buildFacetSegments(text, [
      { s: 0, e: 11, t: 'b' },
      { s: 6, e: 11, t: 'sp' },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 6, styles: ['b'] },
      { start: 6, end: 11, styles: ['b', 'sp'] },
    ]);
  });

  it('reports every facet type on a fully overlapping selection', () => {
    const ranges: TweetFacet[] = FACET_TYPES.map((t) => ({ s: 6, e: 11, t }));
    const segs = buildFacetSegments(text, ranges);
    expect(segs).toEqual([
      { start: 0, end: 6, styles: [] },
      { start: 6, end: 11, styles: ['b', 'i', 'u', 'st', 'sp'] },
    ]);
  });

  it('orders styles with spoiler last so renderers can nest it outermost', () => {
    const ranges: TweetFacet[] = [
      { s: 0, e: 11, t: 'sp' },
      { s: 0, e: 11, t: 'b' },
    ];
    const segs = buildFacetSegments(text, ranges);
    expect(segs[0].styles[segs[0].styles.length - 1]).toBe('sp');
  });

  it('treats out-of-range or empty facets as plain text', () => {
    expect(buildFacetSegments(text, [{ s: 5, e: 5, t: 'b' }])).toEqual([]);
    expect(buildFacetSegments(text, [{ s: 0, e: 999, t: 'b' }])).toEqual([]);
  });
});