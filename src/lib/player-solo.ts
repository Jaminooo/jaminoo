export type PlayerPause = () => void;
export type PlayerUnregister = () => void;

export class PlayerSolo {
  private players = new Map<symbol, PlayerPause>();
  private active: symbol | null = null;

  register(id: symbol, pause: PlayerPause): PlayerUnregister {
    this.players.set(id, pause);
    return () => {
      this.players.delete(id);
      if (this.active === id) {
        this.active = null;
      }
    };
  }

  claim(id: symbol): boolean {
    if (this.active !== id) {
      this.active = id;
      for (const [pid, pause] of this.players) {
        if (pid !== id) {
          try {
            pause();
          } catch {
            // ignore
          }
        }
      }
    }
    return true;
  }

  tryClaim(id: symbol): boolean {
    if (this.active !== null && this.active !== id) return false;
    return this.claim(id);
  }

  release(id: symbol): void {
    if (this.active === id) {
      this.active = null;
    }
  }

  isActive(id: symbol): boolean {
    return this.active === id;
  }

  get activeId(): symbol | null {
    return this.active;
  }

  get size(): number {
    return this.players.size;
  }
}

export const playerSolo = new PlayerSolo();
