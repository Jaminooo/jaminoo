'use client';

import { create } from 'zustand';

export type ToastKind = 'default' | 'error' | 'ok';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  items: ToastItem[];
  add: (message: string, kind?: ToastKind) => void;
  remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  add(message, kind = 'default') {
    const id = Date.now() + Math.random();
    set({ items: [...get().items, { id, message, kind }] });
    setTimeout(() => get().remove(id), 3400);
  },
  remove(id) {
    set({ items: get().items.filter((i) => i.id !== id) });
  },
}));

export function toast(message: string, kind: ToastKind = 'ok') {
  useToastStore.getState().add(message, kind);
}