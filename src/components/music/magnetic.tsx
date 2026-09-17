'use client';

import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

/**
 * Subtle magnetic cursor interaction for the configured button.
 * Desktop only (fine pointer), disabled when prefers-reduced-motion is set.
 * Movement is small and never affects click behavior.
 */
export function Magnetic(props: ButtonHTMLAttributes<HTMLButtonElement> & { strength?: number }) {
  const { strength = 5, style, ...rest } = props;
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const apply = (dx: number, dy: number) => {
      const max = strength;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 44) {
        const f = (Math.min(1, (44 - d) / 44) * max) / d;
        el.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
      } else {
        el.style.transform = '';
      }
    };

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      apply(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    };
    const onLeave = () => {
      el.style.transform = '';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);

  return <button ref={ref} style={{ transition: 'transform 0.18s ease-out', ...style }} {...rest} />;
}