'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Gamepad2, Gamepad, Joystick, Keyboard, Play, Trophy, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { createGame, step, turn, onSnake, type Direction, type SnakeState } from '@/lib/snake-logic';

const COLS = 17;
const ROWS = 17;
const BEST_KEY = 'jamino.snake.best';

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

type SnakeStatus = 'idle' | 'running' | 'paused' | 'over';

function readBest(): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(window.localStorage.getItem(BEST_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function SnakeBoard({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const [state, setState] = useState<SnakeState>(() => createGame(COLS, ROWS));
  const [status, setStatus] = useState<SnakeStatus>('idle');
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const stateRef = useRef(state);
  const statusRef = useRef(status);
  const dirQueue = useRef<Direction[]>([]);

  stateRef.current = state;
  statusRef.current = status;

  useEffect(() => {
    setBest(readBest());
  }, []);

  // Main tick loop — only runs while the game is actively playing.
  useEffect(() => {
    if (status !== 'running') return;
    const speed = Math.max(80, 170 - state.score * 4);
    const id = window.setInterval(() => {
      let next = stateRef.current;
      // Apply all queued turns before the step so fast double-taps feel right.
      for (const d of dirQueue.current) next = turn(next, d);
      dirQueue.current = [];
      next = step(next);
      setState(next);
      if (next.over) {
        setStatus('over');
        setBest((prev) => {
          if (next.score > prev) {
            window.localStorage.setItem(BEST_KEY, String(next.score));
            setIsNewBest(true);
            return next.score;
          }
          return prev;
        });
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [status, state.score]);

  const queueTurn = useCallback((dir: Direction) => {
    if (statusRef.current !== 'running') return;
    if (dirQueue.current.length < 2) dirQueue.current.push(dir);
  }, []);

  // Keyboard controls (arrow keys + WASD).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      if (statusRef.current === 'running') queueTurn(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queueTurn]);

  const start = () => {
    setIsNewBest(false);
    setState(createGame(COLS, ROWS));
    dirQueue.current = [];
    setStatus('running');
  };

  const togglePause = () => {
    setStatus((s) => (s === 'running' ? 'paused' : s === 'paused' ? 'running' : s));
  };

  const cell = (x: number, y: number) => y * COLS + x;
  const head = state.snake[0];
  const cellPct = 100 / COLS;

  const pad = (dir: Direction) => (
    <button
      key={dir}
      type="button"
      className={`game-pad-key game-pad-${dir}`}
      aria-label={t('games.keysHint')}
      onClick={() => queueTurn(dir)}
    >
      {dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◀' : '▶'}
    </button>
  );

  return (
    <section className="game-snake" aria-label={t('games.snake')}>
      <div className="game-snake-head">
        <div>
          <span className="game-kicker">{t('games.snakeKicker')}</span>
          <h2>{t('games.snake')}</h2>
        </div>
        <div className="game-scoreboard">
          <div className="game-score-chip">
            <Trophy size={14} />
            <span>{t('games.best')}</span>
            <b>{best}</b>
          </div>
          <div className="game-score-chip is-score">
            <Sparkles size={14} />
            <span>{t('games.score')}</span>
            <b>{state.score}</b>
          </div>
        </div>
      </div>

      <div className="game-snake-body">
        <div
          className={`game-board${status === 'running' ? ' is-running' : ''}`}
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            const isSnake = onSnake(state.snake, { x, y });
            const isHead = head.x === x && head.y === y;
            const isFood = state.food.x === x && state.food.y === y;
            if (!isSnake && !isFood) return <span key={i} className="game-cell" />;
            return (
              <span
                key={i}
                className={`game-cell${isHead ? ' is-head' : isSnake ? ' is-body' : ''}${isFood ? ' is-food' : ''}`}
                style={{ gridColumnStart: x + 1, gridRowStart: y + 1 }}
              />
            );
          })}

          <AnimatePresence>
            {status !== 'running' && (
              <motion.div
                key={status}
                className="game-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {status === 'idle' && (
                  <>
                    <Gamepad2 size={40} />
                    <p>{t('games.snakeDesc')}</p>
                    <button type="button" className="btn btn-primary" onClick={start}>
                      <Play size={15} fill="currentColor" /> {t('games.start')}
                    </button>
                  </>
                )}
                {status === 'paused' && (
                  <>
                    <Pause size={40} />
                    <button type="button" className="btn btn-primary" onClick={togglePause}>
                      <Play size={15} fill="currentColor" /> {t('games.resume')}
                    </button>
                  </>
                )}
                {status === 'over' && (
                  <>
                    <Trophy size={40} />
                    <strong className="game-final-score">
                      {t('games.score')}: {state.score}
                    </strong>
                    {isNewBest && <em className="game-new-best">{t('games.newBest')}</em>}
                    <button type="button" className="btn btn-primary" onClick={start}>
                      <RotateCcw size={15} /> {t('games.playAgain')}
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="game-side">
          <div className="game-controls">
            <button
              type="button"
              className="btn btn-ghost game-pause-btn"
              onClick={togglePause}
              disabled={status === 'idle' || status === 'over'}
            >
              {status === 'paused' ? <Play size={15} /> : <Pause size={15} />}
              {status === 'paused' ? t('games.resume') : t('games.pause')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={start}>
              <RotateCcw size={15} /> {t('games.restart')}
            </button>
          </div>

          <div className="game-pad" role="group" aria-label={t('games.keysHint')}>
            <span className="game-pad-gap" />
            {pad('up')}
            <span className="game-pad-gap" />
            {pad('left')}
            {pad('down')}
            {pad('right')}
          </div>

          <div className="game-hint">
            <Keyboard size={15} />
            <p>
              <b>{t('games.howToPlay')}</b>
              {t('games.keysHint')}
            </p>
          </div>

          <div className="game-stats">
            <div>
              <span>{t('games.length')}</span>
              <b>{state.snake.length}</b>
            </div>
            <div>
              <span>{t('games.speed')}</span>
              <b>{Math.max(1, Math.round((170 - state.score * 4) / 40))}</b>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

const COMING_SOON = [
  { icon: Joystick, key: 'tetris' },
  { icon: Gamepad, key: 'pong' },
  { icon: Gamepad2, key: 'mines' },
];

export function GamesHub() {
  const t = useTranslations();
  const setProduct = useAppStore((state) => state.setProduct);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToGames = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const soonCards = useMemo(
    () =>
      COMING_SOON.map(({ icon: Icon, key }) => (
        <article key={key} className="game-soon-card">
          <span className="game-soon-icon">
            <Icon size={22} />
          </span>
          <b>{t(`games.${key}`)}</b>
          <span className="game-soon-badge">{t('games.comingSoon')}</span>
        </article>
      )),
    [t],
  );

  return (
    <div className="hub-shell hub-shell-games">
      <WorkspaceTopbar onHome={() => setProduct('home')} product={t('hubs.games')} />
      <div className="games-scroll" ref={scrollRef}>
        <main className="games-hub-main">
          <button type="button" className="hub-back" onClick={() => setProduct('home')}>
            <ArrowLeft size={15} /> {t('hubs.all')}
          </button>

          <header className="games-hero">
            <span className="hub-kicker">{t('games.kicker')}</span>
            <h1>{t('games.title')}</h1>
            <p>{t('games.lead')}</p>
          </header>

          <SnakeBoard t={t} />

          <section className="game-soon" aria-label={t('games.otherGamesKicker')}>
            <div className="game-soon-head">
              <span className="game-kicker">{t('games.otherGamesKicker')}</span>
              <p>{t('games.soonNote')}</p>
            </div>
            <div className="game-soon-grid">{soonCards}</div>
          </section>

          <footer className="games-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setProduct('home')}>
              <ArrowRight size={15} /> {t('games.back')}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}