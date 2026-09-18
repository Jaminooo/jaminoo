'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, CalendarDays, Ghost } from 'lucide-react';
import { mangaBySlug, type MangaTitle } from '@/data/manga';
import { useTranslations } from '@/providers/use-translations';
import { WorkspaceTopbar } from '@/components/hub-gateway';

export function MangaTimeline({ slug }: { slug: string }) {
  const t = useTranslations();
  const router = useRouter();
  const manga = mangaBySlug(slug) as MangaTitle | undefined;
  const [filtered, setFiltered] = useState<number | null>(null);

  const chapters = useMemo(() => {
    if (!manga) return [];
    return Array.from({ length: manga.chapters }, (_, i) => manga.chapters - i);
  }, [manga]);

  if (!manga) {
    return (
      <div className="hub-shell anime-hub-shell">
        <div className="anime-empty" style={{ padding: '6em 2em' }}>
          <Ghost size={30} />
          <p>{t('manga.noManga')}</p>
          <button type="button" className="hub-back" onClick={() => router.push('/anime')}>
            <ArrowLeft size={15} /> {t('manga.backToAnime')}
          </button>
        </div>
      </div>
    );
  }

  const shown = filtered ?? manga.chapters;

  const gotoChapter = (n: number) => router.push(`/manga/${slug}/${n}`);

  return (
    <div className="hub-shell anime-hub-shell">
      <WorkspaceTopbar onHome={() => router.push('/')} product={manga.title} />
      <main className="anime-hub-content manga-timeline-page">
        <button type="button" className="hub-back" onClick={() => router.push('/anime?tab=manga')}>
          <ArrowLeft size={15} /> {t('manga.backToAnime')}
        </button>

        <header className="manga-tl-hero">
          <div className="manga-tl-cover" style={{ background: `linear-gradient(160deg, hsl(${manga.hue[0]} 70% 30%), hsl(${manga.hue[1]} 80% 20%))` }}>
            <BookOpen size={30} />
          </div>
          <div className="manga-tl-head">
            <div className="hub-kicker">{t('manga.timeline')}</div>
            <h1>{manga.title}</h1>
            <p className="anime-modal-original">{manga.original}</p>
            <p className="manga-tl-meta">
              <span><BookOpen size={13} /> {manga.chapters} {t('manga.chapters')}</span>
              <span><CalendarDays size={13} /> {manga.stage || '—'}</span>
            </p>
            <div className="anime-toolbar manga-tl-search">
              <input
                type="number"
                min={1}
                max={manga.chapters}
                value={filtered ?? ''}
                placeholder={t('anime.searchPlaceholder')}
                onChange={(e) => setFiltered(e.target.value === '' ? null : Number(e.target.value))}
              />
              {filtered !== null && (
                <button type="button" onClick={() => setFiltered(null)} aria-label="Clear">{t('anime.clearSearch')}</button>
              )}
            </div>
          </div>
        </header>

        <p className="manga-tl-opener">{t('manga.opener')}</p>

        <div className="manga-timeline">
          {chapters.slice(0, shown).map((no, i) => {
            const to = Math.min(no, i * 6);
            const title = `${t('manga.chapterLabel')} ${no}`;
            return (
              <div
                className={`tl-box ${i % 2 ? 'tl-box--rev' : ''}`}
                key={no}
              >
                <div className="tl-box-card" onClick={() => gotoChapter(no)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') gotoChapter(no); }}>
                  <div className="tl-box-top">
                    <span className="tl-box-no">#{no}</span>
                    <span className="tl-box-studio">{manga.studio}</span>
                  </div>
                  <strong className="tl-box-title">{title}</strong>
                  <p className="tl-box-sub">
                    {i === 0 ? 'Latest chapter' : `Saga recap · ~${to} min read`}
                  </p>
                </div>
              </div>
            );
          })}

          {shown < manga.chapters && (
            <button type="button" className="tl-box-load" onClick={() => setFiltered(null)}>
              Show all {manga.chapters} chapters
            </button>
          )}
        </div>

        <footer className="manga-tl-foot">
          <button type="button" className="anime-watch-btn" onClick={() => gotoChapter(1)}>
            <BookOpen size={15} /> {t('manga.read')} — {manga.title}
          </button>
        </footer>
      </main>
    </div>
  );
}