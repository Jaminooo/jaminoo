'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { PanelShell } from '@/components/panel-shell';
import { TopRightControls } from '@/components/top-controls';
import { ToastHost } from '@/components/toast-host';
import { motion, AnimatePresence } from 'framer-motion';
import { HubGateway } from '@/components/hub-gateway';
import { MusicHub } from '@/components/music-hub';
import { VideoHub } from '@/components/video-hub';
import { CinemaHub } from '@/components/cinema-hub';
import { TweetHub } from '@/components/tweet-hub';
import { LandingPage } from '@/components/landing-page';
import { useSyncRouting } from '@/lib/sync-routing';

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
            product === 'home' ? <HubGateway /> : product === 'music' ? <MusicHub /> : product === 'video' ? <VideoHub /> : product === 'cinema' ? <CinemaHub /> : product === 'tweet' ? <TweetHub /> : <PanelShell />
          ) : (
            <LandingPage />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
