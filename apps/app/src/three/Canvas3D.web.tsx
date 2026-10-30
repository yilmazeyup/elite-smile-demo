import { useEffect, useRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';

import type { Canvas3DProps, Stage } from './types';

export type { Scene3D, Stage } from './types';

/**
 * A three.js canvas that fills its box: it sizes itself to the box, caps the pixel ratio, pauses while the tab is
 * hidden or the canvas is off screen, and cleans up the GPU objects when it goes away.
 */
export function Canvas3D({ setup, style, deps = [], alpha = true, fov = 40 }: Canvas3DProps) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'pan-y';
    el.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 200);
    const stage: Stage = { renderer, scene, camera, el, width: 1, height: 1 };
    const size = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      stage.width = w;
      stage.height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      scene3d?.resize?.(w, h);
    };
    const scene3d = setupRef.current(stage) || {};
    size();
    const observer = new ResizeObserver(size);
    observer.observe(el);
    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
    });
    io.observe(el);
    let raf = 0;
    let last = performance.now();
    const start = last;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      scene3d.update?.((now - start) / 1000, dt);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      scene3d.dispose?.();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
      canvas.remove();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return <View ref={box} style={[{ position: 'relative', overflow: 'hidden' }, style]} />;
}

/** The current look, read from the page. */
export const pageIsNight = () => document.documentElement.dataset.theme !== 'day';
