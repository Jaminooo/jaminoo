'use client';

import { useEffect, useRef } from 'react';
import type { AudioFrame } from './use-audio-frame';
import { readCssColor } from '@/lib/audio/colors';

const BINS = 26;
const BAR = 5;

export function WaveformFallback({
  getFrame,
  enabled,
  playing,
}: {
  getFrame: () => AudioFrame | null;
  enabled: boolean;
  playing: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || !playing) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colorA = readCssColor('--color-violet', '#663af3');
    const colorB = readCssColor('--color-violet-light', '#b39dfc');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = (wrap.clientWidth || 1) * dpr;
      canvas.height = (wrap.clientHeight || 1) * dpr;
      canvas.style.width = `${wrap.clientWidth || 1}px`;
      canvas.style.height = `${wrap.clientHeight || 1}px`;
    };
    resize();
    let raf = 0;
    let running = false;
    let last = 0;

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const loop = () => {
      raf = 0;
      if (!running || document.hidden) return;
      const now = performance.now();
      const frame = getFrame();
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const bw = (w - (BINS + 1) * BAR) / BINS;
      ctx.clearRect(0, 0, w, h);

      if (frame && (frame.playing || now - last < 600)) {
        last = now;
        const data = frame.spectrum;
        const total = data.length || 1;
        for (let i = 0; i < BINS; i++) {
          const lo = Math.floor((i / BINS) * total);
          const hi = Math.floor(((i + 1) / BINS) * total);
          let s = 0;
          for (let j = lo; j < hi && j < total; j++) s += data[j];
          const v = s / Math.max(1, hi - lo) / 255;
          const bh = Math.max(2, v * h * 0.9);
          const x = i * (bw + BAR) + BAR / 2;
          const g = ctx.createLinearGradient(0, h, 0, h - bh);
          g.addColorStop(0, colorA);
          g.addColorStop(1, colorB);
          ctx.globalAlpha = 0.25 + v * 0.65;
          ctx.fillStyle = g;
          ctx.fillRect(x, h - bh, bw, bh);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    start();
    const ro = new ResizeObserver(() => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resize();
    });
    ro.observe(wrap);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, playing]);

  if (!enabled) return null;
  return (
    <div ref={wrapRef} className="music-stage music-stage-2d" aria-hidden="true">
      <canvas ref={canvasRef} className="music-stage-canvas" />
    </div>
  );
}
