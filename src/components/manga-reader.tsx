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

/**
 * MangaReader — paged, dependency-free reader with a simple CSS torch.
 *
 * Pages form a horizontally-snapped strip; the wheel / arrow keys / on-screen
 * buttons flip between spreads. A permanent dark veil keeps the page shadowed
 * and a warm light always follows the cursor so the point under it stays
 * readable (pure CSS — no WebGPU).
 */
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

  const [isDesktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (min-width: 768px)');
    const upd = () => setDesktop(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  const onMove = useCallback((e: PointerEvent) => {
    const light = lightRef.current;
    const stage = stageRef.current;
    if (!light || !stage) return;
    const r = stage.getBoundingClientRect();
    light.style.setProperty('--lx', `${e.clientX - r.left}px`);
    light.style.setProperty('--ly', `${e.clientY - r.top}px`);
  }, []);

  const go = useCallback((i: number) => {
    const next = clampv(i, 0, pageCountRef.current - 1);
    pageRef.current = next;
    setPage(next);
    requestAnimationFrame(() => {
      const item = stripRef.current?.children[next] as HTMLElement | undefined;
      item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    });
  }, []);

  useEffect(() => {
    const advance = (dir: 1 | -1) => {
      go(pageRef.current + dir);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const fwd =
        e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter';
      const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp';
      if (fwd || back) {
        e.preventDefault();
        advance(fwd ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
    };
  }, [go, onMove]);

  const onStageWheel = useCallback((e: React.WheelEvent) => {
    if (!isDesktop) return;
    if (Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    go(pageRef.current + (e.deltaY > 0 ? 1 : -1));
  }, [isDesktop, go]);

  useEffect(() => {
    setPage(0);
    pageRef.current = 0;
    stripRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [slug, chapter]);

  const close = useCallback(() => router.push('/anime?tab=manga'), [router]);
  const chapterPath = (next: number) => {
    if (next < 1 || next > manga!.chapters) return;
    router.push(`/manga/${slug}/${next}`);
  };

  if (!manga) {
    return <div className="manga-reader-empty"><p>Manga not found.</p><button type="button" onClick={close}>Close</button></div>;
  }

  return (
    <div className="manga-reader-shell manga-reader-rtl">
      <header className="manga-reader-bar">
        <button type="button" className="manga-reader-btn manga-reader-close" onClick={close} aria-label="Close">
          <X size={18} />
        </button>
        <div className="manga-reader-title">
          <b>{manga.title}</b>
          <span>فصل {chapter} · صفحه {page + 1} از {pageCount}</span>
        </div>
        <div className="manga-reader-chapter-nav">
          <button type="button" className="manga-reader-btn" disabled={chapter <= 1} onClick={() => chapterPath(chapter - 1)} aria-label="Previous chapter"><ChevronLeft size={17} /><small>فصل</small></button>
          <button type="button" className="manga-reader-btn" disabled={chapter >= manga.chapters} onClick={() => chapterPath(chapter + 1)} aria-label="Next chapter"><small>فصل</small><ChevronRight size={17} /></button>
        </div>
        <div className="manga-reader-nav">
          <button type="button" className="manga-reader-btn" onClick={() => go(page - 1)} disabled={page <= 0} aria-label="Previous page"><ChevronRight size={18} /></button>
          <button type="button" className="manga-reader-btn" onClick={() => go(page + 1)} disabled={page >= pageCount - 1} aria-label="Next page"><ChevronLeft size={18} /></button>
        </div>
      </header>

      <main className="manga-reader-stage" ref={stageRef} onWheel={onStageWheel}>
        <div className="manga-reader-strip" ref={stripRef}>
          {pages.map((src, index) => (
            <figure key={`${src}-${index}`} className={`manga-reader-panel ${index === page ? 'active' : ''}`} onClick={() => go(index)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${manga.title} chapter ${chapter} page ${index + 1}`} loading={index < 2 ? 'eager' : 'lazy'} draggable={false} />
            </figure>
          ))}
        </div>

        <button type="button" className="manga-reader-page-btn prev" onClick={() => go(page - 1)} disabled={page <= 0} aria-label="Previous page">
          <ChevronRight size={26} />
        </button>
        <button type="button" className="manga-reader-page-btn next" onClick={() => go(page + 1)} disabled={page >= pageCount - 1} aria-label="Next page">
          <ChevronLeft size={26} />
        </button>

        <div className="manga-reader-shade" aria-hidden="true" />
        <div className="manga-reader-light" ref={lightRef} aria-hidden="true" />
        <div className="manga-reader-hint">
          <MousePointer2 size={13} /> نور موس فعال است · اسکرول یا فلش‌ها برای جابه‌جایی بین صفحات
        </div>
      </main>
    </div>
  );
}