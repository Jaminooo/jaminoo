// Pure snake game logic — no DOM, no timers. Fully unit-testable.

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  /** Head first, then body toward the tail. */
  snake: Point[];
  dir: Direction;
  food: Point;
  cols: number;
  rows: number;
  score: number;
  over: boolean;
}

export const DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function onSnake(snake: Point[], p: Point): boolean {
  return snake.some((s) => samePoint(s, p));
}

/** Pick a random free cell (not covered by the snake), or {x:-1,y:-1} when the board is full. */
export function randomFood(snake: Point[], cols: number, rows: number, rng: () => number = Math.random): Point {
  const free: Point[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = { x, y };
      if (!onSnake(snake, p)) free.push(p);
    }
  }
  if (free.length === 0) return { x: -1, y: -1 };
  const pick = Math.min(free.length - 1, Math.floor(rng() * free.length));
  return free[pick];
}

export function createGame(cols = 15, rows = 15, rng: () => number = Math.random): SnakeState {
  const hx = Math.floor(cols / 2);
  const hy = Math.floor(rows / 2);
  const snake = [
    { x: hx, y: hy },
    { x: hx - 1, y: hy },
    { x: hx - 2, y: hy },
  ];
  return { snake, dir: 'right', food: randomFood(snake, cols, rows, rng), cols, rows, score: 0, over: false };
}

/** Queue a direction turn; a 180° reversal is ignored. */
export function turn(state: SnakeState, dir: Direction): SnakeState {
  const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
  if (dir === opposite[state.dir]) return state;
  return { ...state, dir };
}

/** Advance the game by one tick. Returns the next state (or the same state when already over). */
export function step(state: SnakeState, rng: () => number = Math.random): SnakeState {
  if (state.over) return state;
  const { snake, dir, cols, rows, food } = state;
  const d = DELTAS[dir];
  const head = snake[0];
  const next = { x: head.x + d.x, y: head.y + d.y };

  // Wall collision.
  if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows) {
    return { ...state, over: true };
  }

  const eats = samePoint(next, food);
  // When not eating, the tail moves away this tick, so it is safe to overlap it.
  const body = eats ? snake : snake.slice(0, -1);
  if (onSnake(body, next)) {
    return { ...state, over: true };
  }

  const grown = [next, ...snake];
  if (!eats) grown.pop();
  const newFood = eats ? randomFood(grown, cols, rows, rng) : food;
  return { ...state, snake: grown, food: newFood, score: eats ? state.score + 1 : state.score };
}