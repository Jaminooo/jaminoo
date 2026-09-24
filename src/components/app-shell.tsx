'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { TopRightControls } from '@/components/top-controls';
import { ToastHost } from '@/components/toast-host';
import { motion, AnimatePresence } from 'motion/react';
import { GlobalMusicPlayer } from '@/components/global-music-player';
import { useSyncRouting } from '@/lib/sync-routing';

const sceneLoading = () => <div className="app-scene-loading" role="status" aria-label="Loading workspace" />;
const PanelShell = dynamic(() => import('@/components/panel-shell').then((module) => module.PanelShell), { loading: sceneLoading });
const HubGateway = dynamic(() => import('@/components/hub-gateway').then((module) => module.HubGateway), { loading: sceneLoading });
const MusicHub = dynamic(() => import('@/components/music-hub').then((module) => module.MusicHub), { loading: sceneLoading });
const VideoHub = dynamic(() => import('@/components/video-hub').then((module) => module.VideoHub), { loading: sceneLoading });
const WatchHub = dynamic(() => import('@/components/watch-hub').then((module) => module.WatchHub), { loading: sceneLoading });
const TweetHub = dynamic(() => import('@/components/tweet-hub').then((module) => module.TweetHub), { loading: sceneLoading });
const LandingPage = dynamic(() => import('@/components/landing-page').then((module) => module.LandingPage), { loading: sceneLoading });

export function AppShell() {
  const { me, booted, setMe, setBooted, product } = useAppStore();
  useSyncRouting();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const previousKeyRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ user: import('@/store/app-store').Me }>('/api/auth');
        setMe(res.user);
      } catch {
        setMe(null);
      } finally {
        setBooted(true);
      }
    })();
  }, [setMe, setBooted]);

  const sceneKey = me ? (product === 'home' ? 'home' : `product:${product}`) : 'auth';

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const previous = previousKeyRef.current;
    if (previous && previous !== sceneKey) scrollPositions.current[previous] = scroller.scrollTop;
    previousKeyRef.current = sceneKey;
    scroller.scrollTop = scrollPositions.current[sceneKey] ?? 0;
  }, [sceneKey]);

  if (!booted) {
    return (
      <div className="screen screen-auth" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="wordmark" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="wordmark-mark">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 3 5 21" />
              <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
            </svg>
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Jamino</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {!me && <TopRightControls />}
      <ToastHost />
      <AnimatePresence mode="wait">
        <motion.div key={sceneKey} className="app-scroller" ref={scrollerRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {me ? (
            product === 'home' ? <HubGateway /> : product === 'music' ? <MusicHub /> : product === 'video' ? <VideoHub /> : product === 'watch' ? <WatchHub /> : product === 'tweet' ? <TweetHub /> : <PanelShell />
          ) : (
            <LandingPage />
          )}
        </motion.div>
      </AnimatePresence>
      {me && <GlobalMusicPlayer />}
    </div>
  );
}
