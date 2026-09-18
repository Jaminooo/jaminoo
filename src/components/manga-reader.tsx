'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MousePointer2, X } from 'lucide-react';
import { mangaBySlug, chapterPages } from '@/data/manga';

function clampv(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface MangaReaderProps {
  slug: string;
  chapter: number;
}

export function MangaReader({ slug, chapter }: MangaReaderProps) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const manga = useMemo(() => mangaBySlug(slug), [slug]);
  const pages = useMemo(() => chapterPages(slug, chapter), [slug, chapter]);
  const pageCount = pages.length || 1;
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;
  pageRef.current = page;

  const go = useCallback((index: number) => {
    const next = clampv(index, 0, pageCountRef.current - 1);
    pageRef.current = next;
    setPage(next);
    requestAnimationFrame(() => {
      const item = stripRef.current?.children[next] as HTMLElement | undefined;
      item?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const onMove = useCallback((event: PointerEvent) => {
    const stage = stageRef.current;
    const light = lightRef.current;
    if (!stage || !light) return;
    const rect = stage.getBoundingClientRect();
    light.style.setProperty('--lx', `${event.clientX - rect.left}px`);
    light.style.setProperty('--ly', `${event.clientY - rect.top}px`);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 4) return;
      event.preventDefault();
      go(pageRef.current + (event.deltaY > 0 ? 1 : -1));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ';
      const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp';
      if (!forward && !backward) return;
      event.preventDefault();
      go(pageRef.current + (forward ? 1 : -1));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      stage.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [go, onMove]);

  useEffect(() => {
    setPage(0);
    pageRef.current = 0;
    stripRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [slug, chapter]);

  const close = () => router.push('/anime?tab=manga');
  const chapterPath = (next: number) => router.push(`/manga/${slug}/${next}`);

  if (!manga) {
    return <div className="manga-reader-empty"><p>Manga not found.</p><button type="button" onClick={close}>Close</button></div>;
  }

  return (
    <div className="manga-reader-shell">
      <header className="manga-reader-bar">
        <button type="button" className="manga-reader-btn" onClick={close} aria-label="Back to manga"><X size={18} /></button>
        <div className="manga-reader-title"><b>{manga.title}</b><span>Chapter {chapter} · page {page + 1} / {pageCount}</span></div>
        <div className="manga-reader-chapter-nav">
          <button type="button" className="manga-reader-btn" disabled={chapter <= 1} onClick={() => chapterPath(chapter - 1)} aria-label="Previous chapter"><ChevronLeft size={17} /><small>Chapter</small></button>
          <button type="button" className="manga-reader-btn" disabled={chapter >= manga.chapters} onClick={() => chapterPath(chapter + 1)} aria-label="Next chapter"><small>Chapter</small><ChevronRight size={17} /></button>
        </div>
        <div className="manga-reader-nav">
          <button type="button" className="manga-reader-btn" disabled={page <= 0} onClick={() => go(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
          <button type="button" className="manga-reader-btn" disabled={page >= pageCount - 1} onClick={() => go(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
        </div>
      </header>
      <main className="manga-reader-stage" ref={stageRef}>
        <div className="manga-reader-strip" ref={stripRef}>
          {pages.map((src, index) => (
            <figure key={`${src}-${index}`} className={`manga-reader-panel ${index === page ? 'active' : ''}`} onClick={() => go(index)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${manga.title} chapter ${chapter} page ${index + 1}`} loading={index < 2 ? 'eager' : 'lazy'} draggable={false} />
            </figure>
          ))}
        </div>
        <div className="manga-reader-shade" aria-hidden="true" />
        <div className="manga-reader-light" ref={lightRef} aria-hidden="true" />
        <div className="manga-reader-hint"><MousePointer2 size={13} /> نور موس فعال است · اسکرول یا فلش‌ها برای جابه‌جایی بین صفحات</div>
      </main>
    </div>
  );
}
