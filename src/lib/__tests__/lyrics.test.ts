import { describe, it, expect } from 'vitest';
import { parseLyrics, activeLineIndex, activeWordIndex } from '../audio/lyrics';

describe('parseLyrics', () => {
  it('parses standard LRC lines including >1min timestamps', () => {
    const doc = parseLyrics(
      [
        '[00:00.00]Intro line',
        '[01:02.00]City lights / burning gold',
        '[02:12.00]Neon river running through the rain',
      ].join('\n'),
    );
    expect(doc.lines).toHaveLength(3);
    expect(doc.hasWordTiming).toBe(false);
    expect(doc.lines[0].time).toBe(0);
    expect(doc.lines[1].time).toBe(62_000);
    expect(doc.lines[2].time).toBe(132_000);
    expect(doc.lines[1].text).toBe('City lights / burning gold');
  });

  it('parses inline word timestamps (enhanced LRC)', () => {
    const doc = parseLyrics('[00:00.00] <00:00.20>City<00:01.10>lights<00:02.00>are');
    expect(doc.hasWordTiming).toBe(true);
    expect(doc.lines[0].words.map((w) => w.text)).toEqual(['City', 'lights', 'are']);
    expect(doc.lines[0].words[1].time).toBe(1100);
  });

  it('ignores garbage lines without timestamps', () => {
    const doc = parseLyrics('plain text without bracket\n[00:05.00]Here we go\n');
    expect(doc.lines).toHaveLength(1);
    expect(doc.lines[0].text).toBe('Here we go');
  });

  it('maps timestamps to active lines via binary search', () => {
    const doc = parseLyrics('[00:00.00]A\n[00:10.00]B\n[00:20.00]C');
    expect(activeLineIndex(doc.lines, 0)).toBe(0);
    expect(activeLineIndex(doc.lines, 9_999)).toBe(0);
    expect(activeLineIndex(doc.lines, 10_000)).toBe(1);
    expect(activeLineIndex(doc.lines, 25_000)).toBe(2);
    expect(activeLineIndex(doc.lines, -1)).toBe(-1);
  });

  it('tracks active word within a timed line', () => {
    const doc = parseLyrics('[00:00.00] <00:00.00>One<00:00.50>Two<00:01.00>Three');
    const line = doc.lines[0];
    expect(activeWordIndex(line, 0)).toBe(0);
    expect(activeWordIndex(line, 750)).toBe(1);
    expect(activeWordIndex(line, 1500)).toBe(2);
  });
});