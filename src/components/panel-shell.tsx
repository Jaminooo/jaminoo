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
import { DJRoomPanel } from '@/components/dj-room-panel';
import { DmPanel } from '@/components/dm-panel';
import { FriendProfilePanel } from '@/components/friend-profile';
import { CommunityHome } from '@/components/community-home';
import { GroupsPanel } from '@/components/groups-panel';
import { GroupChat } from '@/components/group-chat';
import { motion, AnimatePresence } from 'motion/react';
import { connectLive, onLive } from '@/lib/live';
import { loadUnread } from '@/lib/unread';
import { House, MessagesSquare, Radio, Users, MessageCircle, User } from 'lucide-react';
import { GlobalSearch } from '@/components/global-search';

export function PanelShell() {
  const me = useAppStore((s) => s.me);
  const { tab, setTab, roomId, setRoomId, dmWith, setDmWith, profileUserId, setProfileUserId, groupId, setGroupId, unread, setUnread, setProduct } = useAppStore();
  const t = useTranslations();

  useEffect(() => {
    if (!me) return;
    connectLive();
    loadUnread();
    const offBadge = onLive('friends:update', loadUnread);
    const offPresence = onLive('presence:update', (d: { online: number[]; presence?: Record<number, { status: string; statusText: string }> }) => {
      useAppStore.getState().setOnline(d.online ?? []);
      if (d.presence) useAppStore.getState().setPresenceMap(d.presence);
    });
    const offStatus = onLive('status:update', (d: { userId: number; status: string; statusText: string }) => {
      if (!d || typeof d.userId !== 'number') return;
      const map = { ...useAppStore.getState().presenceMap };
      if (map[d.userId]) map[d.userId] = { status: d.status, statusText: d.statusText };
      useAppStore.getState().setPresenceMap(map);
    });
    const offDm = onLive('dm:new', loadUnread);
    const offInvite = onLive('jam-invite', loadUnread);
    const offSeen = onLive('dm:seen', loadUnread);
    const offReaction = onLive('reaction:update', loadUnread);
    const offGroupMsg = onLive('group:message', loadUnread);
    const offGroupUpdate = onLive('group:update', loadUnread);
    return () => {
      offBadge();
      offPresence();
      offStatus();
      offDm();
      offInvite();
      offSeen();
      offReaction();
      offGroupMsg();
      offGroupUpdate();
    };
  }, [me, setUnread]);

  const goRoom = (id: string) => setRoomId(id);
  const exitRoom = () => setRoomId(null);

  const topbar = (
    <div className="topbar">
      <button className="wordmark" onClick={() => setProduct('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} title="All hubs">
        <span className="wordmark-mark">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3 5 21" />
            <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
          </svg>
        </span>
        {t('brand.name')}
      </button>
      <div className="tb-right">
        <GlobalSearch />
        <TopRightControls inline />
        <div className="user-chip">
          {me && <JaminoAvatar avatarId={me.avatarId} size={32} photo={me.avatarPhoto} name={me.username} />}
          {me && <span className="friend-name" style={{ fontSize: 14 }}>{me.username}</span>}
        </div>
      </div>
    </div>
  );

  if (profileUserId != null) {
    return (
      <div className="screen-panel">
        {topbar}
        <div className="panel-body" style={{ minHeight: 'calc(100vh - 61px)' }}>
          <div className="content" style={{ maxWidth: 860, marginInline: 'auto' }}>
            <FriendProfilePanel userId={profileUserId} onBack={() => setProfileUserId(null)} />
          </div>
        </div>
      </div>
    );
  }

  if (groupId) {
    return (
      <div className="screen-panel">
        {topbar}
        <div className="panel-body section-group" style={{ minHeight: 'calc(100vh - 61px)' }}>
          <div className="content room-content" style={{ maxWidth: 1440, marginInline: 'auto' }}>
            <GroupChat groupId={groupId} onBack={() => setGroupId(null)} />
          </div>
        </div>
      </div>
    );
  }

  if (roomId) {
    return (
      <div className="screen-panel">
        {topbar}
        <div className="panel-body" style={{ minHeight: 'calc(100vh - 61px)' }}>
          <div className="content room-content" style={{ maxWidth: 1440, marginInline: 'auto' }}>
            <DJRoomPanel jamId={roomId} onBack={exitRoom} />
          </div>
        </div>
      </div>
    );
  }

  if (dmWith != null) {
    return (
      <div className="screen-panel">
        {topbar}
        <div className="panel-body" style={{ minHeight: 'calc(100vh - 61px)' }}>
          <div className="content" style={{ maxWidth: 860, marginInline: 'auto' }}>
            <DmPanel otherId={dmWith} onBack={() => setDmWith(null)} />
          </div>
        </div>
      </div>
    );
  }

  const badge = (n: number) => (n > 0 ? <span className="side-badge">{n > 9 ? '9+' : n}</span> : null);

  const nav = [
    { key: 'home', icon: <House size={18} />, label: t('groups.home'), badge: 0 },
    { key: 'groups', icon: <MessagesSquare size={18} />, label: t('groups.title'), badge: unread.groups },
    { key: 'jams', icon: <Radio size={18} />, label: t('panel.jams'), badge: unread.invites },
    { key: 'friends', icon: <Users size={18} />, label: t('panel.friends'), badge: unread.friends },
    { key: 'dms', icon: <MessageCircle size={18} />, label: t('panel.messages'), badge: unread.dms },
  ];

  return (
    <div className="screen-panel">
      {topbar}

      <div className={`panel-body section-${tab}`}>
        <nav className="sidebar ch-sidebar">
          <div className="side-nav">
            {nav.map((n) => (
              <button key={n.key} className={`side-item ${tab === n.key ? 'active' : ''}`} onClick={() => setTab(n.key as any)}>
                {n.icon}
                <span>{n.label}</span>
                {badge(n.badge)}
              </button>
            ))}
            <button className={`side-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
              <User size={18} />
              <span>{t('panel.profile')}</span>
            </button>
          </div>
          <div className="side-foot-card">
            <div className="side-foot-title">{t('groups.subtitle')}</div>
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
              {tab === 'home' && <CommunityHome />}
              {tab === 'groups' && <GroupsPanel />}
              {tab === 'jams' && <JamsPanel onEnter={goRoom} />}
              {tab === 'friends' && <FriendsPanel />}
              {tab === 'dms' && <DmInboxPanel />}
              {tab === 'profile' && <ProfilePanel />}
              {tab === 'security' && <SecurityPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="mobile-tabnav" aria-label="Primary">
        {nav.slice(0, 5).map((n) => (
          <button key={n.key} type="button" className={tab === n.key ? 'active' : ''} onClick={() => setTab(n.key as any)}>
            {n.icon}
            <span>{n.label}</span>
            {badge(n.badge)}
          </button>
        ))}
      </nav>
    </div>
  );
}
