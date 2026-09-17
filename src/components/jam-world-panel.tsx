'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Copy, Crown, Flame, Globe2, Link2, Music2, Play, Sparkles, UsersRound, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';

interface WorldMember { id: number; username: string; }
interface JamWorldProps { jamId: string; jamName: string; kind: string; description: string; members: WorldMember[]; messages: { text: string; user: { username: string } }[]; isOwner: boolean; }
interface Moment { id: string; title: string; kind: string; note: string; snapshot: { memberCount?: number; messageCount?: number; roomKind?: string }; createdAt: string; user: { username: string }; }

const worldCopy: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  CHAT: { label: 'Conversation Lounge', icon: <Sparkles size={15} />, tone: 'chat' },
  HANGOUT: { label: 'Hangout Arcade', icon: <UsersRound size={15} />, tone: 'hangout' },
  MUSIC: { label: 'Listening Arena', icon: <Music2 size={15} />, tone: 'music' },
  MOVIE: { label: 'Cinema Party', icon: <Play size={15} />, tone: 'movie' },
};

export function JamWorldPanel({ jamId, jamName, kind, description, members, messages, isOwner }: JamWorldProps) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const world = worldCopy[kind] ?? worldCopy.CHAT;
  const latestText = messages.at(-1)?.text || 'The room is warming up.';
  const energy = Math.min(100, Math.max(18, members.length * 16 + messages.length * 3));
  const snapshot = useMemo(() => ({ memberCount: members.length, messageCount: messages.length, roomKind: kind }), [kind, members.length, messages.length]);

  const loadMoments = () => api<{ moments: Moment[] }>(`/api/jams/${jamId}/moments`).then((data) => setMoments(data.moments)).catch(() => {});
  useEffect(() => { loadMoments(); }, [jamId]);

  const createMoment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ moment: Moment }>(`/api/jams/${jamId}/moments`, { method: 'POST', body: JSON.stringify({ title, note, kind: world.label.toUpperCase().replaceAll(' ', '_'), snapshot }) });
      setMoments((items) => [data.moment, ...items]);
      setTitle('');
      setNote('');
      setOpen(false);
      toast('Moment captured.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not capture this moment.', 'error');
    } finally { setBusy(false); }
  };

  const copyMoment = async (moment: Moment) => {
    const url = `${window.location.origin}/moment/${encodeURIComponent(moment.id)}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast('Moment link copied.', 'ok');
  };

  return (
    <section className={`jam-world-panel jam-world-${world.tone}`}>
      <div className="jam-world-orbit" />
      <div className="jam-world-copy"><div className="jam-world-kicker"><Globe2 size={13} /> JAM WORLD · LIVE SPACE</div><h2>{jamName}</h2><p>{description || latestText}</p><div className="jam-world-tags"><span>{world.icon} {world.label}</span><span><UsersRound size={12} /> {members.length} inside</span><span><Flame size={12} /> {energy}% energy</span></div></div>
      <div className="jam-world-actions"><button type="button" className="btn btn-violet pill-sm" onClick={() => setOpen(true)}><Camera size={14} /> Capture moment</button>{isOwner && <span className="jam-world-owner"><Crown size={13} /> Host world</span>}</div>
      {moments.length > 0 && <div className="jam-moments-strip"><div className="jam-moments-label"><Sparkles size={13} /> Live moments</div>{moments.slice(0, 3).map((moment) => <button type="button" className="jam-moment-chip" key={moment.id} onClick={() => void copyMoment(moment)}><span><b>{moment.title}</b><small>@{moment.user.username}</small></span><Link2 size={13} /></button>)}</div>}
      {open && <div className="jam-moment-popover"><form onSubmit={createMoment}><div className="jam-moment-popover-head"><b>Capture this moment</b><button type="button" className="btn-icon" onClick={() => setOpen(false)}><X size={15} /></button></div><input className="auth-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Moment title" maxLength={90} autoFocus /><textarea className="auth-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What makes this moment special?" maxLength={400} rows={3} /><button type="submit" className="btn btn-violet" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save and share'}</button></form></div>}
    </section>
  );
}
