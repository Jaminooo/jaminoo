'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { TopRightControls } from '@/components/top-controls';
import { ProfilePanel } from '@/components/profile-panel';
import { SecurityPanel } from '@/components/security-panel';
import { FriendsPanel } from '@/components/friends-panel';
import { JamsPanel } from '@/components/jams-panel';
import { DmInboxPanel } from '@/components/dm-inbox';
import { RoomPanel } from '@/components/room-panel';
import { DmPanel } from '@/components/dm-panel';
import { FriendProfilePanel } from '@/components/friend-profile';
import { motion, AnimatePresence } from 'framer-motion';
import { connectLive, onLive } from '@/lib/live';
import { loadUnread } from '@/lib/unread';
import { User, Shield, Users, Radio, MessageCircle } from 'lucide-react';

export function PanelShell() {
  const me = useAppStore((s) => s.me);
  const { tab, setTab, roomId, setRoomId, dmWith, setDmWith, profileUserId, setProfileUserId, unread, setUnread } = useAppStore();
  const t = useTranslations();

  useEffect(() => {
    if (!me) return;
    connectLive();
    loadUnread();
    const offBadge = onLive('friends:update', loadUnread);
    const offPresence = onLive('presence:update', (d: { online: number[] }) => useAppStore.getState().setOnline(d.online ?? []));
    const offDm = onLive('dm:new', loadUnread);
    const offInvite = onLive('jam-invite', loadUnread);
    const offSeen = onLive('dm:seen', loadUnread);
    const offReaction = onLive('reaction:update', loadUnread);
    return () => {
      offBadge();
      offPresence();
      offDm();
      offInvite();
      offSeen();
      offReaction();
    };
  }, [me, setUnread]);

  const goRoom = (id: string) => setRoomId(id);
  const exitRoom = () => setRoomId(null);

  const sectionClass = roomId ? 'section-room' : dmWith != null ? 'section-dm' : profileUserId != null ? 'section-profile-view' : `section-${tab}`;

  if (profileUserId != null) {
    return (
      <div className={`panel-body ${sectionClass}`} style={{ minHeight: '100vh' }}>
        <div className="content" style={{ maxWidth: 860, marginInline: 'auto' }}>
          <FriendProfilePanel userId={profileUserId} onBack={() => setProfileUserId(null)} />
        </div>
      </div>
    );
  }

  if (roomId) {
    return (
      <div className={`panel-body ${sectionClass}`} style={{ minHeight: '100vh' }}>
        <div className="content" style={{ maxWidth: 860, marginInline: 'auto' }}>
          <RoomPanel jamId={roomId} onBack={exitRoom} />
        </div>
      </div>
    );
  }

  if (dmWith != null) {
    return (
      <div className={`panel-body ${sectionClass}`} style={{ minHeight: '100vh' }}>
        <div className="content" style={{ maxWidth: 860, marginInline: 'auto' }}>
          <DmPanel otherId={dmWith} onBack={() => setDmWith(null)} />
        </div>
      </div>
    );
  }

  const badge = (n: number) => (n > 0 ? <span className="side-badge">{n > 9 ? '9+' : n}</span> : null);

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
          <TopRightControls inline />
          <div className="user-chip">
            {me && <JaminoAvatar avatarId={me.avatarId} size={32} photo={me.avatarPhoto} name={me.username} />}
            {me && <span className="friend-name" style={{ fontSize: 14 }}>{me.username}</span>}
          </div>
        </div>
      </div>

      <div className={`panel-body ${sectionClass}`}>
        <nav className="sidebar">
          <div className="side-nav">
            <button className={`side-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
              <User size={18} />
              <span>{t('panel.profile')}</span>
            </button>
            <button className={`side-item ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>
              <Shield size={18} />
              <span>{t('panel.security')}</span>
            </button>
            <button className={`side-item ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
              <Users size={18} />
              <span>{t('panel.friends')}</span>
              {badge(unread.friends)}
            </button>
            <button className={`side-item ${tab === 'jams' ? 'active' : ''}`} onClick={() => setTab('jams')}>
              <Radio size={18} />
              <span>{t('panel.jams')}</span>
              {badge(unread.invites)}
            </button>
            <button className={`side-item ${tab === 'dms' ? 'active' : ''}`} onClick={() => setTab('dms')}>
              <MessageCircle size={18} />
              <span>{t('panel.messages')}</span>
              {badge(unread.dms)}
            </button>
          </div>
          <div className="side-foot-card">
            <div className="side-foot-title">{t('panel.jams')}</div>
            <div className="side-foot-text">{t('panel.jamsSub')}</div>
          </div>
        </nav>

        <main className="content" style={{ minHeight: 'calc(100vh - 61px)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {tab === 'profile' && <ProfilePanel />}
              {tab === 'security' && <SecurityPanel />}
              {tab === 'friends' && <FriendsPanel />}
              {tab === 'jams' && <JamsPanel onEnter={goRoom} />}
              {tab === 'dms' && <DmInboxPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}