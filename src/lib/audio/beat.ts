export class BeatDetector {
  private avg = 0;
  private lastBeat = 0;
  private _beat = 0;

  get beat(): number {
    return this._beat;
  }

  update(bass: number, nowMs: number): void {
    this.avg = this.avg * 0.96 + bass * 0.04;
    const diff = bass - this.avg;
    if (
      diff > 0.045 &&
      bass > this.avg * 1.32 + 0.03 &&
      bass > 0.15 &&
      nowMs - this.lastBeat > 180
    ) {
      this._beat = 1;
      this.lastBeat = nowMs;
    } else {
      this._beat *= 0.92;
      if (this._beat < 0.01) this._beat = 0;
    }
  }

  reset(): void {
    this.avg = 0;
    this.lastBeat = 0;
    this._beat = 0;
  }
}
