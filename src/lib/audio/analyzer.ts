import { Howler } from 'howler';

export interface AudioBands {
  volume: number;
  bass: number;
  mid: number;
  treble: number;
  spectrum: Uint8Array;
  wave: Uint8Array;
}

const FFT_SIZE = 2048;

class AudioAnalyzerImpl {
  private analyser: AnalyserNode | null = null;
  private _sink: GainNode | null = null;
  private freq: Uint8Array<ArrayBuffer> | null = null;
  private time: Uint8Array<ArrayBuffer> | null = null;
  private readonly _bands: AudioBands = {
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    spectrum: new Uint8Array(0),
    wave: new Uint8Array(0),
  };

  get ready(): boolean {
    return !!this.analyser;
  }

  get bands(): AudioBands {
    return this._bands;
  }

  attach(): boolean {
    if (this.analyser) return true;
    // Howler.ctx and masterGain are created lazily after the first Howl in web-audio mode.
    const ctx = (Howler as any).ctx as AudioContext | null | undefined;
    const master = (Howler as any).masterGain as GainNode | null | undefined;
    if (!ctx || !master) return false;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.82;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    // Route a silent branch through the analyser so it is processed without duplicating audio output.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    master.connect(analyser);
    analyser.connect(sink);
    sink.connect(ctx.destination);

    this.analyser = analyser;
    this._sink = sink;
    this.freq = new Uint8Array(analyser.frequencyBinCount);
    this.time = new Uint8Array(analyser.fftSize);
    this._bands.spectrum = this.freq;
    this._bands.wave = this.time;
    return true;
  }

  async resume(): Promise<boolean> {
    const ctx = (Howler as any).ctx as AudioContext | undefined;
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  read(): AudioBands {
    const a = this.analyser;
    const freq = this.freq;
    const time = this.time;
    if (!a || !freq || !time) return this._bands;

    a.getByteFrequencyData(freq);
    a.getByteTimeDomainData(time);

    const n = freq.length;
    const sampleRate = ((Howler as any).ctx as AudioContext)?.sampleRate ?? 44100;
    const nyquist = sampleRate / 2;
    const binHz = nyquist / n;

    const avg = (loHz: number, hiHz: number) => {
      const lo = Math.max(0, Math.floor(loHz / binHz));
      const hi = Math.min(n - 1, Math.ceil(hiHz / binHz));
      if (hi <= lo) return freq[lo] / 255;
      let sum = 0;
      for (let i = lo; i <= hi; i++) sum += freq[i];
      return (sum / ((hi - lo + 1) * 255));
    };

    this._bands.bass = avg(20, 140);
    this._bands.mid = avg(400, 2600);
    this._bands.treble = avg(5000, 12000);

    // RMS volume from time-domain
    let sumSq = 0;
    for (let i = 0; i < time.length; i++) {
      const v = (time[i] - 128) / 128;
      sumSq += v * v;
    }
    this._bands.volume = Math.min(1, Math.sqrt(sumSq / time.length) * 3);

    return this._bands;
  }

  detach(): void {
    try {
      this.analyser?.disconnect();
      this._sink?.disconnect();
    } catch {}
    this.analyser = null;
    this._sink = null;
    this.freq = null;
    this.time = null;
  }
}

let singleton: AudioAnalyzerImpl | null = null;

export function getAudioAnalyzer(): AudioAnalyzerImpl {
  if (!singleton) singleton = new AudioAnalyzerImpl();
  return singleton;
}
