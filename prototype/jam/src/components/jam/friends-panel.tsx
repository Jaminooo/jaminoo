'use client';

import { useTranslations } from 'next-intl';
import { useJamStore } from '@/store/jam-store';
import { motion } from 'framer-motion';
import { avatarEl } from '@/components/jam/jam-avatar';

interface Props {
  searchQuery: string;
}

export function FriendsPanel({ searchQuery }: Props) {
  const t = useTranslations();
  const store = useJamStore();
  const user = store.me();

  if (!user) return null;

  const friends = store.friendsOf(user.id);
  const incoming = store.data().friendships.filter(f => f.status === 'pending' && String(f.b) === String(user.id));
  const outgoing = store.data().friendships.filter(f => f.status === 'pending' && String(f.a) === String(user.id));

  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return null;
    const matches = store.data().users.filter(x => String(x.id) !== String(user.id) && (
      x.username.toLowerCase().includes(q) ||
      store.uidDisplay(x.id).toLowerCase().includes(q)
    ));
    if (!matches.length) return <div className="empty-state">{t('friends.noMatches') + searchQuery + '"'}</div>;
    return matches.map(x => {
      const rel = store.relation(user.id, x.id);
      let action;
      if (rel === 'friends') action = <span className="badge">{t('friends.requestAlready')}</span>;
      else if (rel === 'outgoing') action = <span className="badge">{t('friends.requestAlready')}</span>;
      else if (rel === 'incoming') action = <IconButton kind="check" label={t('friends.accept')} onClick={() => store.acceptFriend(x.id)} violet />;
      else action = <IconButton kind="plus" label={t('friends.addFriend')} onClick={() => store.addFriend(x.id)} violet />;
      return <div key={x.id} className="friend-row">{avatarEl(x.id, x.avatarId, 'avatar-40')}<div className="friend-meta"><div className="friend-name">{x.username}{x.github ? ' <span className="badge violet">GH</span>' : ''}</div><div className="friend-id">{store.uidDisplay(x.id)}</div></div><div className="friend-actions">{action}</div></div>;
    });
  })();

  return (
    <div className="friends-cols">
      <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className="card-title-row">
          <h3 className="card-title">{t('friends.friendsCount')}</h3>
          <span className="count-chip">{friends.length}</span>
        </div>
        <div className="list">
          {friends.length
            ? friends.map(id => friendRow(id))
            : <div className="empty-state">{t('friends.noFriendsYet')}</div>
          }
        </div>
      </motion.div>
      <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
        <div className="card-title-row">
          <h3 className="card-title">{t('friends.incomingCount')}</h3>
          <span className="count-chip violet">{incoming.length}</span>
        </div>
        <div className="list">
          {incoming.length
            ? incoming.map(f => friendRow(f.a))
            : <div className="empty-state">{t('friends.noIncoming')}</div>
          }
        </div>
      </motion.div>
      <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
        <div className="card-title-row">
          <h3 className="card-title">{t('friends.sentCount')}</h3>
          <span className="count-chip">{outgoing.length}</span>
        </div>
        <div className="list">
          {outgoing.length
            ? outgoing.map(f => friendRow(f.b))
            : <div className="empty-state">{t('friends.noOutgoing')}</div>
          }
        </div>
      </motion.div>
      {searchResults && (
        <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} style={{ marginTop: 24 }}>
          <div className="card-title-row"><h3 className="card-title">{t('friends.search')}</h3></div>
          <div className="list">{searchResults}</div>
        </motion.div>
      )}
    </div>
  );
}

function friendRow(id: number) {
  const t = useTranslations();
  const store = useJamStore();
  const user = store.data().users.find(u => String(u.id) === String(id));
  if (!user) return null;
  return (
    <div className="friend-row">
      <span className="avatar avatar-40" dangerouslySetInnerHTML={{ __html: avatarEl(id, user.avatarId, 'avatar-40') }} />
      <div className="friend-meta">
        <div className="friend-name">{user.username}{user.github ? ' <span className="badge violet">GH</span>' : ''}</div>
        <div className="friend-id">{store.uidDisplay(id)}</div>
      </div>
      <div className="friend-actions">
        <IconButton kind="view" label={t('friends.view')} onClick={() => openUserProfile(id)} />
        <IconButton kind="trash" label={t('friends.remove')} onClick={() => store.declineFriend(id)} danger />
      </div>
    </div>
  );
}

function IconButton({ kind, label, onClick, danger, violet }: { kind: 'view' | 'trash' | 'check' | 'plus'; label: string; onClick: () => void; danger?: boolean; violet?: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    view: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>),
    trash: (<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    check: <polyline points="20 6 9 17 4 12" />,
    plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  };
  const className = 'btn-icon' + (danger ? ' danger' : '') + (violet ? ' violet' : '');
  return (
    <button className={className} title={label} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icons[kind]}
      </svg>
    </button>
  );
}

function openUserProfile(id: number) {
  const t = useTranslations();
  const store = useJamStore();
  const user = store.data().users.find(u => String(u.id) === String(id));
  if (!user) return;
  const rel = store.relation(store.me()?.id ?? 0, id);
  let action;
  if (rel === 'friends') action = <button className="btn btn-ghost btn-block" onClick={() => { store.declineFriend(id); store.closeModal(); }}>{t('friends.remove')}</button>;
  else if (rel === 'outgoing') action = <button className="btn btn-ghost btn-block" disabled>{t('friends.requestSent')}</button>;
  else if (rel === 'incoming') action = <button className="btn btn-violet btn-block" onClick={() => { store.acceptFriend(id); store.closeModal(); }}>{t('friends.acceptRequest')}</button>;
  else action = <button className="btn btn-violet btn-block" onClick={() => { store.addFriend(id); store.closeModal(); }}>{t('friends.addFriend')}</button>;
  store.openModal(t('modal.profile'), `
    <div style="text-align:center">
      <div style="display:inline-flex">${avatarEl(id, user.avatarId, 'avatar-56')}</div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:22px;color:var(--color-white);margin-top:12px">${user.username}</h3>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--color-fog);margin-top:4px">${store.uidDisplay(id)}${user.github ? ' · GitHub' : ''}</div>
      <div style="font-size:12px;color:var(--color-fog);margin-top:4px">${t('modal.joined')} ${new Date(user.createdAt).toLocaleDateString()}</div>
      <p style="color:var(--color-moon);font-size:14px;margin:14px 0 20px">${user.bio || t('modal.noBio')}</p>
      ${action}
    </div>
  `);
}
