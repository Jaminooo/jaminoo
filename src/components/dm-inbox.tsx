'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { EmojiText } from '@/components/emoji-text';
import { api } from '@/lib/client-api';

interface InboxItem {
  id: string;
  other: {
    id: number;
    username: string;
    uid: string;
    avatarId: number;
    avatarPhoto: string | null;
    status: string;
    statusText: string;
  };
  lastMessage: { text: string; kind: string; senderId: number; createdAt: string } | null;
  unreadCount: number;
}

export function DmInboxPanel() {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const setDmWith = useAppStore((s) => s.setDmWith);
  const [convs, setConvs] = useState<InboxItem[]>([]);

  useEffect(() => {
    api<{ conversations: InboxItem[] }>('/api/dm/inbox').then((d) => setConvs(d.conversations)).catch(() => {});
  }, []);

  return (
    <div className="friends-panel">
      <h2 className="panel-title">{t('dm.inbox')}</h2>
      {convs.length === 0 && <div className="empty-state">{t('dm.noChats')}</div>}
      {convs.map((c) => {
        const preview = c.lastMessage
          ? (c.lastMessage.kind === 'VOICE' ? `[${t('dm.voiceMessage')}]` : c.lastMessage.text?.slice(0, 40)) ?? ''
          : '';
        const isSelf = c.lastMessage?.senderId === me?.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`friend-row ${c.unreadCount > 0 ? 'unread-row' : ''}`}
            onClick={() => setDmWith(c.other.id)}
          >
            <JaminoAvatar avatarId={c.other.avatarId} size={40} photo={c.other.avatarPhoto} name={c.other.username} />
            <div className="friend-info">
              <span className="friend-name">
                {c.other.username}
                <span className={`online-dot st-${c.other.status ? c.other.status.toLowerCase() : ''}`} />
              </span>
              {preview && (
                <span className="friend-sub">
                  {isSelf ? `${t('dm.you')}: ` : ''}
                  <EmojiText text={preview} />
                </span>
              )}
            </div>
            {c.unreadCount > 0 && <span className="dm-badge">{c.unreadCount > 9 ? '9+' : c.unreadCount}</span>}
            {c.lastMessage && (
              <span className="friend-sub" style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--color-fog)' }}>
                {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
