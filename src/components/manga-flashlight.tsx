'use client';

import { useEffect, useRef } from 'react';
import type { Mesh as ThreeMesh, Node as ThreeNode, WebGPURenderer } from 'three/webgpu';

type OnActive = (on: boolean) => void;

/**
 * MangaFlashlight — faithful port of the three.js WebGPU "flashlight" effect
 * from the shared source:
 *
 *   THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() );
 *   const renderer = new THREE.WebGPURenderer();
 *   await renderer.init();
 *   const rp = new RenderPipeline( renderer );
 *   rp.outputNode = $.vec4( scene_pass.rgb, $.mx_rgbtohsv( scene_pass.rgb ).z.oneMinus().pow( 16 ).mul( 0.9 ) );
 *
 * A RectAreaLight torch follows the cursor (raycast onto the ground plane),
 * a faint sun provides ambient, and the canvas composites over the manga
 * pages: the pool of light reveals the page where the cursor points, the
 * rest stays under a realistic darkness veil.
 *
 * Everything runs client-side inside an effect (dynamic imports) so SSR /
 * hydration stays clean. If WebGPU is unavailable, the component renders
 * nothing and the parent keeps its CSS shade + light fallback.
 */
export function MangaFlashlight({ onActive }: { onActive?: OnActive }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onActiveRef = useRef<OnActive | undefined>(onActive);
  onActiveRef.current = onActive;
  const firedRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    onActiveRef.current = onActive;
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      onActiveRef.current?.(false);
      return;
    }

    let disposed = false;
    let renderer: WebGPURenderer | null = null;

    const fire = (ok: boolean) => {
      if (!disposed && !firedRef.current) {
        firedRef.current = true;
        onActiveRef.current?.(ok);
      }
    };

    (async () => {
      try {
        const THREE = await import('three/webgpu');
        const $ = THREE.TSL;
        const { RectAreaLightTexturesLib } = await import(
          'three/addons/lights/RectAreaLightTexturesLib.js'
        );
        const { RectAreaLightHelper } = await import(
          'three/addons/helpers/RectAreaLightHelper.js'
        );

        THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
        host.appendChild(canvas);

        renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
        await renderer.init();

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
        camera.position.set(10, 12, 14);
        camera.lookAt(0, 0, 0);

        const rp = new THREE.RenderPipeline(renderer);
        const scenePass = $.pass(scene, camera);
        const hsv = $.mx_rgbtohsv(scenePass.rgb) as unknown as ThreeNode<"vec3">;
        rp.outputNode = $.vec4(scenePass.rgb, hsv.z.oneMinus().pow(16).mul(0.9));

        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(48, 48),
          new THREE.MeshPhysicalNodeMaterial({
            color: 0x14141f,
            roughness: 0.55,
            metalness: 0.12,
          })
        );
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        const cubes: ThreeMesh[] = [];
        for (let i = 0; i < 8; i++) {
          const mat = new THREE.MeshPhysicalNodeMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.55, 0.5),
            roughness: 0.25,
          });
          const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat);
          cube.position.set(i < 4 ? -11 : 11, 0.6, -8 + i * 4);
          cube.rotation.y = Math.random() * Math.PI;
          scene.add(cube);
          cubes.push(cube);
        }

        const torchLight = new THREE.RectAreaLight(0xfff1d6, 110, 3, 2.4);
        torchLight.position.set(0, 6, 0);
        torchLight.lookAt(0, 0, 0);
        const torchRoot = new THREE.Object3D();
        torchRoot.add(torchLight);
        scene.add(torchRoot);

        const sun = new THREE.RectAreaLight(0xffffff, 0.14, 40, 40);
        sun.position.set(0, 14, -4);
        sun.lookAt(0, 0, 0);
        scene.add(sun);

        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const hit = new THREE.Vector3();
        const torchTarget = new THREE.Vector3();

        const onPointerMove = (e: PointerEvent) => {
          const r = host.getBoundingClientRect();
          ndc.x = ((e.clientX - r.left) / (r.width || 1)) * 2 - 1;
          ndc.y = -((e.clientY - r.top) / (r.height || 1)) * 2 + 1;
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObject(ground, false);
          if (hits.length) {
            hit.copy(hits[0].point);
            torchTarget.set(hit.x, 0, hit.z);
          }
        };

        const resize = () => {
          const w = host.clientWidth || window.innerWidth;
          const h = host.clientHeight || window.innerHeight;
          renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer?.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };

        resize();
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('resize', resize);

        renderer.setAnimationLoop(() => {
          torchRoot.position.x += (torchTarget.x - torchRoot.position.x) * 0.14;
          torchRoot.position.z += (torchTarget.z - torchRoot.position.z) * 0.14;
          torchRoot.position.y = 6;
          torchLight.lookAt(torchRoot.position.x, 0, torchRoot.position.z + 1);
          cubes.forEach((c) => {
            c.rotation.y += 0.002;
          });
          rp.render();
        });

        fire(true);
      } catch (err) {
        if (host) host.replaceChildren();
        fire(false);
      }
    })();

    return () => {
      disposed = true;
      renderer?.setAnimationLoop(null);
      renderer?.dispose();
      try {
        host.replaceChildren();
      } catch {
        /* noop */
      }
    };
  }, [onActive]);

  return <div ref={hostRef} className="manga-flashlight" aria-hidden="true" />;
}