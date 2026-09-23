'use client';

import { useToastStore } from '@/components/toast';
import { AnimatePresence, motion } from 'motion/react';

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className={`toast ${item.kind}`}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
