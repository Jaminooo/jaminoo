'use client';

import { useEffect, useState } from 'react';
import { Check, Handshake, Mail, Send, UsersRound, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { connectLive, onLive } from '@/lib/live';
import { toast } from '@/components/toast';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useTranslations } from '@/providers/use-translations';

interface CollabPost { id: number; title: string; kind: string; }
interface Friend { id: number; username: string; avatarId: number; avatarPhoto?: string | null; }
interface Invite { id: number; post: CollabPost; from: Friend; to: Friend; status: string; message: string; }

export function CreatorCollabStudio({ posts }: { posts: CollabPost[] }) {
  const t = useTranslations();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<Invite[]>([]);
  const [sent, setSent] = useState<Invite[]>([]);
  const [postId, setPostId] = useState(posts[0]?.id ? String(posts[0].id) : '');
  const [friendId, setFriendId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ friends: Friend[] }>('/api/friends').then((data) => setFriends(data.friends)).catch(() => {});
    api<{ received: Invite[]; sent: Invite[] }>('/api/video/collabs').then((data) => { setReceived(data.received); setSent(data.sent); }).catch(() => {});
    connectLive();
    const refresh = () => api<{ received: Invite[]; sent: Invite[] }>('/api/video/collabs').then((data) => { setReceived(data.received); setSent(data.sent); }).catch(() => {});
    const off = onLive('video:collab:update', refresh);
    return off;
  }, []);

  useEffect(() => { if (!postId && posts[0]?.id) setPostId(String(posts[0].id)); }, [posts, postId]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!postId || !friendId) return;
    setBusy(true);
    try {
      const data = await api<{ invite: Invite }>('/api/video/collabs', { method: 'POST', body: JSON.stringify({ postId: Number(postId), toUserId: Number(friendId), message }) });
      setSent((items) => [data.invite, ...items]);
      setMessage('');
      toast(t('video.studio.collab.toastSent'), 'ok');
    } catch (error) { toast(error instanceof Error ? error.message : t('video.studio.collab.toastSendError'), 'error'); }
    finally { setBusy(false); }
  };

  const respond = async (inviteId: number, action: 'accept' | 'decline') => {
    try {
      await api('/api/video/collabs', { method: 'PATCH', body: JSON.stringify({ inviteId, action }) });
      setReceived((items) => items.map((item) => item.id === inviteId ? { ...item, status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' } : item));
      toast(action === 'accept' ? t('video.studio.collab.toastAccepted') : t('video.studio.collab.toastDeclined'), 'ok');
    } catch (error) { toast(error instanceof Error ? error.message : t('video.studio.collab.toastError'), 'error'); }
  };

  return (
    <section className="creator-collab-studio">
      <div className="creator-collab-head"><div><div className="hub-kicker"><Handshake size={13} /> {t('video.studio.collab.kicker')}</div><h3>{t('video.studio.collab.title')}</h3><p>{t('video.studio.collab.sub')}</p></div><span className="creator-collab-count"><UsersRound size={15} /> {t('video.studio.collab.pending', { n: sent.filter((item) => item.status === 'PENDING').length })}</span></div>
      <form className="creator-collab-form" onSubmit={invite}><select value={postId} onChange={(event) => setPostId(event.target.value)}><option value="">{t('video.studio.collab.choosePost')}</option>{posts.map((post) => <option key={post.id} value={post.id}>{post.title || t('video.common.untitledPost')} · {post.kind}</option>)}</select><select value={friendId} onChange={(event) => setFriendId(event.target.value)}><option value="">{t('video.studio.collab.chooseFriend')}</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>@{friend.username}</option>)}</select><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('video.studio.collab.briefPh')} maxLength={240} /><button type="submit" className="btn btn-violet pill-sm" disabled={busy || !postId || !friendId}><Send size={14} /> {t('video.studio.collab.invite')}</button></form>
      {received.filter((item) => item.status === 'PENDING').length > 0 && <div className="creator-collab-inbox"><div className="creator-collab-label"><Mail size={14} /> {t('video.studio.collab.inbox')}</div>{received.filter((item) => item.status === 'PENDING').map((item) => <div className="creator-collab-invite" key={item.id}><JaminoAvatar avatarId={item.from.avatarId} size={30} photo={item.from.avatarPhoto} name={item.from.username} /><span><b>@{item.from.username}</b><small>{item.post.title || t('video.common.untitledPost')}{item.message ? ` · ${item.message}` : ''}</small></span><button type="button" className="btn-icon violet" onClick={() => void respond(item.id, 'accept')} title={t('video.studio.collab.acceptTitle')}><Check size={15} /></button><button type="button" className="btn-icon" onClick={() => void respond(item.id, 'decline')} title={t('video.studio.collab.declineTitle')}><X size={15} /></button></div>)}</div>}
    </section>
  );
}