import { describe, it, expect } from 'vitest';
import { pickAutoDjSong, mergeTaste, tasteFromSongs, type AutoDjSong, type AutoDjInput } from '../audio/autodj';

const songs: AutoDjSong[] = [
  { id: 1, title: 'Synthwave Hit', artistId: 1, genres: ['Synthwave', 'Electronic'], durationSec: 200, plays: 5000, featured: true },
  { id: 2, title: 'Jazz Alone', artistId: 2, genres: ['Jazz'], durationSec: 180, plays: 100, featured: false },
  { id: 3, title: 'Lo-Fi Focus', artistId: 3, genres: ['Lo-Fi'], durationSec: 220, plays: 800, featured: false },
  { id: 4, title: 'More Synth', artistId: 1, genres: ['Synthwave'], durationSec: 190, plays: 300, featured: false },
  { id: 5, title: 'Rock Anthem', artistId: 4, genres: ['Rock'], durationSec: 210, plays: 9999, featured: true },
];

describe('pickAutoDjSong', () => {
  const base: Omit<AutoDjInput, 'candidates'> = { taste: {}, recentIds: [], queueIds: [], currentSongId: null, random: () => 0 };

  it('returns null when there are no candidates', () => {
    expect(pickAutoDjSong({ ...base, candidates: [] })).toBeNull();
  });

  it('prefers songs matching the room taste', () => {
    const out = pickAutoDjSong({
      ...base,
      candidates: songs,
      taste: { Synthwave: 3, Electronic: 2 },
      random: () => 0,
    });
    expect(out).not.toBeNull();
    expect(out!.genres).toContain('Synthwave');
  });

  it('never picks the currently playing song', () => {
    const out = pickAutoDjSong({ ...base, candidates: songs, currentSongId: 1, random: () => 0 });
    expect(out!.id).not.toBe(1);
  });

  it('never picks songs already in the queue', () => {
    const out = pickAutoDjSong({ ...base, candidates: songs, queueIds: [2, 3], random: () => 0 });
    expect([2, 3]).not.toContain(out!.id);
  });

  it('avoids recent songs when possible', () => {
    const out = pickAutoDjSong({
      ...base,
      candidates: songs,
      recentIds: [1, 4, 5],
      queueIds: [2, 3],
      random: () => 0,
    });
    expect(out).not.toBeNull();
  });

  it('falls back to a repeat when nothing is fresh', () => {
    const out = pickAutoDjSong({
      ...base,
      candidates: [songs[0]],
      recentIds: [1],
      random: () => 0.7,
    });
    expect(out!.id).toBe(1);
  });

  it('stays deterministic with an injected RNG', () => {
    const pick = () => pickAutoDjSong({ ...base, candidates: songs, taste: { LoFi: 5 }, random: () => 0.99 });
    expect(pick()!.id).toBe(pick()!.id);
  });
});

describe('taste helpers', () => {
  it('builds a genre weight map from song genre arrays', () => {
    const taste = tasteFromSongs([
      { genres: ['Synthwave', 'Electronic'] },
      { genres: ['Synthwave'] },
    ]);
    expect(taste).toEqual({ Synthwave: 2, Electronic: 1 });
  });

  it('merges separate taste maps by summing weights', () => {
    const merged = mergeTaste({ Synthwave: 2 }, { Synthwave: 1, Jazz: 4 });
    expect(merged).toEqual({ Synthwave: 3, Jazz: 4 });
  });
});