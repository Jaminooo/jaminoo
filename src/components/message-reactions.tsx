'use client';

import { useState } from 'react';
import { REACTION_EMOJIS } from '@/lib/constants';
import { Plus } from 'lucide-react';
import { useTranslations } from '@/providers/use-translations';

export interface ReactionAgg {
  emoji: string;
  count: number;
  me: boolean;
}

export function aggReactions(raw: { emoji: string; userId: number }[], meId: number | null): ReactionAgg[] {
  const out: ReactionAgg[] = [];
  for (const r of raw) {
    const cur = out.find((x) => x.emoji === r.emoji);
    if (cur) cur.count++;
    else out.push({ emoji: r.emoji, count: 1, me: meId != null && r.userId === meId });
  }
  return out;
}

export function MessageReactions({
  reactions,
  onReact,
  myReaction,
}: {
  reactions: ReactionAgg[];
  onReact: (emoji: string) => void;
  myReaction?: string | null;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <div className="reactions" onMouseLeave={() => setOpen(false)}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          className={`reaction-pill ${r.me ? 'reaction-me' : ''}`}
          onClick={() => onReact(r.emoji)}
          title={r.emoji}
        >
          <span>{r.emoji}</span>
          <b>{r.count}</b>
        </button>
      ))}
      <div className="reaction-add-wrap">
        <button type="button" className="reaction-add" onClick={() => setOpen((v) => !v)} title={t('reactions.add')}>
          <Plus size={13} />
        </button>
        {open && (
          <div className="reaction-quick">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" className={`reaction-quick-btn ${myReaction === e ? 'reaction-me' : ''}`} onClick={() => { setOpen(false); onReact(e); }}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}