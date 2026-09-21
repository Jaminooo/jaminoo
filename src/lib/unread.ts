'use client';

import { useAppStore } from '@/store/app-store';
import { api } from '@/lib/client-api';

export async function loadUnread() {
  try {
    const d = await api<{ friends: number; invites: number; dms: number; notifications: number; groups: number }>('/api/unread');
    useAppStore.getState().setUnread(d);
  } catch {
    // ignore offline
  }
}

export function useUnreadRefresh() {
  return { refreshUnread: loadUnread };
}
