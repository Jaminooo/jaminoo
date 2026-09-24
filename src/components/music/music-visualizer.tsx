'use client';

import { useEffect, useRef } from 'react';
import type { AudioFrame } from './use-audio-frame';
import { VisualizerScene } from './visualizer-scene';
import { supportsWebGL, visualizerQuality } from '@/lib/audio/capabilities';

export function MusicVisualizer({
  getFrame,
  reduced,
  enabled,
  playing,
}: {
  getFrame: () => AudioFrame | null;
  reduced: boolean;
  enabled: boolean;
  playing: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<VisualizerScene | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!supportsWebGL()) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let scene: VisualizerScene | null = null;
    try {
      scene = new VisualizerScene(canvas, visualizerQuality(), reduced);
    } catch {
      return;
    }
    scene.setFrameGetter(getFrame);
    sceneRef.current = scene;

    let inViewport = false;
    const io = new IntersectionObserver((entries) => {
      inViewport = entries[0]?.isIntersecting ?? false;
      scene?.setVisible(inViewport && !document.hidden);
    });
    io.observe(wrap);

    const onVis = () => {
      scene?.setVisible(inViewport && !document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sceneRef.current = null;
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      scene?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduced]);

  useEffect(() => {
    sceneRef.current?.setPlaying(playing);
  }, [playing]);

  if (!enabled) return null;
  return (
    <div ref={wrapRef} className="music-stage" aria-hidden="true">
      <canvas ref={canvasRef} className="music-stage-canvas" />
    </div>
  );
}
