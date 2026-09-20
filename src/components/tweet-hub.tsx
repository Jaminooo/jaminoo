'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bell,
  Bird,
  Bookmark,
  Calendar,
  Check,
  Eye,
  Flag,
  Globe,
  Hash,
  Heart,
  ImagePlus,
  Link2,
  ListPlus,
  Lock,
  MapPin,
MessageCircle,
  MoreHorizontal,
  CornerUpLeft,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Repeat2,
  Search,
  Send,
  ShieldAlert,
  Smile,
  Sparkles,
  Trash2,
  TrendingUp,
  List,
  User as UserIcon,
  UsersRound,
  UserPlus,
  VolumeX,
  X,
  Clock,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { api } from '@/lib/client-api';
import { uploadWithProgress } from '@/lib/client-api';
import { connectLive, onLive, onLiveConnect, emitLive } from '@/lib/live';
import { toast } from '@/components/toast';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { useTranslations } from '@/providers/use-translations';

type TweetView = 'home' | 'explore' | 'following' | 'bookmarks' | 'notifications' | 'profile' | 'search' | 'lists' | 'scheduled';
type ProfileTab = 'posts' | 'replies' | 'media' | 'likes';
type TweetEventType = 'like' | 'retweet' | 'reply' | 'follow' | 'quote' | 'mention';

interface TweetAuthor {
  id: number;
  username: string;
  name: string;
  avatarId: number;
  avatarPhoto: string | null;
  bannerPhoto: string | null;
  bio: string;
  website: string;
  location: string;
  isPrivate?: boolean;
}

interface TweetMedia {
  id: string;
  url: string;
  mime: string;
}

interface PollOption {
  id: number;
  text: string;
  votes: number;
  percent: number;
}

interface TweetPoll {
  id: number;
  question: string;
  closesAt: string;
  open: boolean;
  totalVotes: number;
  myVote: number | null;
  options: PollOption[];
}

interface Tweet {
  id: number;
  text: string;
  media: TweetMedia[];
  replyToId: number | null;
  replyToAuthor?: string | null;
  retweetOfId: number | null;
  quotedTweetId: number | null;
  quoted: Tweet | null;
  createdAt: string;
  updatedAt: string;
  author: TweetAuthor;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  liked: boolean;
  saved: boolean;
  retweeted: boolean;
  views: number;
  pinned: boolean;
  poll: TweetPoll | null;
}

interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
}

interface TweetListRow {
  id: number;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: string;
  ownerId: number;
  owner: TweetAuthor;
  memberCount: number;
  tweetCount: number;
}

interface TweetListDetail {
  list: { id: number; name: string; description: string; isPrivate: boolean; createdAt: string; owner: TweetAuthor };
  canManage: boolean;
  members: (TweetAuthor & { joinedAt: string })[];
  tweets: Tweet[];
}

interface BookmarkCollection {
  id: number;
  name: string;
  createdAt: string;
  count: number;
}

interface ScheduledRow {
  id: number;
  text: string;
  mediaIds: string[];
  replyToId: number | null;
  publishAt: string;
  status: string;
  publishedAt: string | null;
}

interface TweetStats {
  impressions: number;
  likes: number;
  bookmarks: number;
  reposts: number;
  replies: number;
  quotes: number;
  engagements: number;
  engagementRate: number;
}

interface TweetProfile {
  user: TweetAuthor & { joinedAt: string };
  stats: { tweets: number; replies: number; media: number; likes: number; following: number; followers: number; likedCount: number };
  following: boolean;
  requested?: boolean;
  locked?: boolean;
  private?: boolean;
  blocked: boolean;
  blockedBy: boolean;
  muted: boolean;
  isMe: boolean;
}

interface Trend {
  tag: string;
  count: number;
}

interface SugUser {
  id: number;
  username: string;
  name?: string;
  avatarId: number;
  avatarPhoto: string | null;
  bio: string;
  tweets: number;
  followers: number;
  following?: boolean;
}

interface TweetEvent {
  id: number;
  type: TweetEventType;
  readAt: string | null;
  tweetId: number | null;
  tweetText: string;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    name: string;
    avatarId: number;
    avatarPhoto: string | null;
    bio: string;
  } | null;
}

interface ListUser {
  id: number;
  username: string;
  name?: string;
  avatarId: number;
  avatarPhoto: string | null;
  bio: string;
  tweets: number;
  followersCount: number;
  following: boolean;
  followsYou?: boolean;
  mutual?: boolean;
  isMe: boolean;
  isTarget: boolean;
}

const FEED_VIEWS: TweetView[] = ['home', 'explore', 'following', 'bookmarks', 'profile', 'search'];
const MAX_MEDIA = 4;
const MAX_TEXT = 280;
const RECENTS_KEY = 'tweet-recent-searches';

const EMOJIS = ['😀','😂','🤣','😊','😍','🥰','😎','🤩','🙃','😜','🤔','😴','🥳','😭','😅','😉','👍','👎','👏','🙏','💪','🫡','🔥','✨','⭐','💯','🎉','🎊','❤️','💔','💚','💙','🫶','🎂','🎁','🌍','🚀','⚡','🌟'];
const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'HATE', 'VIOLENCE', 'SEXUAL', 'FRAUD', 'OTHER'] as const;

function useTimeAgo() {
  const t = useTranslations();
  return useCallback(
    (value: string) => {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
      if (seconds < 60) return t('tweetHub.time.now');
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return t('tweetHub.time.min', { value: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('tweetHub.time.hour', { value: hours });
      const days = Math.floor(hours / 24);
      if (days < 7) return t('tweetHub.time.day', { value: days });
      return new Date(value).toLocaleDateString();
    },
    [t]
  );
}

function apiViewFor(view: TweetView) {
  return view === 'explore' ? 'trending' : view;
}

function renderText(text: string, onTag?: (tag: string) => void, onMention?: (username: string) => void) {
  return text.split(/(\s+)/).map((part, index) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <button type="button" key={index} className="tweet-inline-link" onClick={(event) => { event.stopPropagation(); onTag?.(part); }}>
          {part}
        </button>
      );
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <button type="button" key={index} className="tweet-inline-mention" onClick={(event) => { event.stopPropagation(); onMention?.(part.slice(1)); }}>
          {part}
        </button>
      );
    }
    return part;
  });
}

function isVideo(tweet: Tweet, item?: TweetMedia) {
  return (item ?? tweet.media[0])?.mime.startsWith('video/');
}

function TweetMediaGrid({ tweet, onOpen }: { tweet: Tweet; onOpen: (index: number) => void }) {
  const media = tweet.media;
  if (media.length === 0) return null;
  if (media.length === 1) {
    const item = media[0];
    if (item.mime.startsWith('video/')) {
      return <div className="tweet-media tweet-media-video"><video src={item.url} controls playsInline preload="metadata" /></div>;
    }
    return <button type="button" className="tweet-media tweet-media-image" onClick={() => onOpen(0)}><img src={item.url} alt="" loading="lazy" /></button>;
  }
  return (
    <div className={`tweet-grid ${media.length === 3 ? 'tweet-grid-3' : media.length === 2 ? 'tweet-grid-2' : 'tweet-grid-4'}`}>
      {media.map((item, index) => (
        <button type="button" key={item.id} className={`tweet-grid-item ${media.length === 3 && index === 0 ? 'tweet-grid-span' : ''}`} onClick={() => onOpen(index)}>
          {item.mime.startsWith('video/') ? (
            <span className="tweet-grid-video"><video src={item.url} muted playsInline preload="metadata" /></span>
          ) : (
            <img src={item.url} alt="" loading="lazy" />
          )}
        </button>
      ))}
    </div>
  );
}

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
}

function pollRemaining(poll: TweetPoll): string {
  if (!poll.closesAt) return '∞';
  const total = new Date(poll.closesAt).getTime() - Date.now();
  if (total <= 0) return '0m';
  const minutes = Math.floor(total / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function TweetPollView({ poll, onVote }: { poll: TweetPoll; onVote: (optionId: number) => void }) {
  const t = useTranslations();
  const voted = poll.myVote != null || !poll.open;
  return (
    <div className="tweet-poll">
      <b className="tweet-poll-question">{poll.question}</b>
      <div className="tweet-poll-options">
        {poll.options.map((option) => {
          const mine = option.id === poll.myVote;
          return (
            <button
              type="button"
              key={option.id}
              className={`tweet-poll-option ${mine ? 'mine' : ''} ${voted ? 'voted' : ''}`}
              disabled={voted}
              onClick={(event) => { event.stopPropagation(); onVote(option.id); }}
            >
              <span className="tweet-poll-fill" style={{ width: voted ? `${option.percent}%` : '0%' }} />
              <span className="tweet-poll-label"><b>{option.text}</b></span>
              {voted && <span className="tweet-poll-pct">{option.percent}%</span>}
            </button>
          );
        })}
      </div>
      <span className="tweet-poll-meta">
        {poll.open
          ? t('tweetHub.poll.votes', { count: poll.totalVotes }) + (poll.closesAt ? ` · ${t('tweetHub.poll.closesIn', { time: pollRemaining(poll) })}` : '')
          : t('tweetHub.poll.endedLabel') + ' · ' + t('tweetHub.poll.votes', { count: poll.totalVotes })}
      </span>
    </div>
  );
}

const linkPreviewCache = new Map<string, LinkPreview>();

function TweetLinkPreview({ text }: { text: string }) {
  const [preview, setPreview] = useState<LinkPreview | null>(linkPreviewCache.get(text) ?? null);
  useEffect(() => {
    const cached = linkPreviewCache.get(text);
    if (cached) { setPreview(cached); return; }
    let cancelled = false;
    api<{ preview: LinkPreview }>('/api/tweets/link-preview', { method: 'POST', body: JSON.stringify({ url: text }) })
      .then((data) => {
        if (cancelled) return;
        linkPreviewCache.set(text, data.preview);
        setPreview(data.preview);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [text]);
  if (!preview) return null;
  return (
    <button type="button" className="tweet-linkpreview" onClick={(event) => { event.stopPropagation(); window.open(preview.url, '_blank', 'noopener,noreferrer'); }}>
      {preview.image && <span className="tweet-linkpreview-img" style={{ backgroundImage: `url(${preview.image})` }} />}
      <span className="tweet-linkpreview-body">
        <b>{preview.title}</b>
        {preview.description && <span>{preview.description}</span>}
        <small>{new URL(preview.url).hostname.replace(/^www\./, '')}</small>
      </span>
    </button>
  );
}

function QuotedCard({ tweet, onOpen, onAuthor, onTag, onMention }: {
  tweet: Tweet;
  onOpen: () => void;
  onAuthor: () => void;
  onTag: (tag: string) => void;
  onMention: (username: string) => void;
}) {
  const timeAgo = useTimeAgo();
  return (
    <button type="button" className="tweet-quote-card" onClick={onOpen}>
      <span className="tweet-quote-head">
        <JaminoAvatar avatarId={tweet.author.avatarId} size={20} photo={tweet.author.avatarPhoto} name={tweet.author.username} />
        <b>{tweet.author.name || `@${tweet.author.username}`}</b>
        <span>@{tweet.author.username} · {timeAgo(tweet.createdAt)}</span>
      </span>
      {tweet.text && <span className="tweet-quote-text">{renderText(tweet.text, onTag, onMention)}</span>}
      {tweet.media[0] && (
        <span className="tweet-quote-media">
          {isVideo(tweet) ? <video src={tweet.media[0].url} muted playsInline preload="metadata" /> : <img src={tweet.media[0].url} alt="" loading="lazy" />}
        </span>
      )}
    </button>
  );
}

function TweetActions({
  tweet,
  onLike,
  onRetweet,
  onQuote,
  onBookmark,
  onReply,
  onShare,
}: {
  tweet: Tweet;
  onLike: () => void;
  onRetweet: () => void;
  onQuote: () => void;
  onBookmark: () => void;
  onReply: () => void;
  onShare: () => void;
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const t = useTranslations();
  return (
    <div className="tweet-actions">
      <button type="button" className="tweet-action tweet-action-reply" onClick={(event) => { event.stopPropagation(); onReply(); }} title={t('tweetHub.reply')} aria-label={t('tweetHub.reply')}>
        <MessageCircle size={17} /><span>{tweet.replies}</span>
      </button>
      <span className="tweet-action-retweet-group" onMouseLeave={() => setQuoteOpen(false)}>
<button type="button" className={`tweet-action tweet-action-retweet ${tweet.retweeted ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onRetweet(); }} title={t('tweetHub.action.repost')} aria-label={t('tweetHub.action.repost')}>
        <Repeat2 size={17} /><span>{tweet.retweets}</span>
      </button>
      <button type="button" className="tweet-action-chev" onClick={(event) => { event.stopPropagation(); setQuoteOpen((o) => !o); }} title={t('tweetHub.action.repostMenu')} aria-label={t('tweetHub.action.repostMenu')}>
        <span className="tweet-chev">▾</span>
      </button>
      {quoteOpen && (
        <div className="tweet-quote-menu">
          <button type="button" onClick={(event) => { event.stopPropagation(); onRetweet(); setQuoteOpen(false); }}><Repeat2 size={15} />{t('tweetHub.action.repost')}</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onQuote(); setQuoteOpen(false); }}><Pencil size={15} />{t('tweetHub.action.quotePost')}</button>
        </div>
      )}
    </span>
    <button type="button" className={`tweet-action tweet-action-like ${tweet.liked ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onLike(); }} title={t('tweetHub.action.like')} aria-label={t('tweetHub.action.like')}>
        <Heart size={17} fill={tweet.liked ? 'currentColor' : 'none'} /><span>{tweet.likes}</span>
      </button>
      <span className="tweet-action-sep" />
      <button type="button" className={`tweet-action tweet-action-bookmark ${tweet.saved ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onBookmark(); }} title={t('tweetHub.action.bookmark')} aria-label={t('tweetHub.action.bookmark')}>
        <Bookmark size={17} fill={tweet.saved ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="tweet-action tweet-action-share" onClick={(event) => { event.stopPropagation(); onShare(); }} title={t('tweetHub.action.copyLink')} aria-label={t('tweetHub.action.copyLink')}>
        <Link2 size={16} />
      </button>
    </div>
  );
}

function TweetOptionsMenu({ tweet, isOwner, onCopy, onEdit, onDelete, onMute, onBlock, onReport, onPin, onAddToList, onMoveToCollection, onStats }: {
  tweet: Tweet;
  isOwner: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
  onPin?: (pinned: boolean) => void;
  onAddToList?: () => void;
  onMoveToCollection?: () => void;
  onStats?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  return (
    <span className="tweet-menu-wrap" onMouseLeave={() => setOpen(false)}>
      <button type="button" className={`tweet-menu-btn ${open ? 'open' : ''}`} title={t('tweetHub.action.more')} aria-label={t('tweetHub.action.more')}
        onClick={(event) => { event.stopPropagation(); setOpen((o) => !o); }}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="tweet-menu">
          {onAddToList && (
            <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onAddToList(); }}><ListPlus size={14} />{t('tweetHub.lists.saveToList')}</button>
          )}
          {onMoveToCollection && (
            <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onMoveToCollection(); }}><Bookmark size={14} />{t('tweetHub.collections.moveToFolder')}</button>
          )}
          {isOwner ? (
            <>
              {onStats && (
                <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onStats(); }}><BarChart3 size={14} />{t('tweetHub.stats.title')}</button>
              )}
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onEdit(); }}><Pencil size={14} />{t('tweetHub.action.editTweet')}</button>
              {onPin && !tweet.retweetOfId && (
                <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onPin(!tweet.pinned); }}>
                  {tweet.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {tweet.pinned ? t('tweetHub.pin.unpin') : t('tweetHub.pin.pin')}
                </button>
              )}
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onCopy(); }}><Link2 size={14} />{t('tweetHub.action.copyLink')}</button>
              <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); setOpen(false); onDelete(); }}><Trash2 size={14} />{t('tweetHub.action.delete')}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onCopy(); }}><Link2 size={14} />{t('tweetHub.action.copyLink')}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onMute(); }}><VolumeX size={14} />{t('tweetHub.action.mute', { username: tweet.author.username })}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onBlock(); }}><Ban size={14} />{t('tweetHub.action.block', { username: tweet.author.username })}</button>
              <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); setOpen(false); onReport(); }}><Flag size={14} />{t('tweetHub.action.reportTweet')}</button>
            </>
          )}
        </div>
      )}
    </span>
  );
}

function TweetCard({
  tweet,
  onOpen,
  onLike,
  onRetweet,
  onQuote,
  onBookmark,
  onShare,
  onDelete,
  onAuthor,
  onTag,
  onMention,
  onReply,
  onEdit,
  onMute,
  onBlock,
  onReport,
  onMedia,
  onPin,
  onVote,
  onAddToList,
  onMoveToCollection,
  onStats,
}: {
  tweet: Tweet;
  onOpen: () => void;
  onLike: () => void;
  onRetweet: () => void;
  onQuote: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onDelete: () => void;
  onAuthor: () => void;
  onTag: (tag: string) => void;
  onMention: (username: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
  onMedia?: (index: number) => void;
  onPin?: (pinned: boolean) => void;
  onVote?: (optionId: number) => void;
  onAddToList?: () => void;
  onMoveToCollection?: () => void;
  onStats?: () => void;
}) {
  const me = useAppStore((state) => state.me);
  const isOwner = me?.id === tweet.author.id;
  const t = useTranslations();
  const firstUrl = useMemo(() => {
    if (!tweet.text) return null;
    const match = /https?:\/\/[^\s<>"']+/i.exec(tweet.text);
    return match ? match[0] : null;
  }, [tweet.text]);
  const timeAgo = useTimeAgo();
  return (
    <article className="tweet-card">
      {tweet.pinned && <div className="tweet-pinned-note"><Pin size={13} /> {t('tweetHub.pin.pinned')}</div>}
      {tweet.retweetOfId && <div className="tweet-retweet-note"><Repeat2 size={13} /> {t('tweetHub.card.reposted')}</div>}
      <div className="tweet-card-body">
        <button type="button" className="tweet-avatar-btn" onClick={onAuthor} aria-label={t('tweetHub.card.openUser', { username: tweet.author.username })}>
          <JaminoAvatar avatarId={tweet.author.avatarId} size={44} photo={tweet.author.avatarPhoto} name={tweet.author.username} />
        </button>
        <div className="tweet-card-content">
          <div className="tweet-card-head">
            <button type="button" className="tweet-identity" onClick={onAuthor} title={`@${tweet.author.username}`}>
              <b>{tweet.author.name || `@${tweet.author.username}`}</b>
              <span className="tweet-handle">@{tweet.author.username}</span>
            </button>
            <span className="tweet-time">· {timeAgo(tweet.createdAt)}</span>
            <TweetOptionsMenu
              tweet={tweet}
              isOwner={isOwner}
              onCopy={onShare}
              onEdit={onEdit}
              onDelete={onDelete}
              onMute={onMute}
              onBlock={onBlock}
              onReport={onReport}
              onPin={onPin}
              onAddToList={onAddToList}
              onMoveToCollection={onMoveToCollection}
              onStats={onStats}
            />
          </div>
          {tweet.replyToAuthor && (
            <span className="tweet-reply-label">{t('tweetHub.card.inReplyTo', { name: tweet.replyToAuthor })}</span>
          )}
          <button type="button" className="tweet-text-btn" onClick={onOpen}>
            {tweet.text && <p className="tweet-text">{renderText(tweet.text, onTag, onMention)}</p>}
          </button>
          {tweet.quoted && (
            <QuotedCard tweet={tweet.quoted} onOpen={onOpen} onAuthor={onAuthor} onTag={onTag} onMention={onMention} />
          )}
          <TweetMediaGrid tweet={tweet} onOpen={onMedia ?? (() => {})} />
          {tweet.poll && <TweetPollView poll={tweet.poll} onVote={onVote ?? (() => {})} />}
          {firstUrl && <TweetLinkPreview text={firstUrl} />}
          <TweetActions tweet={tweet} onLike={onLike} onRetweet={onRetweet} onQuote={onQuote} onBookmark={onBookmark} onReply={onReply} onShare={onShare} />
          {tweet.views > 0 && <div className="tweet-views"><Eye size={13} /> {formatCount(tweet.views)}</div>}
        </div>
      </div>
    </article>
  );
}

const autofocusClass = 'tweet-composer-textarea';

function Composer({
  onPosted,
  replyToId,
  replyContext,
  quote,
  editTweet,
  onCancel,
  placeholder,
  compact = false,
  autoFocus = false,
}: {
  onPosted: (tweet: Tweet) => void;
  replyToId?: number;
  replyContext?: { author: TweetAuthor } | null;
  quote?: Tweet | null;
  editTweet?: Tweet | null;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const me = useAppStore((state) => state.me);
  const t = useTranslations();
  const resolvedPlaceholder = placeholder ?? t('tweetHub.composerPlaceholder');
  const [text, setText] = useState(editTweet?.text ?? '');
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentions, setMentions] = useState<SugUser[]>([]);
  const [poll, setPoll] = useState<{ question: string; options: string[]; duration: number } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [threading, setThreading] = useState(false);
  const [threadLastId, setThreadLastId] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlsRef = useRef<string[]>([]);
  const remaining = MAX_TEXT - text.length;
  const effectiveReplyId = replyToId ?? ((threading && threadLastId) ? threadLastId : null);
  const isReply = !!effectiveReplyId;
  const pollActive = !!poll && !editTweet && !quote && files.length === 0;
  const draftsEligible = !editTweet && !quote && !replyToId;
  const [draftStatus, setDraftStatus] = useState<'' | 'saving' | 'saved'>('');
  const hydratedRef = useRef(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draftsEligible) return;
    api<{ draft: { id: number; text: string; mediaIds: string[]; quotedTweetId: number | null; updatedAt: string } | null }>('/api/tweets/drafts')
      .then((data) => {
        if (data.draft && data.draft.text) setText(data.draft.text);
        hydratedRef.current = true;
      })
      .catch(() => { hydratedRef.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftsEligible || !hydratedRef.current) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    if (text.trim().length === 0) {
      setDraftStatus('');
      void api('/api/tweets/drafts', { method: 'DELETE' }).catch(() => {});
      return;
    }
    setDraftStatus('saving');
    draftTimer.current = setTimeout(() => {
      api('/api/tweets/drafts', { method: 'POST', body: JSON.stringify({ text }) })
        .then(() => setDraftStatus('saved'))
        .catch(() => setDraftStatus(''));
    }, 700);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [text, draftsEligible]);

  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const pickFiles = (next: FileList | null) => {
    if (!next) return;
    const added = Array.from(next).slice(0, MAX_MEDIA - files.length)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    urlsRef.current.push(...added.map((a) => a.url));
    setFiles((current) => [...current, ...added]);
  };

  const removeFile = (index: number) => {
    const removed = files[index];
    if (removed) URL.revokeObjectURL(removed.url);
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const updateMentions = useCallback((value: string) => {
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    const caret = inputRef.current?.selectionStart ?? value.length;
    const prefix = value.slice(0, caret);
    const match = /@([A-Za-z0-9_]{1,30})$/.exec(prefix);
    if (!match || match[1].length < 2) { setMentions([]); return; }
    mentionTimer.current = setTimeout(() => {
      api<{ users: SugUser[] }>(`/api/tweets/mention-suggest?q=${encodeURIComponent(match[1])}`)
        .then((data) => setMentions(data.users.slice(0, 5)))
        .catch(() => setMentions([]));
    }, 250);
  }, []);

  const insertMention = (username: string) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const prefix = text.slice(0, caret).replace(/@([A-Za-z0-9_]{1,30})$/, `@${username} `);
    const next = prefix + text.slice(caret);
    setText(next);
    setMentions([]);
    requestAnimationFrame(() => { if (el) el.setSelectionRange(prefix.length, prefix.length); });
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const next = text.slice(0, caret) + emoji + text.slice(caret);
    setText(next);
    requestAnimationFrame(() => { if (el) el.setSelectionRange(caret + emoji.length, caret + emoji.length); });
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const ids: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const form = new FormData();
      form.append('file', files[i].file);
      try {
        const uploaded = await uploadWithProgress<{ asset: { id: string } }>(
          '/api/tweets/assets',
          form,
          (percent) => setProgress(Math.round(((i + percent / 100) / files.length) * 100)),
        );
        ids.push(uploaded.asset.id);
      } catch {
        throw new Error(t('tweetHub.toast.uploadFailed'));
      }
    }
    return ids;
  };

  const canPost = !busy && (text.trim().length > 0 || files.length > 0 || mediaIds.length > 0 || !!quote || (!!poll && poll.options.some((o) => o.trim().length > 0)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setProgress(null);
    try {
      let ids = mediaIds;
      if (ids.length === 0) {
        ids = await uploadFiles();
        setMediaIds(ids);
        setProgress(null);
      }
      const payload: Record<string, unknown> = {
        text: text.trim(),
        mediaIds: ids.length > 0 ? ids : undefined,
        poll: pollActive ? {
          question: poll!.question,
          options: poll!.options.filter((o) => o.trim().length > 0),
          durationMinutes: poll!.duration,
        } : undefined,
      };
      if (effectiveReplyId) payload.replyToId = effectiveReplyId;
      if (quote && !editTweet) payload.quotedTweetId = quote.id;

      if (editTweet) {
        const data = await api<{ tweet: Tweet }>(`/api/tweets/${editTweet.id}`, { method: 'PATCH', body: JSON.stringify({ text: text.trim() }) });
        onPosted(data.tweet);
        toast(t('tweetHub.toast.tweetUpdated'), 'ok');
      } else {
        const target = effectiveReplyId ? `/api/tweets/${effectiveReplyId}/replies` : '/api/tweets';
        const data = await api<{ tweet: Tweet }>(target, { method: 'POST', body: JSON.stringify(payload) });
        onPosted(data.tweet);
        setDraftStatus('');
        if (draftsEligible) void api('/api/tweets/drafts', { method: 'DELETE' }).catch(() => {});
        if (!replyToId) {
          setThreading(true);
          setThreadLastId(data.tweet.id);
        } else if (threading) {
          setThreadLastId(data.tweet.id);
        }
        toast(isReply ? t('tweetHub.toast.replyPosted') : t('tweetHub.toast.live'), 'ok');
      }
      setText('');
      setFiles((current) => { current.forEach((f) => URL.revokeObjectURL(f.url)); return []; });
      setMediaIds([]);
      setMentions([]);
      setPoll(null);
    } catch (error) {
      setMediaIds([]);
      toast(error instanceof Error ? error.message : t('tweetHub.toast.postFailed'), 'error');
    } finally {
      setBusy(false);
      setProgress(null);
      inputRef.current?.focus();
    }
  };

  return (
    <form className={`tweet-composer ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <div className="tweet-composer-avatar">
        {me && <JaminoAvatar avatarId={me.avatarId} size={compact ? 38 : 46} photo={me.avatarPhoto} name={me.username} />}
      </div>
      <div className="tweet-composer-body">
        {replyContext && (
          <div className="tweet-composer-note"><CornerUpLeft size={13} /> {t('tweetHub.card.replyingTo', { name: replyContext.author.username })}</div>
        )}
        {editTweet && <div className="tweet-composer-note"><Pencil size={13} /> {t('tweetHub.editingNote')}</div>}
        {draftStatus && <div className="tweet-composer-note"><Clock size={13} /> {draftStatus === 'saving' ? t('tweetHub.draft.saving') : t('tweetHub.draft.saved')}</div>}
        <textarea
          id="tweet-composer-input"
          ref={inputRef}
          className={autofocusClass}
          value={text}
          onChange={(event) => { setText(event.target.value.slice(0, MAX_TEXT)); updateMentions(event.target.value); }}
          placeholder={resolvedPlaceholder}
          rows={compact ? 2 : 3}
          autoFocus={autoFocus}
          maxLength={MAX_TEXT}
        />
        {mentions.length > 0 && (
          <div className="tweet-mention-suggest">
            {mentions.map((user) => (
              <button type="button" key={user.id} onClick={() => insertMention(user.username)}>
                <JaminoAvatar avatarId={user.avatarId} size={26} photo={user.avatarPhoto} name={user.username} />
                <span><b>{user.name || `@${user.username}`}</b><small>@{user.username}</small></span>
                <BadgeCheck size={14} />
              </button>
            ))}
          </div>
        )}
        {quote && !editTweet && (
          <div className="tweet-quote-box">
            <QuotedCard tweet={quote} onOpen={() => {}} onAuthor={() => {}} onTag={() => {}} onMention={() => {}} />
          </div>
        )}
        {files.length > 0 && (
          <div className={`tweet-composer-previews ${files.length > 1 ? 'multi' : ''}`}>
            {files.map((item, index) => (
              <div className="tweet-composer-preview" key={index}>
                {item.file.type.startsWith('video/') ? <video src={item.url} muted playsInline /> : <img src={item.url} alt="" />}
                <button type="button" className="tweet-preview-remove" onClick={() => removeFile(index)} aria-label={t('tweetHub.removeMedia')}><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
        {pollActive && (
          <div className="tweet-poll-builder">
            <div className="tweet-poll-builder-head">
              <b><ListPlus size={15} /> {t('tweetHub.poll.builderTitle')}</b>
              <button type="button" className="tweet-poll-remove" onClick={() => setPoll(null)} aria-label={t('tweetHub.cancel')}><X size={15} /></button>
            </div>
            <input
              className="tweet-poll-q"
              value={poll!.question}
              maxLength={80}
              placeholder={t('tweetHub.poll.questionPlaceholder')}
              onChange={(event) => setPoll({ ...poll!, question: event.target.value })}
            />
            <div className="tweet-poll-options-builder">
              {poll!.options.map((opt, index) => (
                <div className="tweet-poll-option-row" key={index}>
                  <span>{index + 1}</span>
                  <input
                    value={opt}
                    maxLength={25}
                    placeholder={t('tweetHub.poll.optionPlaceholder', { n: index + 1 })}
                    onChange={(event) => {
                      const options = [...poll!.options];
                      options[index] = event.target.value;
                      setPoll({ ...poll!, options });
                    }}
                  />
                  {poll!.options.length > 2 && (
                    <button type="button" className="tweet-poll-option-del" onClick={() => setPoll({ ...poll!, options: poll!.options.filter((_, i) => i !== index) })} aria-label={t('tweetHub.removeMedia')}><X size={13} /></button>
                  )}
                </div>
              ))}
            </div>
            {poll!.options.length < 4 && (
              <button type="button" className="btn btn-ghost pill-sm" onClick={() => setPoll({ ...poll!, options: [...poll!.options, ''] })}><span className="tweet-poll-add">+</span>{t('tweetHub.poll.addOption')}</button>
            )}
            <select
              className="tweet-poll-duration"
              value={poll!.duration}
              onChange={(event) => setPoll({ ...poll!, duration: Number(event.target.value) })}
            >
              {[5, 30, 60, 360, 720, 1440].map((mins) => (
                <option key={mins} value={mins}>
                  {mins === 5 ? t('tweetHub.poll.opt5m') : mins === 30 ? t('tweetHub.poll.opt30m') : mins === 60 ? t('tweetHub.poll.opt1h') : mins === 360 ? t('tweetHub.poll.opt6h') : mins === 720 ? t('tweetHub.poll.opt12h') : t('tweetHub.poll.opt1d')}
                </option>
              ))}
            </select>
          </div>
        )}
        {threading && !replyToId && !editTweet && !quote && (
          <div className="tweet-composer-note tweet-thread-chip">
            <Sparkles size={13} /> {t('tweetHub.threadingNote')}
            <button type="button" className="tweet-thread-exit" onClick={() => setThreading(false)} title={t('tweetHub.cancel')} aria-label={t('tweetHub.cancel')}><X size={13} /></button>
          </div>
        )}
        {busy && progress !== null && (
          <div className="tweet-upload">
            <div className="tweet-upload-bar"><span style={{ width: `${progress}%` }} /></div>
            <small>{t('tweetHub.uploading', { percent: progress })}</small>
          </div>
        )}
        <div className="tweet-composer-foot">
          <div className="tweet-composer-tools">
            <button type="button" className="tweet-tool" onClick={() => fileRef.current?.click()} title={t('tweetHub.addMedia')} aria-label={t('tweetHub.addMedia')}>
              <ImagePlus size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={(event) => { pickFiles(event.target.files); event.target.value = ''; }}
            />
            <button type="button" className="tweet-tool" onClick={() => setEmojiOpen((o) => !o)} title={t('tweetHub.emoji')} aria-label={t('tweetHub.emoji')}>
              <Smile size={18} />
            </button>
            {!editTweet && !quote && !compact && files.length === 0 && (
              <button type="button" className={`tweet-tool ${pollActive ? 'active' : ''}`} onClick={() => setPoll(pollActive ? null : { question: '', options: ['', ''], duration: 1440 })} title={t('tweetHub.poll.toggle')} aria-label={t('tweetHub.poll.toggle')}>
                <ListPlus size={18} />
              </button>
            )}
            {!replyToId && !editTweet && !quote && !compact && !pollActive && files.length === 0 && text.trim().length > 0 && (
              <button type="button" className="tweet-tool" onClick={() => setScheduleOpen(true)} title={t('tweetHub.schedule.title')} aria-label={t('tweetHub.schedule.title')}>
                <CalendarClock size={18} />
              </button>
            )}
            <span className={`tweet-counter ${remaining < 0 ? 'danger' : remaining <= 20 ? 'warn' : ''}`}>{remaining}</span>
          </div>
          <div className="tweet-composer-post">
            {onCancel && <button type="button" className="btn btn-ghost pill-sm" onClick={onCancel}><X size={13} /> {t('tweetHub.cancel')}</button>}
            <button type="submit" className="btn btn-tweet" disabled={!canPost}>
              {busy ? t('tweetHub.posting') : <><Send size={14} /> {isReply ? t('tweetHub.reply') : editTweet ? t('tweetHub.save') : t('tweetHub.post')}</>}
            </button>
          </div>
        </div>
        {emojiOpen && (
          <div className="tweet-emoji-picker">
            {EMOJIS.filter((e, i) => EMOJIS.indexOf(e) === i).map((emoji) => (
              <button type="button" key={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</button>
            ))}
          </div>
        )}
        {scheduleOpen && <ScheduleTweetModal text={text} onClose={() => setScheduleOpen(false)} onScheduled={() => setScheduleOpen(false)} />}
      </div>
    </form>
  );
}

function RelationshipModal({ kind, username, avatarId, avatarPhoto, user, onClose, onFollowChange }: {
  kind: 'followers' | 'following';
  username: string;
  avatarId: number;
  avatarPhoto: string | null;
  user: ListUser | null;
  onClose: () => void;
  onFollowChange?: () => void;
}) {
  const [users, setUsers] = useState<ListUser[]>([]);
  const [loading, setLoading] = useState(false);
  const me = useAppStore((state) => state.me);
  const t = useTranslations();
  const title = t(kind === 'followers' ? 'tweetHub.people.followers' : 'tweetHub.people.following');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api<{ users: ListUser[] }>(`/api/tweets/${user.id}/${kind}`)
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [user, kind]);

  const toggleFollow = async (target: ListUser) => {
    if (target.isMe || target.isTarget) return;
    try {
      const data = await api<{ following: boolean }>(`/api/tweets/${target.id}/follow`, { method: 'POST' });
      setUsers((current) => current.map((u) => u.id === target.id ? { ...u, following: data.following } : u));
      onFollowChange?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.people.updateFailed'), 'error');
    }
  };

  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal tweet-list-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.people.kicker')}</div><h2>{title}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        <div className="tweet-modal-scroll">
          <div className="tweet-list-row tweet-list-target">
            <JaminoAvatar avatarId={avatarId} size={40} photo={avatarPhoto} name={username} />
            <span><b>{username}</b><small>@{username}</small></span>
          </div>
          {loading && <div className="tweet-empty"><span className="admin-loader" /> {t('tweetHub.people.loading', { title: title.toLowerCase() })}</div>}
          {!loading && users.length === 0 && <div className="tweet-empty"><UsersRound size={20} /><span>{kind === 'followers' ? t('tweetHub.people.noFollowers') : t('tweetHub.people.notFollowing')}</span></div>}
          {users.map((u) => (
            <div className="tweet-list-row" key={u.id}>
              <span className="tweet-list-id">
                <JaminoAvatar avatarId={u.avatarId} size={40} photo={u.avatarPhoto} name={u.username} />
                <span>
                  <b>{u.name || `@${u.username}`} {u.mutual && <em className="tweet-rel-badge" title={t('tweetHub.rel.mutual')}>{t('tweetHub.rel.mutualLabel')}</em>}</b>
                  <small>
                    @{u.username}
                    {u.followsYou && !u.mutual && <em className="tweet-rel-note">{t('tweetHub.rel.followsYou')}</em>}
                    {u.mutual && <em className="tweet-rel-note">{t('tweetHub.rel.youBothFollow')}</em>}
                  </small>
                </span>
              </span>
              {!u.isMe && !u.isTarget && !(me && me.id === u.id) && (
                <button type="button" className={`btn ${u.following ? 'btn-ghost' : 'btn-tweet'} pill-sm`} onClick={() => void toggleFollow(u)}>
                  {u.following ? t('tweetHub.people.followingBtn') : t('tweetHub.people.follow')}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }: {
  profile: TweetProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.user.name);
  const [bio, setBio] = useState(profile.user.bio);
  const [website, setWebsite] = useState(profile.user.website);
  const [location, setLocation] = useState(profile.user.location);
  const [isPrivate, setIsPrivate] = useState(profile.user.isPrivate ?? false);
  const [busy, setBusy] = useState(false);
  const t = useTranslations();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api('/api/tweets/profile', { method: 'PATCH', body: JSON.stringify({ name, bio, website, location, isPrivate }) });
      toast(t('tweetHub.profile.updated'), 'ok');
      onSaved();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.profile.updateFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.profile.kicker')}</div><h2>{t('tweetHub.profile.edit')}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        <form className="tweet-modal-scroll" onSubmit={save}>
          <label className="tweet-edit-field">
            <span>{t('tweetHub.profile.displayName')}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} placeholder={t('tweetHub.profile.yourName')} />
          </label>
          <label className="tweet-edit-field">
            <span>{t('tweetHub.profile.bio')}</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} placeholder={t('tweetHub.profile.bioPlaceholder')} />
          </label>
          <label className="tweet-edit-field">
            <span>{t('tweetHub.profile.website')}</span>
            <input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={120} placeholder="https://…" />
          </label>
          <label className="tweet-edit-field">
            <span>{t('tweetHub.profile.location')}</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={60} placeholder={t('tweetHub.profile.locationPlaceholder')} />
          </label>
          <label className="tweet-edit-row">
            <span><b>{t('tweetHub.profile.privateAccount')}</b><small>{t('tweetHub.profile.privateHint')}</small></span>
            <button type="button" className={`tweet-toggle ${isPrivate ? 'on' : ''}`} role="switch" aria-checked={isPrivate} onClick={() => setIsPrivate((v) => !v)}><span /></button>
          </label>
          <div className="tweet-edit-actions">
            <button type="submit" className="btn btn-tweet" disabled={busy}>{busy ? t('tweetHub.profile.saving') : t('tweetHub.profile.saveProfile')}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FollowRequestsModal({ requests, busyId, onAccept, onDecline, onClose }: {
  requests: { id: number; createdAt: string; requester: SugUser }[];
  busyId: number | null;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal tweet-list-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.people.kicker')}</div><h2>{t('tweetHub.followRequests.title')}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        <div className="tweet-modal-scroll">
          {requests.length === 0 && <div className="tweet-empty"><UsersRound size={20} /><span>{t('tweetHub.followRequests.empty')}</span></div>}
          {requests.map((row) => (
            <div className="tweet-list-row" key={row.id}>
              <span className="tweet-list-id">
                <JaminoAvatar avatarId={row.requester.avatarId} size={40} photo={row.requester.avatarPhoto} name={row.requester.username} />
                <span><b>{row.requester.name || `@${row.requester.username}`}</b><small>@{row.requester.username}</small></span>
              </span>
              {busyId === row.id ? (
                <span className="admin-loader" />
              ) : (
                <span className="tweet-request-actions">
                  <button type="button" className="btn btn-tweet pill-sm" onClick={() => onAccept(row.id)}>{t('tweetHub.followRequests.accept')}</button>
                  <button type="button" className="btn btn-ghost pill-sm" onClick={() => onDecline(row.id)}>{t('tweetHub.followRequests.decline')}</button>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AddToListModal({ tweet, lists, onPick, onClose, onManageLists }: {
  tweet: Tweet;
  lists: TweetListRow[];
  onPick: (list: TweetListRow) => void;
  onClose: () => void;
  onManageLists: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal tweet-list-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.lists.kicker')}</div><h2>{t('tweetHub.lists.saveToList')}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        <div className="tweet-modal-scroll">
          {lists.length === 0 ? (
            <div className="tweet-empty"><List size={20} /><span>{t('tweetHub.lists.noListsForSave')}</span><button type="button" className="btn btn-tweet pill-sm" onClick={onManageLists}>{t('tweetHub.lists.manage')}</button></div>
          ) : (
            lists.map((list) => (
              <button type="button" className="tweet-list-chip" key={list.id} onClick={() => onPick(list)}>
                <List size={14} />
                <span><b>{list.name}</b><small>{list.isPrivate ? t('tweetHub.lists.privateBadge') : t('tweetHub.lists.publicBadge')}</small></span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MoveToCollectionModal({ tweet, collections, onPick, onClose }: {
  tweet: Tweet;
  collections: BookmarkCollection[];
  onPick: (collection: BookmarkCollection | null) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal tweet-list-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.collections.kicker')}</div><h2>{t('tweetHub.collections.moveToFolder')}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        <div className="tweet-modal-scroll">
          <button type="button" className="tweet-list-chip" onClick={() => onPick(null)}>
            <Bookmark size={14} />
            <span><b>{t('tweetHub.collections.all')}</b><small>{t('tweetHub.collections.unsorted')}</small></span>
          </button>
          {collections.length === 0 && <p className="tweet-rail-empty">{t('tweetHub.collections.noFolders')}</p>}
          {collections.map((coll) => (
            <button type="button" className="tweet-list-chip" key={coll.id} onClick={() => onPick(coll)}>
              <Bookmark size={14} />
              <span><b>{coll.name}</b><small>{coll.count === 1 ? t('tweetHub.collections.oneTweet') : t('tweetHub.collections.tweetsCount', { count: coll.count })}</small></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScheduleTweetModal({ text, onClose, onScheduled }: {
  text: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const t = useTranslations();
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const min = useMemo(() => new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!when || busy) return;
    setBusy(true);
    try {
      await api('/api/tweets/schedule', { method: 'POST', body: JSON.stringify({ text: text.trim(), publishAt: new Date(when).toISOString() }) });
      toast(t('tweetHub.schedule.scheduled'), 'ok');
      onScheduled();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal tweet-list-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.schedule.kicker')}</div><h2>{t('tweetHub.schedule.title')}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        <form className="tweet-modal-scroll tweet-schedule-form" onSubmit={submit}>
          <p className="tweet-rail-empty">{t('tweetHub.schedule.hint')}</p>
          <p className="tweet-sched-preview">{text}</p>
          <input className="tweet-poll-q" type="datetime-local" value={when} min={min} onChange={(event) => setWhen(event.target.value)} required />
          <button type="submit" className="btn btn-tweet" disabled={busy || !when}>{busy ? t('tweetHub.schedule.scheduling') : t('tweetHub.schedule.scheduleBtn')}</button>
        </form>
      </section>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, onCancel, onConfirm }: {
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations();
  const resolvedLabel = confirmLabel ?? t('tweetHub.action.delete');
  return (
    <div className="tweet-modal-backdrop" onMouseDown={onCancel}>
      <section className="tweet-modal tweet-confirm-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head"><div><h2>{title}</h2></div></header>
        <div className="tweet-modal-scroll">
          <p className="tweet-confirm-copy">{message}</p>
          <div className="tweet-edit-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('tweetHub.cancel')}</button>
            <button type="button" className="btn btn-danger" onClick={onConfirm}><Trash2 size={14} /> {resolvedLabel}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalyticsModal({ stats, loading, onClose }: {
  stats: TweetStats | null;
  loading?: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const rows: { label: string; value: number }[] = stats ? [
    { label: t('tweetHub.stats.impressions'), value: stats.impressions },
    { label: t('tweetHub.stats.likes'), value: stats.likes },
    { label: t('tweetHub.stats.reposts'), value: stats.reposts },
    { label: t('tweetHub.stats.replies'), value: stats.replies },
    { label: t('tweetHub.stats.quotes'), value: stats.quotes },
    { label: t('tweetHub.stats.bookmarks'), value: stats.bookmarks },
  ] : [];
  return (
    <div className="tweet-modal-backdrop" onMouseDown={onClose}>
      <section className="tweet-modal tweet-list-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tweet-modal-head">
          <div><div className="hub-kicker">{t('tweetHub.stats.kicker')}</div><h2>{t('tweetHub.stats.title')}</h2></div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('tweetHub.close')}><X size={18} /></button>
        </header>
        {loading ? (
          <div className="tweet-loading">{Array.from({ length: 3 }, (_, index) => <div className="tweet-skeleton" key={index} />)}</div>
        ) : (
          <div className="tweet-modal-scroll tweet-stats-grid">
            {rows.map((row) => (
              <div className="tweet-stat-card" key={row.label}>
                <b>{formatCount(row.value)}</b>
                <span>{row.label}</span>
              </div>
            ))}
            {stats && <div className="tweet-stat-card primary">
              <b>{stats.engagementRate}%</b>
              <span>{t('tweetHub.stats.engagementRate')}</span>
            </div>}
            {stats && <div className="tweet-stat-card">
              <b>{formatCount(stats.engagements)}</b>
              <span>{t('tweetHub.stats.engagements')}</span>
            </div>}
          </div>
        )}
        <p className="tweet-rail-empty">{t('tweetHub.stats.hint')}</p>
      </section>
    </div>
  );
}

function NotificationsView({ onUnread, onOpenTweet, onOpenProfile, refreshKey = 0 }: {
  onUnread: (count: number) => void;
  onOpenTweet: (id: number) => void;
  onOpenProfile: (username: string, id?: number) => void;
  refreshKey?: number;
}) {
  const [events, setEvents] = useState<TweetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unread, setUnread] = useState(0);
  const t = useTranslations();
  const timeAgo = useTimeAgo();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api<{ notifications: TweetEvent[]; unread: number }>('/api/notifications?filter=tweets')
      .then((data) => { setEvents(data.notifications.filter((e) => !!e.type) as TweetEvent[]); setUnread(data.unread); onUnread(data.unread); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [onUnread]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const markAll = async () => {
    try {
      await api('/api/notifications', { method: 'PATCH' });
      setEvents((current) => current.map((e) => ({ ...e, readAt: new Date().toISOString() })));
      setUnread(0);
      onUnread(0);
    } catch { /* ignore */ }
  };

  const openEvent = (event: TweetEvent) => {
    if (event.tweetId) onOpenTweet(event.tweetId);
    else if (event.actor) onOpenProfile(event.actor.username, event.actor.id);
  };

  const label: Record<TweetEventType, (name: string) => string> = {
    like: (name) => t('tweetHub.notifications.liked', { name }),
    retweet: (name) => t('tweetHub.notifications.reposted', { name }),
    reply: (name) => t('tweetHub.notifications.replied', { name }),
    follow: (name) => t('tweetHub.notifications.followedYou', { name }),
    quote: (name) => t('tweetHub.notifications.quoted', { name }),
    mention: (name) => t('tweetHub.notifications.mentioned', { name }),
  };
  const icon: Record<TweetEventType, typeof Heart> = { like: Heart, retweet: Repeat2, reply: MessageCircle, follow: UserIcon, quote: Pencil, mention: Smile };

  if (loading && events.length === 0) return <div className="tweet-empty large"><span className="admin-loader" /> {t('tweetHub.notifications.loading')}</div>;
  if (error && events.length === 0) {
    return (
      <div className="tweet-empty large">
        <Bell size={26} />
        <b>{t('tweetHub.notifications.loadFailed')}</b>
        <button type="button" className="btn btn-tweet pill-sm" onClick={() => void load()}><Sparkles size={13} /> {t('tweetHub.retry')}</button>
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="tweet-empty large">
        <Bell size={26} />
        <b>{t('tweetHub.notifications.noActivity')}</b>
        <span>{t('tweetHub.notifications.noActivityHint')}</span>
      </div>
    );
  }
  return (
    <div className="tweet-notifications-wrap">
      <div className="tweet-notifications-top">
        {unread > 0 && <span className="tweet-unread-badge">{t('tweetHub.notifications.unread', { count: unread })}</span>}
        <button type="button" className="btn btn-ghost pill-sm" onClick={() => void markAll()}><Check size={13} /> {t('tweetHub.notifications.markAllRead')}</button>
      </div>
      <section className="tweet-notifications">
        {events.map((event) => {
          const Icon = icon[event.type];
          const name = event.actor ? `@${event.actor.username}` : t('tweetHub.notifications.someone');
          return (
            <button type="button" className={`tweet-notification ${!event.readAt ? 'unread' : ''}`} key={event.id} onClick={() => openEvent(event)}>
              <span className={`tweet-notification-icon ${event.type}`}><Icon size={16} /></span>
              <JaminoAvatar avatarId={event.actor?.avatarId ?? 0} size={38} photo={event.actor?.avatarPhoto ?? null} name={event.actor?.username ?? '?'} />
              <span className="tweet-notification-copy">
                <span className="tweet-notification-text">{label[event.type](name)}</span>
                {event.tweetText && <span className="tweet-notification-quote">{event.tweetText}</span>}
                <small>{timeAgo(event.createdAt)}</small>
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

const ALLOWED_TABS: ProfileTab[] = ['posts', 'replies', 'media', 'likes'];

interface NotifPref { kind: string; enabled: boolean }
const PREF_KINDS = ['ALL', 'TWEET_LIKE', 'TWEET_RETWEET', 'TWEET_REPLY', 'TWEET_FOLLOW', 'TWEET_QUOTE', 'TWEET_MENTION'] as const;

function NotificationPrefsCard() {
  const t = useTranslations();
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ preferences: NotifPref[] }>('/api/notification-preferences')
      .then((data) => {
        const map: Record<string, boolean> = {};
        for (const item of data.preferences) map[item.kind] = item.enabled;
        setPrefs(map);
      })
      .catch(() => setPrefs(null));
  }, []);

  if (!prefs) return null;

  const toggle = async (kind: string, enabled: boolean) => {
    setPrefs((current) => (current ? { ...current, [kind]: enabled } : current));
    setBusy(true);
    try {
      await api('/api/notification-preferences', { method: 'PUT', body: JSON.stringify({ kind, enabled }) });
    } catch {
      setPrefs((current) => (current ? { ...current, [kind]: !enabled } : current));
      toast(t('tweetHub.prefs.failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tweet-rail-card">
      <h3><Bell size={15} /> {t('tweetHub.prefs.title')}</h3>
      <p className="tweet-rail-empty">{t('tweetHub.prefs.hint')}</p>
      <div className="tweet-prefs-list">
        {PREF_KINDS.map((kind) => (
          <label className="tweet-pref" key={kind}>
            <span>{t(`tweetHub.prefs.${kind}`)}</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[kind]}
              className={`tweet-toggle ${prefs[kind] ? 'on' : ''}`}
              disabled={busy}
              onClick={() => void toggle(kind, !prefs[kind])}
            >
              <span />
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}

export function TweetHub() {
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const setDmWith = useAppStore((state) => state.setDmWith);
  const me = useAppStore((state) => state.me);
  const t = useTranslations();
  const timeAgo = useTimeAgo();

  const [view, setView] = useState<TweetView>('home');
  const [feed, setFeed] = useState<Tweet[]>([]);
  const [feedError, setFeedError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState<SugUser[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profileTab, setProfileTab] = useState<ProfileTab>('posts');
  const [profile, setProfile] = useState<TweetProfile | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [suggestions, setSuggestions] = useState<SugUser[]>([]);
  const [activeTweet, setActiveTweet] = useState<Tweet | null>(null);
  const [replyParent, setReplyParent] = useState<Tweet | null>(null);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [quote, setQuote] = useState<Tweet | null>(null);
  const [editTarget, setEditTarget] = useState<Tweet | null>(null);
  const [lightbox, setLightbox] = useState<{ media: TweetMedia[]; index: number } | null>(null);
  const [listModal, setListModal] = useState<{ kind: 'followers' | 'following'; user: ListUser } | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Tweet | null>(null);
  const [reportTarget, setReportTarget] = useState<Tweet | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState<Tweet | null>(null);
  const [notifBadge, setNotifBadge] = useState(0);
  const [followRequests, setFollowRequests] = useState<{ id: number; createdAt: string; requester: SugUser }[]>([]);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [followRequestBusy, setFollowRequestBusy] = useState<number | null>(null);
  const listsKey = 'followedTweetLists';
  const [myLists, setMyLists] = useState<TweetListRow[]>([]);
  const [publicLists, setPublicLists] = useState<TweetListRow[]>([]);
  const [followedListIds, setFollowedListIds] = useState<number[]>([]);
  const [activeList, setActiveList] = useState<TweetListRow | null>(null);
  const [listDetail, setListDetail] = useState<TweetListDetail | null>(null);
  const [listFeed, setListFeed] = useState<Tweet[]>([]);
  const [listBusy, setListBusy] = useState(false);
  const [listCreateOpen, setListCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [newListPrivate, setNewListPrivate] = useState(false);
  const [memberUsername, setMemberUsername] = useState('');
  const [addToListTarget, setAddToListTarget] = useState<Tweet | null>(null);
  const [deleteListTarget, setDeleteListTarget] = useState<TweetListRow | null>(null);
  const [bookmarkColls, setBookmarkColls] = useState<BookmarkCollection[]>([]);
  const [activeCollId, setActiveCollId] = useState<number | null>(null);
  const [newCollName, setNewCollName] = useState('');
  const [collBusy, setCollBusy] = useState(false);
  const [renamingColl, setRenamingColl] = useState<BookmarkCollection | null>(null);
  const [renameCollName, setRenameCollName] = useState('');
  const [deleteCollTarget, setDeleteCollTarget] = useState<BookmarkCollection | null>(null);
  const [moveTarget, setMoveTarget] = useState<Tweet | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledRow[]>([]);
  const [scheduledBusy, setScheduledBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [statsTarget, setStatsTarget] = useState<Tweet | null>(null);
  const [statsData, setStatsData] = useState<TweetStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [notifRefresh, setNotifRefresh] = useState(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  const loadFeed = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setFeedError(false);
    try {
      const params = new URLSearchParams({ view: apiViewFor(view) });
      if (searchQuery) params.set('q', searchQuery);
      if (view === 'search' && searchQuery.startsWith('#')) {
        params.set('view', 'hashtag');
        params.set('tag', searchQuery.slice(1));
      }
      if (view === 'profile' && profileName) {
        params.set('profile', profileName);
        params.set('tab', profileTab);
      }
      if (view === 'bookmarks' && activeCollId) params.set('collection', String(activeCollId));
      if (!reset && cursorRef.current) params.set('cursor', cursorRef.current);
      const data = await api<{ tweets: Tweet[]; users?: SugUser[]; nextCursor: string | null; hasMore: boolean }>(`/api/tweets?${params}`);
      setUsers(data.users ?? []);
      setFeed((current) => {
        if (reset) return data.tweets;
        const seen = new Set(current.map((tweet) => tweet.id));
        return [...current, ...data.tweets.filter((tweet) => !seen.has(tweet.id))];
      });
      cursorRef.current = data.nextCursor;
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
    } catch (error) {
      setFeedError(true);
      if (reset) setFeed([]);
      if (!reset) toast(error instanceof Error ? error.message : t('tweetHub.toast.feedFailed'), 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [profileName, profileTab, searchQuery, t, view, activeCollId]);

  const reload = useCallback(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setFeed([]);
    void loadFeed(true);
  }, [loadFeed]);

  const loadSidebar = useCallback(() => {
    api<{ trends: Trend[] }>('/api/tweets/trends').then((data) => setTrends(data.trends)).catch(() => {});
    api<{ users: SugUser[] }>('/api/tweets/suggestions').then((data) => setSuggestions(data.users)).catch(() => {});
  }, []);

  useEffect(() => {
    loadSidebar();
    setRecentSearches((JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') as string[]).slice(0, 8));
    api<{ unread: number }>('/api/notifications?filter=tweets').then((data) => setNotifBadge(data.unread)).catch(() => {});
    api<{ incoming: { id: number; createdAt: string; requester: SugUser }[] }>('/api/tweets/follow-requests').then((data) => setFollowRequests(data.incoming)).catch(() => {});
    setFollowedListIds((JSON.parse(localStorage.getItem(listsKey) ?? '[]') as number[]).slice(0, 50));
    void loadCollections();
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get('tweetView') as TweetView | null;
      const username = params.get('tweetUser');
      const statusId = Number(params.get('id') ?? 0);
      const listId = Number(params.get('list') ?? 0);
      if (statusId > 0) {
        api<{ tweet: Tweet; replyParent: Tweet | null }>(`/api/tweets/${statusId}`)
          .then((data) => { void openTweetFromDetail(data.tweet); })
          .catch(() => toast(t('tweetHub.toast.tweetGone'), 'error'));
      }
      if (listId > 0) { void loadLists().then(() => openListById(listId, params.get('listName') ?? undefined)); }
      else if (username) { setView('profile'); setProfileName(username); }
      else if (requested && (FEED_VIEWS.includes(requested) || requested === 'notifications' || requested === 'lists' || requested === 'scheduled')) setView(requested);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSidebar]);

  useEffect(() => {
    const socket = connectLive();
    if (!socket) return;
    const joinPublic = onLiveConnect(() => emitLive('tweet:join', ['tweet:public']));
    const patchCounts = (updater: (tweet: Tweet) => Tweet) => {
      setFeed((current) => current.map((tweet) => updater(tweet)));
      setActiveTweet((current) => (current ? updater(current) : current));
      setReplies((current) => current.map((reply) => updater(reply)));
      setListFeed((current) => current.map((tweet) => updater(tweet)));
    };
    const onNew = onLive('tweet:new', (data) => {
      const tweet = data?.tweet as Tweet | undefined;
      if (!tweet) return;
      const scoped = viewRef.current === 'home' || viewRef.current === 'explore' || viewRef.current === 'following';
      if (!scoped) return;
      setFeed((current) => (current.some((item) => item.id === tweet.id) ? current : [tweet, ...current]));
    });
    const onLike = onLive('tweet:like', (data) => {
      const id = Number(data?.tweetId ?? 0);
      if (!id || typeof data.likes !== 'number') return;
      patchCounts((tweet) => (tweet.id === id ? { ...tweet, likeCount: data.likes } : tweet));
    });
    const onRepost = onLive('tweet:repost', (data) => {
      const id = Number(data?.tweetId ?? 0);
      if (!id || typeof data.reposts !== 'number') return;
      patchCounts((tweet) => (tweet.id === id ? { ...tweet, repostCount: data.reposts } : tweet));
    });
    const onReply = onLive('tweet:reply', (data) => {
      const id = Number(data?.tweetId ?? 0);
      if (!id) return;
      patchCounts((tweet) => (tweet.id === id ? { ...tweet, replies: tweet.replies + 1 } : tweet));
    });
    const onDelete = onLive('tweet:delete', (data) => {
      const id = Number(data?.tweetId ?? 0);
      if (!id) return;
      setFeed((current) => current.filter((tweet) => tweet.id !== id));
      setListFeed((current) => current.filter((tweet) => tweet.id !== id));
      setReplies((current) => current.filter((tweet) => tweet.id !== id));
      setActiveTweet((current) => (current?.id === id ? null : current));
    });
    const onNotif = onLive('notif:new', () => {
      setNotifBadge((count) => count + 1);
      setNotifRefresh((count) => count + 1);
    });
    return () => {
      joinPublic(); onNew(); onLike(); onRepost(); onReply(); onDelete(); onNotif();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (event.key === 'n' || event.key === 'N') {
        const composer = document.getElementById('tweet-composer-input') as HTMLTextAreaElement | null;
        if (composer) { composer.focus(); event.preventDefault(); }
      } else if (event.key === '/') {
        const search = document.getElementById('tweet-search-input') as HTMLInputElement | null;
        if (search) { search.focus(); event.preventDefault(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!FEED_VIEWS.includes(view)) return;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setFeed([]);
    setFeedError(false);
    void loadFeed(true);
  }, [loadFeed, view]);

  const refreshProfile = useCallback((username?: string) => {
    const name = username ?? profileName;
    if (!name) return;
    api<{ user: TweetProfile['user']; stats: TweetProfile['stats']; following: boolean; requested: boolean; locked: boolean; private: boolean; blocked: boolean; blockedBy: boolean; muted: boolean; isMe: boolean }>(`/api/tweets/profile?username=${encodeURIComponent(name)}`)
      .then((data) => setProfile({ user: data.user, stats: data.stats, following: data.following, requested: data.requested, locked: data.locked, private: data.private, blocked: data.blocked, blockedBy: data.blockedBy, muted: data.muted, isMe: data.isMe }))
      .catch(() => setProfile(null));
  }, [profileName]);

  useEffect(() => {
    if (view !== 'profile') { setProfile(null); return; }
    if (!profileName) return;
    refreshProfile();
  }, [profileName, view, refreshProfile]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !FEED_VIEWS.includes(view)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadFeed(false);
    }, { rootMargin: '800px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadFeed, view]);

  const patchTweet = useCallback((id: number, update: Partial<Tweet>) => {
    setFeed((current) => current.map((tweet) => tweet.id === id ? { ...tweet, ...update } : tweet));
    setActiveTweet((current) => current?.id === id ? { ...current, ...update } : current);
    setReplies((current) => current.map((tweet) => tweet.id === id ? { ...tweet, ...update } : tweet));
  }, []);

  const changeView = (next: TweetView) => {
    if (view === next) return;
    setView(next);
    setSearchQuery('');
    setSearchInput('');
    setProfileTab('posts');
    if (next === 'lists') void loadLists();
    if (next === 'scheduled') void loadScheduled();
    const suffix = next === 'home' ? '' : `&tweetView=${next}`;
    window.history.replaceState({}, '', `/?hub=tweet${suffix}`);
  };

  const openProfile = (username: string, id?: number) => {
    if (id && me?.id === id) username = me.username;
    setView('profile');
    setProfileName(username);
    setActiveTweet(null);
    window.history.replaceState({}, '', `/?hub=tweet&tweetView=profile&tweetUser=${encodeURIComponent(username)}`);
  };

  const openDm = (otherId: number) => {
    setProduct('community');
    setTab('dms');
    setDmWith(otherId);
  };

  const openTweetById = useCallback((id: number) => {
    api<{ tweet: Tweet; replyParent: Tweet | null }>(`/api/tweets/${id}`)
      .then((data) => {
        setActiveTweet(data.tweet);
        setReplyParent(data.replyParent);
        return api<{ replies: Tweet[] }>(`/api/tweets/${id}/replies`);
      })
      .then((data) => setReplies(data.replies))
      .catch(() => toast(t('tweetHub.toast.tweetGone'), 'error'))
      .finally(() => setRepliesLoading(false));
  }, [t]);

  const openTweetFromDetail = async (tweet: Tweet) => {
    setActiveTweet(tweet);
    setReplyParent(null);
    setReplies([]);
    setRepliesLoading(true);
    try {
      const data = await api<{ replyParent: Tweet | null }>(`/api/tweets/${tweet.id}`);
      setReplyParent(data.replyParent);
      const replyData = await api<{ replies: Tweet[] }>(`/api/tweets/${tweet.id}/replies`);
      setReplies(replyData.replies);
    } catch {
      /* keep light data */
    } finally {
      setRepliesLoading(false);
    }
  };

  const openTweet = (tweet: Tweet) => {
    setActiveTweet(tweet);
    setReplyParent(null);
    setReplies([]);
    setRepliesLoading(true);
    setQuote(null);
    setEditTarget(null);
    emitLive('tweet:join', `tweet:${tweet.id}`);
    window.history.replaceState({}, '', `/?hub=tweet&tweetView=status&id=${tweet.id}`);
    void openTweetById(tweet.id);
  };

  const closeTweet = () => {
    if (activeTweet) emitLive('tweet:leave', `tweet:${activeTweet.id}`);
    setActiveTweet(null);
    setReplyParent(null);
    setReplies([]);
    setQuote(null);
    setEditTarget(null);
    window.history.replaceState({}, '', '/?hub=tweet');
  };

  const runSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setSearchQuery(query);
    setView('search');
    setRecentSearches((current) => {
      const next = [query, ...current.filter((s) => s !== query)].slice(0, 8);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
    window.history.replaceState({}, '', `/?hub=tweet&tweetView=search&q=${encodeURIComponent(query)}`);
  };

  const clearRecents = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENTS_KEY);
  };

  const searchTag = (tag: string) => {
    setSearchInput(tag);
    setSearchQuery(tag);
    setView('search');
    window.history.replaceState({}, '', `/?hub=tweet&tweetView=search&q=${encodeURIComponent(tag)}`);
  };

  // -- optimistic actions ------------------------------------------------
  const toggleLike = async (tweet: Tweet) => {
    const next = !tweet.liked;
    const delta = next ? 1 : -1;
    patchTweet(tweet.id, { liked: next, likes: Math.max(0, tweet.likes + delta) });
    try {
      const data = await api<{ liked: boolean; likes: number }>(`/api/tweets/${tweet.id}/like`, { method: 'POST' });
      patchTweet(tweet.id, { liked: data.liked, likes: data.likes });
    } catch (error) {
      patchTweet(tweet.id, { liked: tweet.liked, likes: tweet.likes });
      toast(error instanceof Error ? error.message : t('tweetHub.toast.likeFailed'), 'error');
    }
  };

  const toggleRetweet = async (tweet: Tweet) => {
    const next = !tweet.retweeted;
    const delta = next ? 1 : -1;
    patchTweet(tweet.id, { retweeted: next, retweets: Math.max(0, tweet.retweets + delta) });
    try {
      const data = await api<{ retweeted: boolean; retweets: number }>(`/api/tweets/${tweet.id}/retweet`, { method: 'POST' });
      patchTweet(tweet.id, { retweeted: data.retweeted, retweets: data.retweets });
      toast(data.retweeted ? t('tweetHub.toast.reposted') : t('tweetHub.toast.repostRemoved'), 'ok');
    } catch (error) {
      patchTweet(tweet.id, { retweeted: tweet.retweeted, retweets: tweet.retweets });
      toast(error instanceof Error ? error.message : t('tweetHub.toast.repostFailed'), 'error');
    }
  };

  const toggleBookmark = async (tweet: Tweet) => {
    const next = !tweet.saved;
    patchTweet(tweet.id, { saved: next });
    try {
      const data = await api<{ saved: boolean }>(`/api/tweets/${tweet.id}/bookmark`, { method: 'POST' });
      patchTweet(tweet.id, { saved: data.saved });
    } catch (error) {
      patchTweet(tweet.id, { saved: tweet.saved });
      toast(error instanceof Error ? error.message : t('tweetHub.toast.bookmarkFailed'), 'error');
    }
  };

  const toggleFollow = async (userId: number) => {
    const prevProfile = profile;
    if (prevProfile && prevProfile.user.id === userId) {
      const next = !prevProfile.following;
      setProfile({ ...prevProfile, following: next, requested: next ? false : prevProfile.requested, stats: { ...prevProfile.stats, followers: Math.max(0, prevProfile.stats.followers + (next ? 1 : -1)) } });
    }
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, following: !user.following } : user));
    try {
      const data = await api<{ following: boolean; requested?: boolean }>(`/api/tweets/${userId}/follow`, { method: 'POST' });
      if (prevProfile && prevProfile.user.id === userId) {
        setProfile((current) => current
          ? { ...current, following: data.following, requested: data.requested ?? false, stats: { ...current.stats, followers: Math.max(0, prevProfile.stats.followers + (data.following ? 1 : 0)) } }
          : current);
      }
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, following: data.following } : user));
      setSuggestions((current) => data.following ? current.filter((user) => user.id !== userId) : current);
      toast(data.following ? t('tweetHub.toast.following') : data.requested ? t('tweetHub.toast.requestSent') : t('tweetHub.toast.unfollowed'), 'ok');
    } catch (error) {
      if (prevProfile && prevProfile.user.id === userId) setProfile(prevProfile);
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, following: !user.following } : user));
      toast(error instanceof Error ? error.message : t('tweetHub.toast.followFailed'), 'error');
    }
  };

  const handleFollowRequest = async (id: number, accept: boolean) => {
    setFollowRequestBusy(id);
    try {
      await api(`/api/tweets/follow-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ accept }) });
      if (accept) toast(t('tweetHub.followRequests.accepted'), 'ok');
      else toast(t('tweetHub.followRequests.declined'), 'ok');
      setFollowRequests((current) => current.filter((row) => row.id !== id));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    } finally {
      setFollowRequestBusy(null);
    }
  };

  const loadLists = useCallback(async () => {
    try {
      const data = await api<{ mine: TweetListRow[]; public: TweetListRow[] }>('/api/tweets/lists?view=public');
      setMyLists(data.mine);
      setPublicLists(data.public);
    } catch { /* sidebar lists are non-critical */ }
  }, []);

  const openList = async (list: TweetListRow) => {
    if (activeList?.id === list.id) return;
    setActiveList(list);
    setListFeed([]);
    setListDetail(null);
    setListBusy(true);
    try {
      const data = await api<TweetListDetail>(`/api/tweets/lists/${list.id}`);
      setListDetail(data);
      setListFeed(data.tweets);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.lists.loadFailed'), 'error');
      setActiveList(null);
    } finally {
      setListBusy(false);
    }
  };

  const openListById = async (id: number, name?: string) => {
    setView('lists');
    setActiveList({ id, name: name ?? `#${id}`, description: '', isPrivate: false, createdAt: '', ownerId: 0, owner: { id: 0, username: '', name: '', avatarId: 0, avatarPhoto: null, bannerPhoto: null, bio: '', website: '', location: '' }, memberCount: 0, tweetCount: 0 });
    setListFeed([]);
    await openList({ id, name: name ?? `#${id}`, description: '', isPrivate: false, createdAt: '', ownerId: 0, owner: { id: 0, username: '', name: '', avatarId: 0, avatarPhoto: null, bannerPhoto: null, bio: '', website: '', location: '' }, memberCount: 0, tweetCount: 0 });
  };

  const createList = async (event: FormEvent) => {
    event.preventDefault();
    if (!newListName.trim()) return;
    setListBusy(true);
    try {
      await api('/api/tweets/lists', { method: 'POST', body: JSON.stringify({ name: newListName, description: newListDesc, isPrivate: newListPrivate }) });
      toast(t('tweetHub.lists.created'), 'ok');
      setNewListName(''); setNewListDesc(''); setNewListPrivate(false); setListCreateOpen(false);
      await loadLists();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.lists.createFailed'), 'error');
    } finally { setListBusy(false); }
  };

  const toggleFollowList = (list: TweetListRow) => {
    const followed = followedListIds.includes(list.id);
    const next = followed ? followedListIds.filter((item) => item !== list.id) : [...followedListIds, list.id];
    setFollowedListIds(next);
    localStorage.setItem(listsKey, JSON.stringify(next));
    toast(followed ? t('tweetHub.lists.unfollowed') : t('tweetHub.lists.followed'), 'ok');
    if (!listDetail && !activeList) return;
  };

  const isFollowingList = (listId: number) => myLists.some((list) => list.id === listId) || followedListIds.includes(listId);

  const copyListLink = async (list: TweetListRow) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?hub=tweet&tweetView=lists&list=${list.id}`);
      toast(t('tweetHub.lists.linkCopied'), 'ok');
    } catch { toast(t('tweetHub.toast.actionFailed'), 'error'); }
  };

  const loadScheduled = useCallback(async () => {
    setScheduledBusy(true);
    try {
      const data = await api<{ scheduled: ScheduledRow[] }>('/api/tweets/schedule');
      setScheduled(data.scheduled);
    } catch { /* silent */ } finally { setScheduledBusy(false); }
  }, []);

  const cancelSchedule = async (id: number) => {
    try {
      await api(`/api/tweets/schedule/${id}`, { method: 'PATCH' });
      setScheduled((current) => current.map((row) => row.id === id ? { ...row, status: 'CANCELED' } : row));
      toast(t('tweetHub.schedule.canceled'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await api(`/api/tweets/schedule/${id}`, { method: 'DELETE' });
      setScheduled((current) => current.filter((row) => row.id !== id));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    }
  };

  const runDueNow = async () => {
    setRunBusy(true);
    try {
      const data = await api<{ published: number; failed: number }>('/api/tweets/schedule/publish', { method: 'POST' });
      toast(t('tweetHub.schedule.ran', { published: data.published, failed: data.failed }), 'ok');
      await loadScheduled();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    } finally { setRunBusy(false); }
  };

  const openStats = (tweet: Tweet) => {
    setStatsTarget(tweet);
    setStatsData(null);
    setStatsLoading(true);
    api<{ stats: TweetStats }>(`/api/tweets/${tweet.id}/stats`)
      .then((data) => setStatsData(data.stats))
      .catch(() => toast(t('tweetHub.toast.actionFailed'), 'error'))
      .finally(() => setStatsLoading(false));
  };

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeList || !memberUsername.trim()) return;
    setListBusy(true);
    try {
      await api(`/api/tweets/lists/${activeList.id}/members`, { method: 'POST', body: JSON.stringify({ username: memberUsername }) });
      toast(t('tweetHub.lists.memberAdded'), 'ok');
      setMemberUsername('');
      await openList(activeList);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.lists.updateFailed'), 'error');
    } finally { setListBusy(false); }
  };

  const removeListMember = async (memberId: number) => {
    if (!activeList) return;
    try {
      await api(`/api/tweets/lists/${activeList.id}/members?userId=${memberId}`, { method: 'DELETE' });
      toast(t('tweetHub.lists.memberRemoved'), 'ok');
      await openList(activeList);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.lists.updateFailed'), 'error');
    }
  };

  const deleteList = async () => {
    if (!deleteListTarget) return;
    try {
      await api(`/api/tweets/lists/${deleteListTarget.id}`, { method: 'DELETE' });
      toast(t('tweetHub.lists.deleted'), 'ok');
      setDeleteListTarget(null);
      if (activeList?.id === deleteListTarget.id) setActiveList(null);
      await loadLists();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.lists.deleteFailed'), 'error');
    }
  };

  const addToMyList = async (list: TweetListRow, tweet: Tweet) => {
    try {
      await api(`/api/tweets/lists/${list.id}/tweets`, { method: 'POST', body: JSON.stringify({ tweetId: tweet.id }) });
      toast(t('tweetHub.lists.tweetAdded'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.lists.updateFailed'), 'error');
    }
  };

  const loadCollections = useCallback(async () => {
    try {
      const data = await api<{ collections: BookmarkCollection[] }>('/api/tweets/bookmark-collections');
      setBookmarkColls(data.collections);
    } catch { /* non-critical */ }
  }, []);

  const selectCollection = (id: number | null) => {
    setActiveCollId(id);
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setFeed([]);
    void loadFeed(true);
  };

  const createCollection = async (event: FormEvent) => {
    event.preventDefault();
    if (!newCollName.trim()) return;
    setCollBusy(true);
    try {
      const data = await api<{ collection: BookmarkCollection }>('/api/tweets/bookmark-collections', { method: 'POST', body: JSON.stringify({ name: newCollName }) });
      toast(t('tweetHub.collections.created'), 'ok');
      setNewCollName('');
      setBookmarkColls((current) => [...current, data.collection]);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.collections.createFailed'), 'error');
    } finally { setCollBusy(false); }
  };

  const renameCollection = async (event: FormEvent) => {
    event.preventDefault();
    if (!renamingColl || !renameCollName.trim()) return;
    setCollBusy(true);
    try {
      await api(`/api/tweets/bookmark-collections/${renamingColl.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameCollName }) });
      toast(t('tweetHub.collections.renamed'), 'ok');
      setBookmarkColls((current) => current.map((coll) => coll.id === renamingColl.id ? { ...coll, name: renameCollName } : coll));
      setRenamingColl(null);
      setRenameCollName('');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.collections.updateFailed'), 'error');
    } finally { setCollBusy(false); }
  };

  const deleteCollection = async () => {
    if (!deleteCollTarget) return;
    try {
      await api(`/api/tweets/bookmark-collections/${deleteCollTarget.id}`, { method: 'DELETE' });
      toast(t('tweetHub.collections.deleted'), 'ok');
      setBookmarkColls((current) => current.filter((coll) => coll.id !== deleteCollTarget.id));
      if (activeCollId === deleteCollTarget.id) selectCollection(null);
      setDeleteCollTarget(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.collections.updateFailed'), 'error');
    }
  };

  const moveToCollection = async (collection: BookmarkCollection | null, tweet: Tweet) => {
    try {
      await api(`/api/tweets/${tweet.id}/bookmark`, { method: 'PUT', body: JSON.stringify({ collectionId: collection ? collection.id : null }) });
      toast(collection ? t('tweetHub.collections.movedTo', { name: collection.name }) : t('tweetHub.collections.removedFromAll'), 'ok');
      void loadCollections();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    } finally { setMoveTarget(null); }
  };

  const deleteTweet = async (tweet: Tweet) => {
    setConfirmDelete(null);
    try {
      await api(`/api/tweets/${tweet.id}`, { method: 'DELETE' });
      setFeed((current) => current.filter((item) => item.id !== tweet.id));
      setReplies((current) => current.filter((item) => item.id !== tweet.id));
      if (activeTweet?.id === tweet.id) closeTweet();
      toast(t('tweetHub.toast.tweetDeleted'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.deleteFailed'), 'error');
    }
  };

  const togglePin = async (tweet: Tweet) => {
    const next = !tweet.pinned;
    patchTweet(tweet.id, { pinned: next });
    try {
      const data = await api<{ pinned: boolean }>(`/api/tweets/${tweet.id}/pin`, { method: 'POST', body: JSON.stringify({ pinned: next }) });
      patchTweet(tweet.id, { pinned: data.pinned });
      toast(data.pinned ? t('tweetHub.pin.pinnedToast') : t('tweetHub.pin.unpinnedToast'), 'ok');
    } catch (error) {
      patchTweet(tweet.id, { pinned: tweet.pinned });
      toast(error instanceof Error ? error.message : t('tweetHub.toast.actionFailed'), 'error');
    }
  };

  const votePoll = async (tweet: Tweet, optionId: number) => {
    const poll = tweet.poll;
    if (!poll || poll.myVote != null) return;
    try {
      const data = await api<{ poll: TweetPoll }>(`/api/polls/${poll.id}/vote`, { method: 'POST', body: JSON.stringify({ optionId }) });
      patchTweet(tweet.id, { poll: data.poll });
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.poll.voteFailed'), 'error');
    }
  };

  const openThread = async (tweet: Tweet) => {
    try {
      const data = await api<{ thread: Tweet[] }>(`/api/tweets/thread?id=${tweet.id}`);
      if (data.thread.length > 1) void openTweet(data.thread[0]);
      else if (tweet.replyToId) void openTweetById(tweet.replyToId);
    } catch {
      toast(t('tweetHub.toast.actionFailed'), 'error');
    }
  };

  const copyLink = async (tweet: Tweet) => {
    const url = `${window.location.origin}/?hub=tweet&tweetView=status&id=${tweet.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('tweetHub.toast.linkCopied'), 'ok');
    } catch {
      window.prompt(t('tweetHub.toast.copyLink'), url);
    }
  };

  const muteUser = async (tweet: Tweet) => {
    try {
      await api(`/api/tweets/${tweet.author.id}/mute`, { method: 'POST' });
      if (profile && profile.user.id === tweet.author.id) setProfile({ ...profile, muted: true });
      setFeed((current) => current.filter((item) => item.author.id !== tweet.author.id));
      setReplies((current) => current.filter((item) => item.author.id !== tweet.author.id));
      if (activeTweet?.author.id === tweet.author.id) closeTweet();
      toast(t('tweetHub.toast.muted', { username: tweet.author.username }), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.muteFailed'), 'error');
    }
  };

  const blockUser = async (tweet: Tweet) => {
    setBlockConfirm(null);
    try {
      await api(`/api/tweets/${tweet.author.id}/block`, { method: 'POST' });
      if (profile && profile.user.id === tweet.author.id) setProfile({ ...profile, blocked: true, following: false });
      setSuggestions((current) => current.filter((user) => user.id !== tweet.author.id));
      setFeed((current) => current.filter((item) => item.author.id !== tweet.author.id));
      setReplies((current) => current.filter((item) => item.author.id !== tweet.author.id));
      if (activeTweet?.author.id === tweet.author.id) closeTweet();
      toast(t('tweetHub.toast.blocked', { username: tweet.author.username }), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.blockFailed'), 'error');
    }
  };

  const unblockUser = async (userId: number) => {
    const prev = profile;
    if (prev) setProfile({ ...prev, blocked: false });
    try {
      await api(`/api/tweets/${userId}/block`, { method: 'DELETE' });
      toast(t('tweetHub.toast.unblocked'), 'ok');
    } catch (error) {
      if (prev) setProfile(prev);
      toast(error instanceof Error ? error.message : t('tweetHub.toast.unblockFailed'), 'error');
    }
  };

  const unmuteUser = async (userId: number) => {
    const prev = profile;
    if (prev) setProfile({ ...prev, muted: false });
    try {
      await api(`/api/tweets/${userId}/mute`, { method: 'DELETE' });
      toast(t('tweetHub.toast.unmuted'), 'ok');
    } catch (error) {
      if (prev) setProfile(prev);
      toast(error instanceof Error ? error.message : t('tweetHub.toast.unmuteFailed'), 'error');
    }
  };

  const submitReport = async (category: string) => {
    if (!reportTarget || reportBusy) return;
    setReportBusy(true);
    try {
      await api(`/api/tweets/${reportTarget.id}/report`, { method: 'POST', body: JSON.stringify({ reason: category }) });
      toast(t('tweetHub.toast.reportThanks'), 'ok');
      setReportTarget(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('tweetHub.toast.reportFailed'), 'error');
    } finally {
      setReportBusy(false);
    }
  };

  const openQuote = (tweet: Tweet) => {
    if (view !== 'home') { setView('home'); setSearchQuery(''); setSearchInput(''); window.history.replaceState({}, '', '/?hub=tweet'); }
    setQuote(tweet);
    setEditTarget(null);
  };

  const startEdit = (tweet: Tweet) => {
    if (view !== 'home') { setView('home'); setSearchQuery(''); setSearchInput(''); window.history.replaceState({}, '', '/?hub=tweet'); }
    setEditTarget(tweet);
    setQuote(null);
  };

  const onComposerPosted = (tweet: Tweet) => {
    if (view === 'home' || view === 'profile' || view === 'following') setFeed((current) => [tweet, ...current.filter((item) => item.id !== tweet.id)]);
    if (editTarget) setEditTarget(null);
    if (quote) setQuote(null);
  };

  const onReplyPosted = (reply: Tweet) => {
    if (!activeTweet) return;
    setReplies((current) => [reply, ...current.filter((item) => item.id !== reply.id)]);
    patchTweet(activeTweet.id, { replies: activeTweet.replies + 1 });
  };

  const pageTitle = useMemo(() => {
    if (view === 'home') return t('tweetHub.nav.home');
    if (view === 'explore') return t('tweetHub.nav.explore');
    if (view === 'following') return t('tweetHub.nav.following');
    if (view === 'bookmarks') return t('tweetHub.nav.bookmarks');
    if (view === 'lists') return t('tweetHub.nav.lists');
    if (view === 'scheduled') return t('tweetHub.nav.scheduled');
    if (view === 'notifications') return t('tweetHub.nav.notifications');
    if (view === 'search') return searchQuery ? t('tweetHub.pageTitle.results', { query: searchQuery }) : t('tweetHub.searchLabel');
    if (view === 'profile') return profileName ? `@${profileName}` : t('tweetHub.pageTitle.profile');
    return t('tweetHub.pageTitle.hub');
  }, [profileName, searchQuery, t, view]);

  const nav: { id: TweetView; label: string; icon: typeof Bird; badge?: number }[] = [
    { id: 'home', label: t('tweetHub.nav.home'), icon: Bird },
    { id: 'explore', label: t('tweetHub.nav.explore'), icon: Search },
    { id: 'following', label: t('tweetHub.nav.following'), icon: UsersRound },
    { id: 'notifications', label: t('tweetHub.nav.notifications'), icon: Bell, badge: notifBadge },
    { id: 'bookmarks', label: t('tweetHub.nav.bookmarks'), icon: Bookmark },
    { id: 'lists', label: t('tweetHub.nav.lists'), icon: List },
    { id: 'scheduled', label: t('tweetHub.nav.scheduled'), icon: CalendarClock },
  ];

  return (
    <div className="hub-shell hub-shell-tweet tweet-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product={t('tweetHub.brand.name')} />
      <div className="tweet-hub-layout">
        <aside className="tweet-hub-sidebar">
          <div className="tweet-hub-brand">
            <span className="hub-empty-icon"><Bird size={22} /></span>
            <div><b>{t('tweetHub.brand.name')}</b><small>{t('tweetHub.brand.tagline')}</small></div>
          </div>
          <nav>
            {nav.map(({ id, label, icon: Icon, badge }) => (
              <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => id === 'notifications' ? changeView('notifications') : changeView(id)}>
                <Icon size={17} />
                <span>{label}</span>
                {badge ? badge > 0 && <em className="tweet-nav-badge">{badge > 99 ? '99+' : badge}</em> : null}
              </button>
            ))}
            <button type="button" className={view === 'profile' ? 'active' : ''} onClick={() => me && openProfile(me.username, me.id)}>
              <UserIcon size={17} /><span>{t('tweetHub.nav.profile')}</span>
            </button>
            {followRequests.length > 0 && (
              <button type="button" onClick={() => setFollowRequestsOpen(true)}>
                <UsersRound size={17} /><span>{t('tweetHub.followRequests.nav')}</span>
                <em className="tweet-nav-badge">{followRequests.length > 99 ? '99+' : followRequests.length}</em>
              </button>
            )}
          </nav>
          <button type="button" className="btn btn-tweet tweet-hub-post" onClick={() => { setQuote(null); setEditTarget(null); if (view !== 'home') changeView('home'); document.querySelector<HTMLTextAreaElement>('.tweet-composer-textarea')?.focus(); }}>
            <Bird size={16} /> {t('tweetHub.post')}
          </button>
          <button type="button" className="tweet-hub-jam-link" onClick={() => { setProduct('community'); setTab('jams'); }}>
            <UsersRound size={15} /> {t('tweetHub.openCommunity')}
          </button>
        </aside>

        <main className="tweet-hub-main">
          <header className="tweet-hub-heading">
            <div className="tweet-hub-heading-copy">
              {view === 'profile' && <button type="button" className="tweet-back" onClick={() => { changeView('home'); }}><ArrowLeft size={16} /> {t('tweetHub.back')}</button>}
              <div className="hub-kicker">{t('tweetHub.kicker')}</div>
              <h1>{pageTitle}</h1>
            </div>
            <div className="hub-heading-actions">
              <button type="button" className="btn btn-ghost pill-sm" onClick={reload}><Sparkles size={14} /> {t('tweetHub.refresh')}</button>
            </div>
          </header>

          {(view === 'explore' || view === 'search') && (
            <>
              <form className="tweet-search" onSubmit={runSearch}>
                <Search size={17} />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t('tweetHub.searchPlaceholder')} maxLength={120} id="tweet-search-input" />
                <button type="submit" className="btn btn-tweet pill-sm">{t('tweetHub.searchLabel')}</button>
              </form>
              <p className="tweet-search-hint">{t('tweetHub.search.operators')}</p>
            </>
          )}

          {view === 'home' && !editTarget && !quote && (
            <Composer onPosted={onComposerPosted} placeholder={quote ? t('tweetHub.quotePlaceholder') : t('tweetHub.composerPlaceholder')} />
          )}
          {view === 'home' && (editTarget || quote) && (
            <Composer
              key={`composer-${editTarget?.id ?? quote?.id ?? 'new'}`}
              onPosted={onComposerPosted}
              editTweet={editTarget}
              quote={quote}
              onCancel={() => { setEditTarget(null); setQuote(null); }}
              placeholder={t('tweetHub.composerPlaceholder')}
              autoFocus
            />
          )}

          {view === 'search' && !searchQuery && (
            <section className="tweet-rail-card tweet-recent">
              <div className="tweet-recent-head"><h3><Search size={15} /> {t('tweetHub.recent.title')}</h3>{recentSearches.length > 0 && <button type="button" className="btn btn-ghost pill-sm" onClick={clearRecents}><X size={12} /> {t('tweetHub.recent.clear')}</button>}</div>
              {recentSearches.length === 0 ? (
                <p className="tweet-rail-empty">{t('tweetHub.recent.empty')}</p>
              ) : (
                recentSearches.map((term) => (
                  <button type="button" className="tweet-trend" key={term} onClick={() => { setSearchInput(term); setSearchQuery(term); setView('search'); }}>
                    <span className="tweet-trend-tag" style={{ fontWeight: 500 }}>{term.startsWith('#') || term.startsWith('@') ? term : `“${term}”`}</span>
                  </button>
                ))
              )}
            </section>
          )}

          {view === 'profile' && profile && (
            <section className="tweet-profile-head">
              {profile.user.bannerPhoto ? (
                <div className="tweet-profile-art" style={{ backgroundImage: `url(${profile.user.bannerPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ) : (
                <div className="tweet-profile-art" />
              )}
              <div className="tweet-profile-body">
                <div className="tweet-profile-avatar">
                  <JaminoAvatar avatarId={profile.user.avatarId} size={84} photo={profile.user.avatarPhoto} name={profile.user.username} />
                </div>
                <div className="tweet-profile-actions">
                  {profile.isMe ? (
                    <button type="button" className="btn btn-ghost pill-sm" onClick={() => setEditProfileOpen(true)}><Pencil size={13} /> {t('tweetHub.profile.edit')}</button>
                  ) : profile.blockedBy ? (
                    <span className="tweet-block-note"><Ban size={13} /> {t('tweetHub.profile.blockedNote')}</span>
                  ) : (
                    <>
                      {profile.blocked && (
                        <button type="button" className="btn btn-ghost pill-sm" onClick={() => void unblockUser(profile.user.id)}><Ban size={13} /> {t('tweetHub.profile.unblock')}</button>
                      )}
                      {profile.muted && (
                        <button type="button" className="btn btn-ghost pill-sm" onClick={() => void unmuteUser(profile.user.id)}><VolumeX size={13} /> {t('tweetHub.profile.unmute')}</button>
                      )}
                      <button type="button" className={`btn ${profile.following || profile.requested ? 'btn-ghost' : 'btn-tweet'} pill-sm`} onClick={() => void toggleFollow(profile.user.id)}>
                        {profile.following
                          ? t('tweetHub.people.followingBtn')
                          : profile.requested
                            ? t('tweetHub.people.requestSent')
                            : <><BadgeCheck size={14} /> {profile.private ? t('tweetHub.people.requestFollow') : t('tweetHub.people.follow')}</>}
                      </button>
                      <button type="button" className="btn btn-ghost pill-sm" onClick={() => openDm(profile.user.id)}><MessageCircle size={13} /> {t('tweetHub.profile.message')}</button>
                    </>
                  )}
                </div>
                <div className="tweet-profile-name">
                  <h2>{profile.user.name || `@${profile.user.username}`}</h2>
                  <span className="tweet-handle-large">@{profile.user.username}</span>
                  {profile.user.bio && <p>{profile.user.bio}</p>}
                  {profile.locked && <div className="tweet-private-note"><Lock size={14} /> {t('tweetHub.profile.privateNote')}</div>}
                  <p className="tweet-profile-meta">
                    {profile.user.location && <span><MapPin size={13} /> {profile.user.location}</span>}
                    {profile.user.website && <span><Globe size={13} /> <a href={profile.user.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{profile.user.website.replace(/^https?:\/\//, '')}</a></span>}
                    <span><Calendar size={13} /> {t('tweetHub.profile.joined', { date: new Date(profile.user.joinedAt).toLocaleDateString() })}</span>
                  </p>
                </div>
                <div className="tweet-profile-stats">
                  {ALLOWED_TABS.map((tab) => (
                    <button key={tab} className={`tweet-stat-btn ${profileTab === tab ? 'active' : ''}`} onClick={() => { setProfileTab(tab); setFeed([]); }}>
                      <b>{profile.stats[tab === 'posts' ? 'tweets' : tab === 'replies' ? 'replies' : tab === 'media' ? 'media' : 'likes']}</b> {t(`tweetHub.profile.${tab}`)}
                    </button>
                  ))}
                  <span className="tweet-stat-sep" />
                  <button type="button" className="tweet-stat-btn" onClick={() => setListModal({ kind: 'following', user: { id: profile.user.id, username: profile.user.username, avatarId: profile.user.avatarId, avatarPhoto: profile.user.avatarPhoto, bio: '', tweets: 0, followersCount: 0, following: false, isMe: false, isTarget: true } })}>
                    <b>{profile.stats.following}</b> {t('tweetHub.people.following')}
                  </button>
                  <button type="button" className="tweet-stat-btn" onClick={() => setListModal({ kind: 'followers', user: { id: profile.user.id, username: profile.user.username, avatarId: profile.user.avatarId, avatarPhoto: profile.user.avatarPhoto, bio: '', tweets: 0, followersCount: 0, following: false, isMe: false, isTarget: true } })}>
                    <b>{profile.stats.followers}</b> {t('tweetHub.people.followers')}
                  </button>
                </div>
              </div>
            </section>
          )}

          {view === 'explore' && (
            <section className="tweet-explore-banner">
              <TrendingUp size={26} />
              <div>
                <div className="hub-kicker">{t('tweetHub.explore.kicker')}</div>
                <h2>{t('tweetHub.explore.title')}</h2>
                <p>{t('tweetHub.explore.sub')}</p>
              </div>
            </section>
          )}

          {view === 'notifications' ? (
            <NotificationsView onUnread={setNotifBadge} onOpenTweet={openTweetById} onOpenProfile={openProfile} refreshKey={notifRefresh} />
          ) : (
            <>
              {view === 'lists' && (
                <section className="tweet-lists-panel">
                  <div className="tweet-rail-card">
                    <div className="tweet-list-panel-head">
                      <h3><List size={15} /> {t('tweetHub.lists.myLists')}</h3>
                      <button type="button" className="btn btn-ghost pill-sm" onClick={() => setListCreateOpen((open) => !open)}><Plus size={13} /> {t('tweetHub.lists.new')}</button>
                    </div>
                    {listCreateOpen && (
                      <form className="tweet-list-create" onSubmit={createList}>
                        <input value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder={t('tweetHub.lists.namePlaceholder')} maxLength={50} />
                        <input value={newListDesc} onChange={(event) => setNewListDesc(event.target.value)} placeholder={t('tweetHub.lists.descPlaceholder')} maxLength={160} />
                        <label className="tweet-list-private">
                          <span>{t('tweetHub.lists.private')}</span>
                          <input type="checkbox" checked={newListPrivate} onChange={(event) => setNewListPrivate(event.target.checked)} />
                        </label>
                        <button type="submit" className="btn btn-tweet pill-sm" disabled={listBusy}>{t('tweetHub.lists.createBtn')}</button>
                      </form>
                    )}
                    <div className="tweet-list-picker">
                      {myLists.length === 0 && <p className="tweet-rail-empty">{t('tweetHub.lists.empty')}</p>}
                      {myLists.map((list) => (
                        <button type="button" key={list.id} className={`tweet-list-chip grow ${activeList?.id === list.id ? 'active' : ''}`} onClick={() => void openList(list)}>
                          <List size={14} />
                          <span>
                            <b>{list.name}</b>
                            <small>{list.isPrivate ? <><Lock size={11} /> {t('tweetHub.lists.privateBadge')}</> : t('tweetHub.lists.publicBadge')} · {t('tweetHub.lists.counts', { members: list.memberCount, tweets: list.tweetCount })}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    {publicLists.length > 0 && (
                      <div className="tweet-list-picker">
                        <h4 className="tweet-list-subhead">{t('tweetHub.lists.fromOthers')}</h4>
                        {publicLists.map((list) => (
                          <div className="tweet-list-chip-row" key={list.id}>
                            <button type="button" className={`tweet-list-chip grow ${activeList?.id === list.id ? 'active' : ''}`} onClick={() => void openList(list)}>
                              <List size={14} />
                              <span><b>{list.name}</b><small>@{list.owner.username}</small></span>
                            </button>
                            <button type="button" className={`btn ${isFollowingList(list.id) ? 'btn-ghost' : 'btn-tweet'} pill-sm`} onClick={() => toggleFollowList(list)}>
                              {isFollowingList(list.id) ? t('tweetHub.lists.unfollow') : t('tweetHub.lists.follow')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeList && (
                    <div className="tweet-rail-card">
                      <div className="tweet-list-panel-head">
                        <h3><List size={15} /> {activeList.name}</h3>
                        <div className="tweet-list-actions">
                          <button type="button" className="btn-icon" onClick={() => void copyListLink(activeList)} title={t('tweetHub.lists.share')} aria-label={t('tweetHub.lists.share')}><Link2 size={15} /></button>
                          {listDetail?.canManage && <button type="button" className="btn-icon" onClick={() => setDeleteListTarget(activeList)} aria-label={t('tweetHub.lists.delete')}><Trash2 size={15} /></button>}
                        </div>
                      </div>
                      {listDetail?.list.description && <p className="tweet-list-desc">{listDetail.list.description}</p>}
                      {listDetail?.canManage && (
                        <form className="tweet-list-add-member" onSubmit={addMember}>
                          <input value={memberUsername} onChange={(event) => setMemberUsername(event.target.value)} placeholder={t('tweetHub.lists.memberPlaceholder')} maxLength={32} />
                          <button type="submit" className="btn btn-tweet pill-sm" disabled={listBusy}><UserPlus size={13} /> {t('tweetHub.lists.addMemberBtn')}</button>
                        </form>
                      )}
                      <div className="tweet-list-members">
                        {(!listDetail || listDetail.members.length === 0) && <p className="tweet-rail-empty">{t('tweetHub.lists.noMembers')}</p>}
                        {listDetail?.members.map((member) => (
                          <div className="tweet-list-row" key={member.id}>
                            <span className="tweet-list-id">
                              <JaminoAvatar avatarId={member.avatarId} size={34} photo={member.avatarPhoto} name={member.username} />
                              <span><b>{member.name || `@${member.username}`}</b><small>@{member.username}</small></span>
                            </span>
                            {listDetail.canManage && <button type="button" className="btn-icon" onClick={() => void removeListMember(member.id)} aria-label={t('tweetHub.lists.removeMember')}><X size={14} /></button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
              {view === 'bookmarks' && (
                <section className="tweet-collections-panel">
                  <div className="tweet-rail-card">
                    <div className="tweet-list-panel-head">
                      <h3><Bookmark size={15} /> {t('tweetHub.collections.title')}</h3>
                    </div>
                    <div className="tweet-list-picker">
                      <button type="button" className={`tweet-list-chip grow ${activeCollId === null ? 'active' : ''}`} onClick={() => selectCollection(null)}>
                        <Bookmark size={14} />
                        <span><b>{t('tweetHub.collections.all')}</b><small>{t('tweetHub.collections.everything')}</small></span>
                      </button>
                      {bookmarkColls.map((coll) => (
                        <div className="tweet-list-chip-row" key={coll.id}>
                          <button type="button" className={`tweet-list-chip grow ${activeCollId === coll.id ? 'active' : ''}`} onClick={() => selectCollection(coll.id)}>
                            <Bookmark size={14} />
                            <span><b>{coll.name}</b><small>{coll.count === 1 ? t('tweetHub.collections.oneTweet') : t('tweetHub.collections.tweetsCount', { count: coll.count })}</small></span>
                          </button>
                          <button type="button" className="btn-icon" onClick={() => { setRenamingColl(coll); setRenameCollName(coll.name); }} aria-label={t('tweetHub.collections.rename')} title={t('tweetHub.collections.rename')}><Pencil size={13} /></button>
                          <button type="button" className="btn-icon" onClick={() => setDeleteCollTarget(coll)} aria-label={t('tweetHub.collections.delete')} title={t('tweetHub.collections.delete')}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                    {renamingColl && (
                      <form className="tweet-list-add-member" onSubmit={renameCollection}>
                        <input value={renameCollName} onChange={(event) => setRenameCollName(event.target.value)} placeholder={t('tweetHub.collections.namePlaceholder')} maxLength={40} />
                        <button type="submit" className="btn btn-tweet pill-sm" disabled={collBusy}>{t('tweetHub.collections.renameBtn')}</button>
                        <button type="button" className="btn btn-ghost pill-sm" onClick={() => setRenamingColl(null)}>{t('tweetHub.cancel')}</button>
                      </form>
                    )}
                    <form className="tweet-list-add-member" onSubmit={createCollection}>
                      <input value={newCollName} onChange={(event) => setNewCollName(event.target.value)} placeholder={t('tweetHub.collections.newPlaceholder')} maxLength={40} />
                      <button type="submit" className="btn btn-tweet pill-sm" disabled={collBusy}><Plus size={13} /> {t('tweetHub.collections.new')}</button>
                    </form>
                  </div>
                </section>
              )}
              {view === 'scheduled' && (
                <section className="tweet-scheduled-panel">
                  <div className="tweet-rail-card">
                    <div className="tweet-list-panel-head">
                      <h3><CalendarClock size={15} /> {t('tweetHub.schedule.title')}</h3>
                      <button type="button" className="btn btn-ghost pill-sm" onClick={() => void runDueNow()} disabled={runBusy}>
                        {runBusy ? t('tweetHub.schedule.running') : t('tweetHub.schedule.runNow')}
                      </button>
                    </div>
                    {scheduledBusy && scheduled.length === 0 ? (
                      <div className="tweet-loading">{Array.from({ length: 3 }, (_, index) => <div className="tweet-skeleton" key={index} />)}</div>
                    ) : scheduled.length === 0 ? (
                      <p className="tweet-rail-empty">{t('tweetHub.schedule.empty')}</p>
                    ) : (
                      <div className="tweet-list-members">
                        {scheduled.map((row) => (
                          <div className="tweet-list-row" key={row.id}>
                            <span className="tweet-list-id">
                              <span className="tweet-sched-icon"><CalendarClock size={16} /></span>
                              <span>
                                <b>{new Date(row.publishAt).toLocaleString()}</b>
                                <small className={`tweet-sched-status s-${row.status.toLowerCase()}`}>
                                  {row.status === 'PUBLISHED' ? t('tweetHub.schedule.published') : row.status === 'CANCELED' ? t('tweetHub.schedule.canceledLabel') : row.status === 'FAILED' ? t('tweetHub.schedule.failed') : t('tweetHub.schedule.pending')}
                                  {row.text ? ` · ${row.text.slice(0, 60)}${row.text.length > 60 ? '…' : ''}` : ''}
                                </small>
                              </span>
                            </span>
                            {row.status === 'PENDING' && (
                              <span className="tweet-sched-actions">
                                <button type="button" className="btn btn-ghost pill-sm" onClick={() => void deleteSchedule(row.id)}>{t('tweetHub.schedule.delete')}</button>
                                <button type="button" className="btn-icon" onClick={() => void cancelSchedule(row.id)} aria-label={t('tweetHub.schedule.cancel')} title={t('tweetHub.schedule.cancel')}><X size={14} /></button>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
              <section className="tweet-feed">
              {view === 'search' && searchQuery && users.length > 0 && (
                <section className="tweet-rail-card tweet-user-results">
                  <h3><UsersRound size={15} /> {t('tweetHub.search.people')}</h3>
                  {users.map((user) => (
                    <div className="tweet-suggestion" key={user.id}>
                      <button type="button" className="tweet-suggestion-id" onClick={() => openProfile(user.username, user.id)}>
                        <JaminoAvatar avatarId={user.avatarId} size={38} photo={user.avatarPhoto} name={user.username} />
                        <span><b>{user.name || `@${user.username}`}</b><small>@{user.username} · {user.followers === 1 ? t('tweetHub.search.oneFollower') : t('tweetHub.search.followersCount', { count: user.followers })}</small></span>
                      </button>
                      {me?.id !== user.id && (
                        <button type="button" className={`btn ${user.following ? 'btn-ghost' : 'btn-tweet'} pill-sm`} onClick={() => void toggleFollow(user.id)}>
                          {user.following ? t('tweetHub.people.followingBtn') : t('tweetHub.people.follow')}
                        </button>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {view !== 'lists' && loading && feed.length === 0 && (
                <div className="tweet-loading">
                  {[1, 2, 3, 4].map((item) => <div className="tweet-skeleton" key={item} />)}
                </div>
              )}
              {view !== 'lists' && !loading && feedError && feed.length === 0 && (
                <div className="tweet-empty large">
                  <ShieldAlert size={26} />
                  <b>{t('tweetHub.toast.feedFailed')}</b>
                  <span>{t('tweetHub.feed.connectionHint')}</span>
                  <button type="button" className="btn btn-tweet pill-sm" onClick={reload}><Sparkles size={13} /> {t('tweetHub.retry')}</button>
                </div>
              )}
              {!loading && !feedError && (view === 'lists' ? listFeed.length === 0 : feed.length === 0) && (
                <div className="tweet-empty large">
                  <Bird size={26} />
                  <b>
                    {view === 'lists' ? (activeList ? t('tweetHub.feed.noTweets') : t('tweetHub.lists.pickFirst')) : view === 'bookmarks' ? t('tweetHub.feed.noBookmarks') : view === 'following' ? t('tweetHub.feed.followToFill') : view === 'search' ? t('tweetHub.search.noResults') : view === 'profile' ? (profile && profile.blockedBy ? t('tweetHub.feed.blockedProfile') : profile && profile.locked ? t('tweetHub.feed.privateProfile') : t('tweetHub.feed.noTweets')) : t('tweetHub.feed.quiet')}
                  </b>
                  <span>
                    {view === 'lists' ? (activeList ? t('tweetHub.feed.beFirst') : t('tweetHub.lists.pickHint')) : view === 'bookmarks' ? t('tweetHub.feed.noBookmarksHint') : view === 'following' ? t('tweetHub.feed.followToFillHint') : t('tweetHub.feed.beFirst')}
                  </span>
                  {view === 'home' && <span className="tweet-empty-badge"><Sparkles size={13} /> {t('tweetHub.feed.composeFirst')}</span>}
                </div>
              )}
              {(view === 'lists' ? listFeed : feed).map((tweet) => (
                <TweetCard
                  key={tweet.id}
                  tweet={tweet}
                  onOpen={() => openTweet(tweet)}
                  onLike={() => void toggleLike(tweet)}
                  onRetweet={() => void toggleRetweet(tweet)}
                  onQuote={() => openQuote(tweet)}
                  onBookmark={() => void toggleBookmark(tweet)}
                  onShare={() => void copyLink(tweet)}
                  onDelete={() => setConfirmDelete(tweet)}
                  onAuthor={() => openProfile(tweet.author.username, tweet.author.id)}
                  onTag={searchTag}
                  onMention={openProfile}
                  onReply={() => openTweet(tweet)}
                  onEdit={() => startEdit(tweet)}
                  onMute={() => void muteUser(tweet)}
                  onBlock={() => setBlockConfirm(tweet)}
                  onReport={() => setReportTarget(tweet)}
                  onMedia={(index) => setLightbox({ media: tweet.media, index })}
                  onPin={(pinned) => void togglePin({ ...tweet, pinned })}
                  onAddToList={() => setAddToListTarget(tweet)}
                  onMoveToCollection={tweet.saved ? () => setMoveTarget(tweet) : undefined}
                  onStats={me?.id === tweet.author.id ? () => openStats(tweet) : undefined}
                  onVote={(optionId) => void votePoll(tweet, optionId)}
                />
              ))}
              <div ref={sentinelRef} className="tweet-feed-sentinel">
                {loading && feed.length > 0 && <span className="admin-loader" />}
                {view === 'lists' && listBusy && activeList && <span className="admin-loader" />}
                {!hasMore && feed.length > 0 && <span>{t('tweetHub.feed.allCaughtUp')}</span>}
              </div>
            </section>
            </>
          )}
        </main>

        <aside className="tweet-hub-rail">
          <form className="tweet-rail-search" onSubmit={runSearch}>
            <Search size={15} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t('tweetHub.rail.searchPlaceholder')} maxLength={120} />
          </form>
          <section className="tweet-rail-card">
            <h3><TrendingUp size={15} /> {t('tweetHub.rail.trends')}</h3>
            {trends.length === 0 && <p className="tweet-rail-empty">{t('tweetHub.rail.noTrends')}</p>}
            {trends.map((trend) => (
              <button type="button" className="tweet-trend" key={trend.tag} onClick={() => searchTag(`#${trend.tag}`)}>
                <span className="tweet-trend-tag"><Hash size={13} />{trend.tag}</span>
                <small>{trend.count === 1 ? t('tweetHub.feed.oneTweet') : t('tweetHub.feed.tweetsCount', { count: trend.count })}</small>
              </button>
            ))}
          </section>
          <section className="tweet-rail-card">
            <h3><UsersRound size={15} /> {t('tweetHub.rail.whoToFollow')}</h3>
            {suggestions.length === 0 && <p className="tweet-rail-empty">{t('tweetHub.rail.allFollowed')}</p>}
            {suggestions.map((user) => (
              <div className="tweet-suggestion" key={user.id}>
                <button type="button" className="tweet-suggestion-id" onClick={() => openProfile(user.username, user.id)}>
                  <JaminoAvatar avatarId={user.avatarId} size={38} photo={user.avatarPhoto} name={user.username} />
                  <span><b>{user.name || `@${user.username}`}</b><small>{t('tweetHub.search.followersCount', { count: user.followers })}</small></span>
                </button>
                {me?.id !== user.id && (
                  <button type="button" className="btn btn-tweet pill-sm" onClick={() => void toggleFollow(user.id)}>{t('tweetHub.people.follow')}</button>
                )}
              </div>
            ))}
          </section>
          <NotificationPrefsCard />
          <p className="tweet-rail-note">{t('tweetHub.rail.note')}</p>
        </aside>
      </div>

      <nav className="hub-mobile-nav tweet-mobile-nav">
        <button type="button" onClick={() => setProduct('home')} aria-label={t('tweetHub.nav.hubs')}><Bird size={17} /><span>{t('tweetHub.nav.hubs')}</span></button>
        {nav.filter((item) => item.id !== 'following').map(({ id, label, icon: Icon, badge }) => (
          <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => changeView(id)}>
            <Icon size={17} /><span>{label}</span>
            {badge ? badge > 0 && <em className="tweet-nav-badge">{badge > 99 ? '99+' : badge}</em> : null}
          </button>
        ))}
      </nav>

      {lightbox && (
        <div className="tweet-lightbox" onMouseDown={() => setLightbox(null)}>
          <button type="button" className="btn-icon tweet-lightbox-close" onClick={() => setLightbox(null)} aria-label={t('tweetHub.close')}><X size={20} /></button>
          {lightbox.media.length > 1 && (
            <>
              <button type="button" className="tweet-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.media.length) % lightbox.media.length }); }} aria-label={t('tweetHub.lightbox.prev')}>‹</button>
              <button type="button" className="tweet-lightbox-nav next" onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.media.length }); }} aria-label={t('tweetHub.lightbox.next')}>›</button>
            </>
          )}
          <div className="tweet-lightbox-media" onMouseDown={(e) => e.stopPropagation()}>
            {lightbox.media[lightbox.index].mime.startsWith('video/') ? (
              <video src={lightbox.media[lightbox.index].url} controls autoPlay playsInline />
            ) : (
              <img src={lightbox.media[lightbox.index].url} alt="" />
            )}
          </div>
        </div>
      )}

      {activeTweet && (
        <div className="tweet-modal-backdrop" onMouseDown={closeTweet}>
          <section className="tweet-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="tweet-modal-head">
              <div><div className="hub-kicker">{t('tweetHub.status.kicker')}</div><h2>{t('tweetHub.status.conversation')}</h2></div>
              <button type="button" className="btn-icon" onClick={closeTweet} aria-label={t('tweetHub.close')}><X size={18} /></button>
            </header>
            <div className="tweet-modal-scroll">
              {replyParent && (
                <div className="tweet-reply-parent">
                  <span className="tweet-reply-line" />
                  <button type="button" className="tweet-identity" onClick={() => openProfile(replyParent.author.username, replyParent.author.id)}>
                    <b>{replyParent.author.name || `@${replyParent.author.username}`}</b>
                  </button>
                  <p>{renderText(replyParent.text, searchTag, openProfile)}</p>
                </div>
              )}
              <div className="tweet-modal-primary">
                <div className="tweet-card-head">
                  <button type="button" className="tweet-identity" onClick={() => openProfile(activeTweet.author.username, activeTweet.author.id)}>
                    <b>{activeTweet.author.name || `@${activeTweet.author.username}`}</b>
                    <span className="tweet-handle">@{activeTweet.author.username}</span>
                  </button>
                  <span className="tweet-time">· {timeAgo(activeTweet.createdAt)}</span>
                  <TweetOptionsMenu
                    tweet={activeTweet}
                    isOwner={me?.id === activeTweet.author.id}
                    onCopy={() => void copyLink(activeTweet)}
                    onEdit={() => { closeTweet(); startEdit(activeTweet); }}
                    onDelete={() => setConfirmDelete(activeTweet)}
                    onMute={() => void muteUser(activeTweet)}
                    onBlock={() => setBlockConfirm(activeTweet)}
                    onReport={() => setReportTarget(activeTweet)}
                    onPin={(pinned) => void togglePin({ ...activeTweet, pinned })}
                    onAddToList={() => setAddToListTarget(activeTweet)}
                    onStats={me?.id === activeTweet.author.id ? () => openStats(activeTweet) : undefined}
                  />
                  {me?.id !== activeTweet.author.id && (
                    <button type="button" className="tweet-menu-btn" onClick={() => openDm(activeTweet.author.id)} title={t('tweetHub.profile.message')} aria-label={t('tweetHub.profile.message')}>
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
                {activeTweet.text && <p className="tweet-modal-text">{renderText(activeTweet.text, searchTag, openProfile)}</p>}
                <TweetMediaGrid tweet={activeTweet} onOpen={(index) => setLightbox({ media: activeTweet.media, index })} />
                {activeTweet.quoted && (
                  <QuotedCard tweet={activeTweet.quoted} onOpen={() => openTweet(activeTweet.quoted!)} onAuthor={() => openProfile(activeTweet.quoted!.author.username, activeTweet.quoted!.author.id)} onTag={searchTag} onMention={openProfile} />
                )}
                {activeTweet.poll && <TweetPollView poll={activeTweet.poll} onVote={(optionId) => void votePoll(activeTweet, optionId)} />}
                {(/https?:\/\/[^\s<>"']+/i.exec(activeTweet.text) ?? [])[0] && <TweetLinkPreview text={(/https?:\/\/[^\s<>"']+/i.exec(activeTweet.text) ?? [''])[0]} />}
                <TweetActions tweet={activeTweet} onLike={() => void toggleLike(activeTweet)} onRetweet={() => void toggleRetweet(activeTweet)} onQuote={() => { closeTweet(); openQuote(activeTweet); }} onBookmark={() => void toggleBookmark(activeTweet)} onReply={() => {}} onShare={() => void copyLink(activeTweet)} />
                <div className="tweet-modal-meta">
                  {activeTweet.replyToId ? (
                    <button type="button" className="tweet-thread-link" onClick={() => void openThread(activeTweet)}><Repeat2 size={13} /> {t('tweetHub.status.viewThread')}</button>
                  ) : null}
                  {activeTweet.views > 0 && <span><Eye size={14} /> {formatCount(activeTweet.views)}</span>}
                  <span>{new Date(activeTweet.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>
              {!editTarget && (
                <Composer compact autoFocus replyToId={activeTweet.id} replyContext={{ author: activeTweet.author }} placeholder={t('tweetHub.status.replyPlaceholder')} onPosted={onReplyPosted} />
              )}
              <div className="tweet-replies">
                {repliesLoading && <div className="tweet-empty"><span className="admin-loader" /> {t('tweetHub.status.loadingReplies')}</div>}
                {!repliesLoading && replies.length === 0 && <div className="tweet-empty"><MessageCircle size={20} /><span>{t('tweetHub.status.noReplies')}</span></div>}
                {replies.map((reply) => (
                  <TweetCard
                    key={reply.id}
                    tweet={reply}
                    onOpen={() => openTweet(reply)}
                    onLike={() => void toggleLike(reply)}
                    onRetweet={() => void toggleRetweet(reply)}
                    onQuote={() => openQuote(reply)}
                    onBookmark={() => void toggleBookmark(reply)}
                    onShare={() => void copyLink(reply)}
                    onDelete={() => setConfirmDelete(reply)}
                    onAuthor={() => openProfile(reply.author.username, reply.author.id)}
                    onTag={searchTag}
                    onMention={openProfile}
                    onReply={() => openTweet(reply)}
                    onEdit={() => startEdit(reply)}
                    onMute={() => void muteUser(reply)}
                    onBlock={() => setBlockConfirm(reply)}
                    onReport={() => setReportTarget(reply)}
                    onMedia={(index) => setLightbox({ media: reply.media, index })}
                    onPin={(pinned) => void togglePin({ ...reply, pinned })}
                    onVote={(optionId) => void votePoll(reply, optionId)}
                    onStats={me?.id === reply.author.id ? () => openStats(reply) : undefined}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {listModal && (
        <RelationshipModal
          kind={listModal.kind}
          username={listModal.user.username}
          avatarId={listModal.user.avatarId}
          avatarPhoto={listModal.user.avatarPhoto}
          user={listModal.user}
          onClose={() => setListModal(null)}
          onFollowChange={() => { if (view === 'profile') refreshProfile(); }}
        />
      )}

      {followRequestsOpen && (
        <FollowRequestsModal
          requests={followRequests}
          busyId={followRequestBusy}
          onAccept={(id) => void handleFollowRequest(id, true)}
          onDecline={(id) => void handleFollowRequest(id, false)}
          onClose={() => setFollowRequestsOpen(false)}
        />
      )}

      {addToListTarget && (
        <AddToListModal
          tweet={addToListTarget}
          lists={myLists}
          onPick={(list) => { void addToMyList(list, addToListTarget); setAddToListTarget(null); }}
          onClose={() => setAddToListTarget(null)}
          onManageLists={() => { setAddToListTarget(null); changeView('lists'); setListCreateOpen(true); }}
        />
      )}

      {deleteListTarget && (
        <ConfirmModal
          title={t('tweetHub.lists.deleteTitle', { name: deleteListTarget.name })}
          message={t('tweetHub.lists.deleteMessage')}
          confirmLabel={t('tweetHub.lists.delete')}
          onCancel={() => setDeleteListTarget(null)}
          onConfirm={() => void deleteList()}
        />
      )}

      {moveTarget && (
        <MoveToCollectionModal
          tweet={moveTarget}
          collections={bookmarkColls}
          onPick={(coll) => void moveToCollection(coll, moveTarget)}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {deleteCollTarget && (
        <ConfirmModal
          title={t('tweetHub.collections.deleteTitle', { name: deleteCollTarget.name })}
          message={t('tweetHub.collections.deleteMessage')}
          confirmLabel={t('tweetHub.collections.delete')}
          onCancel={() => setDeleteCollTarget(null)}
          onConfirm={() => void deleteCollection()}
        />
      )}

      {editProfileOpen && profile && (
        <EditProfileModal profile={profile} onClose={() => setEditProfileOpen(false)} onSaved={() => { setEditProfileOpen(false); reload(); }} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={t('tweetHub.deleteModal.title')}
          message={t('tweetHub.deleteModal.message')}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void deleteTweet(confirmDelete)}
        />
      )}

      {blockConfirm && (
        <ConfirmModal
          title={t('tweetHub.blockModal.title', { username: blockConfirm.author.username })}
          message={t('tweetHub.blockModal.message')}
          confirmLabel={t('tweetHub.blockModal.confirm')}
          onCancel={() => setBlockConfirm(null)}
          onConfirm={() => void blockUser(blockConfirm)}
        />
      )}

      {reportTarget && (
        <div className="tweet-modal-backdrop" onMouseDown={() => setReportTarget(null)}>
          <section className="tweet-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="tweet-modal-head">
              <div><div className="hub-kicker">{t('tweetHub.report.kicker')}</div><h2>{t('tweetHub.report.title')}</h2></div>
              <button type="button" className="btn-icon" onClick={() => setReportTarget(null)} aria-label={t('tweetHub.close')}><X size={18} /></button>
            </header>
            <div className="tweet-modal-scroll">
              <p className="tweet-report-copy">{t('tweetHub.report.copy')}</p>
              {reportBusy && <div className="tweet-empty"><span className="admin-loader" /> {t('tweetHub.report.sending')}</div>}
              {!reportBusy && REPORT_REASONS.map((reason) => (
                <button type="button" className="tweet-report-reason" key={reason} onClick={() => void submitReport(reason)}>
                  <Flag size={14} /> {t(`tweetHub.report.${reason.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

{statsTarget && (statsData || statsLoading) && (
                <AnalyticsModal stats={statsData} loading={statsLoading && !statsData} onClose={() => setStatsTarget(null)} />
              )}
    </div>
  );
}