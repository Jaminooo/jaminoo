import type { PointerEvent as ReactPointerEvent } from 'react';

export function trackSpotlight<T extends HTMLElement>(event: ReactPointerEvent<T>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
}

export function resetSpotlight<T extends HTMLElement>(event: ReactPointerEvent<T>) {
  event.currentTarget.style.removeProperty('--spotlight-x');
  event.currentTarget.style.removeProperty('--spotlight-y');
}
