import { describe, expect, it } from 'vitest';
import { createGame, randomFood, samePoint, step, turn, onSnake, type Point, type SnakeState } from '@/lib/snake-logic';

describe('snake-logic', () => {
  it('createGame builds a centered 3-cell snake with free food and zero score', () => {
    const g = createGame(15, 15);
    expect(g.snake).toHaveLength(3);
    expect(g.score).toBe(0);
    expect(g.over).toBe(false);
    expect(g.dir).toBe('right');
    expect(g.snake[0]).toEqual({ x: 7, y: 7 });
    // Food never spawns on the snake.
    expect(onSnake(g.snake, g.food)).toBe(false);
    // Food is inside the board.
    expect(g.food.x).toBeGreaterThanOrEqual(0);
    expect(g.food.y).toBeGreaterThanOrEqual(0);
    expect(g.food.x).toBeLessThan(15);
    expect(g.food.y).toBeLessThan(15);
  });

  it('samePoint compares points by coordinates', () => {
    expect(samePoint({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePoint({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });

  it('step moves the head forward without growing when not eating', () => {
    const g = createGame(15, 15);
    // Force a clean board so the snake never hits food.
    // Move food somewhere it will not be reached: directly behind the tail.
    const tail = g.snake[g.snake.length - 1];
    const g2: SnakeState = { ...g, food: { x: -1, y: -1 } };
    const next = step(g2);
    expect(next.over).toBe(false);
    expect(next.snake).toHaveLength(3);
    expect(next.snake[0]).toEqual({ x: 8, y: 7 });
    expect(next.score).toBe(0);
    expect(tail).not.toEqual(next.snake[next.snake.length - 1]);
  });

  it('eating food grows the snake and increases the score', () => {
    const g: SnakeState = {
      snake: [
        { x: 3, y: 3 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
      ],
      dir: 'right',
      food: { x: 4, y: 3 },
      cols: 15,
      rows: 15,
      score: 0,
      over: false,
    };
    const next = step(g, () => 0);
    expect(next.over).toBe(false);
    expect(next.snake).toHaveLength(4);
    expect(next.snake[0]).toEqual({ x: 4, y: 3 });
    expect(next.score).toBe(1);
    // New food is placed on a free cell.
    expect(next.food.x).not.toBe(-1);
    expect(onSnake(next.snake, next.food)).toBe(false);
  });

  it('hitting the wall ends the game', () => {
    const g: SnakeState = {
      snake: [
        { x: 14, y: 5 },
        { x: 13, y: 5 },
      ],
      dir: 'right',
      food: { x: -1, y: -1 },
      cols: 15,
      rows: 15,
      score: 0,
      over: false,
    };
    const next = step(g);
    expect(next.over).toBe(true);
    expect(next.snake).toHaveLength(2);
  });

  it('colliding into its own body ends the game', () => {
    // Head at (2,3) moves right into its neck at (3,3) — the tail (3,2) moves away, so this is a real collision.
    const g: SnakeState = {
      snake: [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 2 },
      ],
      dir: 'right',
      food: { x: -1, y: -1 },
      cols: 15,
      rows: 15,
      score: 0,
      over: false,
    };
    const next = step(g);
    expect(next.over).toBe(true);
  });

  it('turn ignores a 180-degree reversal', () => {
    const g = createGame(15, 15);
    const flipped = turn(g, 'left');
    expect(flipped.dir).toBe('right');
    // Valid turn applies.
    const up = turn(g, 'up');
    expect(up.dir).toBe('up');
  });

  it('step is a no-op once the game is over', () => {
    const g: SnakeState = { ...createGame(15, 15), over: true };
    const next = step(g);
    expect(next).toBe(g);
  });

  it('randomFood always lands on a free cell even with a crowded board', () => {
    const snake: Point[] = [];
    for (let x = 0; x < 15; x++) for (let y = 0; y < 15; y++) snake.push({ x, y });
    // Board is full → sentinel cell.
    expect(randomFood(snake, 15, 15)).toEqual({ x: -1, y: -1 });

    // Almost full board → only one free cell remains.
    const almost = snake.slice(0, snake.length - 1);
    const last = snake[snake.length - 1];
    const food = randomFood(almost, 15, 15);
    expect(food).toEqual(last);
  });

  it('cannot eat food that sits on the tail when the tail moves away', () => {
    const g: SnakeState = {
      snake: [
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 0, y: 3 },
      ],
      dir: 'right',
      food: { x: 0, y: 3 }, // food sits on the tail; tail moves away this tick
      cols: 15,
      rows: 15,
      score: 0,
      over: false,
    };
    const next = step(g, () => 0);
    // Head moves to (3,3) without eating the tail food, nothing collides.
    expect(next.over).toBe(false);
    expect(next.snake[0]).toEqual({ x: 3, y: 3 });
    expect(next.snake).toHaveLength(3);
  });

  it('orders snake cells head-first', () => {
    const g = createGame(15, 15);
    const next = step(g);
    const head = next.snake[0];
    const body = next.snake.slice(1);
    expect(body.some((p) => samePoint(p, head))).toBe(false);
  });
});