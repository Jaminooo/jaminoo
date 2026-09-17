'use client';

import { useEffect, useRef } from 'react';
import type { LyricLine } from '@/lib/audio/lyrics';

export interface LyricActive {
  line: number;
  word: number;
}

export function SyncedLyrics({
  lines,
  hasWordTiming,
  plainLyrics,
  active,
}: {
  lines: LyricLine[];
  hasWordTiming: boolean;
  plainLyrics: string | null;
  active: LyricActive | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (active && active.line >= 0) {
      const el = box.children[active.line] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [active]);

  if (lines.length === 0) {
    if (!plainLyrics) return null;
    return <pre className="music-lyrics-plain">{plainLyrics}</pre>;
  }

  const ai = active?.line ?? -1;

  return (
    <div className="music-lyrics" ref={boxRef}>
      {lines.map((l, i) => {
        let cls = 'music-lrc-line';
        if (i === ai) cls += ' active';
        else if (i === ai - 1) cls += ' prev';
        else if (i === ai + 1) cls += ' next';
        else if (i < ai) cls += ' past';
        else cls += ' upcoming';

        return (
          <div key={i} className={cls}>
            {hasWordTiming && l.words.some((w) => w.time !== null) ? (
              l.words.map((w, wi) => (
                <span
                  key={wi}
                  className={`music-lrc-word ${i === ai && wi === active?.word ? 'active' : ''}`}
                >
                  {w.text}
                  {'\u00A0'}
                </span>
              ))
            ) : (
              <>{l.text}</>
            )}
          </div>
        );
      })}
    </div>
  );
}