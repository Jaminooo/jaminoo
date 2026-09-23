import { describe, expect, it } from 'vitest';
import {
  animeItem,
  buildWatchShelves,
  cinematicItem,
  filterByWatchTab,
  kindsForTab,
  matchWatchQuery,
  mergeWatchCatalog,
  normalizeWatchKind,
  watchKindCounts,
  watchPartyPlan,
  watchTitleHue,
  type WatchItem,
} from '../watch-catalog';

const cinemaRows = [
  { id: 1, title: 'Midnight Circuit', description: 'Neon chase.', kind: 'MOVIE', externalUrl: 'https://cdn/mc.mp4', thumbnailUrl: null, subtitlesUrl: null, durationSec: 596 },
  { id: 2, title: 'Skyline Stories', description: 'Rooftops.', kind: 'SERIES', externalUrl: 'https://cdn/ss.mp4', thumbnailUrl: null, subtitlesUrl: null, durationSec: 653 },
  { id: 3, title: 'Puzzle Friends', description: 'The crew rebuilds.', kind: 'CARTOON', externalUrl: 'https://cdn/pf.mp4', thumbnailUrl: null, subtitlesUrl: null, durationSec: 14 },
  { id: 4, title: 'Unlisted Legacy', description: 'Should be dropped.', kind: 'LIVE', externalUrl: 'https://cdn/x.mp4', thumbnailUrl: null, subtitlesUrl: null, durationSec: 999 },
];

const animeRows = [
  { id: 10, slug: 'neon-tokyo-2049', title: 'Neon Tokyo 2049', original: 'ネオントーキョー', overview: 'A signal.', trailerUrl: '', type: 'TV', status: 'AIRING', year: 2026, episodes: 2, rating: 9.1, genres: ['Sci-Fi', 'Action'], studio: 'Studio Ame', colorFrom: 200, colorTo: 285, coverUrl: null },
  { id: 11, slug: 'summer-comet', title: 'Summer Comet', original: '夏の彗星', overview: 'A comet.', trailerUrl: '', type: 'MOVIE', status: 'FINISHED', year: 2024, episodes: 1, rating: 9.0, genres: ['Romance'], studio: 'Kodama Films', colorFrom: 320, colorTo: 20, coverUrl: null },
  { id: 12, slug: 'ova-blade', title: 'Blade OVA', original: '', overview: 'One-off.', trailerUrl: '', type: 'OVA', status: 'FINISHED', year: 2023, episodes: 1, rating: 7.5, genres: ['Action'], studio: 'Orbit', colorFrom: 10, colorTo: 200, coverUrl: null },
];

describe('watchTitleHue', () => {
  it('stays within the HSL hue range', () => {
    for (const title of ['', 'a', 'Midnight Circuit', 'Neon Tokyo 2049', 'پازل']) {
      for (const offset of [0, 55, 359]) {
        const hue = watchTitleHue(title, offset);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      }
    }
  });

  it('is deterministic and offset-shifting', () => {
    expect(watchTitleHue('Skyline Stories', 0)).toBe(watchTitleHue('Skyline Stories', 0));
    expect(watchTitleHue('Puzzle Friends', 55)).toBe((watchTitleHue('Puzzle Friends', 0) + 55) % 360);
  });
});

describe('normalizeWatchKind', () => {
  it('passes cinema kinds through and drops unknown ones', () => {
    expect(normalizeWatchKind('cinema', 'MOVIE')).toBe('MOVIE');
    expect(normalizeWatchKind('cinema', 'SERIES')).toBe('SERIES');
    expect(normalizeWatchKind('cinema', 'CARTOON')).toBe('CARTOON');
    expect(normalizeWatchKind('cinema', 'LIVE')).toBeNull();
    expect(normalizeWatchKind('cinema', '')).toBeNull();
  });

  it('folds anime types onto ANIME or MOVIE', () => {
    expect(normalizeWatchKind('anime', 'TV')).toBe('ANIME');
    expect(normalizeWatchKind('anime', 'OVA')).toBe('ANIME');
    expect(normalizeWatchKind('anime', 'SPECIAL')).toBe('ANIME');
    expect(normalizeWatchKind('anime', 'MOVIE')).toBe('MOVIE');
  });
});

describe('cinematicItem', () => {
  it('builds a stable key and keeps the playable media', () => {
    const item = cinematicItem(cinemaRows[0]);
    expect(item).not.toBeNull();
    expect(item!.key).toBe('cinema:1');
    expect(item!.kind).toBe('MOVIE');
    expect(item!.mediaUrl).toBe('https://cdn/mc.mp4');
    expect(item!.rating).toBe(0);
    expect(item!.episodes).toBe(0);
  });

  it('rejects unsupported cinema kinds', () => {
    expect(cinematicItem(cinemaRows[3])).toBeNull();
  });
});

describe('animeItem', () => {
  it('keeps airing/rating/status and maps movie-type anime to MOVIE', () => {
    const tv = animeItem(animeRows[0]);
    expect(tv.kind).toBe('ANIME');
    expect(tv.rating).toBe(9.1);
    expect(tv.status).toBe('AIRING');
    expect(tv.key).toBe('anime:10');
    const movie = animeItem(animeRows[1]);
    expect(movie.kind).toBe('MOVIE');
    expect(animeItem(animeRows[2]).kind).toBe('ANIME');
  });
});

describe('mergeWatchCatalog', () => {
  it('merges both catalogues without dropping entries and keeps order', () => {
    const merged = mergeWatchCatalog(cinemaRows, animeRows);
    expect(merged).toHaveLength(6); // 4 cinema (−1 unsupported) + 3 anime
    expect(merged.map((i) => i.source)).toEqual(['cinema', 'cinema', 'cinema', 'anime', 'anime', 'anime']);
    expect(new Set(merged.map((i) => i.key)).size).toBe(merged.length);
  });
});

describe('kindsForTab / filterByWatchTab', () => {
  it('maps each catalog tab to the right kinds', () => {
    expect(kindsForTab('movies')).toEqual(['MOVIE']);
    expect(kindsForTab('series')).toEqual(['SERIES']);
    expect(kindsForTab('anime')).toEqual(['ANIME']);
    expect(kindsForTab('cartoons')).toEqual(['CARTOON']);
  });

  it('filters the unified list per tab', () => {
    const merged = mergeWatchCatalog(cinemaRows, animeRows);
    expect(filterByWatchTab(merged, 'movies').map((i) => i.kind)).toEqual(['MOVIE', 'MOVIE']);
    expect(filterByWatchTab(merged, 'cartoons').map((i) => i.title)).toEqual(['Puzzle Friends']);
    expect(filterByWatchTab(merged, 'anime')).toHaveLength(2);
    expect(filterByWatchTab(merged, 'home')).toHaveLength(merged.length);
  });
});

describe('matchWatchQuery', () => {
  it('matches title, subtitle and description, case-insensitively', () => {
    const item = animeItem(animeRows[0]);
    expect(matchWatchQuery(item, '')).toBe(true);
    expect(matchWatchQuery(item, 'NEON')).toBe(true);
    expect(matchWatchQuery(item, 'ネオントーキョー')).toBe(true);
    expect(matchWatchQuery(item, 'signal')).toBe(true);
    expect(matchWatchQuery(item, 'not-here')).toBe(false);
  });
});

describe('watchKindCounts', () => {
  it('counts every content type', () => {
    const counts = watchKindCounts(mergeWatchCatalog(cinemaRows, animeRows));
    expect(counts).toEqual({ MOVIE: 2, SERIES: 1, ANIME: 2, CARTOON: 1 });
  });
});

describe('buildWatchShelves', () => {
  it('ranks rated items into featured and fills fresh/updated', () => {
    const merged = mergeWatchCatalog(cinemaRows, animeRows);
    const shelves = buildWatchShelves(merged);
    expect(shelves.featured[0].rating).toBeGreaterThanOrEqual(shelves.featured[shelves.featured.length - 1].rating);
    expect(shelves.fresh).toHaveLength(6);
    expect(shelves.updated.every((i) => i.source === 'anime')).toBe(true);
    expect(shelves.updated.map((i) => i.title)).toContain('Neon Tokyo 2049');
  });

  it('falls back gracefully on an empty catalog', () => {
    const empty: WatchItem[] = [];
    expect(buildWatchShelves(empty)).toEqual({ featured: [], fresh: [], updated: [] });
  });
});

describe('watchPartyPlan', () => {
  it('maps anime items to ANIME rooms with an episode load', () => {
    const merged = mergeWatchCatalog([], animeRows);
    const tv = merged[0];
    const plan = watchPartyPlan(tv, { jamId: 'jam-1', episodeId: 42 });
    expect(plan).toEqual({ jamKind: 'ANIME', mediaPath: '/api/jams/jam-1/anime', mediaBody: { action: 'load', episodeId: 42 } });
    expect(watchPartyPlan(tv, { jamId: 'jam-1' })).toBeNull();
  });

  it('maps movies/series/cartoons to MOVIE rooms by cinema id', () => {
    const merged = mergeWatchCatalog(cinemaRows, []);
    const cartoon = merged.find((i) => i.kind === 'CARTOON')!;
    const plan = watchPartyPlan(cartoon, { jamId: 'jam-2' });
    expect(plan).toEqual({ jamKind: 'MOVIE', mediaPath: '/api/jams/jam-2/cinema', mediaBody: { action: 'load', videoId: 3 } });
  });

  it('rejects cinema items without a playable url', () => {
    const bare = { ...cinemaRows[0], externalUrl: '' };
    const item = cinematicItem(bare)!;
    expect(watchPartyPlan(item, { jamId: 'jam-3' })).toBeNull();
  });
});