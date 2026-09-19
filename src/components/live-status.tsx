'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, LoaderCircle } from 'lucide-react';
import { connectLive, liveStatus, onLiveStatus, type LiveStatus as Status } from '@/lib/live';

const copy: Record<Status, string> = {
  idle: 'Live updates idle', connecting: 'Connecting to live updates', connected: 'Live updates connected',
  reconnecting: 'Reconnecting to live updates', offline: 'You are offline', error: 'Live updates unavailable',
};

export function LiveStatus() {
  const [status, setStatus] = useState<Status>(liveStatus());
  useEffect(() => {
    connectLive();
    return onLiveStatus(setStatus);
  }, []);
  const active = status === 'connected';
  const waiting = status === 'connecting' || status === 'reconnecting';
  const Icon = active ? Wifi : status === 'offline' || status === 'error' ? WifiOff : LoaderCircle;
  return (
    <span className={`live-status live-status-${status}`} title={copy[status]} aria-label={copy[status]}>
      <Icon size={13} className={waiting ? 'live-status-spin' : undefined} />
      <span className="live-status-label">{active ? 'Live' : status === 'offline' ? 'Offline' : 'Syncing'}</span>
    </span>
  );
}
