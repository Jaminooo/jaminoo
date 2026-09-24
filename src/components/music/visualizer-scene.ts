import * as THREE from 'three';
import { readCssColor } from '@/lib/audio/colors';
import type { VisualizerQuality } from '@/lib/audio/capabilities';
import type { AudioFrame } from './use-audio-frame';

const ORB_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uBeat;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;

  float wave(vec3 p, float t) {
    return sin(p.x * 2.9 + t * 1.15) * sin(p.y * 2.9 + t * 0.82) * sin(p.z * 2.9 + t * 1.42);
  }

  void main() {
    vec3 pos = position;
    float slow = wave(normal, uTime);
    slow = slow * 0.5 + 0.5;
    float disp = (uBass * 0.30 + uBeat * 0.15) * slow;
    disp += uBass * 0.09 * wave(normal * 3.0, uTime * 1.7);
    pos += normal * disp;
    vDisp = disp;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const ORB_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uGlow;
  uniform float uBeat;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;

  void main() {
    float fres = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
    vec3 base = mix(uColorA, uColorB, clamp(fres + vDisp * 2.0, 0.0, 1.0));
    float glow = uGlow * 1.5 + uBeat * 1.1;
    vec3 col = base + uColorB * fres * glow;
    float alpha = 0.5 + fres * 0.5 + glow * 0.12;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

const PARTICLE_VERT = /* glsl */ `
  attribute float aRandom;
  uniform float uTime;
  uniform float uBass;
  uniform float uTreble;
  uniform float uBeat;
  uniform float uVolume;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float r = length(p);
    float grow = 1.0 + uBass * 0.55 + uBeat * 0.14 + uTreble * 0.08;
    p = (p / max(r, 0.0001)) * r * grow;
    p += vec3(
      sin(uTime * 0.55 + aRandom * 21.0),
      cos(uTime * 0.5 + aRandom * 33.0),
      sin(uTime * 0.62 + aRandom * 17.0)
    ) * (uTreble * 0.18 + uBass * 0.05);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.8 + aRandom * 1.7) * uSize * uPixelRatio * (1.0 + uBass * 1.2 + uBeat * 0.8);
    gl_PointSize = clamp(size * (120.0 / max(-mv.z, 0.1)), 1.0, 64.0);
    vAlpha = 0.22 + uVolume * 0.65 + uTreble * 0.2;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float m = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(uColor, m * clamp(vAlpha, 0.0, 1.0));
  }
`;

interface OrbUniforms {
  [key: string]: { value: number | THREE.Color };
  uTime: { value: number };
  uBass: { value: number };
  uBeat: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uGlow: { value: number };
}

interface ParticleUniforms {
  [key: string]: { value: number | THREE.Color };
  uTime: { value: number };
  uBass: { value: number };
  uTreble: { value: number };
  uBeat: { value: number };
  uVolume: { value: number };
  uSize: { value: number };
  uPixelRatio: { value: number };
  uColor: { value: THREE.Color };
}

export class VisualizerScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orb: THREE.Mesh;
  private orbUniforms: OrbUniforms;
  private particles: THREE.Points;
  private particleUniforms: ParticleUniforms;
  private resizeObs: ResizeObserver | null = null;
  private raf = 0;
  private disposed = false;
  private visible = false;
  private playing = false;
  private last = 0;
  private elapsed = 0;
  private currentScale = 1;
  private currentGlow = 0;
  private currentBass = 0;
  private currentTreble = 0;
  private currentVolume = 0;
  private reduced: boolean;
  private readonly quality: VisualizerQuality;
  private readonly colorA: string;
  private readonly colorB: string;

  constructor(canvas: HTMLCanvasElement, quality: VisualizerQuality, reduced: boolean) {
    this.quality = quality;
    this.reduced = reduced;
    this.colorA = readCssColor('--color-violet', '#663af3');
    this.colorB = readCssColor('--color-violet-light', '#b39dfc');

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxDpr));
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
    this.camera.position.set(0, 0, 4.2);

    const colorA = new THREE.Color(this.colorA);
    const colorB = new THREE.Color(this.colorB);

    // ---- Orb ----
    this.orbUniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uBeat: { value: 0 },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
      uGlow: { value: 0 },
    };
    const orbGeo = new THREE.IcosahedronGeometry(1.2, 4);
    const orbMat = new THREE.ShaderMaterial({
      vertexShader: ORB_VERT,
      fragmentShader: ORB_FRAG,
      uniforms: this.orbUniforms,
      transparent: true,
      depthWrite: false,
    });
    this.orb = new THREE.Mesh(orbGeo, orbMat);
    this.scene.add(this.orb);

    // ---- Particles ----
    const count = quality.particleCount;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      randoms[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    this.particleUniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uVolume: { value: 0 },
      uSize: { value: reduced ? 0.6 : 1 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, quality.maxDpr) },
      uColor: { value: colorB.clone() },
    };
    const pMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: this.particleUniforms,
      transparent: true,
      depthWrite: false,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particles);

    if (this.resizeObs) this.resizeObs.disconnect();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();

    this.last = performance.now();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(): void {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const w = parent.clientWidth || 1;
    const h = parent.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.updateLoop();
  }

  setPlaying(v: boolean): void {
    this.playing = v;
    this.updateLoop();
  }

  private updateLoop(): void {
    const shouldRun = this.visible && this.playing && !document.hidden && !this.disposed;
    if (!shouldRun) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.last = performance.now();
      return;
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private loop = (): void => {
    this.raf = 0;
    if (this.disposed || !this.visible || !this.playing || document.hidden) return;
    const now = performance.now();
    const dtSec = Math.min(0.064, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dtSec;
    this.tick(this.frameGetter ? this.frameGetter() : null, dtSec);
    this.raf = requestAnimationFrame(this.loop);
  };

  private lastFrame: AudioFrame | null = null;
  private frameGetter: (() => AudioFrame | null) | null = null;

  setFrameGetter(get: () => AudioFrame | null): void {
    this.frameGetter = get;
  }

  tick(frame: AudioFrame | null, dt: number): void {
    const playing = frame?.playing ?? false;

    const targetBass = frame ? frame.bass : 0;
    const targetTreble = frame ? frame.treble : 0;
    const targetVolume = frame ? frame.volume : 0;
    const k = this.reduced ? 0.04 : 0.09;

    this.currentScale += ((1 + targetBass * 0.11 + (frame?.beat ?? 0) * 0.05) - this.currentScale) * k;
    this.currentGlow += ((playing ? targetVolume * 1.5 + (frame?.beat ?? 0) * 1.2 : 0.08) - this.currentGlow) * k;
    this.currentBass += (targetBass - this.currentBass) * k;
    this.currentTreble += (targetTreble - this.currentTreble) * k;
    this.currentVolume += (targetVolume - this.currentVolume) * k;

    this.orb.scale.setScalar(this.currentScale);
    this.orb.rotation.y += dt * 0.28;
    if (!this.reduced) {
      this.orb.rotation.x += dt * 0.06;
    }

    const u = this.orbUniforms;
    u.uTime.value = this.elapsed;
    u.uBass.value = this.currentBass;
    u.uBeat.value = frame?.beat ?? 0;
    u.uGlow.value = this.currentGlow;

    const p = this.particleUniforms;
    p.uTime.value = this.elapsed;
    p.uBass.value = this.currentBass;
    p.uTreble.value = this.currentTreble;
    p.uBeat.value = frame?.beat ?? 0;
    p.uVolume.value = this.currentVolume;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();

    const disposeObj = (obj: THREE.Object3D) => {
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    };
    disposeObj(this.scene);
    this.renderer.dispose();
    try {
      this.renderer.forceContextLoss();
    } catch {}
    this.scene.clear();
  }
}
