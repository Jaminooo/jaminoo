import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUALITY,
  DEMO_VIDEO_URL,
  episodePlayUrl,
  groupEpisodesBySeason,
  relatedTitles,
  titlePlayUrl,
  type RelatedCandidate,
  type WatchSelectEpisode,
} from '../watch-select';

function ep(id: number, number: number, season: number, title = `Ep ${number}`): WatchSelectEpisode {
  return { id, number, season, title, externalUrl: null, thumbnailUrl: null };
}

describe('episodePlayUrl / titlePlayUrl', () => {
  it('falls back to the bundled demo video when there is no url', () => {
    expect(episodePlayUrl(null)).toBe(DEMO_VIDEO_URL);
    expect(episodePlayUrl({ externalUrl: '' })).toBe(DEMO_VIDEO_URL);
    expect(episodePlayUrl({ externalUrl: '   ' })).toBe(DEMO_VIDEO_URL);
    expect(titlePlayUrl(null)).toBe(DEMO_VIDEO_URL);
    expect(titlePlayUrl('')).toBe(DEMO_VIDEO_URL);
  });

  it('keeps real playable urls untouched', () => {
    expect(episodePlayUrl({ externalUrl: '/api/media/abc' })).toBe('/api/media/abc');
    expect(titlePlayUrl('https://cdn.example.com/ep.mp4')).toBe('https://cdn.example.com/ep.mp4');
  });
});

describe('groupEpisodesBySeason', () => {
  it('groups by season and sorts episodes by number', () => {
    const groups = groupEpisodesBySeason([
      ep(1, 2, 1),
      ep(2, 1, 1),
      ep(3, 3, 2),
      ep(4, 1, 2),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].season).toBe(1);
    expect(groups[0].episodes.map((e) => e.number)).toEqual([1, 2]);
    expect(groups[1].season).toBe(2);
    expect(groups[1].episodes.map((e) => e.number)).toEqual([1, 3]);
  });

  it('sorts season groups ascending, not insertion order', () => {
    const groups = groupEpisodesBySeason([
      ep(1, 1, 5),
      ep(2, 1, 2),
      ep(3, 1, 1),
    ]);
    expect(groups.map((g) => g.season)).toEqual([1, 2, 5]);
  });

  it('falls back missing or invalid seasons to season 1', () => {
    const groups = groupEpisodesBySeason([ep(1, 1, 0), ep(2, 2, NaN), { ...ep(3, 3, 1), season: 1 }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].season).toBe(1);
    expect(groups[0].episodes).toHaveLength(3);
  });

  it('returns an empty list for empty input', () => {
    expect(groupEpisodesBySeason([])).toEqual([]);
  });
});

describe('relatedTitles', () => {
  const ANIME: RelatedCandidate = {
    key: 'anime:1',
    title: 'Cowboy Bebop',
    source: 'anime',
    kind: 'ANIME',
    genres: ['Action', 'Sci-Fi'],
    rating: 9,
    slug: 'cowboy-bebop',
  };
  const CARTOON: RelatedCandidate = {
    key: 'cinema:2',
    title: 'Cartoon',
    source: 'cinema',
    kind: 'CARTOON',
    genres: ['Action'],
    rating: 8,
    slug: '',
  };
  const ANIME_MOVIE: RelatedCandidate = {
    key: 'anime:3',
    title: 'Your Name',
    source: 'anime',
    kind: 'MOVIE',
    genres: ['Action'],
    rating: 9.5,
    slug: 'your-name',
  };
  const OTHER_ANIME: RelatedCandidate = {
    key: 'anime:4',
    title: 'A Colder Star',
    source: 'anime',
    kind: 'ANIME',
    genres: ['Sci-Fi', 'Drama'],
    rating: 7,
    slug: 'a-colder-star',
  };
  const UNRELATED: RelatedCandidate = {
    key: 'anime:5',
    title: 'Soft Signal',
    source: 'anime',
    kind: 'ANIME',
    genres: ['Romance'],
    rating: 10,
    slug: 'soft-signal',
  };

  it('excludes cinema items, anime films and the item itself', () => {
    const result = relatedTitles({ key: ANIME.key, genres: ANIME.genres }, [ANIME, CARTOON, ANIME_MOVIE, OTHER_ANIME, UNRELATED]);
    expect(result.map((r) => r.key)).toEqual([OTHER_ANIME.key]);
  });

  it('ranks by genre overlap, then rating', () => {
    const A: RelatedCandidate = { ...OTHER_ANIME, key: 'anime:6', genres: ['Action', 'Sci-Fi'], rating: 6 };
    const B: RelatedCandidate = { ...OTHER_ANIME, key: 'anime:7', genres: ['Sci-Fi'], rating: 9 };
    const result = relatedTitles({ key: ANIME.key, genres: ANIME.genres }, [A, B]);
    expect(result.map((r) => r.key)).toEqual([A.key, B.key]);
  });

  it('returns empty when the item has no genres', () => {
    expect(relatedTitles({ key: 'anime:9', genres: [] }, [OTHER_ANIME])).toEqual([]);
  });

  it('respects the limit', () => {
    const items = [1, 2, 3, 4, 5].map((n) => ({ ...OTHER_ANIME, key: `anime:${n}`, rating: n }));
    expect(relatedTitles({ key: ANIME.key, genres: ANIME.genres }, items, 3)).toHaveLength(3);
  });
});

describe('quality defaults', () => {
  it('exports a sane default', () => {
    expect(DEFAULT_QUALITY).toBe('auto');
  });
});