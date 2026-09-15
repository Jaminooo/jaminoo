'use client';

import { create } from 'zustand';

export type ToastKind = 'default' | 'error' | 'ok';

export interface ToastState {
  items: Array<{ id: number; message: string; kind: ToastKind }>;
  add: (message: string, kind?: ToastKind) => void;
  remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  add(message, kind = 'default') {
    const id = Date.now() + Math.random();
    get().items.push({ id, message, kind });
    setTimeout(() => get().remove(id), 3200);
    set({ items: [...get().items] });
  },
  remove(id) {
    set({ items: get().items.filter(item => item.id !== id) });
  },
}));

export function JamToastHost() {
  const items = useToastStore((state) => state.items);

  if (!items.length) return null;

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.kind}`}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
