'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Keyboard, MousePointer2, X } from 'lucide-react';
import { mangaBySlug, chapterPages } from '@/data/manga';
import { MangaFlashlight } from '@/components/manga-flashlight';

function clampv(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

export interface MangaReaderProps {
  slug: string;
  chapter: number;
}

/**
 * MangaReader — clean, dependency-free reader.
 *
 * Desktop: a full-screen vertical strip of page panels. A "flashlight" glow
 * follows the cursor and brightens exactly where it points (mirroring the
 * RectAreaLight behaviour from the original source). The wheel / arrow keys /
 * PageUp-PageDown / on-screen buttons flip between the panels; chapters flip
 * through the router.
 *
 * Mobile (and any fallback): a plain vertical strip of <img> tags that scrolls
 * natively with touch — the wheel/keyboard lock is only installed on desktop.
 */
export function MangaReader({ slug, chapter }: MangaReaderProps) {
  const router = useRouter();
  const stripRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  pageRef.current = page;

  const manga = useMemo(() => mangaBySlug(slug), [slug]);
  const pages = useMemo(() => chapterPages(slug, chapter), [slug, chapter]);
  const pageCount = pages.length || 1;
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;

  const [isDesktop, setDesktop] = useState(false);
  const [gpuOn, setGpuOn] = useState(false);
  const onGpuActive = useCallback((on: boolean) => setGpuOn(on), []);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (min-width: 768px)');
    const upd = () => setDesktop(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  const onMove = useCallback((e: PointerEvent) => {
    const light = lightRef.current;
    const stage = light?.parentElement;
    if (!light || !stage) return;
    const r = stage.getBoundingClientRect();
    light.style.setProperty('--lx', `${e.clientX - r.left}px`);
    light.style.setProperty('--ly', `${e.clientY - r.top}px`);
  }, []);

  const go = useCallback((i: number) => {
    const next = clampv(i, 0, pageCountRef.current - 1);
    setPage(next);
    pageRef.current = next;
    requestAnimationFrame(() => {
      const item = stripRef.current?.children[next] as HTMLElement | undefined;
      item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const advance = (dir: 1 | -1) => {
      const cur = pageRef.current;
      go(cur + dir);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      advance(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      const fwd =
        e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter';
      const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp';
      if (fwd || back) {
        e.preventDefault();
        advance(fwd ? 1 : -1);
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
    };
  }, [isDesktop, go, onMove]);

  const close = useCallback(() => router.push('/anime?tab=manga'), [router]);
  const goClick = (i: number) => go(i);

  if (!manga) {
    return (
      <div className="manga-reader-empty manga-reader-rtl">
        <p>Manga not found.</p>
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="manga-reader-shell manga-reader-rtl">
      <div className="manga-reader-bar">
        <button
          type="button"
          className="manga-reader-btn manga-reader-close"
          onClick={close}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="manga-reader-title">
          <b>{manga.title}</b>
          <span>
            Chapter {chapter} · page {page + 1} / {pageCount}
          </span>
        </div>
        <div className="manga-reader-nav">
          <button
            type="button"
            className="manga-reader-btn"
            onClick={() => goClick(page - 1)}
            disabled={page <= 0}
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="manga-reader-btn"
            onClick={() => goClick(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="manga-reader-stage">
        <div className="manga-reader-strip" ref={stripRef}>
          {pages.map((src, i) => (
            <figure key={i} className="manga-reader-panel" onClick={() => go(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${manga.title} chapter ${chapter} page ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </figure>
          ))}
        </div>
        <div className="manga-reader-shade" aria-hidden="true" />
        <div className="manga-reader-light" ref={lightRef} aria-hidden="true" />
        {isDesktop && <MangaFlashlight onActive={onGpuActive} />}
        <div className="manga-reader-hint manga-reader-rtl">
          <MousePointer2 size={13} /> {gpuOn ? 'WebGPU flashlight active' : 'The page lights up where your cursor points'} — scroll or arrows to flip
        </div>
      </div>
    </div>
  );
}
