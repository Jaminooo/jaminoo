import { describe, expect, it, vi } from 'vitest';
import { PlayerSolo } from '../player-solo';

describe('PlayerSolo (exclusive playback)', () => {
  it('registers and unregisters players', () => {
    const solo = new PlayerSolo();
    const id1 = Symbol('p1');
    const id2 = Symbol('p2');
    const pause1 = vi.fn();
    const pause2 = vi.fn();

    const u1 = solo.register(id1, pause1);
    const u2 = solo.register(id2, pause2);

    expect(solo.size).toBe(2);
    expect(solo.activeId).toBeNull();

    u1();
    expect(solo.size).toBe(1);
    expect(solo.isActive(id1)).toBe(false);

    u2();
    expect(solo.size).toBe(0);
    expect(solo.activeId).toBeNull();
  });

  it('claim pauses all others and sets active', () => {
    const solo = new PlayerSolo();
    const id1 = Symbol('p1');
    const id2 = Symbol('p2');
    const id3 = Symbol('p3');
    const pause1 = vi.fn();
    const pause2 = vi.fn();
    const pause3 = vi.fn();

    solo.register(id1, pause1);
    solo.register(id2, pause2);
    solo.register(id3, pause3);

    solo.claim(id1);
    expect(solo.activeId).toBe(id1);
    expect(solo.isActive(id1)).toBe(true);
    expect(pause1).not.toHaveBeenCalled();
    expect(pause2).toHaveBeenCalledTimes(1);
    expect(pause3).toHaveBeenCalledTimes(1);

    pause2.mockClear();
    pause3.mockClear();

    solo.claim(id2);
    expect(solo.activeId).toBe(id2);
    expect(pause1).toHaveBeenCalledTimes(1);
    expect(pause2).not.toHaveBeenCalled();
    expect(pause3).toHaveBeenCalledTimes(1);
  });

  it('tryClaim does not steal when another is active', () => {
    const solo = new PlayerSolo();
    const id1 = Symbol('p1');
    const id2 = Symbol('p2');
    const pause1 = vi.fn();
    const pause2 = vi.fn();

    solo.register(id1, pause1);
    solo.register(id2, pause2);

    expect(solo.claim(id1)).toBe(true);
    expect(solo.activeId).toBe(id1);

    pause1.mockClear();
    pause2.mockClear();

    expect(solo.tryClaim(id2)).toBe(false);
    expect(solo.activeId).toBe(id1);
    expect(pause1).not.toHaveBeenCalled();
    expect(pause2).not.toHaveBeenCalled();

    expect(solo.tryClaim(id1)).toBe(true);
    expect(solo.activeId).toBe(id1);
  });

  it('release clears active only for the active id', () => {
    const solo = new PlayerSolo();
    const id1 = Symbol('p1');
    const id2 = Symbol('p2');
    const pause1 = vi.fn();
    const pause2 = vi.fn();

    solo.register(id1, pause1);
    solo.register(id2, pause2);

    solo.claim(id1);
    expect(solo.activeId).toBe(id1);

    solo.release(id2);
    expect(solo.activeId).toBe(id1);

    solo.release(id1);
    expect(solo.activeId).toBeNull();
  });

  it('unregistering the active player frees the slot', () => {
    const solo = new PlayerSolo();
    const id1 = Symbol('p1');
    const pause1 = vi.fn();

    const u1 = solo.register(id1, pause1);
    solo.claim(id1);
    expect(solo.activeId).toBe(id1);

    u1();
    expect(solo.size).toBe(0);
    expect(solo.activeId).toBeNull();
    expect(solo.isActive(id1)).toBe(false);
  });
});
