'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, ExternalLink, Film, Heart, UserPlus, UserRoundCheck, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { JaminoAvatar } from '@/components/jamino-avatar';

interface ProfilePost {
  id: number;
  title: string;
  kind: string;
  mediaType: string;
  assetUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  likes: number;
}

interface CreatorProfile {
  id: number;
  username: string;
  avatarId: number;
  avatarPhoto: string | null;
  channelName: string;
  handle: string;
  bio: string;
  category: string;
  links: string[];
  followers: number;
  following: boolean;
  hub: string;
}

export function CreatorProfileModal({ creatorId, open, onClose }: { creatorId: number | null; open: boolean; onClose: () => void }) {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open || !creatorId) return;
    setLoading(true);
    api<{ creator: CreatorProfile; posts: ProfilePost[] }>(`/api/creators/${creatorId}?hub=VIDEO`)
      .then((data) => { setCreator(data.creator); setPosts(data.posts); })
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not load creator profile.', 'error'))
      .finally(() => setLoading(false));
  }, [creatorId, open]);

  const toggleFollow = async () => {
    if (!creator || working) return;
    setWorking(true);
    try {
      const data = await api<{ following: boolean }>(`/api/creators/${creator.id}/follow?hub=VIDEO`, { method: 'POST' });
      setCreator((current) => current ? { ...current, following: data.following, followers: current.followers + (data.following ? 1 : -1) } : current);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update follow.', 'error');
    } finally {
      setWorking(false);
    }
  };

  if (!open) return null;
  return (
    <div className="creator-profile-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="creator-profile-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="creator-profile-head"><div className="creator-profile-identity"><div className="creator-profile-avatar"><JaminoAvatar avatarId={creator?.avatarId ?? 0} size={58} photo={creator?.avatarPhoto ?? null} name={creator?.username ?? 'Creator'} /></div><div><div className="hub-kicker">CREATOR PROFILE</div><h2>{creator?.channelName || 'Creator'}</h2><span>@{creator?.handle || creator?.username || 'creator'}</span></div></div><button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {loading ? <div className="creator-profile-loading"><span className="admin-loader" /> Loading profile…</div> : creator ? <>
          <div className="creator-profile-summary"><div><BadgeCheck size={16} /> {creator.category || 'Video creator'}</div><b>{creator.followers} followers</b><p>{creator.bio || 'No creator bio yet.'}</p><button type="button" className={`btn ${creator.following ? 'btn-ghost' : 'btn-violet'} pill-sm`} onClick={() => void toggleFollow()} disabled={working}>{creator.following ? <UserRoundCheck size={14} /> : <UserPlus size={14} />} {creator.following ? 'Following' : 'Follow'}</button>{creator.links.length > 0 && <div className="creator-profile-links">{creator.links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer"><ExternalLink size={13} /> {link}</a>)}</div>}</div>
          <div className="creator-profile-posts"><div className="creator-profile-section-title"><Film size={15} /> Published work</div>{posts.length === 0 ? <div className="creator-profile-empty">This creator has not published a video yet.</div> : <div className="creator-profile-post-grid">{posts.map((post) => <article key={post.id} className="creator-profile-post"><div className="creator-profile-post-media">{post.mediaType === 'VIDEO' ? <video controls playsInline poster={post.thumbnailUrl || undefined} src={post.assetUrl || post.externalUrl || undefined} /> : post.mediaType === 'IMAGE' ? <Image src={post.assetUrl || post.externalUrl || ''} alt="" fill unoptimized /> : <div><Heart size={18} /><span>{post.title}</span></div>}</div><div><b>{post.title || 'Untitled post'}</b><small>{post.kind} · {post.likes} likes</small></div></article>)}</div>}</div>
        </> : <div className="creator-profile-empty">Creator profile unavailable.</div>}
      </section>
    </div>
  );
}
