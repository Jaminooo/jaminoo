import { describe, expect, it } from 'vitest';
import { coverGradient, durationLabel, titleHue } from '../video-format';

describe('titleHue', () => {
  it('stays within the HSL hue range', () => {
    for (const title of ['', 'a', 'Midnight Circuit', 'Welcome to the Video Hub', 'Neon Tokyo 2049', 'سلام']) {
      for (const offset of [0, 55, 200, 359]) {
        const hue = titleHue(title, offset);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      }
    }
  });

  it('is deterministic for the same title and offset', () => {
    expect(titleHue('Sunday Drive', 0)).toBe(titleHue('Sunday Drive', 0));
    expect(titleHue('The Last Cartographer', 40)).toBe(titleHue('The Last Cartographer', 40));
  });

  it('shifts by the offset', () => {
    expect(titleHue('Big Fun', 55)).toBe((titleHue('Big Fun', 0) + 55) % 360);
  });
});

describe('coverGradient', () => {
  it('renders a 135deg gradient with two hsl stops', () => {
    const gradient = coverGradient('Midnight Drive');
    expect(gradient).toContain('linear-gradient(135deg,');
    expect(gradient).toMatch(/hsl\(\d+ 65% 26%\)/);
    expect(gradient).toMatch(/hsl\(\d+ 70% 20%\)/);
  });

  it('is stable across calls', () => {
    expect(coverGradient('Joyride')).toBe(coverGradient('Joyride'));
  });
});

describe('durationLabel', () => {
  it('returns an empty label for missing durations', () => {
    expect(durationLabel(0)).toBe('');
    expect(durationLabel(NaN)).toBe('');
  });

  it('formats seconds as m:ss', () => {
    expect(durationLabel(15)).toBe('0:15');
    expect(durationLabel(60)).toBe('1:00');
    expect(durationLabel(888)).toBe('14:48');
  });

  it('formats hours as h:mm:ss', () => {
    expect(durationLabel(3600)).toBe('1:00:00');
    expect(durationLabel(734)).toBe('12:14');
    expect(durationLabel(7325)).toBe('2:02:05');
  });

  it('clamps negative values to zero', () => {
    expect(durationLabel(-5)).toBe('0:00');
  });
});