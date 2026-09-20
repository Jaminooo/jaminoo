import { describe, it, expect } from 'vitest';
import { validatePollInput, MAX_POLL_OPTIONS, MAX_POLL_OPTION_LEN, MAX_POLL_DURATION_DAYS, DEFAULT_POLL_DURATION_MINUTES } from '../poll-validation';

const valid = {
  question: 'Where to ship?',
  options: ['North', 'South'],
  durationMinutes: 60,
};

describe('validatePollInput', () => {
  it('accepts a valid poll and normalizes options', () => {
    const out = validatePollInput(valid);
    expect(out.question).toBe('Where to ship?');
    expect(out.options).toEqual(['North', 'South']);
    expect(out.durationMinutes).toBe(60);
    expect(out.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('defaults duration to 1440 minutes', () => {
    expect(validatePollInput({ question: 'q', options: ['a', 'b'], durationMinutes: undefined }).durationMinutes)
      .toBe(DEFAULT_POLL_DURATION_MINUTES);
  });

  it('rejects empty or missing question', () => {
    for (const question of ['', '   ', undefined]) {
      expect(() => validatePollInput({ question, options: ['a', 'b'] })).toThrow('question');
    }
  });

  it('rejects fewer than 2 options', () => {
    for (const options of [[], ['only'], [' ', '']]) {
      expect(() => validatePollInput({ ...valid, options })).toThrow('at least 2 options');
    }
  });

  it('trims, drops empties, and caps option count', () => {
    const out = validatePollInput({
      question: 'q',
      options: [...Array.from({ length: 10 }, (_, i) => `Option ${i}`), '   ', 12 as unknown as string],
    });
    expect(out.options.length).toBe(MAX_POLL_OPTIONS);
    expect(out.options).not.toContain('');
  });

  it('rejects case-insensitive duplicate options', () => {
    expect(() => validatePollInput({ question: 'q', options: ['React', 'react', 'cool'] })).toThrow('unique');
    expect(() => validatePollInput({ question: 'q', options: ['A', 'a'] })).toThrow('at least 2 options');
  });

  it('rejects over-long option text', () => {
    expect(() => validatePollInput({ question: 'q', options: ['ok', 'x'.repeat(MAX_POLL_OPTION_LEN + 1)] })).toThrow('characters');
  });

  it('rejects durations out of [5m, 7d] range and non-numeric', () => {
    const max = MAX_POLL_DURATION_DAYS * 24 * 60;
    for (const d of [0, 4, max + 1, NaN, Infinity, 'soon']) {
      expect(() => validatePollInput({ ...valid, durationMinutes: d })).toThrow('between 5 minutes and 7 days');
    }
  });
});