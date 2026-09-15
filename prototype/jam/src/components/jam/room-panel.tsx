'use client';

import { useTranslations } from 'next-intl';
import { useJamStore } from '@/store/jam-store';
'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { avatarEl } from '@/components/jam/jam-avatar';
import { Send } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function RoomPanel({ onBack }: Props) {
  const t = useTranslations();
  const store = useJamStore();
  const room = store.currentRoomJams();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [room?.messages]);

  if (!room) {
    onBack();
    return null;
  }

  const user = store.me();

  const send = () => {
    if (!text.trim()) return;
    store.sendMessage(text.trim());
    setText('');
  };

  return (
    <div className="room">
      <div className="room-head">
        <button className="btn btn-ghost pill-sm" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('jams.allJams')}
        </button>
        <div className="room-title-wrap">
          <h2 className="room-title">{room.name}</h2>
          <span className={`badge ${room.type === 'private' ? 'violet' : ''}`}>
            {room.type === 'private' ? '🔒 ' + t('jams.private') : t('jams.public')}
          </span>
        </div>
        <span className="room-members">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {t('jams.members', { count: room.members.length })}
        </span>
      </div>

      <div className="music-strip">
        <span className="music-strip-icon">🎵</span>
        <span>
          <strong>{t('room.musicComing')}</strong>
        </span>
      </div>

      <div className="room-body" ref={listRef}>
        {room.messages.map((m, idx) => {
          const from = store.data().users.find(u => String(u.id) === String(m.from));
          const mine = String(m.from) === String(user?.id);
          return (
            <motion.div key={idx} className={`msg ${mine ? 'me' : ''}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <span className="avatar avatar-32" dangerouslySetInnerHTML={{ __html: avatarEl(m.from, from?.avatarId ?? 0, 'avatar-32') }} />
              <div>
                <div className="msg-bubble">
                  <div className="msg-name">{mine ? t('auth.username') : (from?.username || '?')}</div>
                  <div className="msg-text">{m.text}</div>
                  <div className="msg-time">{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="composerrow">
        <input className="auth-input" type="text" placeholder={t('room.messagePlaceholder')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="btn btn-violet send-btn" onClick={send}>
          <Send size={16} />
        </button>
      </div>

      <div className="room-foot-actions">
        <button className="btn btn-ghost pill-sm" onClick={() => store.openInvite()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6" />
            <path d="M22 11h-6" />
          </svg>
          {t('jams.inviteFriends')}
        </button>
        <span className="hint">{room.type === 'private' ? t('jams.privateHint') : t('jams.publicHint')}</span>
      </div>
    </div>
  );
}
