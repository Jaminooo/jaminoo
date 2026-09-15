'use client';

import { useAppStore } from '@/store/app-store';

export function OnlineDot({ userId }: { userId: number }) {
  const online = useAppStore((s) => s.online);
  const isOn = online.includes(userId);
  return <span className={`online-dot${isOn ? ' on' : ''}`} />;
}