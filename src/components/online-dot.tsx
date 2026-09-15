'use client';

import { useAppStore } from '@/store/app-store';

export function OnlineDot({ userId, status = 'ONLINE' }: { userId: number; status?: string }) {
  const online = useAppStore((s) => s.online);
  const isOn = online.includes(userId);
  const cls = isOn ? `on st-${(status || 'ONLINE').toLowerCase()}` : '';
  return <span className={`online-dot${cls ? ` ${cls}` : ''}`} />;
}