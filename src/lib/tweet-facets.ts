// Tweet text facets: lightweight rich-text spans stored alongside plain text.
// Canonical content stays in Tweet.text; this column only carries style spans,
// so formatting never affects character counts or searchability.
//
// Facet shape: { s: start, e: end, t: type } with UTF-16 offsets (matching
// textarea selectionStart/End and JS string indexing).
// Types: b = bold, i = italic, u = underline, st = strikethrough, sp = spoiler.

export type FacetType = 'b' | 'i' | 'u' | 'st' | 'sp';

export interface TweetFacet {
  s: number;
  e: number;
  t: FacetType;
}

export const FACET_TYPES: readonly FacetType[] = ['b', 'i', 'u', 'st', 'sp'];

export const MAX_FACETS = 60;

export function parseFacets(raw: unknown): TweetFacet[] {
  if (Array.isArray(raw)) return raw.filter(isFacet).map((f) => ({ s: f.s, e: f.e, t: f.t }));
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parseFacets(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function isFacet(value: unknown): value is TweetFacet {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  if (!Number.isInteger(f.s) || !Number.isInteger(f.e)) return false;
  if ((f.s as number) < 0 || (f.e as number) <= (f.s as number)) return false;
  return typeof f.t === 'string' && FACET_TYPES.includes(f.t as FacetType);
}

// Structural check only: integers + whitelisted style. Bound clamping happens in
// normalizeFacets against the real text length, so stray/malicious offsets are
// clamped rather than silently surviving as-is.
function isFacetShape(value: unknown): value is TweetFacet {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  if (!Number.isInteger(f.s) || !Number.isInteger(f.e)) return false;
  if ((f.e as number) <= (f.s as number)) return false;
  return typeof f.t === 'string' && FACET_TYPES.includes(f.t as FacetType);
}

// Normalize untrusted input against the actual text length. Clamps bounds,
// restricts to the whitelisted styles only, discards any extra properties,
// enforces a max span count, and merges adjacent same-style ranges.
export function normalizeFacets(raw: unknown, textLength: number): TweetFacet[] {
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return normalizeFacets(parsed, textLength);
    } catch {
      return [];
    }
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const clamped = raw
    .filter(isFacetShape)
    .map((f) => ({ s: f.s < 0 ? 0 : Math.round(f.s), e: f.e > textLength ? textLength : Math.round(f.e), t: f.t }))
    .filter((f) => f.s < f.e && f.e <= textLength)
    .slice(0, MAX_FACETS);
  return mergeFacets(clamped);
}

// Merge adjacent ranges of the same style and drop overlaps.
export function mergeFacets(ranges: TweetFacet[]): TweetFacet[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.s - b.s || b.e - a.e);
  const out: TweetFacet[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && last.t === r.t && r.s <= last.e) {
      last.e = Math.max(last.e, r.e);
      continue;
    }
    out.push({ s: r.s, e: r.e, t: r.t });
  }
  return out;
}

// Re-anchor ranges after a controlled-text edit `prev -> next` by locating the
// edited region (common prefix + common suffix) and shifting offsets around it.
export function reflowFacets(prev: string, next: string, ranges: ReadonlyArray<TweetFacet>): TweetFacet[] {
  if (prev === next) return ranges.filter((r) => r.s < r.e);
  const maxLen = Math.min(prev.length, next.length);
  let p = 0;
  while (p < maxLen && prev[p] === next[p]) p++;
  let s = 0;
  while (s < maxLen - p && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++;
  const delta = next.slice(p, next.length - s).length - prev.slice(p, prev.length - s).length;
  const res: TweetFacet[] = [];
  for (const r of ranges) {
    if (r.s >= r.e) continue;
    if (r.e <= p) { res.push({ s: r.s, e: r.e, t: r.t }); continue; }
    if (r.s >= p) {
      const ns = r.s + delta;
      const ne = r.e + delta;
      if (ns >= 0 && ns < next.length && ns < Math.min(ne, next.length)) {
        const e = Math.min(ne, next.length);
        if (ns < e) res.push({ s: ns, e, t: r.t });
      }
      continue;
    }
    const ne = r.e + delta;
    const e = Math.max(r.s + 1, Math.min(ne, next.length));
    if (r.s < e && e <= next.length) res.push({ s: r.s, e, t: r.t });
  }
  return mergeFacets(res);
}

export function stringifyFacets(ranges: TweetFacet[]): string {
  return JSON.stringify(ranges.filter((r) => r.s < r.e));
}

// Toggle a style over [start, end): adds the facet when the range is not fully
// covered, otherwise removes it (trimming partial overlaps so neighbours keep
// their own formatting). This powers the composer toolbar and is purely pure.
export function toggleStyle(ranges: ReadonlyArray<TweetFacet>, type: FacetType, start: number, end: number): TweetFacet[] {
  if (start >= end) return [...ranges];
  const same = ranges.filter((r) => r.t === type);
  const others = ranges.filter((r) => r.t !== type);
  const keep = same.flatMap((r): TweetFacet[] => {
    const parts: TweetFacet[] = [];
    if (r.s < start) parts.push({ ...r, e: Math.min(r.e, start) });
    if (r.e > end) parts.push({ ...r, s: Math.max(r.s, end) });
    return parts.filter((p) => p.s < p.e);
  });
  const covered = same.reduce((acc, r) => acc + Math.max(0, Math.min(r.e, end) - Math.max(r.s, start)), 0);
  if (covered >= end - start) return mergeFacets([...others, ...keep]);
  return mergeFacets([...others, ...keep, { s: start, e: end, t: type }]);
}