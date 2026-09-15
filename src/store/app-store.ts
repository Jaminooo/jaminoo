'use client';

import { create } from 'zustand';

export interface PubUser {
  id: number;
  username: string;
  uid: string;
  avatarId: number;
  bio: string;
  github: boolean;
  createdAt: string;
  avatarPhoto: string | null;
}

export interface Me {
  id: number;
  username: string;
  email: string;
  avatarId: number;
  bio: string;
  github: boolean;
  createdAt: string;
  avatarPhoto: string | null;
}

export type Tab = 'profile' | 'friends' | 'jams';
export type AuthView = 'login' | 'signup' | 'forgot';

interface AppState {
  me: Me | null;
  booted: boolean;
  tab: Tab;
  authView: AuthView;
  roomId: string | null;
  setMe: (me: Me | null) => void;
  setBooted: (b: boolean) => void;
  setTab: (t: Tab) => void;
  setAuthView: (v: AuthView) => void;
  setRoomId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  me: null,
  booted: false,
  tab: 'profile',
  authView: 'login',
  roomId: null,
  setMe: (me) => set({ me }),
  setBooted: (b) => set({ booted: b }),
  setTab: (tab) => set({ tab, roomId: null }),
  setAuthView: (authView) => set({ authView }),
  setRoomId: (roomId) => set({ roomId }),
}));

export function uidDisplay(id: number) {
  return `JM-${String(id).padStart(4, '0')}`;
}