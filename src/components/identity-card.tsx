'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Globe2, Music2, Share2, Sparkles, UsersRound } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { JamiMascot } from '@/components/jami-mascot';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';

export function IdentityCard() {
  const t = useTranslations();
  const me = useAppStore((state) => state.me);
  const setProduct = useAppStore((state) => state.setProduct);
  const [copied, setCopied] = useState(false);
  if (!me) return null;
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/?profile=${me.id}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast(t('identityCard.linkCopied'), 'ok');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast(t('identityCard.copyFailed'), 'error');
    }
  };
  return (
    <section className="identity-card">
      <div className="identity-card-glow" />
      <div className="identity-card-top"><div className="identity-card-person"><JaminoAvatar avatarId={me.avatarId} size={66} photo={me.avatarPhoto} name={me.username} /><div><div className="identity-card-kicker"><Sparkles size={12} /> {t('identityCard.kicker')}</div><h3>@{me.username}</h3><p>{me.bio || t('identityCard.fallbackBio')}</p></div></div><JamiMascot state={me.status === 'ONLINE' ? 'happy' : 'idle'} size={86} /></div>
      <div className="identity-card-status"><span className={`identity-status-dot ${me.status.toLowerCase()}`} /><b>{me.statusText || me.status}</b><span>·</span><span>{t('identityCard.connected')}</span></div>
      <div className="identity-card-actions"><button type="button" className="btn btn-violet pill-sm" onClick={() => setProduct('music')}><Music2 size={14} /> {t('identityCard.openMusic')}</button><button type="button" className="btn btn-ghost pill-sm" onClick={() => setProduct('community')}><UsersRound size={14} /> {t('identityCard.findPeople')}</button><button type="button" className="btn-icon" onClick={() => void copy()} title={t('identityCard.copyLink')} aria-label={t('identityCard.copyLink')}>{copied ? <Copy size={15} /> : <Share2 size={15} />}</button><a className="btn-icon" href={`/profile/${me.id}`} title={t('identityCard.openProfile')} aria-label={t('identityCard.openProfile')}><ExternalLink size={15} /></a></div>
      <div className="identity-card-foot"><span><Globe2 size={13} /> {t('identityCard.publicCard')}</span><span>{t('identityCard.id')} {String(me.id).padStart(4, '0')}</span></div>
    </section>
  );
}
