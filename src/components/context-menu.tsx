'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

export interface CmItem {
  icon?: React.ReactNode;
  label: string;
  danger?: boolean;
  separator?: boolean;
  onClick: () => void;
}

export interface CmState {
  x: number;
  y: number;
  items: CmItem[];
  section?: string;
}

interface CmStore {
  menu: CmState | null;
  openCm: (x: number, y: number, items: CmItem[], section?: string) => void;
  closeCm: () => void;
}

const useCmStore = create<CmStore>((set) => ({
  menu: null,
  openCm: (x, y, items, section) => set({ menu: { x, y, items, section } }),
  closeCm: () => set({ menu: null }),
}));

export function useContextMenu() {
  const menu = useCmStore((s) => s.menu);
  const openCm = useCmStore((s) => s.openCm);
  const closeCm = useCmStore((s) => s.closeCm);
  const onContextMenu = useCallback(
    (e: React.MouseEvent, items: CmItem[], section?: string) => {
      e.preventDefault();
      e.stopPropagation();
      openCm(e.clientX, e.clientY, items, section);
    },
    [openCm]
  );
  return { menu, openCm, closeCm, onContextMenu };
}

export function ContextMenuHost() {
  const menu = useCmStore((s) => s.menu);
  const closeCm = useCmStore((s) => s.closeCm);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!menu) {
      setPos({ left: 0, top: 0 });
      return;
    }
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    let left = menu.x;
    let top = menu.y;
    if (menu.x + r.width + pad > window.innerWidth) left = Math.max(pad, menu.x - r.width - pad);
    if (menu.y + r.height + pad > window.innerHeight) top = Math.max(pad, window.innerHeight - r.height - pad);
    setPos({ left, top });
  }, [menu]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeCm();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCm();
    };
    const onScroll = () => closeCm();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [closeCm]);

  if (typeof document === 'undefined') return null;
  if (!menu) return null;

  return createPortal(
    <div ref={ref} className={`ctx-menu ${menu.section ? `ctx-${menu.section}` : ''}`} style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999 }}>
      {menu.items.map((it, i) =>
        it.separator ? (
          <div key={i} className="ctx-sep" />
        ) : (
          <button
            key={i}
            type="button"
            className={`ctx-item ${it.danger ? 'ctx-danger' : ''}`}
            onClick={() => {
              closeCm();
              it.onClick();
            }}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        )
      )}
    </div>,
    document.body
  );
}

export function ContextMenu() {
  return null;
}

export { useCmStore, useCmStore as useContextMenuStore };