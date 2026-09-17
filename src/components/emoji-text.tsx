'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { emojiUrl, isEmojiSegment } from '@/lib/emoji';

export function EmojiText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(seg.segment(text));
  }, [text]);

  return (
    <span className={className}>
      {parts.map((s, i) =>
        isEmojiSegment(s.segment) ? (
          <Image key={i} className="emoji-img" src={emojiUrl(s.segment)} alt={s.segment} width={20} height={20} unoptimized draggable={false} />
        ) : (
          <span key={i}>{s.segment}</span>
        )
      )}
    </span>
  );
}