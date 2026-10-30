import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { Canvas3D } from './Canvas3D';

export type DoodleApi = { undo: () => void; clear: () => void; save: () => boolean; strokes: () => number };

export type KidsDoodleToothProps = {
  /** The brush colour, read at every stroke. */
  color: string;
  /** Whose drawing: each child keeps their own. */
  kid: string;
  api: MutableRefObject<DoodleApi | null>;
  onChange?: (strokes: number) => void;
  style?: StyleProp<ViewStyle>;
};

const TEX_W = 1024;
const TEX_H = 512;
const BRUSH = 20;
const keyOf = (kid: string) => `smile-kids-doodle-${kid}`;

/** A friendly molar: a lathe profile (round crown, a waist, a root), with four cusps on top and the root split in two. */
function toothGeometry(): THREE.BufferGeometry {
  const profile = [
    [0.001, 1.0],
    [0.3, 1.05],
    [0.56, 1.0],
    [0.77, 0.86],
    [0.87, 0.62],
    [0.89, 0.34],
    [0.83, 0.08],
    [0.71, -0.12],
    [0.65, -0.36],
    [0.58, -0.7],
    [0.47, -1.04],
    [0.31, -1.32],
    [0.15, -1.5],
    [0.001, -1.56],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const curve = new THREE.SplineCurve(profile);
  const points = curve.getPoints(110);
  const segments = 128;
  const geo = new THREE.LatheGeometry(points, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const s = (e0: number, e1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    const phi = Math.atan2(v.x, v.z);
    // Four soft cusps and a shallow groove in the middle of the chewing surface.
    const top = s(0.55, 1.0, v.y);
    v.y += 0.085 * top * Math.cos(4 * phi + Math.PI / 4) * Math.min(1, r / 0.7);
    if (v.y > 0.8 && r < 0.55) v.y -= 0.07 * (1 - r / 0.55) ** 2;
    // A crown a little wider than deep.
    const crown = s(-0.3, 0.2, v.y);
    v.x *= 1 + 0.06 * crown;
    v.z *= 1 - 0.05 * crown;
    // The root splits: the middle lifts, the two halves move apart and flatten.
    const root = s(-0.25, -1.5, v.y);
    const middle = Math.exp(-((v.x / 0.2) ** 2));
    v.y += 0.55 * root * root * middle;
    v.x += 0.16 * root * Math.tanh(v.x / 0.12);
    v.z *= 1 - 0.4 * root;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  // The lathe's seam has two copies of each vertex; give both the same normal so no line shows.
  const n = geo.attributes.normal as THREE.BufferAttribute;
  const per = points.length;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let j = 0; j < per; j++) {
    a.fromBufferAttribute(n, j);
    b.fromBufferAttribute(n, segments * per + j);
    a.add(b).normalize();
    n.setXYZ(j, a.x, a.y, a.z);
    n.setXYZ(segments * per + j, a.x, a.y, a.z);
  }
  geo.center();
  return geo;
}

type Stroke = { color: string; pts: { x: number; y: number }[] };

/**
 * The light and the film-like tone mapping brighten what is painted on the white enamel; the brush lays a deeper,
 * richer version of the chosen colour down, so on screen it looks like the swatch the child tapped.
 */
function deepen(hex: string): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 1.15), hsl.l * 0.72);
  return `#${c.getHexString()}`;
}

/**
 * The Krabbeltand: a big 3D molar to paint on with a finger. Touching the tooth paints (the ray from the finger finds
 * the spot on the tooth, and its texture coordinates find the pixel on a canvas that is the tooth's skin); dragging
 * beside it turns it. Strokes can be undone one by one; "bewaar" keeps the drawing on this device.
 */
export function KidsDoodleTooth({ color, kid, api, onChange, style }: KidsDoodleToothProps) {
  const colorRef = useRef(color);
  colorRef.current = color;
  const changed = useRef(onChange);
  changed.current = onChange;

  return (
    <Canvas3D
      style={style}
      fov={32}
      deps={[kid]}
      setup={({ renderer, scene, camera, el }) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        camera.position.set(0, 0.15, 7.4);
        camera.lookAt(0, 0, 0);
        renderer.domElement.style.touchAction = 'none';
        renderer.domElement.style.cursor = 'crosshair';

        // The skin: enamel white with a faint warm gradient, then the saved drawing, then the strokes.
        const skin = document.createElement('canvas');
        skin.width = TEX_W;
        skin.height = TEX_H;
        const g = skin.getContext('2d')!;
        const base = document.createElement('canvas');
        base.width = TEX_W;
        base.height = TEX_H;
        const bg = base.getContext('2d')!;
        const grad = bg.createLinearGradient(0, 0, 0, TEX_H);
        // The canvas's top is the tip of the root, its bottom the top of the crown.
        grad.addColorStop(0, '#F2E6D2');
        grad.addColorStop(0.45, '#FBF7EF');
        grad.addColorStop(1, '#FFFFFF');
        bg.fillStyle = grad;
        bg.fillRect(0, 0, TEX_W, TEX_H);
        let saved: HTMLImageElement | null = null;
        const strokes: Stroke[] = [];

        const texture = new THREE.CanvasTexture(skin);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        texture.wrapS = THREE.RepeatWrapping;

        const drawStroke = (st: Stroke, from = 0) => {
          g.strokeStyle = st.color;
          g.fillStyle = st.color;
          g.lineWidth = BRUSH;
          g.lineCap = 'round';
          g.lineJoin = 'round';
          for (let i = Math.max(1, from); i < st.pts.length; i++) {
            const p = st.pts[i - 1];
            const q = st.pts[i];
            if (Math.abs(q.x - p.x) > TEX_W / 2) continue;
            for (const dx of [-TEX_W, 0, TEX_W]) {
              g.beginPath();
              g.moveTo(p.x + dx, p.y);
              g.lineTo(q.x + dx, q.y);
              g.stroke();
            }
          }
          if (st.pts.length === 1 || from === 0) {
            const p = st.pts[0];
            for (const dx of [-TEX_W, 0, TEX_W]) {
              g.beginPath();
              g.arc(p.x + dx, p.y, BRUSH / 2, 0, Math.PI * 2);
              g.fill();
            }
          }
        };
        const redraw = () => {
          g.drawImage(base, 0, 0);
          if (saved) g.drawImage(saved, 0, 0, TEX_W, TEX_H);
          for (const st of strokes) drawStroke(st);
          texture.needsUpdate = true;
        };
        redraw();
        try {
          const stored = localStorage.getItem(keyOf(kid));
          if (stored) {
            const img = new Image();
            img.onload = () => {
              saved = img;
              redraw();
            };
            img.src = stored;
          }
        } catch {
          // No storage: start with a clean tooth.
        }

        const material = new THREE.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.36,
          clearcoat: 0.7,
          clearcoatRoughness: 0.16,
          sheen: 0.2,
          sheenColor: new THREE.Color('#FFF1DA'),
          envMapIntensity: 0.8,
        });
        const tooth = new THREE.Mesh(toothGeometry(), material);
        tooth.rotation.y = Math.PI; // the lathe's seam to the back
        const pivot = new THREE.Group();
        pivot.add(tooth);
        scene.add(pivot);

        // A warm glow on the floor under it.
        const glowTex = (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const gg = c.getContext('2d')!;
          const rg = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
          rg.addColorStop(0, 'rgba(255,177,46,0.5)');
          rg.addColorStop(1, 'rgba(255,177,46,0)');
          gg.fillStyle = rg;
          gg.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        })();
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
        glow.position.set(0, -1.85, -0.6);
        scene.add(glow);
        const key = new THREE.DirectionalLight('#FFF6E8', 1.3);
        key.position.set(3, 4, 5);
        const fill = new THREE.DirectionalLight('#BFD9FF', 0.35);
        fill.position.set(-4, 1, 2);
        scene.add(key, fill, new THREE.AmbientLight('#FFF4E6', 0.4));

        // Painting and turning.
        const ray = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const hit = (e: PointerEvent) => {
          const r = renderer.domElement.getBoundingClientRect();
          ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ndc, camera);
          const found = ray.intersectObject(tooth, false)[0];
          return found?.uv ? { x: found.uv.x * TEX_W, y: (1 - found.uv.y) * TEX_H } : null;
        };
        let mode: 'none' | 'paint' | 'turn' = 'none';
        let current: Stroke | null = null;
        let lastX = 0;
        let lastY = 0;
        let spinY = 0;
        let spinX = 0.12;
        let velY = 0;
        let idle = 0;
        const canvas = renderer.domElement;
        const down = (e: PointerEvent) => {
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
            // A pointer the browser no longer tracks: painting still works while it stays on the canvas.
          }
          idle = 0;
          const p = hit(e);
          if (p) {
            mode = 'paint';
            current = { color: deepen(colorRef.current), pts: [p] };
            strokes.push(current);
            drawStroke(current);
            texture.needsUpdate = true;
          } else {
            mode = 'turn';
            lastX = e.clientX;
            lastY = e.clientY;
            velY = 0;
          }
        };
        const move = (e: PointerEvent) => {
          if (mode === 'paint' && current) {
            const p = hit(e);
            if (!p) return;
            current.pts.push(p);
            drawStroke(current, current.pts.length - 1);
            texture.needsUpdate = true;
          } else if (mode === 'turn') {
            const dx = (e.clientX - lastX) / 110;
            const dy = (e.clientY - lastY) / 160;
            lastX = e.clientX;
            lastY = e.clientY;
            spinY += dx;
            velY = dx;
            spinX = Math.max(-0.6, Math.min(0.8, spinX + dy));
          }
        };
        const up = () => {
          if (mode === 'paint') changed.current?.(strokes.length);
          mode = 'none';
          current = null;
        };
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);

        api.current = {
          undo: () => {
            strokes.pop();
            redraw();
            changed.current?.(strokes.length);
          },
          clear: () => {
            strokes.length = 0;
            saved = null;
            redraw();
            changed.current?.(0);
          },
          save: () => {
            try {
              localStorage.setItem(keyOf(kid), skin.toDataURL('image/jpeg', 0.88));
              return true;
            } catch {
              return false;
            }
          },
          strokes: () => strokes.length,
        };

        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        return {
          update: (t, dt) => {
            idle += dt;
            if (mode !== 'turn') {
              spinY += velY;
              velY *= 0.92;
            }
            // When nobody touches it for a while it sways a little, to show it is 3D.
            const sway = !still && idle > 2.5 && mode === 'none' ? Math.sin((idle - 2.5) * 0.6) * 0.25 : 0;
            pivot.rotation.y = spinY + sway;
            pivot.rotation.x = spinX;
            pivot.position.y = still ? 0 : Math.sin(t * 0.9) * 0.04;
          },
          dispose: () => {
            canvas.removeEventListener('pointerdown', down);
            canvas.removeEventListener('pointermove', move);
            canvas.removeEventListener('pointerup', up);
            canvas.removeEventListener('pointercancel', up);
            pmrem.dispose();
            glowTex.dispose();
            api.current = null;
          },
        };
      }}
    />
  );
}
