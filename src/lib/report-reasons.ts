// Single source of truth for report reasons across Tweet Hub and messages.

export const MESSAGE_REPORT_REASONS = ['SPAM', 'HARASSMENT', 'HATE_OR_VIOLENCE', 'SEXUAL_CONTENT', 'IMPERSONATION', 'OTHER'] as const;

export const TWEET_REPORT_REASONS = ['SPAM', 'HARASSMENT', 'HATE', 'VIOLENCE', 'SEXUAL', 'FRAUD', 'OTHER'] as const;

export type TweetReportReason = (typeof TWEET_REPORT_REASONS)[number];

export const REPORT_REASON_CODES = [...MESSAGE_REPORT_REASONS] as const;
export type ReportReasonCode = (typeof REPORT_REASON_CODES)[number];

export function isReportReasonCode(value: unknown): value is ReportReasonCode {
  return typeof value === 'string' && REPORT_REASON_CODES.includes(value as ReportReasonCode);
}

export function isTweetReportReason(value: unknown): value is TweetReportReason {
  return typeof value === 'string' && TWEET_REPORT_REASONS.includes(value as TweetReportReason);
}

export const TWEET_REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  HATE: 'Hateful content',
  VIOLENCE: 'Violence',
  SEXUAL: 'Sexual content',
  FRAUD: 'Scam or fraud',
  OTHER: 'Something else',
};