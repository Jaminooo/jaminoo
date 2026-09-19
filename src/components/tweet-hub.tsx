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
  Flag,
  Globe,
  Hash,
  Heart,
  ImagePlus,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Search,
  Send,
  ShieldAlert,
  Smile,
  Sparkles,
  Trash2,
  TrendingUp,
  User as UserIcon,
  UsersRound,
  VolumeX,
  X,
} from 'lucide-react';
import { api } from '@/lib/client-api';
import { uploadWithProgress } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { useTranslations } from '@/providers/use-translations';

type TweetView = 'home' | 'explore' | 'following' | 'bookmarks' | 'notifications' | 'profile' | 'search';
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
}

interface TweetMedia {
  id: string;
  url: string;
  mime: string;
}

interface Tweet {
  id: number;
  text: string;
  media: TweetMedia[];
  replyToId: number | null;
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
}

interface TweetProfile {
  user: TweetAuthor & { joinedAt: string };
  stats: { tweets: number; replies: number; media: number; likes: number; following: number; followers: number; likedCount: number };
  following: boolean;
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

function TweetOptionsMenu({ tweet, isOwner, onCopy, onEdit, onDelete, onMute, onBlock, onReport }: {
  tweet: Tweet;
  isOwner: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
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
          {isOwner ? (
            <>
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); onEdit(); }}><Pencil size={14} />{t('tweetHub.action.editTweet')}</button>
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
}) {
  const me = useAppStore((state) => state.me);
  const isOwner = me?.id === tweet.author.id;
  const t = useTranslations();
  const timeAgo = useTimeAgo();
  return (
    <article className="tweet-card">
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
            />
          </div>
          <button type="button" className="tweet-text-btn" onClick={onOpen}>
            {tweet.text && <p className="tweet-text">{renderText(tweet.text, onTag, onMention)}</p>}
          </button>
          {tweet.quoted && (
            <QuotedCard tweet={tweet.quoted} onOpen={onOpen} onAuthor={onAuthor} onTag={onTag} onMention={onMention} />
          )}
          <TweetMediaGrid tweet={tweet} onOpen={onMedia ?? (() => {})} />
          <TweetActions tweet={tweet} onLike={onLike} onRetweet={onRetweet} onQuote={onQuote} onBookmark={onBookmark} onReply={onReply} onShare={onShare} />
        </div>
      </div>
    </article>
  );
}

const autofocusClass = 'tweet-composer-textarea';

function Composer({
  onPosted,
  replyToId,
  quote,
  editTweet,
  onCancel,
  placeholder,
  compact = false,
  autoFocus = false,
}: {
  onPosted: (tweet: Tweet) => void;
  replyToId?: number;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlsRef = useRef<string[]>([]);
  const remaining = MAX_TEXT - text.length;
  const isReply = !!replyToId;

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
      api<{ users: SugUser[] }>(`/api/users/search?q=${encodeURIComponent(match[1])}`)
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

  const canPost = !busy && (text.trim().length > 0 || files.length > 0 || mediaIds.length > 0 || !!quote);

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
      };
      if (replyToId) payload.replyToId = replyToId;
      if (quote && !editTweet) payload.quotedTweetId = quote.id;

      if (editTweet) {
        const data = await api<{ tweet: Tweet }>(`/api/tweets/${editTweet.id}`, { method: 'PATCH', body: JSON.stringify({ text: text.trim() }) });
        onPosted(data.tweet);
        toast(t('tweetHub.toast.tweetUpdated'), 'ok');
      } else {
        const target = isReply ? `/api/tweets/${replyToId}/replies` : '/api/tweets';
        const data = await api<{ tweet: Tweet }>(target, { method: 'POST', body: JSON.stringify(payload) });
        onPosted(data.tweet);
        toast(isReply ? t('tweetHub.toast.replyPosted') : t('tweetHub.toast.live'), 'ok');
      }
      setText('');
      setFiles((current) => { current.forEach((f) => URL.revokeObjectURL(f.url)); return []; });
      setMediaIds([]);
      setMentions([]);
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
        {editTweet && <div className="tweet-composer-note"><Pencil size={13} /> {t('tweetHub.editingNote')}</div>}
        <textarea
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
                <span><b>{u.name || `@${u.username}`}</b><small>@{u.username}</small></span>
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
  const [busy, setBusy] = useState(false);
  const t = useTranslations();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api('/api/tweets/profile', { method: 'PATCH', body: JSON.stringify({ name, bio, website, location }) });
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
          <div className="tweet-edit-actions">
            <button type="submit" className="btn btn-tweet" disabled={busy}>{busy ? t('tweetHub.profile.saving') : t('tweetHub.profile.saveProfile')}</button>
          </div>
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

function NotificationsView({ onUnread, onOpenTweet, onOpenProfile }: {
  onUnread: (count: number) => void;
  onOpenTweet: (id: number) => void;
  onOpenProfile: (username: string, id?: number) => void;
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
    api<{ events: TweetEvent[]; unread: number }>('/api/tweets/notifications')
      .then((data) => { setEvents(data.events); setUnread(data.unread); onUnread(data.unread); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [onUnread]);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    try {
      await api('/api/tweets/notifications', { method: 'PATCH' });
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

export function TweetHub() {
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
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
      if (view === 'profile' && profileName) {
        params.set('profile', profileName);
        params.set('tab', profileTab);
      }
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
  }, [profileName, profileTab, searchQuery, t, view]);

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
    api<{ unread: number }>('/api/tweets/notifications').then((data) => setNotifBadge(data.unread)).catch(() => {});
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get('tweetView') as TweetView | null;
      const username = params.get('tweetUser');
      const statusId = Number(params.get('id') ?? 0);
      if (statusId > 0) {
        api<{ tweet: Tweet; replyParent: Tweet | null }>(`/api/tweets/${statusId}`)
          .then((data) => { void openTweetFromDetail(data.tweet); })
          .catch(() => toast(t('tweetHub.toast.tweetGone'), 'error'));
      }
      if (username) { setView('profile'); setProfileName(username); }
      else if (requested && (FEED_VIEWS.includes(requested) || requested === 'notifications')) setView(requested);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSidebar]);

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
    api<{ user: TweetProfile['user']; stats: TweetProfile['stats']; following: boolean; blocked: boolean; blockedBy: boolean; muted: boolean; isMe: boolean }>(`/api/tweets/profile?username=${encodeURIComponent(name)}`)
      .then((data) => setProfile({ user: data.user, stats: data.stats, following: data.following, blocked: data.blocked, blockedBy: data.blockedBy, muted: data.muted, isMe: data.isMe }))
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
    window.history.replaceState({}, '', `/?hub=tweet&tweetView=status&id=${tweet.id}`);
    void openTweetById(tweet.id);
  };

  const closeTweet = () => {
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
      setProfile({ ...prevProfile, following: next, stats: { ...prevProfile.stats, followers: Math.max(0, prevProfile.stats.followers + (next ? 1 : -1)) } });
    }
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, following: !user.following } : user));
    try {
      const data = await api<{ following: boolean }>(`/api/tweets/${userId}/follow`, { method: 'POST' });
      if (prevProfile && prevProfile.user.id === userId) {
        setProfile((current) => current
          ? { ...current, following: data.following, stats: { ...current.stats, followers: Math.max(0, prevProfile.stats.followers + (data.following ? 1 : 0)) } }
          : current);
      }
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, following: data.following } : user));
      setSuggestions((current) => data.following ? current.filter((user) => user.id !== userId) : current);
      toast(data.following ? t('tweetHub.toast.following') : t('tweetHub.toast.unfollowed'), 'ok');
    } catch (error) {
      if (prevProfile && prevProfile.user.id === userId) setProfile(prevProfile);
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, following: !user.following } : user));
      toast(error instanceof Error ? error.message : t('tweetHub.toast.followFailed'), 'error');
    }
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
    if (view === 'notifications') return t('tweetHub.nav.notifications');
    if (view === 'search') return searchQuery ? t('tweetHub.pageTitle.results', { query: searchQuery }) : t('tweetHub.search');
    if (view === 'profile') return profileName ? `@${profileName}` : t('tweetHub.pageTitle.profile');
    return t('tweetHub.pageTitle.hub');
  }, [profileName, searchQuery, t, view]);

  const nav: { id: TweetView; label: string; icon: typeof Bird; badge?: number }[] = [
    { id: 'home', label: t('tweetHub.nav.home'), icon: Bird },
    { id: 'explore', label: t('tweetHub.nav.explore'), icon: Search },
    { id: 'following', label: t('tweetHub.nav.following'), icon: UsersRound },
    { id: 'notifications', label: t('tweetHub.nav.notifications'), icon: Bell, badge: notifBadge },
    { id: 'bookmarks', label: t('tweetHub.nav.bookmarks'), icon: Bookmark },
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
            <form className="tweet-search" onSubmit={runSearch}>
              <Search size={17} />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t('tweetHub.searchPlaceholder')} maxLength={120} />
              <button type="submit" className="btn btn-tweet pill-sm">{t('tweetHub.search')}</button>
            </form>
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
                      <button type="button" className={`btn ${profile.following ? 'btn-ghost' : 'btn-tweet'} pill-sm`} onClick={() => void toggleFollow(profile.user.id)}>
                        {profile.following ? t('tweetHub.people.followingBtn') : <><BadgeCheck size={14} /> {t('tweetHub.people.follow')}</>}
                      </button>
                    </>
                  )}
                </div>
                <div className="tweet-profile-name">
                  <h2>{profile.user.name || `@${profile.user.username}`}</h2>
                  <span className="tweet-handle-large">@{profile.user.username}</span>
                  {profile.user.bio && <p>{profile.user.bio}</p>}
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
            <NotificationsView onUnread={setNotifBadge} onOpenTweet={openTweetById} onOpenProfile={openProfile} />
          ) : (
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
              {loading && feed.length === 0 && (
                <div className="tweet-loading">
                  {[1, 2, 3, 4].map((item) => <div className="tweet-skeleton" key={item} />)}
                </div>
              )}
              {!loading && feedError && feed.length === 0 && (
                <div className="tweet-empty large">
                  <ShieldAlert size={26} />
                  <b>{t('tweetHub.toast.feedFailed')}</b>
                  <span>{t('tweetHub.feed.connectionHint')}</span>
                  <button type="button" className="btn btn-tweet pill-sm" onClick={reload}><Sparkles size={13} /> {t('tweetHub.retry')}</button>
                </div>
              )}
              {!loading && !feedError && feed.length === 0 && (
                <div className="tweet-empty large">
                  <Bird size={26} />
                  <b>
                    {view === 'bookmarks' ? t('tweetHub.feed.noBookmarks') : view === 'following' ? t('tweetHub.feed.followToFill') : view === 'search' ? t('tweetHub.search.noResults') : view === 'profile' ? (profile && profile.blockedBy ? t('tweetHub.feed.blockedProfile') : t('tweetHub.feed.noTweets')) : t('tweetHub.feed.quiet')}
                  </b>
                  <span>
                    {view === 'bookmarks' ? t('tweetHub.feed.noBookmarksHint') : view === 'following' ? t('tweetHub.feed.followToFillHint') : t('tweetHub.feed.beFirst')}
                  </span>
                  {view === 'home' && <span className="tweet-empty-badge"><Sparkles size={13} /> {t('tweetHub.feed.composeFirst')}</span>}
                </div>
              )}
              {feed.map((tweet) => (
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
                />
              ))}
              <div ref={sentinelRef} className="tweet-feed-sentinel">
                {loading && feed.length > 0 && <span className="admin-loader" />}
                {!hasMore && feed.length > 0 && <span>{t('tweetHub.feed.allCaughtUp')}</span>}
              </div>
            </section>
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
          <p className="tweet-rail-note">{t('tweetHub.rail.note')}</p>
        </aside>
      </div>

      <nav className="hub-mobile-nav tweet-mobile-nav">
        <button type="button" onClick={() => setProduct('home')} aria-label={t('tweetHub.nav.hubs')}><Bird size={17} /><span>{t('tweetHub.nav.hubs')}</span></button>
        {nav.slice(0, 4).map(({ id, label, icon: Icon, badge }) => (
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
                  />
                </div>
                {activeTweet.text && <p className="tweet-modal-text">{renderText(activeTweet.text, searchTag, openProfile)}</p>}
                <TweetMediaGrid tweet={activeTweet} onOpen={(index) => setLightbox({ media: activeTweet.media, index })} />
                {activeTweet.quoted && (
                  <QuotedCard tweet={activeTweet.quoted} onOpen={() => openTweet(activeTweet.quoted!)} onAuthor={() => openProfile(activeTweet.quoted!.author.username, activeTweet.quoted!.author.id)} onTag={searchTag} onMention={openProfile} />
                )}
                <TweetActions tweet={activeTweet} onLike={() => void toggleLike(activeTweet)} onRetweet={() => void toggleRetweet(activeTweet)} onQuote={() => { closeTweet(); openQuote(activeTweet); }} onBookmark={() => void toggleBookmark(activeTweet)} onReply={() => {}} onShare={() => void copyLink(activeTweet)} />
                <div className="tweet-modal-meta">
                  <span>{new Date(activeTweet.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>
              {!editTarget && (
                <Composer compact autoFocus replyToId={activeTweet.id} placeholder={t('tweetHub.status.replyPlaceholder')} onPosted={onReplyPosted} />
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
    </div>
  );
}