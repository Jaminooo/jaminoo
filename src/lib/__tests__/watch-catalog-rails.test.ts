import { describe, expect, it } from 'vitest';
import {
  buildCategoryRails,
  buildGenreRails,
  buildHeroPicks,
  buildNewRails,
  genreCounts,
  type WatchItem,
} from '../watch-catalog';

function item(over: Partial<WatchItem> & { key?: string }): WatchItem {
  const source = over.source ?? 'anime';
  const { key: _key, ...rest } = over;
  const key = _key ?? 'a1';
  return {
    key: `${source}:${key}`,
    source,
    kind: 'ANIME',
    title: 'Title',
    subtitle: '',
    description: '',
    artworkUrl: null,
    trailerUrl: '',
    colorFrom: 260,
    colorTo: 330,
    rating: 0,
    year: null,
    genres: [],
    status: '',
    durationSec: 0,
    episodes: 0,
    externalId: 1,
    slug: '',
    mediaUrl: null,
    subtitlesUrl: null,
    ...rest,
  } as WatchItem;
}

describe('buildNewRails', () => {
  it('splits anime and cinema into separate rails', () => {
    const animeA = item({ key: 'a1', title: 'A1' });
    const animeB = item({ key: 'a2', title: 'A2' });
    const movie = item({ key: 'm1', source: 'cinema', kind: 'MOVIE', title: 'M1' });
    const cartoon = item({ key: 'c1', source: 'cinema', kind: 'CARTOON', title: 'C1' });
    const { anime, films } = buildNewRails([movie, animeA, cartoon, animeB]);
    expect(anime.items.map((i) => i.key)).toEqual(['anime:a1', 'anime:a2']);
    expect(films.items.map((i) => i.key)).toEqual(['cinema:m1', 'cinema:c1']);
  });

  it('respects the limit per rail', () => {
    const anime = Array.from({ length: 20 }, (_, n) => item({ key: `a${n}`, title: `A${n}` }));
    const { anime: rail } = buildNewRails(anime, 5);
    expect(rail.items).toHaveLength(5);
  });

  it('handles an empty catalog', () => {
    const { anime, films } = buildNewRails([]);
    expect(anime.items).toEqual([]);
    expect(films.items).toEqual([]);
  });
});

describe('buildGenreRails', () => {
  it('groups by genre and ranks by popularity', () => {
    const action = item({ key: 'a1', genres: ['Action'] });
    const scifi = item({ key: 'a2', genres: ['Sci-Fi', 'Action'] });
    const drama = item({ key: 'a3', genres: ['Drama'] });
    const rails = buildGenreRails([action, scifi, drama], { min: 1 });
    expect(rails.map((r) => r.id)).toEqual(['genre:Action', 'genre:Sci-Fi', 'genre:Drama']);
    expect(rails[0].items).toHaveLength(2);
  });

  it('drops genres below the minimum count', () => {
    const a = item({ key: 'a1', genres: ['Action'] });
    const b = item({ key: 'a2', genres: ['Drama'] });
    const rails = buildGenreRails([a, b], { min: 2 });
    expect(rails).toEqual([]);
  });

  it('caps the number of rails', () => {
    const items = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((genre, n) => item({ key: `a${n}`, genres: [genre] }));
    const rails = buildGenreRails(items, { min: 1, maxRails: 3 });
    expect(rails).toHaveLength(3);
  });
});

describe('buildCategoryRails', () => {
  it('creates film / anime / cartoon rails with the right kinds', () => {
    const movie = item({ key: 'm1', source: 'cinema', kind: 'MOVIE' });
    const anime = item({ key: 'a1', kind: 'ANIME' });
    const cartoon = item({ key: 'c1', source: 'cinema', kind: 'CARTOON' });
    const rails = buildCategoryRails([movie, anime, cartoon]);
    expect(rails.map((r) => r.kind)).toEqual(['MOVIE', 'ANIME', 'CARTOON']);
  });

  it('skips empty categories', () => {
    const onlyAnime = item({ key: 'a1', kind: 'ANIME' });
    expect(buildCategoryRails([onlyAnime])).toHaveLength(1);
  });
});

describe('buildHeroPicks', () => {
  it('returns the newest titles up to the limit', () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map((n) => item({ key: `a${n}`, title: `A${n}` }));
    expect(buildHeroPicks(items, 4).map((i) => i.title)).toEqual(['A1', 'A2', 'A3', 'A4']);
  });

  it('returns empty when there is nothing', () => {
    expect(buildHeroPicks([])).toEqual([]);
  });
});

describe('genreCounts', () => {
  it('counts genres and ranks by popularity', () => {
    const action = item({ key: 'a1', genres: ['Action', 'Sci-Fi'] });
    const scifi = item({ key: 'a2', genres: ['Sci-Fi'] });
    const drama = item({ key: 'a3', genres: ['Drama'] });
    expect(genreCounts([action, scifi, drama])).toEqual([
      { genre: 'Sci-Fi', count: 2 },
      { genre: 'Action', count: 1 },
      { genre: 'Drama', count: 1 },
    ]);
  });

  it('ignores titles without genres and ties break alphabetically', () => {
    const plain = item({ key: 'a1', genres: [] });
    const action = item({ key: 'a2', genres: ['Action'] });
    const drama = item({ key: 'a3', genres: ['Drama'] });
    expect(genreCounts([plain, action, drama])).toEqual([
      { genre: 'Action', count: 1 },
      { genre: 'Drama', count: 1 },
    ]);
  });
});