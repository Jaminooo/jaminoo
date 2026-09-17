'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const LS_KEY = 'jamine-room-panels';

export interface PanelSizes {
  members: number;
  music: number;
  height: number;
}

const DEFAULT_HEIGHT = 560;
const DEFAULTS: PanelSizes = { members: 232, music: 340, height: DEFAULT_HEIGHT };
const MIN_MEMBERS = 164;
const MAX_MEMBERS = 440;
const MIN_MUSIC = 268;
const MAX_MUSIC = 680;
const MIN_HEIGHT = 400;
const MAX_HEIGHT = 1400;

function clampBetween(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function usePanelResize(hasMusic: boolean) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<PanelSizes>(DEFAULTS);
  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<PanelSizes>;
      setSizes((s) => ({
        members: clampBetween(Number(p.members) || s.members, MIN_MEMBERS, MAX_MEMBERS),
        music: clampBetween(Number(p.music) || s.music, MIN_MUSIC, MAX_MUSIC),
        height: clampBetween(Number(p.height) || s.height, MIN_HEIGHT, MAX_HEIGHT),
      }));
    } catch {}
  }, []);

  const persist = useCallback((next: PanelSizes) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const beginResize = useCallback(
    (key: 'members' | 'music') => (down: React.PointerEvent<HTMLDivElement>) => {
      down.preventDefault();
      const grid = gridRef.current;
      if (!grid) return;
      down.currentTarget.setPointerCapture?.(down.pointerId);
      const rect = grid.getBoundingClientRect();
      const rtl = (document.documentElement.dir === 'rtl') || grid.dir === 'rtl';
      const inlineStart = rtl ? rect.right : rect.left;
      const inlineEnd = rtl ? rect.left : rect.right;
      activeRef.current = down.pointerId + ':' + key;
      const min = key === 'members' ? MIN_MEMBERS : MIN_MUSIC;
      const max = key === 'members' ? MAX_MEMBERS : MAX_MUSIC;

      const onMove = (e: PointerEvent) => {
        let width: number;
        if (key === 'members') {
          width = Math.abs(e.clientX - inlineStart);
        } else {
          width = Math.abs(e.clientX - inlineEnd);
        }
        const gridW = Math.abs(inlineEnd - inlineStart);
        const chatMin = 260;
        const otherMin = key === 'members' ? (hasMusic ? MIN_MUSIC : 0) : MIN_MEMBERS;
        const practicalMax = Math.max(min, gridW - chatMin - otherMin);
        width = clampBetween(width, min, Math.min(max, practicalMax));
        setSizes((prev) => {
          const next =
            key === 'members'
              ? { ...prev, members: Math.round(width) }
              : { ...prev, music: Math.round(width) };
          persist(next);
          return next;
        });
      };

      const onUp = () => {
        activeRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [hasMusic, persist]
  );

  const beginVertical = useCallback(
    (down: React.PointerEvent<HTMLDivElement>) => {
      down.preventDefault();
      const grid = gridRef.current;
      if (!grid) return;
      down.currentTarget.setPointerCapture?.(down.pointerId);
      const startY = down.clientY;
      const startH = grid.getBoundingClientRect().height;
      activeRef.current = down.pointerId + ':height';

      const onMove = (e: PointerEvent) => {
        const delta = e.clientY - startY;
        // Vertically shrink from the bottom (not full screen max per se).
        const h = clampBetween(startH + delta, MIN_HEIGHT, MAX_HEIGHT);
        setSizes((prev) => {
          const next = { ...prev, height: Math.round(h) };
          persist(next);
          return next;
        });
      };
      const onUp = () => {
        activeRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [persist]
  );

  const gridStyle = {
    '--members-w': `${sizes.members}px`,
    '--music-w': `${sizes.music}px`,
    '--room-h': `${sizes.height}px`,
  } as React.CSSProperties;

  return { gridRef, gridStyle, sizes, beginResize, beginVertical };
}
