import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { Canvas3D } from './Canvas3D';

export type BracesSetProps = {
  /** The elastics' colours, repeated along the teeth. */
  colors: string[];
  /** Bump this to spin the set once (the colours change halfway, when its back is turned). */
  spin: number;
  style?: StyleProp<ViewStyle>;
};

const R = 3.1;
/** The six front teeth: canine, lateral, central, central, lateral, canine (width, height). */
const TEETH = [
  { w: 0.74, h: 1.06 },
  { w: 0.64, h: 0.98 },
  { w: 0.84, h: 1.16 },
  { w: 0.84, h: 1.16 },
  { w: 0.64, h: 0.98 },
  { w: 0.74, h: 1.06 },
];

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Sofia's front teeth with their braces in 3D: porcelain-white teeth on a soft gum, steel brackets, the archwire and
 * an elastic ring on every bracket in the colours of one visit. Tapping a visit spins the set like a helmet on a
 * stand (Lando Norris's "Helmets Hall of Fame"); drag to turn it yourself.
 */
export function BracesSet({ colors, spin, style }: BracesSetProps) {
  const want = useRef({ colors, spin });
  want.current = { colors, spin };

  return (
    <Canvas3D
      style={style}
      fov={30}
      setup={({ renderer, scene, camera, el }) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        camera.position.set(0, 0.3, 6.5);
        camera.lookAt(0, 0, -0.35);

        const enamel = new THREE.MeshPhysicalMaterial({ color: '#FBF8F1', roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: new THREE.Color('#FFF2DF') });
        const gumMat = new THREE.MeshPhysicalMaterial({ color: '#DE7F91', roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color('#FFC2CD') });
        const steel = new THREE.MeshStandardMaterial({ color: '#DDE3EC', metalness: 1, roughness: 0.2, envMapIntensity: 1.3 });
        const ringMats: THREE.MeshPhysicalMaterial[] = [];

        const set = new THREE.Group();
        const total = TEETH.reduce((t, x) => t + x.w + 0.05, -0.05);
        let along = -total / 2;
        const slots: THREE.Vector3[] = [];
        TEETH.forEach((tooth, i) => {
          const mid = along + tooth.w / 2;
          along += tooth.w + 0.05;
          const theta = mid / R;
          const g = new THREE.Group();
          g.position.set(Math.sin(theta) * R, 0, Math.cos(theta) * R - R);
          g.rotation.y = theta;
          const geo = new RoundedBoxGeometry(tooth.w, tooth.h * 1.12, 0.46, 6, 0.2);
          // A crown narrows toward the gum and rounds at the edge it bites with.
          const p = geo.attributes.position as THREE.BufferAttribute;
          for (let k = 0; k < p.count; k++) {
            const x = p.getX(k);
            const y = p.getY(k);
            const z = p.getZ(k);
            const t = (y + tooth.h / 2) / tooth.h;
            const u = Math.min(1, Math.abs((2 * x) / tooth.w));
            // Narrower at the neck, a softly convex front, and a thinner biting edge.
            p.setX(k, x * (1 - 0.16 * t) * (1 - 0.05 * (1 - t) ** 3));
            const bulge = z > 0 ? 0.09 * (1 - u * u) * Math.sin(Math.PI * Math.min(1, t * 1.1)) : 0;
            p.setZ(k, z * (1 - 0.22 * t) * (1 - 0.35 * (1 - t) ** 4) + bulge);
          }
          geo.computeVertexNormals();
          const crown = new THREE.Mesh(geo, enamel);
          crown.position.y = (-tooth.h * 1.12) / 2 + 0.6;
          g.add(crown);
          // The gum's scallop over the neck of the tooth.
          const scallop = new THREE.Mesh(new THREE.TorusGeometry(tooth.w * 0.36, 0.1, 12, 28, Math.PI), gumMat);
          scallop.rotation.z = Math.PI;
          scallop.scale.set(1, 0.55, 0.9);
          scallop.position.set(0, 0.6, 0.12);
          g.add(scallop);

          // The bracket: a pad, a body with a slot, and four tie wings.
          const bracket = new THREE.Group();
          bracket.add(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.3, 0.05, 2, 0.02), steel));
          const wingGeo = new RoundedBoxGeometry(0.1, 0.1, 0.14, 2, 0.025);
          for (const [x, y] of [
            [-0.1, 0.1],
            [0.1, 0.1],
            [-0.1, -0.1],
            [0.1, -0.1],
          ]) {
            const wing = new THREE.Mesh(wingGeo, steel);
            wing.position.set(x, y, 0.08);
            bracket.add(wing);
          }
          const ringMat = new THREE.MeshPhysicalMaterial({ color: '#2DB4E8', emissive: '#2DB4E8', emissiveIntensity: 0.18, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
          ringMats.push(ringMat);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 16, 44), ringMat);
          ring.position.z = 0.1;
          bracket.add(ring);
          const yAt = crown.position.y + 0.02;
          bracket.position.set(0, yAt, 0.27);
          g.add(bracket);
          const slot = new THREE.Vector3(0, yAt, 0.37);
          g.updateMatrix();
          slots.push(slot.applyMatrix4(g.matrix));
          set.add(g);
          void i;
        });

        // The archwire through the slots, a little past the last brackets.
        const ends = [slots[0].clone().add(new THREE.Vector3(-0.35, 0, -0.22)), ...slots, slots[slots.length - 1].clone().add(new THREE.Vector3(0.35, 0, -0.22))];
        const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ends), 80, 0.022, 8, false), steel);
        set.add(wire);

        // The gum along the top of the teeth.
        const gumPts = Array.from({ length: 24 }, (_, k) => {
          const a = (-total / 2 - 0.25 + (k / 23) * (total + 0.5)) / R;
          return new THREE.Vector3(Math.sin(a) * (R - 0.14), 0.72, Math.cos(a) * (R - 0.14) - R);
        });
        const gum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gumPts), 90, 0.26, 20, false), gumMat);
        gum.scale.y = 0.62;
        set.add(gum);

        const pivot = new THREE.Group();
        set.position.z = 0.5;
        pivot.add(set);
        pivot.position.set(0, 0.05, -0.5);
        scene.add(pivot);

        // A soft pool of light under it, like a display case.
        const glowTex = (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const g = c.getContext('2d')!;
          const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, 'rgba(127,211,242,0.55)');
          grad.addColorStop(1, 'rgba(127,211,242,0)');
          g.fillStyle = grad;
          g.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        })();
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.6), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, -0.95, -0.4);
        scene.add(floor);

        const key = new THREE.DirectionalLight('#FFFFFF', 1.6);
        key.position.set(2.5, 4, 5);
        const rim = new THREE.DirectionalLight('#7FD3F2', 0.8);
        rim.position.set(-4, 2, -3);
        scene.add(key, rim, new THREE.AmbientLight('#E8F2FF', 0.45));

        const paint = (list: string[]) => {
          const cs = list.length ? list : ['#B7C3D9'];
          ringMats.forEach((m, i) => {
            m.color.set(cs[i % cs.length]);
            m.emissive.set(cs[i % cs.length]);
            m.emissiveIntensity = cs[i % cs.length].toUpperCase() === '#FFFFFF' ? 0.05 : 0.2;
          });
        };
        paint(want.current.colors);
        let shown = want.current.colors.join();
        let spun = want.current.spin;
        let spinStart = -1;
        let swapped = true;

        // Drag to turn.
        let dragging = false;
        let lastX = 0;
        let user = 0;
        let vel = 0;
        const down = (e: PointerEvent) => {
          dragging = true;
          lastX = e.clientX;
          vel = 0;
        };
        const move = (e: PointerEvent) => {
          if (!dragging) return;
          const dx = (e.clientX - lastX) / 120;
          lastX = e.clientX;
          user += dx;
          vel = dx;
        };
        const up = () => {
          dragging = false;
        };
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);

        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        return {
          update: (t) => {
            const w = want.current;
            if (w.spin !== spun) {
              spun = w.spin;
              if (still) {
                paint(w.colors);
                shown = w.colors.join();
              } else {
                spinStart = t;
                swapped = false;
              }
            } else if (swapped && w.colors.join() !== shown) {
              paint(w.colors);
              shown = w.colors.join();
            }
            let turn = 0;
            if (spinStart >= 0) {
              const k = Math.min(1, (t - spinStart) / 1.5);
              turn = easeOut(k) * Math.PI * 2;
              if (!swapped && k > 0.32) {
                paint(w.colors);
                shown = w.colors.join();
                swapped = true;
              }
              if (k >= 1) spinStart = -1;
            }
            if (!dragging) {
              user += vel;
              vel *= 0.93;
              user *= 0.96;
            }
            pivot.rotation.y = (still ? 0 : Math.sin(t * 0.45) * 0.22) + user + turn;
            pivot.rotation.x = 0.12 + (still ? 0 : Math.sin(t * 0.33) * 0.03);
          },
          dispose: () => {
            el.removeEventListener('pointerdown', down);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            pmrem.dispose();
            glowTex.dispose();
          },
        };
      }}
    />
  );
}
