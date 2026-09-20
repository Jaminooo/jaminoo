// Pure poll input validation shared by tweet creation and tests.
import { BadRequestError } from '@/lib/api';

export const MAX_POLL_OPTIONS = 4;
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_DURATION_DAYS = 7;
export const MAX_POLL_QUESTION = 80;
export const MAX_POLL_OPTION_LEN = 25;
export const DEFAULT_POLL_DURATION_MINUTES = 1440;

export interface ValidatedPoll {
  question: string;
  options: string[];
  durationMinutes: number;
  expiresAt: Date;
}

// Returns a normalized, validated poll spec or throws BadRequestError.
export function validatePollInput(raw: {
  question?: unknown;
  options?: unknown;
  durationMinutes?: unknown;
}): ValidatedPoll {
  const question = typeof raw.question === 'string' ? raw.question.trim().slice(0, MAX_POLL_QUESTION) : '';
  if (!question) throw new BadRequestError('Poll question is required');
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  const options = rawOptions
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, MAX_POLL_OPTIONS);
  const unique = Array.from(new Set(options.map((o) => o.toLowerCase())));
  if (unique.length < MIN_POLL_OPTIONS || options.length < MIN_POLL_OPTIONS) {
    throw new BadRequestError(`A poll needs at least ${MIN_POLL_OPTIONS} options`);
  }
  if (options.length > MAX_POLL_OPTIONS) throw new BadRequestError(`A poll can have up to ${MAX_POLL_OPTIONS} options`);
  if (options.some((o) => o.length > MAX_POLL_OPTION_LEN)) throw new BadRequestError(`Options are limited to ${MAX_POLL_OPTION_LEN} characters`);
  if (unique.length !== options.length) throw new BadRequestError('Poll options must be unique');

  const durationMinutes = Number(raw.durationMinutes ?? DEFAULT_POLL_DURATION_MINUTES);
  const maxMinutes = MAX_POLL_DURATION_DAYS * 24 * 60;
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > maxMinutes) {
    throw new BadRequestError('Poll duration must be between 5 minutes and 7 days');
  }
  return { question, options, durationMinutes, expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000) };
}