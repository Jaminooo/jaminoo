export interface VisualizerQuality {
  particleCount: number;
  maxDpr: number;
}

export function supportsWebGL(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export function visualizerQuality(): VisualizerQuality {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth;
  if (w < 640) return { particleCount: 260, maxDpr: 1.5 };
  if (w < 1200) return { particleCount: 420, maxDpr: 1.75 };
  return { particleCount: 760, maxDpr: 2 };
}