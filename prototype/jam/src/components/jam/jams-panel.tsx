'use client';

import { useTranslations } from 'next-intl';
import { useJamStore } from '@/store/jam-store';
import { motion } from 'framer-motion';

interface Props {
  onOpenJam: (id: string) => void;
  currentRoom: string | null;
}

export function JamsPanel({ onOpenJam, currentRoom }: Props) {
  const t = useTranslations();
  const store = useJamStore();
  const jams = store.data().jams.filter(j => j.members.some(m => String(m) === String(store.me()?.id)));

  return (
    <div>
      {jams.length ? (
        <div className="jam-grid">
          {jams.map(j => (
            <motion.button
              key={j.id}
              className="jam-card"
              whileHover={{ y: -2 }}
              onClick={() => onOpenJam(j.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="jam-card-top">
                <span className="jam-icon">{j.type === 'private' ? '🔒' : '🔊'}</span>
                <span className={`badge ${j.type === 'private' ? 'violet' : ''}`}>{j.type === 'private' ? t('jams.private') : t('jams.public')}</span>
              </div>
              <div className="jam-name">{j.name}</div>
              <div className="jam-desc">{j.desc || ''}</div>
              <div className="jam-meta">
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {j.members.length}
                </span>
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  {lastActive(j)}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.div className="empty-state" style={{ gridColumn: '1 / -1' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {t('jams.noJamsYet')}
        </motion.div>
      )}
    </div>
  );
}

function lastActive(j: { messages: { ts: number }[]; createdAt: number }) {
  const last = j.messages[j.messages.length - 1]?.ts ?? j.createdAt;
  return new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
