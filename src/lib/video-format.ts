// Pure formatting helpers shared by the Video Hub (and testable in isolation).

/**
 * Deterministic hue (0–359) derived from a string, plus a fixed offset.
 * Identical algorithm to the cinema hub cover art, so cover-less posts
 * get a stable, designed-looking gradient instead of a plain background.
 */
export function titleHue(title: string, offset: number): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return (h + offset) % 360;
}

/** CSS gradient string for a title's placeholder cover art. */
export function coverGradient(title: string, offsetFrom = 0, offsetTo = 55): string {
  const from = titleHue(title, offsetFrom);
  const to = titleHue(title, offsetTo);
  return `linear-gradient(135deg, hsl(${from} 65% 26%), hsl(${to} 70% 20%))`;
}

/** Clock label for a duration in whole seconds: `m:ss` or `h:mm:ss`. */
export function durationLabel(seconds: number): string {
  if (!seconds) return '';
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = Math.floor(safeSeconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${minutes}:${String(remaining).padStart(2, '0')}`;
}