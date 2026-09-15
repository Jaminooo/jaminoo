'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { JamThemeSwitcher } from '@/components/jam/jam-theme-switcher';
import { JamToastHost } from '@/components/jam/jam-toast';
import { AvatarPicker } from '@/components/jam/avatar-picker';
import { ProfileCard } from '@/components/jam/profile-card';
import { FriendsPanel } from '@/components/jam/friends-panel';
import { JamsPanel } from '@/components/jam/jams-panel';
import { RoomPanel } from '@/components/jam/room-panel';
import { AuthScreen } from '@/components/jam/auth-screen';
import { MediaCard } from '@/components/jam/media-card';
import { useJamStore } from '@/store/jam-store';

export function JamApp() {
  const t = useTranslations();
  const [screen, setScreen] = useState<'auth' | 'panel'>('auth');
  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'jams' | 'room'>('profile');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const store = useJamStore();
  const prevMe = useRef(store.me());

  useEffect(() => {
    if (prevMe.current !== store.me()) {
      prevMe.current = store.me();
    }
  }, [store.me()]);

  const user = store.me();

  return (
    <div className="jam-app">
      <JamThemeSwitcher />
      <JamToastHost />
      <AnimatePresence mode="wait">
        {screen === 'auth' ? (
          <motion.div
            key="auth"
            className="screen screen-auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-grid" />
            <div className="bg-halo" />
            <AuthScreen
              onLogin={() => {
                setScreen('panel');
                store.ensureSeed();
              }}
              onSwitchView={(view) => store.switchAuthView(view)}
              t={t}
            />
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            className="screen screen-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <header className="topbar">
              <div className="tb-left">
                <div className="wordmark">
                  <span className="wordmark-mark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 3 5 21" />
                      <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
                    </svg>
                  </span>
                  {t('brand.name')}
                </div>
              </div>
              <div className="tb-right">
                {user && (
                  <div className="user-chip">
                    <span className={`avatar avatar-32`} dangerouslySetInnerHTML={{ __html: `<span class="avatar avatar-32">${store.avatarSVG(user.avatarId, 'chip-' + user.id)}</span>` }} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-white)', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-frost)' }}>{user.username}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-fog)', fontFamily: 'var(--font-mono)', textTransform: 'lowercase' }}>
                        {store.uidDisplay(user.id)}
                      </span>
                    </div>
                  </div>
                )}
                <button className="btn btn-ghost pill-sm" onClick={() => store.logout()}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {t('panel.logout')}
                </button>
              </div>
            </header>

            <div className="panel-body">
              <aside className="sidebar">
                <nav className="side-nav">
                  <button className={`side-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{t('panel.profile')}</span>
                  </button>
                  <button className={`side-item ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{t('panel.friends')}</span>
                    <span className="side-badge" hidden={!store.incomingBadge()}>{store.incomingBadge()}</span>
                  </button>
                  <button className={`side-item ${activeTab === 'jams' ? 'active' : ''}`} onClick={() => setActiveTab('jams')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <span>{t('panel.jams')}</span>
                  </button>
                </nav>
                <div className="side-foot">
                  <div className="side-foot-card">
                    <div className="side-foot-title">{t('modal.profile')}</div>
                    <div className="side-foot-text">{t('jams.jamsSub')}</div>
                  </div>
                </div>
              </aside>

              <main className="content">
                {activeTab === 'profile' && (
                  <motion.section className="tab-pane" key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <div className="pane-head">
                      <h2 className="pane-title">{t('panel.profile')}</h2>
                      <p className="pane-sub">{t('panel.profileSub')}</p>
                    </div>
                    <div className="grid-2">
                      <div className="card">
                        <div className="card-title-row">
                          <h3 className="card-title">{t('profile.avatar')}</h3>
                          <span className="hint">{t('profile.avatarHint')}</span>
                        </div>
                        <AvatarPicker currentId={user?.avatarId ?? 0} onChange={(id) => store.setAvatar(id)} />
                      </div>
                      <div className="card">
                        <div className="card-title-row">
                          <h3 className="card-title">{t('profile.details')}</h3>
                        </div>
                        <ProfileCard />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="card">
                        <div className="card-title-row">
                          <h3 className="card-title">{t('profile.myId')}</h3>
                        </div>
                        <p className="hint" style={{ margin: '-8px 0 14px' }}>{t('profile.idHint')}</p>
                        <div className="id-row">
                          <code className="id-code">{user ? store.uidDisplay(user.id) : ''}</code>
                          <button className="btn btn-ghost pill-sm" onClick={() => store.copyId()}>
                            {t('profile.myId').toUpperCase()}
                          </button>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-title-row">
                          <h3 className="card-title">{t('profile.changePassword')}</h3>
                        </div>
                        <ProfilePasswordCard />
                      </div>
                    </div>
                    <div className="card" style={{ marginTop: 24 }}>
                      <div className="card-title-row">
                        <h3 className="card-title">{t('media.profilePhotos')}</h3>
                        <span className="hint">{t('media.dropHint')}</span>
                      </div>
                      <MediaCard />
                    </div>
                  </motion.section>
                )}

                {activeTab === 'friends' && (
                  <motion.section className="tab-pane" key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <div className="pane-head pane-head-search">
                      <div>
                        <h2 className="pane-title">{t('panel.friends')}</h2>
                        <p className="pane-sub">{t('panel.friendsSub')}</p>
                      </div>
                      <div className="search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          type="text"
                          placeholder={t('friends.search')}
                        />
                      </div>
                    </div>
                    <FriendsPanel searchQuery={searchQuery} />
                  </motion.section>
                )}

                {activeTab === 'jams' && (
                  <motion.section className="tab-pane" key="jams" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <div className="pane-head">
                      <div>
                        <h2 className="pane-title">{t('panel.jams')}</h2>
                        <p className="pane-sub">{t('panel.jamsSub')}</p>
                      </div>
                      <button className="btn btn-violet" onClick={() => store.openNewJamModal()}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {t('panel.newJam')}
                      </button>
                    </div>
                    <JamsPanel onOpenJam={(id) => store.openJam(id)} currentRoom={store.currentRoom()} />
                  </motion.section>
                )}

                {activeTab === 'room' && (
                  <motion.section className="tab-pane" key="room" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <RoomPanel onBack={() => store.backToJams()} />
                  </motion.section>
                )}
              </main>
            </div>

            <AnimatePresence>
              {modalOpen && (
                <motion.div
                  className="modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setModalOpen(false)}
                >
                  <motion.div
                    className="modal"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-head">
                      <h3 className="modal-title">{modalTitle}</h3>
                      <button className="icon-btn" onClick={() => setModalOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div className="modal-body" dangerouslySetInnerHTML={{ __html: modalBody }} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfilePasswordCard() {
  const t = useTranslations();
  const store = useJamStore();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  const onSave = () => {
    store.changePassword(current, newPw, newPw2);
    setCurrent('');
    setNewPw('');
    setNewPw2('');
  };

  return (
    <div className="field-row">
      <label className="field">
        <span className="field-label">{t('profile.currentPassword')}</span>
        <input className="auth-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t('profile.newPassword')}</span>
        <input className="auth-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t('profile.confirmPassword')}</span>
        <input className="auth-input" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
      </label>
      <button className="btn btn-ghost" onClick={onSave}>
        {t('profile.changePassword')}
      </button>
    </div>
  );
}
