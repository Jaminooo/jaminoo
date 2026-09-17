'use client';

import Image from 'next/image';

export type JamiMascotState = 'idle' | 'wave' | 'chat' | 'happy' | 'error' | '404' | 'offline' | 'party' | 'v2';

export function JamiMascot({ state = 'idle', size = 180, className = '', alt = 'Jami mascot' }: { state?: JamiMascotState; size?: number; className?: string; alt?: string }) {
  return (
    <Image
      className={`jami-mascot ${className}`}
      src={`/mascots/jami-${state}.svg`}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      priority={state === 'wave' || state === 'party'}
    />
  );
}
