'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAudioAnalyzer } from '@/lib/audio/analyzer';
import { BeatDetector } from '@/lib/audio/beat';

export interface AudioFrame {
  volume: number;
  bass: number;
  mid: number;
  treble: number;
  beat: number;
  time: number;
  duration: number;
  playing: boolean;
  spectrum: Uint8Array;
  wave: Uint8Array;
}

const IDLE: AudioFrame = {
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
  time: 0,
  duration: 0,
  playing: false,
  spectrum: new Uint8Array(0),
  wave: new Uint8Array(0),
};

export function useAudioFrame(opts: {
  getTime: () => number;
  getDuration: () => number;
  playing: boolean;
  analysisEnabled: boolean;
  resetKey: number | string;
  onTick: (frame: AudioFrame) => void;
}): void {
  const { getTime, getDuration, playing, analysisEnabled, resetKey, onTick } = opts;
  const rafRef = useRef<number>(0);
  const beatRef = useRef(new BeatDetector());
  const lastFrame = useRef<AudioFrame>({ ...IDLE });
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    beatRef.current.reset();
    getAudioAnalyzer().read();
  }, [resetKey]);

  useEffect(() => {
    let running = true;

    const loop = () => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(loop);

      const time = getTime();
      const duration = getDuration();
      let bass = 0;
      let mid = 0;
      let treble = 0;
      let volume = 0;
      let spectrum = lastFrame.current.spectrum;
      let wave = lastFrame.current.wave;
      let beat = 0;

      if (analysisEnabled) {
        const analyzer = getAudioAnalyzer();
        if (!analyzer.ready) analyzer.attach();
        if (analyzer.ready) {
          const bands = analyzer.read();
          bass = bands.bass;
          mid = bands.mid;
          treble = bands.treble;
          volume = bands.volume;
          spectrum = bands.spectrum;
          wave = bands.wave;
          beatRef.current.update(bass, performance.now());
          beat = beatRef.current.beat;
        }
      }

      const frame: AudioFrame = {
        volume,
        bass,
        mid,
        treble,
        beat,
        time,
        duration,
        playing: playingRef.current,
        spectrum,
        wave,
      };
      lastFrame.current = frame;
      onTickRef.current(frame);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [getTime, getDuration, analysisEnabled]);
}
