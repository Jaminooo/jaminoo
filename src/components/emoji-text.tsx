'use client';

import { useMemo } from 'react';
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
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} className="emoji-img" src={emojiUrl(s.segment)} alt={s.segment} draggable={false} />
        ) : (
          <span key={i}>{s.segment}</span>
        )
      )}
    </span>
  );
}