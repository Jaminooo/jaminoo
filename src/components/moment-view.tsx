'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe2, Link2, Sparkles, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { JamiMascot } from '@/components/jami-mascot';
import { toast } from '@/components/toast';
import { useLocale, useTranslations } from '@/providers/use-translations';

export function MomentView({ momentId }: { momentId: string }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    api<{ moment: any }>(`/api/moments/${encodeURIComponent(momentId)}`)
      .then((result) => { if (active) setData(result.moment); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [momentId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast(t('momentPage.copied'), 'ok');
    } catch {
      toast(t('momentPage.copyFailed'), 'error');
    }
  };

  if (error) return <main className="moment-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}><JamiMascot state="404" size={170} /><h1>{t('momentPage.notFound')}</h1><Link href="/">{t('momentPage.back')}</Link></main>;
  if (!data) return <main className="moment-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}><JamiMascot state="wave" size={130} /><p>{t('momentPage.opening')}</p></main>;
  return <main className="moment-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}><div className="moment-page-glow" /><div className="moment-page-brand"><span className="wordmark-mark"><Sparkles size={15} /></span> Jamino</div><section className="moment-card"><div className="moment-card-kicker"><Globe2 size={13} /> {t('momentPage.liveMoment', { kind: data.jam.kind })}</div><h1>{data.title}</h1><p>{data.note || data.jam.desc || t('momentPage.fallbackNote')}</p><div className="moment-card-meta"><span><UsersRound size={14} /> {data.snapshot?.memberCount ?? 0} {t('momentPage.peopleInside')}</span><span>@{data.user.username}</span><span>{new Date(data.createdAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span></div><div className="moment-card-actions"><Link className="btn btn-violet" href={`/join/${data.jam.id}`}><UsersRound size={15} /> {t('momentPage.join')}</Link><button type="button" className="btn btn-ghost" onClick={() => void copyLink()}><Link2 size={15} /> {t('momentPage.copy')}</button></div></section><Link className="moment-back" href="/"><ArrowLeft size={14} /> {t('momentPage.explore')}</Link></main>;
}
