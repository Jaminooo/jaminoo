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
  Volume2,
  VolumeX,
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
import { VideoEditorModal } from '@/components/video-editor-modal';
import { CreatorCollabStudio } from '@/components/creator-collab-studio';
import { CreatorInsights } from '@/components/creator-insights';
import { connectLive, onLive } from '@/lib/live';

type VideoView = 'feed' | 'following' | 'shorts' | 'long' | 'watch' | 'watchlist' | 'creators' | 'studio' | 'playlists' | 'edit';
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
  { id: 'feed', key: 'feed', icon: Film }, { id: 'following', key: 'following', icon: UsersRound }, { id: 'shorts', key: 'shorts', icon: Play }, { id: 'long', key: 'long', icon: Tv2 }, { id: 'watch', key: 'watch', icon: Link2 }, { id: 'watchlist', key: 'watchlist', icon: Bookmark }, { id: 'creators', key: 'creators', icon: Camera }, { id: 'studio', key: 'studio', icon: LayoutDashboard }, { id: 'playlists', key: 'playlists', icon: ListVideo }, { id: 'edit', key: 'edit', icon: Pencil },
];

function durationLabel(seconds: number) {
  if (!seconds) return '';
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = Math.floor(safeSeconds % 60);
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function VideoMedia({ post }: { post: VideoPost }) {
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

  if (post.mediaType === 'IMAGE' && (post.assetUrl || post.externalUrl)) {
    return <div className="video-card-media video-card-image"><Image src={post.assetUrl || post.externalUrl || ''} alt={post.title || 'Video post'} fill unoptimized loading="lazy" /></div>;
  }
  if (post.mediaType === 'VIDEO' && (post.assetUrl || post.externalUrl)) {
    return <div className="video-card-media video-card-video-wrap"><video ref={videoRef} src={post.assetUrl || post.externalUrl || ''} poster={post.thumbnailUrl || undefined} muted={muted} playsInline loop preload="metadata" controls={post.kind === 'LONG'}><track kind="subtitles" src={post.subtitlesUrl || undefined} srcLang="en" label="English" default={!!post.subtitlesUrl} /></video>{post.kind === 'LONG' && <span className="video-play-fab" aria-hidden="true"><Play size={20} /></span>}{post.kind === 'LONG' && post.durationSec > 0 && <span className="video-duration-badge">{durationLabel(post.durationSec)}</span>}{post.kind === 'LONG' && <span className="video-progress-bar"><span /></span>}{post.kind === 'SHORT' && <><button type="button" className="video-sound-button" onClick={(event) => { event.stopPropagation(); const next = !muted; setMuted(next); setAudioBlocked(false); if (videoRef.current) { videoRef.current.muted = next; videoRef.current.play().catch(() => {}); } }} title={muted ? 'Turn sound on' : 'Mute sound'}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>{audioBlocked && muted && <span className="video-sound-hint">Tap for sound</span>}</>}</div>;
  }
  return <div className="video-card-media video-card-text"><Sparkles size={25} /><p>{post.description || post.title || 'A new thought from Jamino.'}</p></div>;
}

function VideoCard({ post, compact = false, onOpen, onOpenPost, onOpenCreator, onLike, onSave, onComment, onShare, onReport, onSaveToPlaylist }: { post: VideoPost; compact?: boolean; onOpen?: () => void; onOpenPost?: () => void; onOpenCreator?: () => void; onLike: () => void; onSave: () => void; onComment: () => void; onShare: () => void; onReport?: () => void; onSaveToPlaylist?: () => void }) {
  const openPost = onOpenPost ?? onOpen ?? (() => {});
  const openCreator = onOpenCreator ?? onOpen ?? openPost;
  return (
    <article className={`video-post-card video-post-${post.kind.toLowerCase()} ${compact ? 'compact' : ''}`}>
      <div className="video-post-topline">
        <button type="button" className="video-post-author" onClick={openCreator}>
          <JaminoAvatar avatarId={post.author.avatarId} size={34} photo={post.author.avatarPhoto} name={post.author.username} />
          <span><b>@{post.author.username}</b><small>{timeAgo(post.createdAt)}</small></span>
        </button>
        <div className="video-post-type"><span>{post.kind === 'SHORT' ? 'SHORT' : post.kind === 'LONG' ? 'LONG' : 'POST'}</span>{post.durationSec > 0 && <small>{durationLabel(post.durationSec)}</small>}<MoreHorizontal size={16} /></div>
      </div>
      <button type="button" className="video-post-heading" onClick={openPost}>
        <strong>{post.title || 'Untitled post'}</strong>
        {post.description && <span>{post.description}</span>}
      </button>
      <VideoMedia post={post} />
      <div className="video-post-actions">
        <button type="button" className={post.liked ? 'active' : ''} onClick={onLike} title="Like"><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button>
        <button type="button" onClick={onComment} title="Comments"><MessageCircle size={17} /><span>{post.comments}</span></button>
        <button type="button" className={post.saved ? 'active' : ''} onClick={onSave} title="Save"><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saves}</span></button>
        <button type="button" onClick={onShare} title="Share"><Share2 size={17} /></button>
        {onSaveToPlaylist && <button type="button" onClick={onSaveToPlaylist} title="Save to playlist"><ListVideo size={17} /></button>}
        {onReport && <button type="button" onClick={onReport} title="Report"><Flag size={16} /></button>}
      </div>
    </article>
  );
}

function CreatePostModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (post: VideoPost) => void }) {
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
        element.onerror = () => reject(new Error('Could not inspect this video'));
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
      toast('Published to Video Hub.', 'ok');
      onCreated(data.post);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not publish this post.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const needsVideo = kind !== 'POST';
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-create-modal" role="dialog" aria-modal="true" aria-labelledby="video-create-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">CREATE IN VIDEO HUB</div><h2 id="video-create-title">Share something worth watching</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <form className="video-create-form" onSubmit={submit}>
          <div className="video-create-tabs"><button type="button" className={kind === 'POST' ? 'active' : ''} onClick={() => { setKind('POST'); setMediaType('TEXT'); setFile(null); }}>Post</button><button type="button" className={kind === 'SHORT' ? 'active' : ''} onClick={() => { setKind('SHORT'); setMediaType('VIDEO'); setFile(null); }}>Short video</button><button type="button" className={kind === 'LONG' ? 'active' : ''} onClick={() => { setKind('LONG'); setMediaType('VIDEO'); setFile(null); }}>Long video</button></div>
          {kind === 'POST' && <label><span>Post format</span><select value={mediaType} onChange={(event) => { setMediaType(event.target.value as MediaType); setFile(null); }}><option value="TEXT">Text post</option><option value="IMAGE">Photo</option><option value="VIDEO">Video</option></select></label>}
          <label><span>Title</span><input required={!description} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder={needsVideo ? 'Give your video a clear title' : 'What is this about?'} /></label>
          <label><span>Description</span><textarea required={!title} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={4} placeholder="Add context, a caption or a story…" /></label>
          {mediaType !== 'TEXT' && <div className="video-upload-box"><UploadCloud size={22} /><div><b>{file ? file.name : 'Choose a photo or video'}</b><span>{mediaType === 'IMAGE' ? 'PNG, JPG or WEBP · up to 15 MB' : 'MP4, MOV or WEBM · up to 100 MB · thumbnail is generated automatically'}</span></div>{mediaType === 'VIDEO' && file && <button type="button" className="btn btn-ghost pill-sm video-edit-trigger" onClick={() => setEditorOpen(true)}><Scissors size={14} /> Edit video</button>}<label className="btn btn-ghost pill-sm"><ImageIcon size={14} /> Browse<input type="file" hidden accept={mediaType === 'IMAGE' ? 'image/png,image/jpeg,image/webp' : 'video/mp4,video/webm,video/quicktime'} onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; setFile(nextFile); setThumbnailFile(null); if (nextFile?.type.startsWith('video/')) void inspectVideo(nextFile); }} /></label></div>}
          {mediaType !== 'TEXT' && <label><span>Or paste a direct media URL</span><input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…/video.mp4" /></label>}
          {needsVideo && <div className="video-create-grid"><label><span>Duration in seconds</span><input type="number" min={0} max={86400} value={durationSec} onChange={(event) => setDurationSec(event.target.value)} placeholder="Auto detected from upload" /></label><label><span>Thumbnail URL</span><input type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder={thumbnailFile ? 'Auto thumbnail ready' : 'Optional cover image'} /></label><label><span>Subtitles URL</span><input type="url" value={subtitlesUrl} onChange={(event) => setSubtitlesUrl(event.target.value)} placeholder="Optional .vtt file" /></label></div>}
          {saving && (file || thumbnailFile) && <div className="creator-upload-progress"><span style={{ width: `${uploadProgress}%` }} /><small>{uploadProgress}% uploaded</small></div>}
          <footer className="video-modal-actions"><span><Sparkles size={13} /> {workflowStatus === 'DRAFT' ? 'Keep it private and finish it later.' : 'Your post appears in the infinite feed after publishing.'}</span><div className="video-modal-actions-buttons"><button type="submit" className="btn btn-ghost" disabled={saving} onClick={() => setWorkflowStatus('DRAFT')}>Save draft</button><button type="submit" className="btn btn-violet" disabled={saving} onClick={() => setWorkflowStatus('PUBLISHED')}>{saving ? `Publishing ${uploadProgress}%…` : <><Send size={14} /> Publish</>}</button></div></footer>
        </form>
        <VideoEditorModal file={file} open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={(editedFile) => { setFile(editedFile); setThumbnailFile(null); setEditorOpen(false); void inspectVideo(editedFile); toast('Edited video applied to your post.', 'ok'); }} />
      </section>
    </div>
  );
}

function CommentsModal({ post, open, onClose, onAdded }: { post: VideoPost | null; open: boolean; onClose: () => void; onAdded: (comment: VideoComment) => void }) {
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
      toast(error instanceof Error ? error.message : 'Could not add comment.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!open || !post) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-comments-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">COMMENTS</div><h2>{post.title || 'Post comments'}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="video-comments-list">{loading && <div className="video-modal-loading"><span className="admin-loader" /> Loading comments…</div>}{!loading && comments.length === 0 && <div className="video-modal-empty"><MessageCircle size={20} /><span>Be the first to say something.</span></div>}{comments.map((comment) => <div className="video-comment-row" key={comment.id}><JaminoAvatar avatarId={comment.user.avatarId} size={32} photo={comment.user.avatarPhoto} name={comment.user.username} /><div><b>@{comment.user.username}</b><p>{comment.text}</p><small>{timeAgo(comment.createdAt)}</small></div></div>)}</div>
        <form className="video-comment-form" onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Write a comment…" /><button type="submit" className="btn-icon violet" disabled={sending || !text.trim()} aria-label="Send comment"><Send size={17} /></button></form>
      </section>
    </div>
  );
}

function SaveToPlaylistModal({ post, open, onClose, onSaved }: { post: VideoPost | null; open: boolean; onClose: () => void; onSaved: () => void }) {
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
      toast(`Saved to playlist.`, 'ok');
      onSaved();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save to playlist.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !name.trim() || busy) return;
    setBusy(true);
    try {
      const data = await api<{ playlist: { id: number } }>('/api/video/playlists', { method: 'POST', body: JSON.stringify({ name, postId: post.id }) });
      setName('');
      toast('Playlist created with this post.', 'ok');
      onSaved();
      onClose();
      void data;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create the playlist.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open || !post) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-comments-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">SAVE TO PLAYLIST</div><h2>{post.title || 'Untitled post'}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="video-playlist-picker">
          {loading && <div className="video-modal-loading"><span className="admin-loader" /> Loading playlists…</div>}
          {!loading && playlists.length === 0 && <div className="video-modal-empty"><ListVideo size={20} /><span>No playlists yet — name one below.</span></div>}
          {playlists.map((playlist) => (
            <button type="button" key={playlist.id} className="video-playlist-option" disabled={busy} onClick={() => void addTo(playlist.id)}>
              <ListVideo size={16} />
              <span><b>{playlist.name}</b><small>{playlist.count} {playlist.count === 1 ? 'video' : 'videos'}</small></span>
              <Plus size={15} />
            </button>
          ))}
        </div>
        <form className="video-comment-form" onSubmit={createAndAdd}>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="New playlist name…" />
          <button type="submit" className="btn-icon violet" disabled={busy || !name.trim()} aria-label="Create playlist"><Plus size={17} /></button>
        </form>
      </section>
    </div>
  );
}

function EditPostModal({ post, open, onClose, onSaved }: { post: VideoPost | null; open: boolean; onClose: () => void; onSaved: (post: VideoPost) => void }) {
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
      toast('Post updated.', 'ok');
      onSaved(data.post);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update this post.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !post) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-create-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head"><div><div className="hub-kicker">EDIT POST</div><h2>{post.title || 'Untitled post'}</h2></div><button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <form className="video-create-form" onSubmit={submit}>
          <label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Give your post a clear title" /></label>
          <label><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={4} placeholder="Add context, a caption or a story…" /></label>
          <div className="video-create-grid">
            <label><span>Thumbnail URL</span><input type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="Optional cover image" /></label>
            <label><span>Subtitles URL</span><input type="url" value={subtitlesUrl} onChange={(event) => setSubtitlesUrl(event.target.value)} placeholder="Optional .vtt file" /></label>
          </div>
          <footer className="video-modal-actions"><span><Sparkles size={13} /> Changes are visible immediately.</span><button type="submit" className="btn btn-violet" disabled={saving}>{saving ? 'Saving…' : <><Send size={14} /> Save changes</>}</button></footer>
        </form>
      </section>
    </div>
  );
}

function PlaylistDetailModal({ playlistId, open, onClose, onChanged, onDeleted, onPlayPost }: { playlistId: number | null; open: boolean; onClose: () => void; onChanged: () => void; onDeleted: () => void; onPlayPost: (post: VideoPost) => void }) {
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
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not load playlist.', 'error'))
      .finally(() => setLoading(false));
  }, [playlistId]);

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
      toast(error instanceof Error ? error.message : 'Could not remove this video.', 'error');
    }
  };

  const saveRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!playlistId || !name.trim()) return;
    try {
      await api('/api/video/playlists', { method: 'PATCH', body: JSON.stringify({ playlistId, action: 'rename', name, description }) });
      setDetail((current) => current ? { ...current, name, description } : current);
      setRenaming(false);
      toast('Playlist updated.', 'ok');
      onChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not rename the playlist.', 'error');
    }
  };

  const deletePlaylist = async () => {
    if (!playlistId) return;
    try {
      await api(`/api/video/playlists?playlistId=${playlistId}`, { method: 'DELETE' });
      toast('Playlist deleted.', 'ok');
      onDeleted();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete the playlist.', 'error');
    }
  };

  if (!open || !playlistId) return null;
  const playable = (detail?.items ?? []).filter((item) => item.post);
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-playlist-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head">
          <div>
            <div className="hub-kicker">PLAYLIST</div>
            {renaming ? (
              <form className="video-playlist-rename" onSubmit={saveRename}>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus />
                <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="Optional description" />
                <button type="submit" className="btn btn-violet pill-sm">Save</button>
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => setRenaming(false)}>Cancel</button>
              </form>
            ) : <h2>{detail?.name ?? 'Playlist'} <button type="button" className="btn-icon" onClick={() => setRenaming(true)} title="Rename playlist"><Pencil size={14} /></button></h2>}
          </div>
          <div className="video-playlist-head-actions">
            <button type="button" className="btn-icon danger" onClick={() => void deletePlaylist()} title="Delete playlist"><Trash2 size={16} /></button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        </header>
        <div className="video-playlist-items">
          {loading && <div className="video-modal-loading"><span className="admin-loader" /> Loading videos…</div>}
          {!loading && detail && detail.items.length === 0 && <div className="video-modal-empty"><ListVideo size={20} /><span>Nothing saved here yet. Use the playlist button on any post.</span></div>}
          {!loading && detail && detail.items.map((item) => item.post && (
            <div className="video-playlist-item" key={item.id}>
              <div className="video-playlist-item-media">
                {item.post.thumbnailUrl ? <Image src={item.post.thumbnailUrl} alt="" fill unoptimized /> : item.post.mediaType === 'TEXT' ? <Sparkles size={16} /> : <Play size={16} />}
              </div>
              <button type="button" className="video-playlist-item-body" onClick={() => onPlayPost(item.post!)}>
                <b>{item.post.title || 'Untitled post'}</b>
                <small>@{item.post.author.username} · {item.post.kind} · {timeAgo(item.post.createdAt)}</small>
              </button>
              <button type="button" className="btn-icon danger" onClick={() => void removeItem(item.postId)} title="Remove from playlist"><X size={14} /></button>
            </div>
          ))}
          {!loading && playable.length > 0 && (
            <button type="button" className="btn btn-violet video-playlist-play-all" onClick={() => onPlayPost(playable[0].post!)}>
              <Play size={14} /> Play from the top
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function CreatorsView({ onOpenCreator }: { onOpenCreator: (id: number) => void }) {
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
      toast(data.following ? `Following @${creator.username}.` : `Unfollowed @${creator.username}.`, 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update follow.', 'error');
    }
  };

  return (
    <section className="video-discover-view">
      <form className="video-watch-form" onSubmit={search}>
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search creators by name, handle or topic" maxLength={80} />
        <button type="submit" className="btn btn-violet pill-sm">Search</button>
      </form>
      {loading && <div className="video-loading-grid">{[1, 2, 3].map((item) => <div className="video-skeleton" key={item} />)}</div>}
      {!loading && creators.length === 0 && (
        <div className="video-hub-empty large">
          <Camera size={26} />
          <b>No creators found{query ? ` for “${query}”` : ''}.</b>
          <span>Approved Video Hub creators appear here — be the first by applying from Create.</span>
          <button type="button" className="btn btn-violet pill-sm" onClick={() => load('')}>Show everyone</button>
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
                  <small>@{creator.handle} · {creator.followers} {creator.followers === 1 ? 'follower' : 'followers'}</small>
                </span>
              </button>
              <button type="button" className={`btn ${creator.following ? 'btn-ghost' : 'btn-violet'} pill-sm`} onClick={() => void toggleFollow(creator)}>
                {creator.following ? <UserRoundCheck size={14} /> : <UserPlus size={14} />}
                {creator.following ? 'Following' : 'Follow'}
              </button>
            </header>
            {creator.category && <span className="video-creator-category">{creator.category}</span>}
            {creator.bio && <p>{creator.bio}</p>}
            {creator.latestPosts.length > 0 && (
              <div className="video-creator-posts">
                {creator.latestPosts.map((post) => (
                  <button type="button" key={post.id} className="video-creator-post-thumb" onClick={() => onOpenCreator(creator.id)} title={post.title || 'Untitled post'}>
                    {post.thumbnailUrl ? <Image src={post.thumbnailUrl} alt="" fill unoptimized /> : post.mediaType === 'VIDEO' ? <Play size={14} /> : <Sparkles size={14} />}
                  </button>
                ))}
              </div>
            )}
            <footer className="video-creator-foot"><Film size={13} /> {creator.postCount} published {creator.postCount === 1 ? 'post' : 'posts'}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function EditView({ onEditPost }: { onEditPost: (post: VideoPost) => void }) {
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
      toast(error instanceof Error ? error.message : 'Could not load your videos.', 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

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
          <div className="hub-kicker">EDIT YOUR VIDEOS</div>
          <h2>Manage and update your posts.</h2>
          <p>Find any of your posts quickly and edit titles, descriptions, thumbnails or subtitles.</p>
        </div>
      </div>
      <form className="video-edit-search" onSubmit={submitSearch}>
        <Search size={16} />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search your posts by title or description…" maxLength={120} />
        {activeSearch && <button type="button" className="btn-icon" onClick={() => { setSearchQuery(''); setActiveSearch(''); }} title="Clear search"><X size={13} /></button>}
        <button type="submit" className="btn btn-violet pill-sm"><Sparkles size={14} /> Search</button>
      </form>
      {loading && posts.length === 0 && <div className="video-loading-grid">{[1, 2, 3].map((item) => <div className="video-skeleton" key={item} />)}</div>}
      {!loading && posts.length === 0 && <div className="video-hub-empty large"><Pencil size={26} /><b>{activeSearch ? `No posts matched “${activeSearch}”.` : 'You have not posted anything yet.'}</b><span>{activeSearch ? 'Try a different search term.' : 'Open Create to publish your first video.'}</span>{!activeSearch && <button type="button" className="btn btn-violet pill-sm" onClick={() => window.history.replaceState({}, '', '/?hub=video&videoView=feed')}>Go to feed</button>}</div>}
      {posts.length > 0 && (
        <div className="video-edit-grid">
          {posts.map((post) => (
            <article className={`video-post-card video-post-${post.kind.toLowerCase()} edit-mode`} key={post.id}>
              <div className="video-post-topline">
                <button type="button" className="video-post-author">
                  <JaminoAvatar avatarId={post.author.avatarId} size={34} photo={post.author.avatarPhoto} name={post.author.username} />
                  <span><b>@{post.author.username}</b><small>{timeAgo(post.createdAt)}</small></span>
                </button>
                <div className="video-post-type"><span>{post.kind === 'SHORT' ? 'SHORT' : post.kind === 'LONG' ? 'LONG' : 'POST'}</span>{post.durationSec > 0 && <small>{durationLabel(post.durationSec)}</small>}{post.workflowStatus && <span className={`video-workflow-badge ${post.workflowStatus.toLowerCase()}`}>{post.workflowStatus}</span>}</div>
              </div>
              <button type="button" className="video-post-heading">
                <strong>{post.title || 'Untitled post'}</strong>
                {post.description && <span>{post.description}</span>}
              </button>
              <VideoMedia post={post} />
              <div className="video-post-actions">
                <button type="button" className={post.liked ? 'active' : ''} title="Like"><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button>
                <button type="button" title="Comments"><MessageCircle size={17} /><span>{post.comments}</span></button>
                <button type="button" className={post.saved ? 'active' : ''} title="Save"><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saves}</span></button>
                <button type="button" title="Share"><Share2 size={17} /></button>
                <button type="button" className="btn btn-violet edit-button" onClick={() => onEditPost(post)}><Pencil size={14} /> Edit</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="video-feed-sentinel">{loading && posts.length > 0 && <span className="admin-loader" />}{!hasMore && posts.length > 0 && <span>All your videos loaded.</span>}</div>
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
  const sentinelRef = useRef<HTMLDivElement>(null);
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
      toast(error instanceof Error ? error.message : 'Could not load the video feed.', 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

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
    if (postId > 0) api<{ post: VideoPost }>(`/api/video/posts/${postId}`).then((data) => setActivePost(data.post)).catch(() => {});
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
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update like.', 'error'); }
  };

  const toggleSave = async (post: VideoPost) => {
    try {
      const data = await api<{ saved: boolean; saves: number }>(`/api/video/posts/${post.id}/save`, { method: 'POST' });
      updatePost(post.id, { saved: data.saved, saves: data.saves });
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update watchlist.', 'error'); }
  };

  const sharePost = async (post: VideoPost) => {
    const url = `${window.location.origin}/?hub=video&post=${post.id}`;
    try { await navigator.clipboard.writeText(url); toast('Post link copied.', 'ok'); } catch { toast(url); }
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
      toast('Playlist created.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create the playlist.', 'error');
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
    try { await api(`/api/video/posts/${post.id}/report`, { method: 'POST', body: JSON.stringify({ reason: 'Reported from Video Hub' }) }); toast('Post reported for review.', 'ok'); } catch (error) { toast(error instanceof Error ? error.message : 'Could not report this post.', 'error'); }
  };

  const deleteStudioPost = async (post: VideoPost) => {
    try { await api(`/api/video/posts/${post.id}`, { method: 'DELETE' }); setStudioPosts((current) => current.filter((item) => item.id !== post.id)); setPosts((current) => current.filter((item) => item.id !== post.id)); toast('Post deleted.', 'ok'); } catch (error) { toast(error instanceof Error ? error.message : 'Could not delete this post.', 'error'); }
  };

  const pageTitle = view === 'feed' ? 'A living video feed.' : t(`videoNav.${NAV.find((item) => item.id === view)?.key ?? 'feed'}`);
  const feedLabel = view === 'watchlist' ? 'Saved for later' : view === 'following' ? 'From creators you follow' : view === 'shorts' ? 'Swipeable shorts' : view === 'long' ? 'Long-form stories' : trending ? 'Trending right now' : activeSearch ? `Results for “${activeSearch}”` : 'Fresh from the community';

  return (
    <div className="hub-shell hub-shell-video video-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Video Hub" />
      <div className="video-hub-layout">
        <aside className="video-hub-sidebar">
          <div className="video-hub-brand"><span className="hub-empty-icon"><Clapperboard size={22} /></span><div><b>Video Hub</b><small>Post, watch, discover.</small></div></div>
          <nav>{NAV.map(({ id, key, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => changeView(id)}><Icon size={16} /><span>{t(`videoNav.${key}`)}</span></button>)}</nav>
          <button type="button" className="video-hub-jam-link" onClick={() => { setProduct('community'); setTab('jams'); }}><UsersRound size={15} /> Open Community</button>
        </aside>

        <main className="video-hub-main">
          <header className="video-hub-heading">
            <div><div className="hub-kicker">VIDEO HUB · CONNECTED TO JAMINO</div><h1>{pageTitle}</h1><p>Photos, posts, shorts and long videos — all from one account.</p></div>
            <div className="hub-heading-actions"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setCreatorOpen(true)}><BadgeCheck size={14} /> {creatorStatus === 'APPROVED' ? 'Creator profile' : 'Become a creator'}</button><button type="button" className="btn btn-violet" onClick={openCreate}><Plus size={15} /> Create</button></div>
          </header>

          {view === 'creators' && <CreatorsView onOpenCreator={setCreatorProfileId} />}

          {view === 'studio' && <CreatorStudio posts={studioPosts} loading={studioLoading} onDelete={(post) => void deleteStudioPost(post)} onEditProfile={() => setCreatorOpen(true)} onEditPost={setEditPost} />}
          {view === 'playlists' && <section className="video-playlists-view">
            <div className="video-playlist-hero"><ListVideo size={26} /><div><div className="hub-kicker">YOUR LIBRARY</div><h2>Keep a queue for later.</h2><p>Group posts, shorts and long videos into named playlists that stay with your account.</p></div></div>
            <form className="video-create-playlist" onSubmit={createPlaylist}><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="New video playlist" maxLength={80} /><button type="submit" className="btn btn-violet pill-sm" disabled={!playlistName.trim()}><Plus size={14} /> Create</button></form>
            {playlistsLoading && <div className="creator-profile-loading"><span className="admin-loader" /> Loading playlists…</div>}
            {!playlistsLoading && playlists.length === 0 && <div className="video-hub-empty"><ListVideo size={22} /><b>No playlists yet.</b><span>Create one above, or save any post with the playlist button.</span></div>}
            <div className="video-playlist-grid">
              {playlists.map((playlist) => (
                <button type="button" className="video-playlist-card" key={playlist.id} onClick={() => setOpenPlaylistId(playlist.id)}>
                  <ListVideo size={20} />
                  <b>{playlist.name}</b>
                  {playlist.description && <span className="video-playlist-card-desc">{playlist.description}</span>}
                  <span>{playlist.count} {playlist.count === 1 ? 'video' : 'videos'}</span>
                </button>
              ))}
            </div>
          </section>}

          {view === 'edit' && <EditView onEditPost={setEditPost} />}
          {view === 'watch' && <section className="video-watch-panel"><form className="video-watch-form" onSubmit={openWatch}><Search size={16} /><input value={watchUrl} onChange={(event) => setWatchUrl(event.target.value)} placeholder="Paste a direct video URL" /><button type="submit" className="btn btn-violet pill-sm">Open</button></form>{activeUrl ? <div className="video-watch-player"><video controls playsInline src={activeUrl} /><div className="video-watch-meta"><div><b>Shared video</b><span>{activeUrl}</span></div><button type="button" className="btn btn-ghost pill-sm" onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => toast('Watch link copied.', 'ok')).catch(() => {}); }}><Share2 size={14} /> Share</button></div></div> : <div className="video-hub-empty large"><Link2 size={26} /><b>No video selected.</b><span>Paste a direct MP4, MOV or WEBM URL to open it.</span></div>}</section>}

          {feedView && <section className={`video-feed-section ${view === 'shorts' ? 'is-shorts' : ''} ${view === 'long' ? 'is-long' : ''}`}>
            <div className="video-feed-toolbar">
              <div><span className="video-feed-dot" /> {feedLabel}</div>
              <div className="video-feed-toolbar-actions">
                {view === 'feed' && !activeSearch && <button type="button" className={`btn btn-ghost pill-sm ${trending ? 'active' : ''}`} onClick={() => setTrending((value) => !value)}><TrendingUp size={14} /> {trending ? 'Newest first' : 'Trending'}</button>}
                <form className="video-feed-search" onSubmit={submitSearch}>
                  <Search size={14} />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search the feed…" maxLength={120} />
                  {activeSearch && <button type="button" className="btn-icon" onClick={() => { setSearchQuery(''); setActiveSearch(''); }} title="Clear search"><X size={13} /></button>}
                </form>
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => { nextCursorRef.current = null; hasMoreRef.current = true; setHasMore(true); setPosts([]); void loadPosts(feedKind, true, view === 'watchlist', view === 'following', activeSearch, trending && view === 'feed'); }}><Sparkles size={14} /> Refresh</button>
              </div>
            </div>
            {loading && posts.length === 0 && <div className="video-loading-grid">{[1, 2, 3].map((item) => <div className="video-skeleton" key={item} />)}</div>}
            {!loading && posts.length === 0 && <div className="video-hub-empty large"><Film size={26} /><b>{activeSearch ? `Nothing matched “${activeSearch}”.` : view === 'watchlist' ? 'Your watchlist is empty.' : view === 'following' ? 'Follow a creator to shape this feed.' : 'The feed is waiting for its first post.'}</b><span>{activeSearch ? 'Try a different title, description or @username.' : view === 'watchlist' ? 'Tap the bookmark on anything you want to keep.' : creatorStatus === 'APPROVED' ? 'Publish the first photo, post or video from Create.' : 'Become a creator to start the first channel.'}</span><button type="button" className="btn btn-violet pill-sm" onClick={activeSearch ? () => { setSearchQuery(''); setActiveSearch(''); } : openCreate}><Plus size={14} /> {activeSearch ? 'Clear search' : creatorStatus === 'APPROVED' ? 'Create a post' : 'Become a creator'}</button></div>}
            {posts.length > 0 && <div className={view === 'shorts' ? 'video-shorts-feed' : view === 'long' ? 'video-long-grid' : 'video-feed-grid'}>{posts.map((post) => <VideoCard key={post.id} post={post} compact={view === 'shorts'} onOpenPost={() => openPost(post)} onOpenCreator={() => setCreatorProfileId(post.author.id)} onLike={() => toggleLike(post)} onSave={() => toggleSave(post)} onComment={() => setCommentsPost(post)} onShare={() => sharePost(post)} onSaveToPlaylist={() => setPlaylistPost(post)} onReport={() => void reportPost(post)} />)}</div>}
            <div ref={sentinelRef} className="video-feed-sentinel">{loading && posts.length > 0 && <span className="admin-loader" />}{!hasMore && posts.length > 0 && <span>You are all caught up.</span>}</div>
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
      {activePost && <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={() => { setActivePost(null); window.history.replaceState({}, '', '/?hub=video'); }}><section className="video-post-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="video-modal-head"><div><div className="hub-kicker">{activePost.kind} · VIDEO HUB</div><h2>{activePost.title || 'Post'}</h2></div><button type="button" className="btn-icon" onClick={() => { setActivePost(null); window.history.replaceState({}, '', '/?hub=video'); }} aria-label="Close"><X size={18} /></button></header><div className="video-post-modal-body"><VideoCard post={activePost} onOpen={() => {}} onLike={() => toggleLike(activePost)} onSave={() => toggleSave(activePost)} onComment={() => setCommentsPost(activePost)} onShare={() => sharePost(activePost)} /></div></section></div>}
    </div>
  );
}

function CreatorStudio({ posts, loading, onDelete, onEditProfile, onEditPost }: { posts: VideoPost[]; loading: boolean; onDelete: (post: VideoPost) => void; onEditProfile: () => void; onEditPost: (post: VideoPost) => void }) {
  const likes = posts.reduce((sum, post) => sum + post.likes, 0);
  const saves = posts.reduce((sum, post) => sum + post.saves, 0);
  const comments = posts.reduce((sum, post) => sum + post.comments, 0);
  const interactions = likes + saves + comments;
  const updateWorkflow = async (post: VideoPost, workflowStatus: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED') => {
    const publishAt = workflowStatus === 'SCHEDULED' ? window.prompt('Publish at (ISO date, e.g. 2026-09-20T18:00:00Z)') : null;
    try {
      const data = await api<{ post: VideoPost }>('/api/video/studio', { method: 'PATCH', body: JSON.stringify({ id: post.id, workflowStatus, publishAt }) });
      window.location.reload();
      void data;
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update workflow.', 'error'); }
  };

  return (
    <section className="creator-studio-view">
      <div className="creator-studio-hero">
        <div><div className="hub-kicker">CREATOR STUDIO</div><h2>Your publishing desk.</h2><p>Review every post, understand the response and update your public channel profile without leaving the hub.</p></div>
        <div className="creator-studio-hero-actions"><button type="button" className="btn btn-ghost pill-sm" onClick={onEditProfile}><Pencil size={14} /> Edit channel</button><LayoutDashboard size={32} /></div>
      </div>
      <CreatorInsights />
      <div className="creator-studio-metrics">
        <div className="creator-studio-metric"><BarChart3 size={17} /><b>{posts.length}</b><span>Published posts</span></div>
        <div className="creator-studio-metric"><Heart size={17} /><b>{likes}</b><span>Total likes</span></div>
        <div className="creator-studio-metric"><Bookmark size={17} /><b>{saves}</b><span>Total saves</span></div>
        <div className="creator-studio-metric"><MessageCircle size={17} /><b>{interactions}</b><span>Audience actions</span></div>
      </div>
      {loading ? <div className="creator-profile-loading"><span className="admin-loader" /> Loading your posts…</div> : posts.length === 0 ? <div className="video-hub-empty large"><Film size={24} /><b>No published work yet.</b><span>Open Create to publish your first post.</span></div> : <>
        <div className="creator-studio-toolbar"><p>Per-post analytics from likes, saves and comments.</p><span className="creator-studio-edit"><TrendingUp size={14} /> {interactions} tracked interactions</span></div>
        <div className="creator-studio-table">
          <div className="creator-studio-row creator-studio-row-head"><span>Post</span><span>Likes</span><span>Saves</span><span>Comments</span><span>Type</span><span /></div>
          {posts.map((post) => <div className="creator-studio-row" key={post.id}><div className="creator-studio-row-title"><div><b>{post.title || 'Untitled post'}</b><small>{new Date(post.createdAt).toLocaleDateString()} · {post.workflowStatus ?? 'PUBLISHED'}</small></div></div><span className="creator-studio-row-stat"><strong>{post.likes}</strong>likes</span><span className="creator-studio-row-stat"><strong>{post.saves}</strong>saves</span><span className="creator-studio-row-stat"><strong>{post.comments}</strong>comments</span><span className="creator-studio-row-stat"><strong>{post.kind}</strong>format</span><div className="creator-studio-row-actions"><button type="button" className="btn-icon" onClick={() => onEditPost(post)} title="Edit post"><Pencil size={15} /></button><button type="button" className="btn btn-ghost pill-sm" onClick={() => void updateWorkflow(post, post.workflowStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}>{post.workflowStatus === 'PUBLISHED' ? 'Draft' : 'Publish'}</button><button type="button" className="btn btn-ghost pill-sm" onClick={() => void updateWorkflow(post, 'SCHEDULED')}>Schedule</button><button type="button" className="btn-icon danger" onClick={() => onDelete(post)} title="Delete post"><Trash2 size={15} /></button></div></div>)}
        </div>
        <CreatorCollabStudio posts={posts.map((post) => ({ id: post.id, title: post.title, kind: post.kind }))} />
      </>}
    </section>
  );
}
