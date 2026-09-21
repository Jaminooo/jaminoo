'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Copy, Crown, Flame, Globe2, Link2, Music2, Play, Sparkles, Tv2, UsersRound, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';

interface WorldMember { id: number; username: string; }
interface JamWorldProps { jamId: string; jamName: string; kind: string; description: string; members: WorldMember[]; messages: { text: string; user: { username: string } }[]; isOwner: boolean; }
interface Moment { id: string; title: string; kind: string; note: string; snapshot: { memberCount?: number; messageCount?: number; roomKind?: string }; createdAt: string; user: { username: string }; }

const WORLD: Record<string, { icon: React.ReactNode; tone: string }> = {
  CHAT: { icon: <Sparkles size={15} />, tone: 'chat' },
  HANGOUT: { icon: <UsersRound size={15} />, tone: 'hangout' },
  MUSIC: { icon: <Music2 size={15} />, tone: 'music' },
  MOVIE: { icon: <Play size={15} />, tone: 'movie' },
  ANIME: { icon: <Tv2 size={15} />, tone: 'anime' },
};

export function JamWorldPanel({ jamId, jamName, kind, description, members, messages, isOwner }: JamWorldProps) {
  const t = useTranslations();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const world = WORLD[kind] ?? WORLD.CHAT;
  const worldLabel = t(`jamWorld.world${kind}`) || t('jamWorld.worldChat');
  const latestText = messages.at(-1)?.text || t('jamWorld.warming');
  const energy = Math.min(100, Math.max(18, members.length * 16 + messages.length * 3));
  const snapshot = useMemo(() => ({ memberCount: members.length, messageCount: messages.length, roomKind: kind }), [kind, members.length, messages.length]);

  const loadMoments = useCallback(() => api<{ moments: Moment[] }>(`/api/jams/${jamId}/moments`).then((data) => setMoments(data.moments)).catch(() => {}), [jamId]);
  useEffect(() => { void loadMoments(); }, [loadMoments]);

  const createMoment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ moment: Moment }>(`/api/jams/${jamId}/moments`, { method: 'POST', body: JSON.stringify({ title, note, kind, snapshot }) });
      setMoments((items) => [data.moment, ...items]);
      setTitle('');
      setNote('');
      setOpen(false);
      toast(t('jamWorld.momentCaptured'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('jamWorld.captureFailed'), 'error');
    } finally { setBusy(false); }
  };

  const copyMoment = async (moment: Moment) => {
    const url = `${window.location.origin}/moment/${encodeURIComponent(moment.id)}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast(t('jamWorld.linkCopied'), 'ok');
  };

  return (
    <section className={`jam-world-panel jam-world-${world.tone}`}>
      <div className="jam-world-orbit" />
      <div className="jam-world-copy"><div className="jam-world-kicker"><Globe2 size={13} /> {t('jamWorld.liveSpace')}</div><h2>{jamName}</h2><p>{description || latestText}</p><div className="jam-world-tags"><span>{world.icon} {worldLabel}</span><span><UsersRound size={12} /> {members.length} {t('jamWorld.inside')}</span><span><Flame size={12} /> {energy}% {t('jamWorld.energy')}</span></div></div>
      <div className="jam-world-actions"><button type="button" className="btn btn-violet pill-sm" onClick={() => setOpen(true)} title={t('jamWorld.captureHint')}><Camera size={14} /> {t('jamWorld.captureMoment')}</button><small className="jam-world-action-hint">{t('jamWorld.captureHint')}</small>{isOwner && <span className="jam-world-owner"><Crown size={13} /> {t('jamWorld.hostWorld')}</span>}</div>
      {moments.length > 0 && <div className="jam-moments-strip"><div className="jam-moments-label"><Sparkles size={13} /> {t('jamWorld.liveMoments')}</div>{moments.slice(0, 3).map((moment) => <button type="button" className="jam-moment-chip" key={moment.id} onClick={() => void copyMoment(moment)}><span><b>{moment.title}</b><small>@{moment.user.username}</small></span><Link2 size={13} /></button>)}</div>}
      {open && <div className="jam-moment-popover"><form onSubmit={createMoment}><div className="jam-moment-popover-head"><b>{t('jamWorld.captureThis')}</b><button type="button" className="btn-icon" onClick={() => setOpen(false)}><X size={15} /></button></div><input className="auth-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('jamWorld.momentTitlePh')} maxLength={90} autoFocus /><textarea className="auth-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('jamWorld.momentNotePh')} maxLength={400} rows={3} /><button type="submit" className="btn btn-violet" disabled={busy || !title.trim()}>{busy ? t('jamWorld.saving') : t('jamWorld.saveShare')}</button></form></div>}
    </section>
  );
}