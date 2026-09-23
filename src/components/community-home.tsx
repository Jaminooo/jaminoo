'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { OnlineDot } from '@/components/online-dot';
import { api } from '@/lib/client-api';
import { connectLive } from '@/lib/live';
import { Users, Radio, MessagesSquare, ArrowRight, Plus, Globe, Lock } from 'lucide-react';

interface GroupCard {
  id: string;
  name: string;
  desc: string;
  avatarId: number;
  isPrivate: boolean;
  memberCount: number;
  myRole: string | null;
  lastActiveAt: string;
}

interface FriendCard {
  id: number;
  username: string;
  avatarId: number;
  avatarPhoto: string | null;
  status: string;
  statusText: string;
}

interface JamCard {
  id: string;
  name: string;
  kind: string;
  members: number;
  closed: boolean;
  lastActive: string;
}

export function CommunityHome() {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const setTab = useAppStore((s) => s.setTab);
  const setGroupId = useAppStore((s) => s.setGroupId);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const setProfileUserId = useAppStore((s) => s.setProfileUserId);
  const online = useAppStore((s) => s.online);

  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [jams, setJams] = useState<JamCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    connectLive();
    Promise.all([
      api<{ mine: GroupCard[] }>('/api/groups').then((d) => setGroups(d.mine)).catch(() => {}),
      api<{ friends: FriendCard[] }>('/api/friends').then((d) => setFriends(d.friends)).catch(() => {}),
      api<{ jams: JamCard[] }>('/api/jams').then((d) => setJams(d.jams)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const onlineFriends = friends.filter((f) => online.includes(f.id));

  const quick = [
    { icon: <Users size={16} />, label: t('groups.quickFriends'), act: () => setTab('friends'), key: 'friends' },
    { icon: <Radio size={16} />, label: t('panel.jams'), act: () => setTab('jams'), key: 'jams' },
    { icon: <Plus size={16} />, label: t('groups.quickNewGroup'), act: () => setTab('groups'), key: 'groups' },
  ];

  return (
    <div className="ch-home" aria-busy={loading}>
      <header className="ch-home-hero">
        <div>
          <div className="ch-kicker">{t('groups.kicker')}</div>
          <h2 className="pane-title">{me ? t('groups.welcome') : t('groups.title')}</h2>
          <p className="pane-sub">{t('groups.welcomeHint')}</p>
        </div>
        <div className="ch-stats">
          <button type="button" className="ch-stat" onClick={() => setTab('friends')}>
            <strong>{loading ? '—' : friends.length}</strong>
            <span>{t('groups.statFriends')}</span>
          </button>
          <button type="button" className="ch-stat" onClick={() => setTab('groups')}>
            <strong>{loading ? '—' : groups.length}</strong>
            <span>{t('groups.myGroups')}</span>
          </button>
          <button type="button" className="ch-stat" onClick={() => setTab('jams')}>
            <strong>{loading ? '—' : jams.filter((j) => !j.closed).length}</strong>
            <span>{t('groups.statJams')}</span>
          </button>
        </div>
      </header>

      <div className="ch-quick">
        {quick.map((q) => (
          <button key={q.key} type="button" className="ch-quick-btn" onClick={q.act}>
            <span className="ch-quick-ic">{q.icon}</span>
            {q.label}
            <ArrowRight size={15} />
          </button>
        ))}
      </div>

      <section className="ch-section">
        <div className="ch-section-head">
          <h3>{t('groups.myGroups')}</h3>
          <button type="button" className="ch-see-all" onClick={() => setTab('groups')}>
            {t('groups.openGroups')} <ArrowRight size={14} />
          </button>
        </div>
        {loading ? (
          <div className="ch-group-grid" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <div className="ch-loading-card ch-loading-group" key={index} />)}</div>
        ) : groups.length === 0 ? (
          <div className="ch-empty">
            <MessagesSquare size={22} />
            <p>{t('groups.noGroupsYet')}</p>
            <button type="button" className="btn btn-violet pill-sm" onClick={() => setTab('groups')}>
              <Plus size={14} /> {t('groups.create')}
            </button>
          </div>
        ) : (
          <div className="ch-group-grid">
            {groups.slice(0, 6).map((g) => (
              <button key={g.id} type="button" className="ch-group-card" onClick={() => setGroupId(g.id)}>
                <div className="ch-group-card-top">
                  <JaminoAvatar avatarId={g.avatarId} size={44} name={g.name} />
                  <span className="ch-group-vis">{g.isPrivate ? <Lock size={12} /> : <Globe size={12} />}</span>
                </div>
                <strong>{g.name}</strong>
                <span className="ch-group-desc">{g.desc || '·'}</span>
                <span className="ch-group-meta">{t('groups.members', { count: g.memberCount })}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="ch-section">
        <div className="ch-section-head">
          <h3>{t('groups.friendsOnline')}</h3>
          {onlineFriends.length > 0 && (
            <button type="button" className="ch-see-all" onClick={() => setTab('friends')}>
              {t('panel.friends')} <ArrowRight size={14} />
            </button>
          )}
        </div>
        {loading ? (
          <div className="ch-online-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div className="ch-loading-card ch-loading-friend" key={index} />)}</div>
        ) : onlineFriends.length === 0 ? (
          <div className="ch-empty ch-empty-sm">
            <p>{friends.length === 0 ? t('friends.noFriendsYet') : t('groups.friendsOnline')}</p>
          </div>
        ) : (
          <div className="ch-online-grid">
            {onlineFriends.slice(0, 12).map((f) => (
              <button key={f.id} type="button" className="ch-online-chip" onClick={() => setProfileUserId(f.id)}>
                <div className="avatar-stack">
                  <JaminoAvatar avatarId={f.avatarId} size={34} photo={f.avatarPhoto} name={f.username} />
                  <OnlineDot userId={f.id} status={f.status} />
                </div>
                <span className="ch-online-name">{f.username}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="ch-section">
        <div className="ch-section-head">
          <h3>{t('panel.jams')}</h3>
          <button type="button" className="ch-see-all" onClick={() => setTab('jams')}>
            {t('jams.allJams')} <ArrowRight size={14} />
          </button>
        </div>
        {loading ? (
          <div className="ch-jam-strip" aria-hidden="true">{Array.from({ length: 2 }, (_, index) => <div className="ch-loading-card ch-loading-jam" key={index} />)}</div>
        ) : jams.length === 0 ? (
          <div className="ch-empty ch-empty-sm">
            <p>{t('jams.noJamsYet')}</p>
          </div>
        ) : (
          <div className="ch-jam-strip">
            {jams.slice(0, 4).map((j) => (
              <button key={j.id} type="button" className="ch-jam-card" onClick={() => !j.closed && setRoomId(j.id)} disabled={j.closed}>
                <span className="ch-jam-ic"><Radio size={15} /></span>
                <strong>{j.name}</strong>
                <span>{t('jams.members', { count: j.members })}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
