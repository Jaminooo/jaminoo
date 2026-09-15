'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface CmItem {
  icon?: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

export interface CmState {
  x: number;
  y: number;
  items: CmItem[];
  section?: string;
}

export function useContextMenu() {
  const [menu, setMenu] = useState<CmState | null>(null);
  const openCm = useCallback((x: number, y: number, items: CmItem[], section?: string) => {
    setMenu({ x, y, items, section });
  }, []);
  const closeCm = useCallback(() => setMenu(null), []);
  const onContextMenu = useCallback(
    (e: React.MouseEvent, items: CmItem[], section?: string) => {
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, items, section });
    },
    []
  );
  return { menu, openCm, closeCm, onContextMenu };
}

export function ContextMenu({ menu, onClose }: { menu: CmState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    let left = menu.x;
    let top = menu.y;
    if (menu.x + r.width + pad > window.innerWidth) left = Math.max(pad, menu.x - r.width - pad);
    if (menu.y + r.height + pad > window.innerHeight) top = Math.max(pad, window.innerHeight - r.height - pad);
    setPos({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.x, menu.y, menu.items.length]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div ref={ref} className={`ctx-menu ${menu.section ? `ctx-${menu.section}` : ''}`} style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999 }}>
      {menu.items.map((it, i) => (
        <button
          key={i}
          type="button"
          className={`ctx-item ${it.danger ? 'ctx-danger' : ''}`}
          onClick={() => {
            onClose();
            it.onClick();
          }}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}