'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  Camera,
  Clapperboard,
  Film,
  Flag,
  Heart,
  House,
  Image as ImageIcon,
  Link2,
  ListVideo,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Scissors,
  Send,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Tv2,
  UploadCloud,
  UserPlus,
  UserRoundCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { api, uploadWithProgress } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { useTranslations } from '@/providers/use-translations';
import { CreatorApplyModal } from '@/components/creator-apply-modal';
import { CreatorProfileModal } from '@/components/creator-profile-modal';
import { VideoEditorModal, VideoEditorWorkspace } from '@/components/video-editor-modal';
import { CreatorCollabStudio } from '@/components/creator-collab-studio';
import { CreatorInsights } from '@/components/creator-insights';
import { VinylPlayer } from '@/components/vinyl-player';
import { connectLive, onLive } from '@/lib/live';

type VideoView = 'feed' | 'following' | 'shorts' | 'long' | 'watch' | 'watchlist' | 'creators' | 'studio' | 'playlists' | 'edit' | 'editor';
type FeedKind = 'ALL' | 'SHORT' | 'LONG';
type MediaType = 'TEXT' | 'IMAGE' | 'VIDEO';

interface VideoAuthor {
  id: number;
  username: string;
  avatarId: number;
  avatarPhoto: string | null;
}

export interface VideoPost {
  id: number;
  title: string;
  description: string;
  kind: 'POST' | 'SHORT' | 'LONG';
  mediaType: MediaType;
  assetId: string | null;
  assetUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  thumbnailAssetId: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
  createdAt: string;
  author: VideoAuthor;
  likes: number;
  saves: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  workflowStatus?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  publishAt?: string | null;
}

interface VideoComment {
  id: number;
  text: string;
  createdAt: string;
  user: VideoAuthor;
}

interface VideoPlaylistSummary {
  id: number;
  name: string;
  description: string;
  count: number;
  createdAt: string;
}

interface VideoPlaylistDetail extends VideoPlaylistSummary {
  items: { id: number; postId: number; note: string; post: VideoPost | null }[];
}

interface DiscoverCreator {
  id: number;
  username: string;
  avatarId: number;
  avatarPhoto: string | null;
  channelName: string;
  handle: string;
  category: string;
  bio: string;
  followers: number;
  postCount: number;
  following: boolean;
  latestPosts: VideoPost[];
}

const NAV: { id: VideoView; key: string; icon: typeof Film }[] = [
  { id: 'feed', key: 'feed', icon: Film }, { id: 'following', key: 'following', icon: UsersRound }, { id: 'shorts', key: 'shorts', icon: Play }, { id: 'long', key: 'long', icon: Tv2 }, { id: 'watch', key: 'watch', icon: Link2 }, { id: 'watchlist', key: 'watchlist', icon: Bookmark }, { id: 'creators', key: 'creators', icon: Camera }, { id: 'studio', key: 'studio', icon: LayoutDashboard }, { id: 'playlists', key: 'playlists', icon: ListVideo }, { id: 'edit', key: 'edit', icon: Pencil }, { id: 'editor', key: 'editor', icon: Scissors },
];

function durationLabel(seconds: number) {
  if (!seconds) return '';
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = Math.floor(safeSeconds % 60);
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function timeAgo(value: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return t('video.common.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('video.common.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('video.common.hoursAgo', { n: hours });
  return t('video.common.daysAgo', { n: Math.floor(hours / 24) });
}

<<<<<<< HEAD
function VideoMedia({ post }: { post: VideoPost }) {
  const t = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(post.kind !== 'SHORT');
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    if (post.mediaType !== 'VIDEO' || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        video.pause();
        return;
      }
      video.muted = post.kind === 'SHORT' ? false : muted;
      video.play().then(() => setAudioBlocked(false)).catch(() => {
        if (post.kind === 'SHORT') {
          video.muted = true;
          setMuted(true);
          setAudioBlocked(true);
        }
        video.play().catch(() => {});
      });
    }, { threshold: 0.55 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [muted, post.id, post.kind, post.mediaType]);

=======
function VideoMedia({ post, feature = false, compact = false, startAt, onTimeUpdate, onDoubleTap }: { post: VideoPost; feature?: boolean; compact?: boolean; startAt?: number; onTimeUpdate?: (seconds: number) => void; onDoubleTap?: () => void }) {
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
  if (post.mediaType === 'IMAGE' && (post.assetUrl || post.externalUrl)) {
    return <div className="video-card-media video-card-image"><Image src={post.assetUrl || post.externalUrl || ''} alt={post.title || t('video.common.videoPost')} fill unoptimized loading="lazy" /></div>;
  }
  if (post.mediaType === 'VIDEO' && (post.assetUrl || post.externalUrl)) {
<<<<<<< HEAD
    return <div className="video-card-media video-card-video-wrap"><video ref={videoRef} src={post.assetUrl || post.externalUrl || ''} poster={post.thumbnailUrl || undefined} muted={muted} playsInline loop preload="metadata" controls={post.kind === 'LONG'}><track kind="subtitles" src={post.subtitlesUrl || undefined} srcLang="en" label={t('video.common.subtitleLang')} default={!!post.subtitlesUrl} /></video>{post.kind === 'LONG' && <span className="video-play-fab" aria-hidden="true"><Play size={20} /></span>}{post.kind === 'LONG' && post.durationSec > 0 && <span className="video-duration-badge">{durationLabel(post.durationSec)}</span>}{post.kind === 'LONG' && <span className="video-progress-bar"><span /></span>}{post.kind === 'SHORT' && <><button type="button" className="video-sound-button" onClick={(event) => { event.stopPropagation(); const next = !muted; setMuted(next); setAudioBlocked(false); if (videoRef.current) { videoRef.current.muted = next; videoRef.current.play().catch(() => {}); } }} title={muted ? t('video.common.soundOn') : t('video.common.soundOff')}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>{audioBlocked && muted && <span className="video-sound-hint">{t('video.common.tapForSound')}</span>}</>}</div>;
=======
    // Shorts inside the feed render chrome-less: the card supplies the UI,
    // the player sizes itself to the video's real aspect ratio.
    const shortsFeed = post.kind === 'SHORT' && !feature && compact;
    return (
      <div className="video-card-media video-card-video-wrap">
        <VinylPlayer
          fill={!shortsFeed}
          bare={shortsFeed}
          variant={feature ? 'feature' : 'card'}
          src={post.assetUrl || post.externalUrl || ''}
          poster={post.thumbnailUrl}
          title={post.title || 'Untitled post'}
          badge={[post.kind, post.durationSec > 0 ? durationLabel(post.durationSec) : null].filter(Boolean).join(' · ')}
          subtitlesUrl={post.subtitlesUrl}
          autoplayInView
          startUnmuted={post.kind === 'SHORT'}
          loop={post.kind !== 'LONG'}
          soundToggle={post.kind === 'SHORT'}
          dynamicAspect={shortsFeed}
          defaultAspect={shortsFeed ? '9 / 16' : '16 / 9'}
          startAt={feature ? startAt : undefined}
          rememberPosition={post.kind === 'LONG'}
          onDoubleTap={onDoubleTap}
          onTimeUpdate={onTimeUpdate}
        />
      </div>
    );
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
  }
  return <div className="video-card-media video-card-text"><Sparkles size={25} /><p>{post.description || post.title || t('video.common.textCaption')}</p></div>;
}

<<<<<<< HEAD
function VideoCard({ post, compact = false, onOpen, onOpenPost, onOpenCreator, onLike, onSave, onComment, onShare, onReport, onSaveToPlaylist }: { post: VideoPost; compact?: boolean; onOpen?: () => void; onOpenPost?: () => void; onOpenCreator?: () => void; onLike: () => void; onSave: () => void; onComment: () => void; onShare: () => void; onReport?: () => void; onSaveToPlaylist?: () => void }) {
  const t = useTranslations();
=======
function VideoCard({ post, compact = false, feature = false, startAt, onOpen, onOpenPost, onOpenCreator, onLike, onSave, onComment, onShare, onReport, onSaveToPlaylist }: { post: VideoPost; compact?: boolean; feature?: boolean; startAt?: number; onOpen?: () => void; onOpenPost?: () => void; onOpenCreator?: () => void; onLike: () => void; onSave: () => void; onComment: () => void; onShare: (atSeconds?: number) => void; onReport?: () => void; onSaveToPlaylist?: () => void }) {
  const timeRef = useRef(0);
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
  const openPost = onOpenPost ?? onOpen ?? (() => {});
  const openCreator = onOpenCreator ?? onOpen ?? openPost;
  return (
    <article className={`video-post-card video-post-${post.kind.toLowerCase()} ${compact ? 'compact' : ''}`}>
      <div className="video-post-topline">
        <button type="button" className="video-post-author" onClick={openCreator}>
          <JaminoAvatar avatarId={post.author.avatarId} size={34} photo={post.author.avatarPhoto} name={post.author.username} />
          <span><b>@{post.author.username}</b><small>{timeAgo(post.createdAt, t)}</small></span>
        </button>
        <div className="video-post-type"><span>{post.kind === 'SHORT' ? 'SHORT' : post.kind === 'LONG' ? 'LONG' : 'POST'}</span>{post.durationSec > 0 && <small>{durationLabel(post.durationSec)}</small>}<MoreHorizontal size={16} /></div>
      </div>
      <button type="button" className="video-post-heading" onClick={openPost}>
        <strong>{post.title || t('video.common.untitledPost')}</strong>
        {post.description && <span>{post.description}</span>}
      </button>
      <VideoMedia post={post} feature={feature} compact={compact} startAt={startAt} onTimeUpdate={feature ? (seconds) => { timeRef.current = seconds; } : undefined} onDoubleTap={post.kind === 'SHORT' || feature ? onLike : undefined} />
      <div className="video-post-actions">
<<<<<<< HEAD
        <button type="button" className={post.liked ? 'active' : ''} onClick={onLike} title={t('video.common.like')}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button>
        <button type="button" onClick={onComment} title={t('video.common.comments')}><MessageCircle size={17} /><span>{post.comments}</span></button>
        <button type="button" className={post.saved ? 'active' : ''} onClick={onSave} title={t('video.common.save')}><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saves}</span></button>
        <button type="button" onClick={onShare} title={t('video.common.share')}><Share2 size={17} /></button>
        {onSaveToPlaylist && <button type="button" onClick={onSaveToPlaylist} title={t('video.common.saveToPlaylist')}><ListVideo size={17} /></button>}
        {onReport && <button type="button" onClick={onReport} title={t('video.common.report')}><Flag size={16} /></button>}
=======
        <button type="button" className={post.liked ? 'active' : ''} onClick={onLike} title="Like"><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button>
        <button type="button" onClick={onComment} title="Comments"><MessageCircle size={17} /><span>{post.comments}</span></button>
        <button type="button" className={post.saved ? 'active' : ''} onClick={onSave} title="Save"><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saves}</span></button>
        <button type="button" onClick={() => onShare(feature ? Math.floor(timeRef.current) : undefined)} title="Share"><Share2 size={17} /></button>
        {onSaveToPlaylist && <button type="button" onClick={onSaveToPlaylist} title="Save to playlist"><ListVideo size={17} /></button>}
        {onReport && <button type="button" onClick={onReport} title="Report"><Flag size={16} /></button>}
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
      </div>
    </article>
  );
}

function CreatePostModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (post: VideoPost) => void }) {
  const t = useTranslations();
  const [kind, setKind] = useState<'POST' | 'SHORT' | 'LONG'>('POST');
  const [mediaType, setMediaType] = useState<MediaType>('TEXT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [subtitlesUrl, setSubtitlesUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [workflowStatus, setWorkflowStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED');
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind('POST');
    setMediaType('TEXT');
    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    setSubtitlesUrl('');
    setExternalUrl('');
    setDurationSec('');
    setFile(null);
    setThumbnailFile(null);
    setUploadProgress(0);
    setWorkflowStatus('PUBLISHED');
    setEditorOpen(false);
  }, [open]);

  const inspectVideo = async (nextFile: File) => {
    const objectUrl = URL.createObjectURL(nextFile);
    const element = document.createElement('video');
    element.preload = 'metadata';
    element.muted = true;
    element.src = objectUrl;
    try {
      await new Promise<void>((resolve, reject) => {
        element.onloadedmetadata = () => resolve();
        element.onerror = () => reject(new Error(t('video.create.inspectError')));
      });
      if (!durationSec && Number.isFinite(element.duration)) setDurationSec(String(Math.round(element.duration)));
      const frameTime = Math.min(.2, Math.max(0, element.duration - .05));
      await new Promise<void>((resolve) => {
        element.onseeked = () => resolve();
        element.currentTime = frameTime;
      });
      const canvas = document.createElement('canvas');
      canvas.width = element.videoWidth || 640;
      canvas.height = element.videoHeight || 360;
      canvas.getContext('2d')?.drawImage(element, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .86));
      if (blob) setThumbnailFile(new File([blob], `${nextFile.name.replace(/\.[^.]+$/, '')}-thumbnail.jpg`, { type: 'image/jpeg' }));
    } catch {
      setThumbnailFile(null);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let assetId = '';
      if (file) {
        const form = new FormData();
        form.append('file', file);
        const uploaded = await uploadWithProgress<{ asset: { id: string } }>('/api/video/assets', form, (percent) => setUploadProgress(Math.round(percent * (thumbnailFile ? .7 : 1))));
        assetId = uploaded.asset.id;
      }
      let thumbnailAssetId = '';
      if (thumbnailFile) {
        const form = new FormData();
        form.append('file', thumbnailFile);
        const uploaded = await uploadWithProgress<{ asset: { id: string } }>('/api/video/assets', form, (percent) => setUploadProgress(70 + Math.round(percent * .3)));
        thumbnailAssetId = uploaded.asset.id;
      }
      const data = await api<{ post: VideoPost }>('/api/video/posts', {
        method: 'POST',
        body: JSON.stringify({ kind, mediaType, title, description, thumbnailUrl, subtitlesUrl, externalUrl, durationSec: Number(durationSec || 0), assetId, thumbnailAssetId, workflowStatus }),
      });
      toast(t('video.create.toastPublished'), 'ok');
      onCreated(data.post);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.create.toastError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const needsVideo = kind !== 'POST';
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-create-modal" role="dialog" aria-modal="true" aria-labelledby="video-create-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">{t('video.create.kicker')}</div><h2 id="video-create-title">{t('video.create.title')}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label={t('video.common.close')}><X size={18} /></button></header>
        <form className="video-create-form" onSubmit={submit}>
          <div className="video-create-tabs"><button type="button" className={kind === 'POST' ? 'active' : ''} onClick={() => { setKind('POST'); setMediaType('TEXT'); setFile(null); }}>{t('video.create.tabPost')}</button><button type="button" className={kind === 'SHORT' ? 'active' : ''} onClick={() => { setKind('SHORT'); setMediaType('VIDEO'); setFile(null); }}>{t('video.create.tabShort')}</button><button type="button" className={kind === 'LONG' ? 'active' : ''} onClick={() => { setKind('LONG'); setMediaType('VIDEO'); setFile(null); }}>{t('video.create.tabLong')}</button></div>
          {kind === 'POST' && <label><span>{t('video.create.format')}</span><select value={mediaType} onChange={(event) => { setMediaType(event.target.value as MediaType); setFile(null); }}><option value="TEXT">{t('video.create.textPost')}</option><option value="IMAGE">{t('video.create.photo')}</option><option value="VIDEO">{t('video.create.video')}</option></select></label>}
          <label><span>{t('video.create.titleLabel')}</span><input required={!description} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder={needsVideo ? t('video.create.titlePhVideo') : t('video.create.titlePhPost')} /></label>
          <label><span>{t('video.create.descriptionLabel')}</span><textarea required={!title} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={4} placeholder={t('video.create.descPh')} /></label>
          {mediaType !== 'TEXT' && <div className="video-upload-box"><UploadCloud size={22} /><div><b>{file ? file.name : t('video.create.chooseMedia')}</b><span>{mediaType === 'IMAGE' ? t('video.create.imageHint') : t('video.create.videoHint')}</span></div>{mediaType === 'VIDEO' && file && <button type="button" className="btn btn-ghost pill-sm video-edit-trigger" onClick={() => setEditorOpen(true)}><Scissors size={14} /> {t('video.create.editVideo')}</button>}<label className="btn btn-ghost pill-sm"><ImageIcon size={14} /> {t('video.create.browse')}<input type="file" hidden accept={mediaType === 'IMAGE' ? 'image/png,image/jpeg,image/webp' : 'video/mp4,video/webm,video/quicktime'} onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; setFile(nextFile); setThumbnailFile(null); if (nextFile?.type.startsWith('video/')) void inspectVideo(nextFile); }} /></label></div>}
          {mediaType !== 'TEXT' && <label><span>{t('video.create.pasteUrl')}</span><input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…/video.mp4" /></label>}
          {needsVideo && <div className="video-create-grid"><label><span>{t('video.create.durationLabel')}</span><input type="number" min={0} max={86400} value={durationSec} onChange={(event) => setDurationSec(event.target.value)} placeholder={t('video.create.durationPh')} /></label><label><span>{t('video.create.thumbnailLabel')}</span><input type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder={thumbnailFile ? t('video.create.thumbnailAuto') : t('video.create.thumbnailPh')} /></label><label><span>{t('video.create.subtitlesLabel')}</span><input type="url" value={subtitlesUrl} onChange={(event) => setSubtitlesUrl(event.target.value)} placeholder={t('video.create.subtitlesPh')} /></label></div>}
          {saving && (file || thumbnailFile) && <div className="creator-upload-progress"><span style={{ width: `${uploadProgress}%` }} /><small>{t('video.create.uploaded', { n: uploadProgress })}</small></div>}
          <footer className="video-modal-actions"><span><Sparkles size={13} /> {workflowStatus === 'DRAFT' ? t('video.create.draftHint') : t('video.create.publishHintFooter')}</span><div className="video-modal-actions-buttons"><button type="submit" className="btn btn-ghost" disabled={saving} onClick={() => setWorkflowStatus('DRAFT')}>{t('video.create.saveDraft')}</button><button type="submit" className="btn btn-violet" disabled={saving} onClick={() => setWorkflowStatus('PUBLISHED')}>{saving ? t('video.create.publishing', { n: uploadProgress }) : <><Send size={14} /> {t('video.create.publish')}</>}</button></div></footer>
        </form>
        <VideoEditorModal file={file} open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={(editedFile) => { setFile(editedFile); setThumbnailFile(null); setEditorOpen(false); void inspectVideo(editedFile); toast(t('video.create.toastEdited'), 'ok'); }} />
      </section>
    </div>
  );
}

function CommentsModal({ post, open, onClose, onAdded }: { post: VideoPost | null; open: boolean; onClose: () => void; onAdded: (comment: VideoComment) => void }) {
  const t = useTranslations();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !post) return;
    setLoading(true);
    api<{ comments: VideoComment[] }>(`/api/video/posts/${post.id}/comments`).then((data) => setComments(data.comments)).catch(() => setComments([])).finally(() => setLoading(false));
  }, [open, post]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !text.trim()) return;
    setSending(true);
    try {
      const data = await api<{ comment: VideoComment }>(`/api/video/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
      setComments((items) => [...items, data.comment]);
      onAdded(data.comment);
      setText('');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.comments.toastError'), 'error');
    } finally {
      setSending(false);
    }
  };

  if (!open || !post) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-comments-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">{t('video.comments.kicker')}</div><h2>{post.title || t('video.comments.title')}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label={t('video.common.close')}><X size={18} /></button></header>
        <div className="video-comments-list">{loading && <div className="video-modal-loading"><span className="admin-loader" /> {t('video.comments.loading')}</div>}{!loading && comments.length === 0 && <div className="video-modal-empty"><MessageCircle size={20} /><span>{t('video.comments.empty')}</span></div>}{comments.map((comment) => <div className="video-comment-row" key={comment.id}><JaminoAvatar avatarId={comment.user.avatarId} size={32} photo={comment.user.avatarPhoto} name={comment.user.username} /><div><b>@{comment.user.username}</b><p>{comment.text}</p><small>{timeAgo(comment.createdAt, t)}</small></div></div>)}</div>
        <form className="video-comment-form" onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder={t('video.comments.placeholder')} /><button type="submit" className="btn-icon violet" disabled={sending || !text.trim()} aria-label={t('video.comments.send')}><Send size={17} /></button></form>
      </section>
    </div>
  );
}

function SaveToPlaylistModal({ post, open, onClose, onSaved }: { post: VideoPost | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations();
  const [playlists, setPlaylists] = useState<VideoPlaylistSummary[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<{ playlists: VideoPlaylistSummary[] }>('/api/video/playlists').then((data) => setPlaylists(data.playlists)).catch(() => setPlaylists([])).finally(() => setLoading(false));
  }, [open]);

  const addTo = async (playlistId: number) => {
    if (!post || busy) return;
    setBusy(true);
    try {
      await api('/api/video/playlists', { method: 'PATCH', body: JSON.stringify({ playlistId, action: 'add', postId: post.id }) });
      toast(t('video.playlist.toastSaved'), 'ok');
      onSaved();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.playlist.toastSaveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !name.trim() || busy) return;
    setBusy(true);
    try {
      await api<{ playlist: { id: number } }>('/api/video/playlists', { method: 'POST', body: JSON.stringify({ name, postId: post.id }) });
      setName('');
      toast(t('video.playlist.toastCreated'), 'ok');
      onSaved();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.playlist.toastCreateError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open || !post) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-comments-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">{t('video.playlist.kicker')}</div><h2>{post.title || t('video.common.untitledPost')}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label={t('video.common.close')}><X size={18} /></button></header>
        <div className="video-playlist-picker">
          {loading && <div className="video-modal-loading"><span className="admin-loader" /> {t('video.playlist.loading')}</div>}
          {!loading && playlists.length === 0 && <div className="video-modal-empty"><ListVideo size={20} /><span>{t('video.playlist.empty')}</span></div>}
          {playlists.map((playlist) => (
            <button type="button" key={playlist.id} className="video-playlist-option" disabled={busy} onClick={() => void addTo(playlist.id)}>
              <ListVideo size={16} />
              <span><b>{playlist.name}</b><small>{playlist.count === 1 ? t('video.common.videoCountOne', { n: playlist.count }) : t('video.common.videoCount', { n: playlist.count })}</small></span>
              <Plus size={15} />
            </button>
          ))}
        </div>
        <form className="video-comment-form" onSubmit={createAndAdd}>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={t('video.playlist.newName')} />
          <button type="submit" className="btn-icon violet" disabled={busy || !name.trim()} aria-label={t('video.playlist.createAria')}><Plus size={17} /></button>
        </form>
      </section>
    </div>
  );
}

function EditPostModal({ post, open, onClose, onSaved }: { post: VideoPost | null; open: boolean; onClose: () => void; onSaved: (post: VideoPost) => void }) {
  const t = useTranslations();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [subtitlesUrl, setSubtitlesUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !post) return;
    setTitle(post.title);
    setDescription(post.description);
    setThumbnailUrl(post.thumbnailUrl ?? '');
    setSubtitlesUrl(post.subtitlesUrl ?? '');
  }, [open, post]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!post) return;
    setSaving(true);
    try {
      const data = await api<{ post: VideoPost }>(`/api/video/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ title, description, thumbnailUrl, subtitlesUrl }) });
      toast(t('video.edit.toastUpdated'), 'ok');
      onSaved(data.post);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.edit.updateError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !post) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-create-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">{t('video.edit.kickerModal')}</div><h2>{post.title || t('video.common.untitledPost')}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label={t('video.common.close')}><X size={18} /></button></header>
        <form className="video-create-form" onSubmit={submit}>
          <label><span>{t('video.create.titleLabel')}</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder={t('video.create.titlePhEdit')} /></label>
          <label><span>{t('video.create.descriptionLabel')}</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={4} placeholder={t('video.create.descPh')} /></label>
          <div className="video-create-grid">
            <label><span>{t('video.create.thumbnailLabel')}</span><input type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder={t('video.create.thumbnailPh')} /></label>
            <label><span>{t('video.create.subtitlesLabel')}</span><input type="url" value={subtitlesUrl} onChange={(event) => setSubtitlesUrl(event.target.value)} placeholder={t('video.create.subtitlesPh')} /></label>
          </div>
          <footer className="video-modal-actions"><span><Sparkles size={13} /> {t('video.edit.changesNote')}</span><button type="submit" className="btn btn-violet" disabled={saving}>{saving ? t('video.edit.saving') : <><Send size={14} /> {t('video.edit.saveChanges')}</>}</button></footer>
        </form>
      </section>
    </div>
  );
}

function PlaylistDetailModal({ playlistId, open, onClose, onChanged, onDeleted, onPlayPost }: { playlistId: number | null; open: boolean; onClose: () => void; onChanged: () => void; onDeleted: () => void; onPlayPost: (post: VideoPost) => void }) {
  const t = useTranslations();
  const [detail, setDetail] = useState<VideoPlaylistDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(() => {
    if (!playlistId) return;
    setLoading(true);
    api<{ playlist: VideoPlaylistDetail }>(`/api/video/playlists?playlistId=${playlistId}`)
      .then((data) => { setDetail(data.playlist); setName(data.playlist.name); setDescription(data.playlist.description); })
      .catch((error) => toast(error instanceof Error ? error.message : t('video.playlist.toastLoadError'), 'error'))
      .finally(() => setLoading(false));
  }, [playlistId, t]);

  useEffect(() => {
    if (open) load();
    else setDetail(null);
  }, [open, load]);

  const removeItem = async (postId: number) => {
    if (!playlistId) return;
    try {
      await api('/api/video/playlists', { method: 'PATCH', body: JSON.stringify({ playlistId, action: 'remove', postId }) });
      setDetail((current) => current ? { ...current, items: current.items.filter((item) => item.postId !== postId), count: Math.max(0, current.count - 1) } : current);
      onChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.playlist.toastRemoveError'), 'error');
    }
  };

  const saveRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!playlistId || !name.trim()) return;
    try {
      await api('/api/video/playlists', { method: 'PATCH', body: JSON.stringify({ playlistId, action: 'rename', name, description }) });
      setDetail((current) => current ? { ...current, name, description } : current);
      setRenaming(false);
      toast(t('video.playlist.toastUpdated'), 'ok');
      onChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.playlist.toastRenameError'), 'error');
    }
  };

  const deletePlaylist = async () => {
    if (!playlistId) return;
    try {
      await api(`/api/video/playlists?playlistId=${playlistId}`, { method: 'DELETE' });
      toast(t('video.playlist.toastDeleted'), 'ok');
      onDeleted();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.playlist.toastDeleteError'), 'error');
    }
  };

  if (!open || !playlistId) return null;
  const playable = (detail?.items ?? []).filter((item) => item.post);
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-playlist-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head">
          <div>
            <div className="hub-kicker">{t('video.playlist.detailKicker')}</div>
            {renaming ? (
              <form className="video-playlist-rename" onSubmit={saveRename}>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus />
                <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder={t('video.playlist.descPh')} />
                <button type="submit" className="btn btn-violet pill-sm">{t('video.playlist.save')}</button>
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => setRenaming(false)}>{t('video.playlist.cancel')}</button>
              </form>
            ) : <h2>{detail?.name ?? t('video.playlist.titleFallback')} <button type="button" className="btn-icon" onClick={() => setRenaming(true)} title={t('video.playlist.renameTitle')}><Pencil size={14} /></button></h2>}
          </div>
          <div className="video-playlist-head-actions">
            <button type="button" className="btn-icon danger" onClick={() => void deletePlaylist()} title={t('video.playlist.deleteTitle')}><Trash2 size={16} /></button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label={t('video.common.close')}><X size={18} /></button>
          </div>
        </header>
        <div className="video-playlist-items">
          {loading && <div className="video-modal-loading"><span className="admin-loader" /> {t('video.playlist.loadingVideos')}</div>}
          {!loading && detail && detail.items.length === 0 && <div className="video-modal-empty"><ListVideo size={20} /><span>{t('video.playlist.emptyDetail')}</span></div>}
          {!loading && detail && detail.items.map((item) => item.post && (
            <div className="video-playlist-item" key={item.id}>
              <div className="video-playlist-item-media">
                {item.post.thumbnailUrl ? <Image src={item.post.thumbnailUrl} alt="" fill unoptimized /> : item.post.mediaType === 'TEXT' ? <Sparkles size={16} /> : <Play size={16} />}
              </div>
              <button type="button" className="video-playlist-item-body" onClick={() => onPlayPost(item.post!)}>
                <b>{item.post.title || t('video.common.untitledPost')}</b>
                <small>@{item.post.author.username} · {item.post.kind} · {timeAgo(item.post.createdAt, t)}</small>
              </button>
              <button type="button" className="btn-icon danger" onClick={() => void removeItem(item.postId)} title={t('video.playlist.removeTitle')}><X size={14} /></button>
            </div>
          ))}
          {!loading && playable.length > 0 && (
            <button type="button" className="btn btn-violet video-playlist-play-all" onClick={() => onPlayPost(playable[0].post!)}>
              <Play size={14} /> {t('video.playlist.playTop')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function CreatorsView({ onOpenCreator }: { onOpenCreator: (id: number) => void }) {
  const t = useTranslations();
  const [creators, setCreators] = useState<DiscoverCreator[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((q: string) => {
    setLoading(true);
    api<{ creators: DiscoverCreator[] }>(`/api/video/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then((data) => setCreators(data.creators))
      .catch(() => setCreators([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(''); }, [load]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    load(query.trim());
  };

  const toggleFollow = async (creator: DiscoverCreator) => {
    try {
      const data = await api<{ following: boolean }>(`/api/creators/${creator.id}/follow?hub=VIDEO`, { method: 'POST' });
      setCreators((current) => current.map((item) => item.id === creator.id ? { ...item, following: data.following, followers: Math.max(0, item.followers + (data.following ? 1 : -1)) } : item));
      toast(data.following ? t('video.creators.followToast', { name: creator.username }) : t('video.creators.unfollowToast', { name: creator.username }), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.creators.followError'), 'error');
    }
  };

  return (
    <section className="video-discover-view">
      <form className="video-watch-form" onSubmit={search}>
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('video.creators.searchPh')} maxLength={80} />
        <button type="submit" className="btn btn-violet pill-sm">{t('video.common.search')}</button>
      </form>
      {loading && <div className="video-loading-grid">{[1, 2, 3].map((item) => <div className="video-skeleton" key={item} />)}</div>}
      {!loading && creators.length === 0 && (
        <div className="video-hub-empty large">
          <Camera size={26} />
          <b>{query ? t('video.creators.notFoundFor', { q: query }) : t('video.creators.notFound')}</b>
          <span>{t('video.creators.emptyHint')}</span>
          <button type="button" className="btn btn-violet pill-sm" onClick={() => load('')}>{t('video.creators.showAll')}</button>
        </div>
      )}
      <div className="video-creators-grid">
        {creators.map((creator) => (
          <article className="video-creator-card" key={creator.id}>
            <header className="video-creator-head">
              <button type="button" className="video-creator-identity" onClick={() => onOpenCreator(creator.id)}>
                <JaminoAvatar avatarId={creator.avatarId} size={44} photo={creator.avatarPhoto} name={creator.username} />
                <span>
                  <b>{creator.channelName}</b>
                  <small>@{creator.handle} · {creator.followers === 1 ? t('video.creators.followersOne', { n: creator.followers }) : t('video.creators.followersMany', { n: creator.followers })}</small>
                </span>
              </button>
              <button type="button" className={`btn ${creator.following ? 'btn-ghost' : 'btn-violet'} pill-sm`} onClick={() => void toggleFollow(creator)}>
                {creator.following ? <UserRoundCheck size={14} /> : <UserPlus size={14} />}
                {creator.following ? t('video.creators.following') : t('video.creators.follow')}
              </button>
            </header>
            {creator.category && <span className="video-creator-category">{creator.category}</span>}
            {creator.bio && <p>{creator.bio}</p>}
            {creator.latestPosts.length > 0 && (
              <div className="video-creator-posts">
                {creator.latestPosts.map((post) => (
                  <button type="button" key={post.id} className="video-creator-post-thumb" onClick={() => onOpenCreator(creator.id)} title={post.title || t('video.common.untitledPost')}>
                    {post.thumbnailUrl ? <Image src={post.thumbnailUrl} alt="" fill unoptimized /> : post.mediaType === 'VIDEO' ? <Play size={14} /> : <Sparkles size={14} />}
                  </button>
                ))}
              </div>
            )}
            <footer className="video-creator-foot"><Film size={13} /> {creator.postCount === 1 ? t('video.creators.publishedOne', { n: creator.postCount }) : t('video.creators.publishedMany', { n: creator.postCount })}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function EditView({ onEditPost }: { onEditPost: (post: VideoPost) => void }) {
  const t = useTranslations();
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  const loadMyPosts = useCallback(async (reset = false, search = '') => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;
    loadingRef.current = true;
    if (reset) setLoading(true);
    try {
      const params = new URLSearchParams({ authorId: 'me' });
      if (!reset && nextCursorRef.current) params.set('cursor', nextCursorRef.current);
      if (search) params.set('q', search);
      const data = await api<{ posts: VideoPost[]; nextCursor: string | null; hasMore: boolean }>(`/api/video/posts?${params}`);
      setPosts((current) => {
        if (reset) return data.posts;
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...data.posts.filter((post) => !seen.has(post.id))];
      });
      nextCursorRef.current = data.nextCursor;
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
    } catch (error) {
      if (reset) setPosts([]);
      toast(error instanceof Error ? error.message : t('video.edit.loadError'), 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setPosts([]);
    void loadMyPosts(true, activeSearch);
  }, [loadMyPosts, activeSearch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMyPosts(false, activeSearch);
    }, { rootMargin: '900px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMyPosts, activeSearch]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = searchQuery.trim();
    setActiveSearch(next);
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setPosts([]);
    void loadMyPosts(true, next);
  };

  return (
    <section className="video-edit-view">
      <div className="video-edit-hero">
        <Pencil size={26} />
        <div>
          <div className="hub-kicker">{t('video.edit.kicker')}</div>
          <h2>{t('video.edit.title')}</h2>
          <p>{t('video.edit.sub')}</p>
        </div>
      </div>
      <form className="video-edit-search" onSubmit={submitSearch}>
        <Search size={16} />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('video.edit.searchPh')} maxLength={120} />
        {activeSearch && <button type="button" className="btn-icon" onClick={() => { setSearchQuery(''); setActiveSearch(''); }} title={t('video.feed.clearSearch')}><X size={13} /></button>}
        <button type="submit" className="btn btn-violet pill-sm"><Sparkles size={14} /> {t('video.common.search')}</button>
      </form>
      {loading && posts.length === 0 && <div className="video-loading-grid">{[1, 2, 3].map((item) => <div className="video-skeleton" key={item} />)}</div>}
      {!loading && posts.length === 0 && <div className="video-hub-empty large"><Pencil size={26} /><b>{activeSearch ? t('video.edit.noMatch', { q: activeSearch }) : t('video.edit.noPosts')}</b><span>{activeSearch ? t('video.edit.tryDifferent') : t('video.edit.openCreate')}</span>{!activeSearch && <button type="button" className="btn btn-violet pill-sm" onClick={() => window.history.replaceState({}, '', '/?hub=video&videoView=feed')}>{t('video.edit.goToFeed')}</button>}</div>}
      {posts.length > 0 && (
        <div className="video-edit-grid">
          {posts.map((post) => (
            <article className={`video-post-card video-post-${post.kind.toLowerCase()} edit-mode`} key={post.id}>
              <div className="video-post-topline">
                <button type="button" className="video-post-author">
                  <JaminoAvatar avatarId={post.author.avatarId} size={34} photo={post.author.avatarPhoto} name={post.author.username} />
                  <span><b>@{post.author.username}</b><small>{timeAgo(post.createdAt, t)}</small></span>
                </button>
                <div className="video-post-type"><span>{post.kind === 'SHORT' ? 'SHORT' : post.kind === 'LONG' ? 'LONG' : 'POST'}</span>{post.durationSec > 0 && <small>{durationLabel(post.durationSec)}</small>}{post.workflowStatus && <span className={`video-workflow-badge ${post.workflowStatus.toLowerCase()}`}>{post.workflowStatus}</span>}</div>
              </div>
              <button type="button" className="video-post-heading">
                <strong>{post.title || t('video.common.untitledPost')}</strong>
                {post.description && <span>{post.description}</span>}
              </button>
              <VideoMedia post={post} />
              <div className="video-post-actions">
                <button type="button" className={post.liked ? 'active' : ''} title={t('video.common.like')}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button>
                <button type="button" title={t('video.common.comments')}><MessageCircle size={17} /><span>{post.comments}</span></button>
                <button type="button" className={post.saved ? 'active' : ''} title={t('video.common.save')}><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saves}</span></button>
                <button type="button" title={t('video.common.share')}><Share2 size={17} /></button>
                <button type="button" className="btn btn-violet edit-button" onClick={() => onEditPost(post)}><Pencil size={14} /> {t('video.edit.edit')}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="video-feed-sentinel">{loading && posts.length > 0 && <span className="admin-loader" />}{!hasMore && posts.length > 0 && <span>{t('video.edit.allLoaded')}</span>}</div>
    </section>
  );
}

function VideoEditorView() {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) return;
    setLoading(true);
    api<{ posts: VideoPost[] }>('/api/video/posts?authorId=me')
      .then((data) => setPosts(data.posts.filter((post) => post.mediaType === 'VIDEO')))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [file]);

  const openFromPost = async (post: VideoPost) => {
    if (!post.assetUrl || busyId !== null) return;
    setBusyId(post.id);
    try {
      const response = await fetch(post.assetUrl);
      if (!response.ok) throw new Error(t('video.editor.downloadError'));
      const blob = await response.blob();
      const name = `${post.title || 'clip'}-${post.id}.mp4`;
      setFile(new File([blob], name, { type: blob.type || 'video/mp4' }));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('video.editor.openError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = useCallback((editedFile: File) => {
    const url = URL.createObjectURL(editedFile);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = editedFile.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(t('video.editor.toastSaved'), 'ok');
  }, [t]);

  if (file) {
    return (
      <section className="video-editor-view">
        <div className="video-editor-hero">
          <Scissors size={26} />
          <div>
            <div className="hub-kicker">{t('video.editor.kicker')}</div>
            <h2>{t('video.editor.editClipTitle')}</h2>
            <p>{t('video.editor.editClipSub')}</p>
          </div>
          <button type="button" className="btn btn-ghost pill-sm" onClick={() => setFile(null)}><X size={14} /> {t('video.editor.chooseAnother')}</button>
        </div>
        <div className="video-editor-view-file"><UploadCloud size={15} /> {file.name}</div>
        <VideoEditorWorkspace
          file={file}
          onRenderDone={handleDownload}
          renderDoneCopy={t('video.editor.doneCopy')}
          renderHelperCopy={t('video.editor.helperCopy')}
        />
      </section>
    );
  }

  return (
    <section className="video-editor-view">
      <div className="video-editor-hero">
        <Scissors size={26} />
        <div>
          <div className="hub-kicker">{t('video.editor.kicker')}</div>
          <h2>{t('video.editor.importTitle')}</h2>
          <p>{t('video.editor.importSub')}</p>
        </div>
      </div>
      <div className="video-editor-import">
        <div className="video-editor-import-art"><Scissors size={36} /></div>
        <h3>{t('video.editor.importStart')}</h3>
        <p>{t('video.editor.importHint')}</p>
        <button type="button" className="btn btn-violet pill-sm" onClick={() => fileInputRef.current?.click()}><UploadCloud size={15} /> {t('video.editor.chooseVideo')}</button>
        <input ref={fileInputRef} type="file" hidden accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; if (nextFile) setFile(nextFile); event.target.value = ''; }} />
      </div>
      <div className="video-editor-posts">
        <div className="video-editor-posts-head"><b>{t('video.editor.reuse')}</b><span>{t('video.editor.reuseHint')}</span></div>
        {loading ? <div className="video-modal-loading"><span className="admin-loader" /> {t('video.editor.loadingMine')}</div> : posts.length === 0 ? <div className="video-hub-empty"><Scissors size={20} /><b>{t('video.editor.noPosts')}</b><span>{t('video.editor.noPostsHint')}</span></div> : (
          <div className="video-editor-posts-grid">
            {posts.map((post) => (
              <button type="button" key={post.id} className="video-editor-post" disabled={busyId !== null} onClick={() => void openFromPost(post)}>
                <div className="video-editor-post-thumb">
                  {post.thumbnailUrl ? <Image src={post.thumbnailUrl} alt="" fill unoptimized /> : <Play size={16} />}
                  {post.durationSec > 0 && <span>{durationLabel(post.durationSec)}</span>}
                </div>
                <span><b>{post.title || t('video.common.untitledClip')}</b><small>@{post.author.username} · {post.kind}</small></span>
                {busyId === post.id ? <Loader2 size={15} className="video-editor-spin" /> : <Scissors size={15} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function VideoHub() {
  const t = useTranslations();
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const [view, setView] = useState<VideoView>('feed');
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [creatorStatus, setCreatorStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentsPost, setCommentsPost] = useState<VideoPost | null>(null);
  const [activePost, setActivePost] = useState<VideoPost | null>(null);
  const [creatorProfileId, setCreatorProfileId] = useState<number | null>(null);
  const [studioPosts, setStudioPosts] = useState<VideoPost[]>([]);
  const [studioLoading, setStudioLoading] = useState(false);
  const [watchUrl, setWatchUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [trending, setTrending] = useState(false);
  // Real server-backed playlists (replaces the old localStorage-only queue).
  const [playlists, setPlaylists] = useState<VideoPlaylistSummary[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [openPlaylistId, setOpenPlaylistId] = useState<number | null>(null);
  const [playlistPost, setPlaylistPost] = useState<VideoPost | null>(null);
  const [editPost, setEditPost] = useState<VideoPost | null>(null);
  const [deepLinkAt, setDeepLinkAt] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shortsFeedRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  const feedKind = useMemo<FeedKind>(() => view === 'shorts' ? 'SHORT' : view === 'long' ? 'LONG' : 'ALL', [view]);
  const feedView = view === 'feed' || view === 'following' || view === 'shorts' || view === 'long' || view === 'watchlist';

  const loadPosts = useCallback(async (kind: FeedKind, reset = false, savedOnly = false, followingOnly = false, search = '', trendingOnly = false) => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ kind });
      if (!reset && nextCursorRef.current) params.set('cursor', nextCursorRef.current);
      if (savedOnly) params.set('saved', '1');
      if (followingOnly) params.set('following', '1');
      if (search) params.set('q', search);
      if (trendingOnly) params.set('trending', '1');

      const data = await api<{ posts: VideoPost[]; nextCursor: string | null; hasMore: boolean }>(`/api/video/posts?${params}`);
      setPosts((current) => {
        if (reset) return data.posts;
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...data.posts.filter((post) => !seen.has(post.id))];
      });
      nextCursorRef.current = data.nextCursor;
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
    } catch (error) {
      if (reset) setPosts([]);
      toast(error instanceof Error ? error.message : t('video.toast.feedLoadError'), 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [t]);

  const loadPlaylists = useCallback(() => {
    setPlaylistsLoading(true);
    api<{ playlists: VideoPlaylistSummary[] }>('/api/video/playlists')
      .then((data) => setPlaylists(data.playlists))
      .catch(() => setPlaylists([]))
      .finally(() => setPlaylistsLoading(false));
  }, []);

  useEffect(() => {
    api<{ applications: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }[] }>('/api/creator/apply?hub=VIDEO').then((data) => setCreatorStatus(data.applications[0]?.status ?? null)).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('videoView') as VideoView | null;
    if (requestedView && NAV.some((item) => item.id === requestedView)) setView(requestedView);
    const url = params.get('watch');
    if (url) { setActiveUrl(url); setView('watch'); }
    const postId = Number(params.get('post') || 0);
    const startAt = Number(params.get('t') || 0);
    if (postId > 0) api<{ post: VideoPost }>(`/api/video/posts/${postId}`).then((data) => { setActivePost(data.post); if (startAt > 0) setDeepLinkAt(startAt); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!feedView) return;
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setPosts([]);
    void loadPosts(feedKind, true, view === 'watchlist', view === 'following', activeSearch, trending && view === 'feed');
  }, [feedKind, feedView, loadPosts, view, activeSearch, trending]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !feedView) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadPosts(feedKind, false, view === 'watchlist', view === 'following', activeSearch, trending && view === 'feed');
    }, { rootMargin: '900px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feedKind, feedView, loadPosts, view, activeSearch, trending]);

  useEffect(() => {
    if (view !== 'studio') return;
    setStudioLoading(true);
    api<{ posts: VideoPost[] }>('/api/video/studio').then((data) => setStudioPosts(data.posts)).catch(() => setStudioPosts([])).finally(() => setStudioLoading(false));
  }, [view]);

  useEffect(() => {
    if (view !== 'playlists') return;
    loadPlaylists();
  }, [view, loadPlaylists]);

  useEffect(() => {
    connectLive();
    return onLive('posts:interact', (data: { postId: number; likes?: number; saves?: number; comments?: number }) => {
      updatePost(data.postId, {
        ...(data.likes !== undefined && data.likes !== null ? { likes: data.likes } : {}),
        ...(data.saves !== undefined && data.saves !== null ? { saves: data.saves } : {}),
        ...(data.comments !== undefined && data.comments !== null ? { comments: data.comments } : {}),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shorts: jump between cards with the arrow keys (seek keys stay with the player).
  useEffect(() => {
    if (view !== 'shorts') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable]')) return;
      const feed = shortsFeedRef.current;
      if (!feed) return;
      const cards = Array.from(feed.querySelectorAll<HTMLElement>('.video-post-card'));
      if (cards.length === 0) return;
      event.preventDefault();
      const feedRect = feed.getBoundingClientRect();
      const mid = feedRect.top + feedRect.height / 2;
      const index = cards.findIndex((card) => {
        const rect = card.getBoundingClientRect();
        return rect.top <= mid && rect.bottom >= mid;
      });
      const nextIndex = event.key === 'ArrowDown' ? Math.min(cards.length - 1, Math.max(0, index) + 1) : Math.max(0, (index < 0 ? 1 : index + 1) - 1);
      cards[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  const changeView = (nextView: VideoView) => {
    setView(nextView);
    setActiveSearch('');
    setSearchQuery('');
    setTrending(false);
    const suffix = nextView === 'feed' ? '' : `&videoView=${nextView}`;
    window.history.replaceState({}, '', `/?hub=video${suffix}`);
  };

  const openCreate = () => {
    if (creatorStatus === 'APPROVED') setCreateOpen(true);
    else setCreatorOpen(true);
  };

  const updatePost = (postId: number, update: Partial<VideoPost>) => {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, ...update } : post));
    setActivePost((current) => current?.id === postId ? { ...current, ...update } : current);
    setCommentsPost((current) => current?.id === postId ? { ...current, ...update } : current);
    setStudioPosts((current) => current.map((post) => post.id === postId ? { ...post, ...update } : post));
  };

  const toggleLike = async (post: VideoPost) => {
    try {
      const data = await api<{ liked: boolean; likes: number }>(`/api/video/posts/${post.id}/like`, { method: 'POST' });
      updatePost(post.id, { liked: data.liked, likes: data.likes });
    } catch (error) { toast(error instanceof Error ? error.message : t('video.toast.likeError'), 'error'); }
  };

  const toggleSave = async (post: VideoPost) => {
    try {
      const data = await api<{ saved: boolean; saves: number }>(`/api/video/posts/${post.id}/save`, { method: 'POST' });
      updatePost(post.id, { saved: data.saved, saves: data.saves });
    } catch (error) { toast(error instanceof Error ? error.message : t('video.toast.saveError'), 'error'); }
  };

<<<<<<< HEAD
  const sharePost = async (post: VideoPost) => {
    const url = `${window.location.origin}/?hub=video&post=${post.id}`;
    try { await navigator.clipboard.writeText(url); toast(t('video.toast.linkCopied'), 'ok'); } catch { toast(url); }
=======
  const sharePost = async (post: VideoPost, atSeconds?: number) => {
    const at = atSeconds && atSeconds > 1 ? `&t=${Math.floor(atSeconds)}` : '';
    const url = `${window.location.origin}/?hub=video&post=${post.id}${at}`;
    try { await navigator.clipboard.writeText(url); toast(at ? 'Link copied — starts at this moment.' : 'Post link copied.', 'ok'); } catch { toast(url); }
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
  };

  const openPost = (post: VideoPost) => {
    setActivePost(post);
    window.history.replaceState({}, '', `/?hub=video&post=${post.id}`);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = searchQuery.trim();
    setActiveSearch(next);
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setPosts([]);
    void loadPosts(feedKind, true, view === 'watchlist', view === 'following', next, trending && view === 'feed');
  };

  const createPlaylist = async (event: FormEvent) => {
    event.preventDefault();
    const name = playlistName.trim();
    if (!name) return;
    try {
      const data = await api<{ playlist: VideoPlaylistSummary }>('/api/video/playlists', { method: 'POST', body: JSON.stringify({ name }) });
      setPlaylists((current) => [data.playlist, ...current.filter((item) => item.id !== data.playlist.id)]);
      setPlaylistName('');
      toast(t('video.playlist.toastCreateShort'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('video.playlist.toastCreateError'), 'error');
    }
  };

  const openWatch = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = watchUrl.trim();
    if (!nextUrl) return;
    setActiveUrl(nextUrl);
    setWatchUrl('');
    window.history.replaceState({}, '', `/?hub=video&watch=${encodeURIComponent(nextUrl)}`);
  };

  const reportPost = async (post: VideoPost) => {
    try { await api(`/api/video/posts/${post.id}/report`, { method: 'POST', body: JSON.stringify({ reason: t('video.toast.reportReason') }) }); toast(t('video.toast.postReported'), 'ok'); } catch (error) { toast(error instanceof Error ? error.message : t('video.toast.reportError'), 'error'); }
  };

  const deleteStudioPost = async (post: VideoPost) => {
    try { await api(`/api/video/posts/${post.id}`, { method: 'DELETE' }); setStudioPosts((current) => current.filter((item) => item.id !== post.id)); setPosts((current) => current.filter((item) => item.id !== post.id)); toast(t('video.toast.postDeleted'), 'ok'); } catch (error) { toast(error instanceof Error ? error.message : t('video.toast.deleteError'), 'error'); }
  };

  const pageTitle = view === 'feed' ? t('video.feed.title') : t(`videoNav.${NAV.find((item) => item.id === view)?.key ?? 'feed'}`);
  const feedLabel = view === 'watchlist' ? t('video.feed.saved') : view === 'following' ? t('video.feed.following') : view === 'shorts' ? t('video.feed.shorts') : view === 'long' ? t('video.feed.long') : trending ? t('video.feed.trending') : activeSearch ? t('video.feed.results', { q: activeSearch }) : t('video.feed.fresh');

  return (
    <div className="hub-shell hub-shell-video video-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Video Hub" />
      <div className="video-hub-layout">
        <aside className="video-hub-sidebar">
          <div className="video-hub-brand"><span className="hub-empty-icon"><Clapperboard size={22} /></span><div><b>{t('hubs.video')}</b><small>{t('video.feed.brandTag')}</small></div></div>
          <nav>{NAV.map(({ id, key, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => changeView(id)}><Icon size={16} /><span>{t(`videoNav.${key}`)}</span></button>)}</nav>
          <button type="button" className="video-hub-jam-link" onClick={() => { setProduct('community'); setTab('jams'); }}><UsersRound size={15} /> {t('video.feed.openCommunity')}</button>
        </aside>

        <main className="video-hub-main">
          <header className="video-hub-heading">
            <div><div className="hub-kicker">{t('video.feed.connected')}</div><h1>{pageTitle}</h1><p>{t('video.feed.tagline')}</p></div>
            <div className="hub-heading-actions"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setCreatorOpen(true)}><BadgeCheck size={14} /> {creatorStatus === 'APPROVED' ? t('video.feed.creatorProfile') : t('video.feed.becomeCreator')}</button><button type="button" className="btn btn-violet" onClick={openCreate}><Plus size={15} /> {t('video.feed.create')}</button></div>
          </header>

          {view === 'creators' && <CreatorsView onOpenCreator={setCreatorProfileId} />}

          {view === 'studio' && <CreatorStudio posts={studioPosts} loading={studioLoading} onDelete={(post) => void deleteStudioPost(post)} onEditProfile={() => setCreatorOpen(true)} onEditPost={setEditPost} />}
          {view === 'playlists' && <section className="video-playlists-view">
            <div className="video-playlist-hero"><ListVideo size={26} /><div><div className="hub-kicker">{t('video.playlist.libKicker')}</div><h2>{t('video.playlist.libTitle')}</h2><p>{t('video.playlist.libSub')}</p></div></div>
            <form className="video-create-playlist" onSubmit={createPlaylist}><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder={t('video.playlist.newPh')} maxLength={80} /><button type="submit" className="btn btn-violet pill-sm" disabled={!playlistName.trim()}><Plus size={14} /> {t('video.feed.create')}</button></form>
            {playlistsLoading && <div className="creator-profile-loading"><span className="admin-loader" /> {t('video.playlist.loading')}</div>}
            {!playlistsLoading && playlists.length === 0 && <div className="video-hub-empty"><ListVideo size={22} /><b>{t('video.playlist.emptyTitle')}</b><span>{t('video.playlist.emptyHint')}</span></div>}
            <div className="video-playlist-grid">
              {playlists.map((playlist) => (
                <button type="button" className="video-playlist-card" key={playlist.id} onClick={() => setOpenPlaylistId(playlist.id)}>
                  <ListVideo size={20} />
                  <b>{playlist.name}</b>
                  {playlist.description && <span className="video-playlist-card-desc">{playlist.description}</span>}
                  <span>{playlist.count === 1 ? t('video.common.videoCountOne', { n: playlist.count }) : t('video.common.videoCount', { n: playlist.count })}</span>
                </button>
              ))}
            </div>
          </section>}

          {view === 'edit' && <EditView onEditPost={setEditPost} />}
          {view === 'editor' && <VideoEditorView />}
<<<<<<< HEAD
          {view === 'watch' && <section className="video-watch-panel"><form className="video-watch-form" onSubmit={openWatch}><Search size={16} /><input value={watchUrl} onChange={(event) => setWatchUrl(event.target.value)} placeholder={t('video.watch.ph')} /><button type="submit" className="btn btn-violet pill-sm">{t('video.watch.open')}</button></form>{activeUrl ? <div className="video-watch-player"><video controls playsInline src={activeUrl} /><div className="video-watch-meta"><div><b>{t('video.watch.shared')}</b><span>{activeUrl}</span></div><button type="button" className="btn btn-ghost pill-sm" onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => toast(t('video.watch.linkCopied'), 'ok')).catch(() => {}); }}><Share2 size={14} /> {t('video.common.share')}</button></div></div> : <div className="video-hub-empty large"><Link2 size={26} /><b>{t('video.watch.none')}</b><span>{t('video.watch.noneHint')}</span></div>}</section>}
=======
          {view === 'watch' && <section className="video-watch-panel"><form className="video-watch-form" onSubmit={openWatch}><Search size={16} /><input value={watchUrl} onChange={(event) => setWatchUrl(event.target.value)} placeholder="Paste a direct video URL" /><button type="submit" className="btn btn-violet pill-sm">Open</button></form>{activeUrl ? <div className="video-watch-player"><VinylPlayer key={activeUrl} variant="feature" src={activeUrl} title="Shared video" badge="Direct link" /><div className="video-watch-meta"><div><b>Shared video</b><span>{activeUrl}</span></div><button type="button" className="btn btn-ghost pill-sm" onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => toast('Watch link copied.', 'ok')).catch(() => {}); }}><Share2 size={14} /> Share</button></div></div> : <div className="video-hub-empty large"><Link2 size={26} /><b>No video selected.</b><span>Paste a direct MP4, MOV or WEBM URL to open it.</span></div>}</section>}
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79

          {feedView && <section className={`video-feed-section ${view === 'shorts' ? 'is-shorts' : ''} ${view === 'long' ? 'is-long' : ''}`}>
            <div className="video-feed-toolbar">
              <div><span className="video-feed-dot" /> {feedLabel}</div>
              <div className="video-feed-toolbar-actions">
                {view === 'feed' && !activeSearch && <button type="button" className={`btn btn-ghost pill-sm ${trending ? 'active' : ''}`} onClick={() => setTrending((value) => !value)}><TrendingUp size={14} /> {trending ? t('video.feed.newestBtn') : t('video.feed.trendingBtn')}</button>}
                <form className="video-feed-search" onSubmit={submitSearch}>
                  <Search size={14} />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('video.feed.search')} maxLength={120} />
                  {activeSearch && <button type="button" className="btn-icon" onClick={() => { setSearchQuery(''); setActiveSearch(''); }} title={t('video.feed.clearSearch')}><X size={13} /></button>}
                </form>
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => { nextCursorRef.current = null; hasMoreRef.current = true; setHasMore(true); setPosts([]); void loadPosts(feedKind, true, view === 'watchlist', view === 'following', activeSearch, trending && view === 'feed'); }}><Sparkles size={14} /> {t('video.feed.refresh')}</button>
              </div>
            </div>
            {loading && posts.length === 0 && <div className="video-loading-grid">{[1, 2, 3].map((item) => <div className="video-skeleton" key={item} />)}</div>}
<<<<<<< HEAD
            {!loading && posts.length === 0 && <div className="video-hub-empty large"><Film size={26} /><b>{activeSearch ? t('video.feed.nothingMatched', { q: activeSearch }) : view === 'watchlist' ? t('video.feed.watchlistEmpty') : view === 'following' ? t('video.feed.followingEmpty') : t('video.feed.feedEmpty')}</b><span>{activeSearch ? t('video.feed.tryDifferent') : view === 'watchlist' ? t('video.feed.watchlistHint') : creatorStatus === 'APPROVED' ? t('video.feed.publishHint') : t('video.feed.feedEmptyHint')}</span><button type="button" className="btn btn-violet pill-sm" onClick={activeSearch ? () => { setSearchQuery(''); setActiveSearch(''); } : openCreate}><Plus size={14} /> {activeSearch ? t('video.feed.clearSearch') : creatorStatus === 'APPROVED' ? t('video.feed.createPost') : t('video.feed.becomeCreator')}</button></div>}
            {posts.length > 0 && <div className={view === 'shorts' ? 'video-shorts-feed' : view === 'long' ? 'video-long-grid' : 'video-feed-grid'}>{posts.map((post) => <VideoCard key={post.id} post={post} compact={view === 'shorts'} onOpenPost={() => openPost(post)} onOpenCreator={() => setCreatorProfileId(post.author.id)} onLike={() => toggleLike(post)} onSave={() => toggleSave(post)} onComment={() => setCommentsPost(post)} onShare={() => sharePost(post)} onSaveToPlaylist={() => setPlaylistPost(post)} onReport={() => void reportPost(post)} />)}</div>}
            <div ref={sentinelRef} className="video-feed-sentinel">{loading && posts.length > 0 && <span className="admin-loader" />}{!hasMore && posts.length > 0 && <span>{t('video.feed.caughtUp')}</span>}</div>
=======
            {!loading && posts.length === 0 && <div className="video-hub-empty large"><Film size={26} /><b>{activeSearch ? `Nothing matched “${activeSearch}”.` : view === 'watchlist' ? 'Your watchlist is empty.' : view === 'following' ? 'Follow a creator to shape this feed.' : 'The feed is waiting for its first post.'}</b><span>{activeSearch ? 'Try a different title, description or @username.' : view === 'watchlist' ? 'Tap the bookmark on anything you want to keep.' : creatorStatus === 'APPROVED' ? 'Publish the first photo, post or video from Create.' : 'Become a creator to start the first channel.'}</span><button type="button" className="btn btn-violet pill-sm" onClick={activeSearch ? () => { setSearchQuery(''); setActiveSearch(''); } : openCreate}><Plus size={14} /> {activeSearch ? 'Clear search' : creatorStatus === 'APPROVED' ? 'Create a post' : 'Become a creator'}</button></div>}
            {posts.length > 0 && <div ref={view === 'shorts' ? shortsFeedRef : undefined} className={view === 'shorts' ? 'video-shorts-feed' : view === 'long' ? 'video-long-grid' : 'video-feed-grid'}>{posts.map((post) => <VideoCard key={post.id} post={post} compact={view === 'shorts'} onOpenPost={() => openPost(post)} onOpenCreator={() => setCreatorProfileId(post.author.id)} onLike={() => toggleLike(post)} onSave={() => toggleSave(post)} onComment={() => setCommentsPost(post)} onShare={(at) => sharePost(post, at)} onSaveToPlaylist={() => setPlaylistPost(post)} onReport={() => void reportPost(post)} />)}</div>}
            <div ref={sentinelRef} className="video-feed-sentinel">{loading && posts.length > 0 && <span className="admin-loader" />}{!hasMore && posts.length > 0 && <span>You are all caught up.</span>}</div>
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
          </section>}
        </main>
      </div>

      <nav className="hub-mobile-nav video-mobile-nav"><button type="button" onClick={() => setProduct('home')} aria-label={t('hubs.choose')}><House size={17} /><span>{t('videoNav.feed')}</span></button>{NAV.slice(0, 5).map(({ id, key, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => changeView(id)}><Icon size={17} /><span>{t(`videoNav.${key}`)}</span></button>)}</nav>
      <CreatorApplyModal hub="VIDEO" open={creatorOpen} onClose={() => setCreatorOpen(false)} onSubmitted={(application) => setCreatorStatus(application.status)} />
      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(post) => { setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]); setView('feed'); }} />
      <CommentsModal post={commentsPost} open={!!commentsPost} onClose={() => setCommentsPost(null)} onAdded={() => { if (commentsPost) updatePost(commentsPost.id, { comments: commentsPost.comments + 1 }); }} />
      <SaveToPlaylistModal post={playlistPost} open={!!playlistPost} onClose={() => setPlaylistPost(null)} onSaved={loadPlaylists} />
      <PlaylistDetailModal playlistId={openPlaylistId} open={openPlaylistId !== null} onClose={() => setOpenPlaylistId(null)} onChanged={loadPlaylists} onDeleted={loadPlaylists} onPlayPost={(post) => { setOpenPlaylistId(null); openPost(post); }} />
      <EditPostModal post={editPost} open={!!editPost} onClose={() => setEditPost(null)} onSaved={(post) => updatePost(post.id, post)} />
      <CreatorProfileModal creatorId={creatorProfileId} open={creatorProfileId !== null} onClose={() => setCreatorProfileId(null)} />
<<<<<<< HEAD
      {activePost && <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={() => { setActivePost(null); window.history.replaceState({}, '', '/?hub=video'); }}><section className="video-post-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="video-modal-head"><div><div className="hub-kicker">{t('video.common.postKicker', { kind: activePost.kind })}</div><h2>{activePost.title || t('video.common.postFallback')}</h2></div><button type="button" className="btn-icon" onClick={() => { setActivePost(null); window.history.replaceState({}, '', '/?hub=video'); }} aria-label={t('video.common.close')}><X size={18} /></button></header><div className="video-post-modal-body"><VideoCard post={activePost} onOpen={() => {}} onLike={() => toggleLike(activePost)} onSave={() => toggleSave(activePost)} onComment={() => setCommentsPost(activePost)} onShare={() => sharePost(activePost)} /></div></section></div>}
=======
      {activePost && <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={() => { setActivePost(null); setDeepLinkAt(0); window.history.replaceState({}, '', '/?hub=video'); }}><section className="video-post-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="video-modal-head"><div><div className="hub-kicker">{activePost.kind} · VIDEO HUB</div><h2>{activePost.title || 'Post'}</h2></div><button type="button" className="btn-icon" onClick={() => { setActivePost(null); setDeepLinkAt(0); window.history.replaceState({}, '', '/?hub=video'); }} aria-label="Close"><X size={18} /></button></header><div className="video-post-modal-body"><VideoCard post={activePost} feature startAt={deepLinkAt || undefined} onOpen={() => {}} onLike={() => toggleLike(activePost)} onSave={() => toggleSave(activePost)} onComment={() => setCommentsPost(activePost)} onShare={(at) => sharePost(activePost, at)} /></div></section></div>}
>>>>>>> 3596a546ffd8d797d92abc3efa59cfc1403cea79
    </div>
  );
}

function CreatorStudio({ posts, loading, onDelete, onEditProfile, onEditPost }: { posts: VideoPost[]; loading: boolean; onDelete: (post: VideoPost) => void; onEditProfile: () => void; onEditPost: (post: VideoPost) => void }) {
  const t = useTranslations();
  const likes = posts.reduce((sum, post) => sum + post.likes, 0);
  const saves = posts.reduce((sum, post) => sum + post.saves, 0);
  const comments = posts.reduce((sum, post) => sum + post.comments, 0);
  const interactions = likes + saves + comments;
  const updateWorkflow = async (post: VideoPost, workflowStatus: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED') => {
    const publishAt = workflowStatus === 'SCHEDULED' ? window.prompt(t('video.studio.prompt')) : null;
    try {
      const data = await api<{ post: VideoPost }>('/api/video/studio', { method: 'PATCH', body: JSON.stringify({ id: post.id, workflowStatus, publishAt }) });
      window.location.reload();
      void data;
    } catch (error) { toast(error instanceof Error ? error.message : t('video.studio.workflowError'), 'error'); }
  };

  return (
    <section className="creator-studio-view">
      <div className="creator-studio-hero">
        <div><div className="hub-kicker">{t('video.studio.kicker')}</div><h2>{t('video.studio.title')}</h2><p>{t('video.studio.sub')}</p></div>
        <div className="creator-studio-hero-actions"><button type="button" className="btn btn-ghost pill-sm" onClick={onEditProfile}><Pencil size={14} /> {t('video.studio.editChannel')}</button><LayoutDashboard size={32} /></div>
      </div>
      <CreatorInsights />
      <div className="creator-studio-metrics">
        <div className="creator-studio-metric"><BarChart3 size={17} /><b>{posts.length}</b><span>{t('video.studio.metricPosts')}</span></div>
        <div className="creator-studio-metric"><Heart size={17} /><b>{likes}</b><span>{t('video.studio.metricLikes')}</span></div>
        <div className="creator-studio-metric"><Bookmark size={17} /><b>{saves}</b><span>{t('video.studio.metricSaves')}</span></div>
        <div className="creator-studio-metric"><MessageCircle size={17} /><b>{interactions}</b><span>{t('video.studio.metricActions')}</span></div>
      </div>
      {loading ? <div className="creator-profile-loading"><span className="admin-loader" /> {t('video.studio.loading')}</div> : posts.length === 0 ? <div className="video-hub-empty large"><Film size={24} /><b>{t('video.studio.noWork')}</b><span>{t('video.studio.openCreate')}</span></div> : <>
        <div className="creator-studio-toolbar"><p>{t('video.studio.toolbarNote')}</p><span className="creator-studio-edit"><TrendingUp size={14} /> {t('video.studio.tracked', { n: interactions })}</span></div>
        <div className="creator-studio-table">
          <div className="creator-studio-row creator-studio-row-head"><span>{t('video.studio.colPost')}</span><span>{t('video.studio.colLikes')}</span><span>{t('video.studio.colSaves')}</span><span>{t('video.studio.colComments')}</span><span>{t('video.studio.colType')}</span><span /></div>
          {posts.map((post) => <div className="creator-studio-row" key={post.id}><div className="creator-studio-row-title"><div><b>{post.title || t('video.common.untitledPost')}</b><small>{new Date(post.createdAt).toLocaleDateString()} · {post.workflowStatus ?? 'PUBLISHED'}</small></div></div><span className="creator-studio-row-stat"><strong>{post.likes}</strong>{t('video.studio.likesLabel')}</span><span className="creator-studio-row-stat"><strong>{post.saves}</strong>{t('video.studio.savesLabel')}</span><span className="creator-studio-row-stat"><strong>{post.comments}</strong>{t('video.studio.commentsLabel')}</span><span className="creator-studio-row-stat"><strong>{post.kind}</strong>{t('video.studio.formatLabel')}</span><div className="creator-studio-row-actions"><button type="button" className="btn-icon" onClick={() => onEditPost(post)} title={t('video.edit.edit')}><Pencil size={15} /></button><button type="button" className="btn btn-ghost pill-sm" onClick={() => void updateWorkflow(post, post.workflowStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}>{post.workflowStatus === 'PUBLISHED' ? t('video.studio.draft') : t('video.studio.publish')}</button><button type="button" className="btn btn-ghost pill-sm" onClick={() => void updateWorkflow(post, 'SCHEDULED')}>{t('video.studio.schedule')}</button><button type="button" className="btn-icon danger" onClick={() => onDelete(post)} title={t('video.studio.deleteTitle')}><Trash2 size={15} /></button></div></div>)}
        </div>
        <CreatorCollabStudio posts={posts.map((post) => ({ id: post.id, title: post.title, kind: post.kind }))} />
      </>}
    </section>
  );
}