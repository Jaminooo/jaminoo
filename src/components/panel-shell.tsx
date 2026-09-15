'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { ProfilePanel } from '@/components/profile-panel';
import { FriendsPanel } from '@/components/friends-panel';
import { JamsPanel } from '@/components/jams-panel';
import { RoomPanel } from '@/components/room-panel';
import { api } from '@/lib/client-api';
import { User, Users, Radio, ArrowLeft, Music2 } from 'lucide-react';

export function PanelShell() {
  const me = useAppStore((s) => s.me);
  const { tab, setTab, roomId, setRoomId } = useAppStore();
  const t = useTranslations();
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    api<{ incoming: unknown[] }>('/api/friends')
      .then((d) => setIncomingCount(d.incoming.length))
      .catch(() => {});
  }, [tab]);

  const goRoom = (id: string) => setRoomId(id);
  const exitRoom = () => setRoomId(null);

  if (roomId) {
    return (
      <div className="panel-body" style={{ minHeight: '100vh' }}>
        <div className="content" style={{ maxWidth: 860, marginInline: 'auto' }}>
          <RoomPanel jamId={roomId} onBack={exitRoom} />
        </div>
      </div>
    );
  }

  return (
    <div className="screen-panel">
      <div className="topbar">
        <button className="wordmark" onClick={() => setTab('jams')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="wordmark-mark">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 3 5 21" />
              <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
            </svg>
          </span>
          {t('brand.name')}
        </button>
        <div className="tb-right">
          <div className="user-chip">
            {me && <JaminoAvatar avatarId={me.avatarId} size={32} />}
            {me && <span className="friend-name" style={{ fontSize: 14 }}>{me.username}</span>}
          </div>
        </div>
      </div>

      <div className="panel-body">
        <nav className="sidebar">
          <div className="side-nav">
            <button className={`side-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
              <User size={18} />
              <span>{t('panel.profile')}</span>
            </button>
            <button className={`side-item ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
              <Users size={18} />
              <span>{t('panel.friends')}</span>
              {incomingCount > 0 && <span className="side-badge">{incomingCount}</span>}
            </button>
            <button className={`side-item ${tab === 'jams' ? 'active' : ''}`} onClick={() => setTab('jams')}>
              <Radio size={18} />
              <span>{t('panel.jams')}</span>
            </button>
          </div>
          <div className="side-foot-card">
            <div className="side-foot-title">{t('panel.jams')}</div>
            <div className="side-foot-text">{t('panel.jamsSub')}</div>
          </div>
        </nav>

        <main className="content" style={{ minHeight: 'calc(100vh - 61px)' }}>
          {tab === 'profile' && <ProfilePanel />}
          {tab === 'friends' && <FriendsPanel />}
          {tab === 'jams' && <JamsPanel onEnter={goRoom} />}
        </main>
      </div>
    </div>
  );
}