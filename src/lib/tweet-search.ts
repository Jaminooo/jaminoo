// Advanced tweet search — parses Twitter-style operators out of a query.
//
// Supported operators:
//   from:username     tweets authored by the account
//   to:username       tweets that reply to / mention the account
//   since:YYYY-MM-DD  tweets created on or after the date
//   until:YYYY-MM-DD  tweets created strictly before the date
//   min_faves:N       tweets with at least N likes
//   filter:media      tweets with an attached image/video
//   filter:links      tweets containing a URL
//
// Everything left over is free text matched against the tweet body. Operator
// tokens are recognized case-insensitively and stripped from the free text.

export interface ParsedTweetQuery {
  text: string;
  from?: string;
  to?: string;
  since?: Date;
  until?: Date;
  minFaves?: number;
  mediaOnly?: boolean;
  linksOnly?: boolean;
  hasFilters: boolean;
}

const OP_PATTERNS: Array<[keyof ParsedTweetQuery, RegExp]> = [
  ['from', /(?:^|\s)from:([A-Za-z0-9_]{1,32})/i],
  ['to', /(?:^|\s)to:([A-Za-z0-9_]{1,32})/i],
  ['since', /(?:^|\s)since:(\d{4}-\d{2}-\d{2})/i],
  ['until', /(?:^|\s)until:(\d{4}-\d{2}-\d{2})/i],
  ['minFaves', /(?:^|\s)min_faves:(\d+)/i],
  ['mediaOnly', /(?:^|\s)filter:media\b/i],
  ['linksOnly', /(?:^|\s)filter:links\b/i],
];

function parseDate(raw: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseTweetQuery(raw: string): ParsedTweetQuery {
  let working = raw.trim();
  const out: ParsedTweetQuery = { text: '', hasFilters: false };

  // Keep scanning because a query may repeat an operator class.
  // Each pass strips the first matching operator token, then continues.
  for (let pass = 0; pass < 8; pass++) {
    let matched = false;
    for (const [key, pattern] of OP_PATTERNS) {
      const result = pattern.exec(working);
      if (!result) continue;
      matched = true;
      working = working.replace(result[0], ' ').replace(/\s{2,}/g, ' ');
      out.hasFilters = true;
      if (key === 'from') out.from = result[1].toLowerCase();
      else if (key === 'to') out.to = result[1].toLowerCase();
      else if (key === 'since' || key === 'until') {
        const date = parseDate(result[1]);
        if (date) {
          if (key === 'since') out.since = date;
          else out.until = date;
        }
      } else if (key === 'minFaves') {
        const value = Number(result[1]);
        if (value > 0) out.minFaves = value;
      } else if (key === 'mediaOnly') out.mediaOnly = true;
      else if (key === 'linksOnly') out.linksOnly = true;
      break;
    }
    if (!matched) break;
  }

  out.text = working.trim();
  if (!out.hasFilters && !out.text) out.hasFilters = false;
  return out;
}