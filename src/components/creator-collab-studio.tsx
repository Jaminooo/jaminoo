'use client';

import { useEffect, useState } from 'react';
import { Check, Handshake, Mail, Send, UsersRound, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { JaminoAvatar } from '@/components/jamino-avatar';

interface CollabPost { id: number; title: string; kind: string; }
interface Friend { id: number; username: string; avatarId: number; avatarPhoto?: string | null; }
interface Invite { id: number; post: CollabPost; from: Friend; to: Friend; status: string; message: string; }

export function CreatorCollabStudio({ posts }: { posts: CollabPost[] }) {
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
      toast('Collaboration invite sent.', 'ok');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not send invite.', 'error'); }
    finally { setBusy(false); }
  };

  const respond = async (inviteId: number, action: 'accept' | 'decline') => {
    try {
      await api('/api/video/collabs', { method: 'PATCH', body: JSON.stringify({ inviteId, action }) });
      setReceived((items) => items.map((item) => item.id === inviteId ? { ...item, status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' } : item));
      toast(action === 'accept' ? 'Collaboration accepted.' : 'Invite declined.', 'ok');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update invite.', 'error'); }
  };

  return (
    <section className="creator-collab-studio">
      <div className="creator-collab-head"><div><div className="hub-kicker"><Handshake size={13} /> COLLAB STUDIO</div><h3>Make the next drop together.</h3><p>Invite a friend into a post, keep the brief in one place and accept incoming collaborations.</p></div><span className="creator-collab-count"><UsersRound size={15} /> {sent.filter((item) => item.status === 'PENDING').length} pending</span></div>
      <form className="creator-collab-form" onSubmit={invite}><select value={postId} onChange={(event) => setPostId(event.target.value)}><option value="">Choose a post</option>{posts.map((post) => <option key={post.id} value={post.id}>{post.title || 'Untitled post'} · {post.kind}</option>)}</select><select value={friendId} onChange={(event) => setFriendId(event.target.value)}><option value="">Invite a friend</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>@{friend.username}</option>)}</select><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a short creative brief" maxLength={240} /><button type="submit" className="btn btn-violet pill-sm" disabled={busy || !postId || !friendId}><Send size={14} /> Invite</button></form>
      {received.filter((item) => item.status === 'PENDING').length > 0 && <div className="creator-collab-inbox"><div className="creator-collab-label"><Mail size={14} /> Incoming invites</div>{received.filter((item) => item.status === 'PENDING').map((item) => <div className="creator-collab-invite" key={item.id}><JaminoAvatar avatarId={item.from.avatarId} size={30} photo={item.from.avatarPhoto} name={item.from.username} /><span><b>@{item.from.username}</b><small>{item.post.title || 'Untitled post'}{item.message ? ` · ${item.message}` : ''}</small></span><button type="button" className="btn-icon violet" onClick={() => void respond(item.id, 'accept')} title="Accept"><Check size={15} /></button><button type="button" className="btn-icon" onClick={() => void respond(item.id, 'decline')} title="Decline"><X size={15} /></button></div>)}</div>}
    </section>
  );
}
