import {
  Heart,
  MessageSquare,
  UserPlus,
  UserCheck,
  Radio,
  Megaphone,
  Bell,
  Repeat2,
  AtSign,
  Reply,
  PenLine,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Locale } from '@/providers/i18n-provider';

export type NotifTone = 'pink' | 'blue' | 'green' | 'violet' | 'amber' | 'steel';

export interface KindMeta {
  icon: LucideIcon;
  tone: NotifTone;
}

const FALLBACK_META: KindMeta = { icon: Bell, tone: 'steel' };

export const KIND_META: Record<string, KindMeta> = {
  FRIEND_REQUEST: { icon: UserPlus, tone: 'green' },
  FRIEND_ACCEPTED: { icon: UserCheck, tone: 'green' },
  CREATOR_FOLLOW: { icon: BadgeCheck, tone: 'violet' },
  CREATOR_REVIEW: { icon: BadgeCheck, tone: 'amber' },
  VIDEO_COLLAB: { icon: PenLine, tone: 'violet' },
  VIDEO_COLLAB_RESPONSE: { icon: Reply, tone: 'violet' },
  VIDEO_LIKE: { icon: Heart, tone: 'pink' },
  VIDEO_COMMENT: { icon: MessageSquare, tone: 'blue' },
  JAM_INVITE: { icon: Radio, tone: 'violet' },
  JAM_INVITE_ACCEPTED: { icon: Radio, tone: 'green' },
  TWEET_LIKE: { icon: Heart, tone: 'pink' },
  TWEET_RETWEET: { icon: Repeat2, tone: 'green' },
  TWEET_REPLY: { icon: Reply, tone: 'blue' },
  TWEET_FOLLOW: { icon: UserPlus, tone: 'green' },
  TWEET_QUOTE: { icon: MessageSquare, tone: 'violet' },
  TWEET_MENTION: { icon: AtSign, tone: 'blue' },
  ADMIN_BROADCAST: { icon: Megaphone, tone: 'amber' },
};

export function metaFor(kind: string): KindMeta {
  return KIND_META[kind] ?? FALLBACK_META;
}

export interface NotifActor {
  id: number;
  username: string;
  name: string;
  avatarId: number;
  avatarPhoto: string | null;
}

function pickLocaleText(value: unknown, locale: Locale): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return typeof v[locale] === 'string' ? (v[locale] as string) : typeof v.en === 'string' ? (v.en as string) : '';
  }
  return '';
}

type Tfunc = (key: string, vars?: Record<string, string | number>) => string;

export function describeNotification(
  notif: { kind: string; payload: Record<string, unknown>; actor?: NotifActor | null },
  t: Tfunc,
  locale: Locale
): { heading: string; detail: string } {
  const { kind, payload, actor } = notif;
  const user = `@${actor?.username || (typeof payload.username === 'string' ? payload.username : '') || 'user'}`;
  const title = typeof payload.title === 'string' ? payload.title : '';
  const text = typeof payload.text === 'string' ? payload.text : '';

  switch (kind) {
    case 'FRIEND_REQUEST':
      return { heading: t('notif.friendRequest', { user }), detail: '' };
    case 'FRIEND_ACCEPTED':
      return { heading: t('notif.friendAccepted', { user }), detail: '' };
    case 'CREATOR_FOLLOW':
      return { heading: t('notif.creatorFollow', { user, hub: String(payload.hub || '') }), detail: '' };
    case 'CREATOR_REVIEW':
      return { heading: t('notif.creatorReview', { hub: String(payload.hub || ''), status: String(payload.status || '').toLowerCase() }), detail: typeof payload.reviewNote === 'string' ? payload.reviewNote : '' };
    case 'VIDEO_COLLAB':
      return { heading: t('notif.videoCollab', { user, title: title || '…' }), detail: '' };
    case 'VIDEO_COLLAB_RESPONSE':
      return { heading: t('notif.videoCollabResponse', { user, title: title || '…', status: String(payload.status || '').toLowerCase() }), detail: '' };
    case 'VIDEO_LIKE':
      return { heading: t('notif.videoLike', { user, title: title || '…' }), detail: '' };
    case 'VIDEO_COMMENT':
      return { heading: t('notif.videoComment', { user, title: title || '…' }), detail: '' };
    case 'JAM_INVITE':
      return { heading: t('notif.jamInvite', { user, jam: String(payload.jamName || payload.jamId || '') }), detail: '' };
    case 'JAM_INVITE_ACCEPTED':
      return { heading: t('notif.jamInviteAccepted', { user, jam: String(payload.jamName || payload.jamId || '') }), detail: '' };
    case 'TWEET_LIKE':
      return { heading: t('notif.tweetLike', { user }), detail: text };
    case 'TWEET_RETWEET':
      return { heading: t('notif.tweetRetweet', { user }), detail: text };
    case 'TWEET_REPLY':
      return { heading: t('notif.tweetReply', { user }), detail: text };
    case 'TWEET_FOLLOW':
      return { heading: t('notif.tweetFollow', { user }), detail: '' };
    case 'TWEET_QUOTE':
      return { heading: t('notif.tweetQuote', { user }), detail: text };
    case 'TWEET_MENTION':
      return { heading: t('notif.tweetMention', { user }), detail: text };
    case 'ADMIN_BROADCAST': {
      const title = pickLocaleText(payload.title, locale) || pickLocaleText(payload.title, locale === 'fa' ? 'en' : 'fa');
      const message = pickLocaleText(payload.message, locale) || pickLocaleText(payload.message, locale === 'fa' ? 'en' : 'fa');
      return { heading: title || t('notif.broadcastTitle'), detail: message };
    }
    default: {
      const raw = typeof payload.message === 'string' ? payload.message : text;
      return { heading: raw || t('notif.other', { kind: kind.replaceAll('_', ' ') }), detail: '' };
    }
  }
}