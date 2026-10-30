import { TOOTH_PATH } from '@smile/shared';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

import { Canvas3D } from './Canvas3D';

/** The logo's tooth as extruded shapes, centred and scaled to about 2 units tall. Built once and shared. */
let shapes: THREE.Shape[] | null = null;
export function toothShapes(): THREE.Shape[] {
  if (shapes) return shapes;
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${TOOTH_PATH}"/></svg>`);
  shapes = data.paths.flatMap((p) => p.toShapes());
  return shapes;
}

export function toothGeometry(depth = 90, bevel = 26): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(toothShapes(), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.55, bevelSegments: 6, curveSegments: 28 });
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  geo.translate(-center.x, -center.y, -center.z);
  const s = 2 / size.y;
  // potrace writes y upwards, like three.js, so the path stands upright as it is.
  geo.scale(s, s, s);
  geo.computeVertexNormals();
  return geo;
}

/**
 * The tooth from the logo, in 3D: blue glass with a pearl shimmer, floating and turning slowly. Drag it to turn it;
 * it settles back on its own.
 */
export function HeroTooth({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Canvas3D
      style={style}
      fov={30}
      setup={({ renderer, scene, camera, el }) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        camera.position.set(0, 0, 7.2);

        const face = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#0B6CC4'),
          roughness: 0.14,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          iridescence: 0.7,
          iridescenceIOR: 1.35,
          iridescenceThicknessRange: [180, 520],
          sheen: 0.4,
          sheenColor: new THREE.Color('#BFE8FF'),
          transmission: 0,
          thickness: 0.8,
          envMapIntensity: 1.15,
        });
        const side = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#083E86'), roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1 });
        const mesh = new THREE.Mesh(toothGeometry(), [face, side]);
        const pivot = new THREE.Group();
        pivot.add(mesh);
        const holder = new THREE.Group();
        holder.add(pivot);
        scene.add(holder);

        // A soft blue glow under it, like light through porcelain.
        const glowTex = (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const g = c.getContext('2d')!;
          const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, 'rgba(45,180,232,0.55)');
          grad.addColorStop(1, 'rgba(45,180,232,0)');
          g.fillStyle = grad;
          g.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        })();
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
        glow.position.set(0, -1.55, -0.4);
        holder.add(glow);

        const key = new THREE.DirectionalLight('#ffffff', 1.4);
        key.position.set(3, 4, 5);
        scene.add(key, new THREE.AmbientLight('#dfefff', 0.5));

        // Drag to turn; it springs back to its slow sway.
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        let spinY = 0;
        let spinX = 0;
        let velY = 0;
        const down = (e: PointerEvent) => {
          dragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
        };
        const move = (e: PointerEvent) => {
          if (!dragging) return;
          const dx = (e.clientX - lastX) / 120;
          const dy = (e.clientY - lastY) / 160;
          lastX = e.clientX;
          lastY = e.clientY;
          spinY += dx;
          velY = dx;
          spinX = Math.max(-0.5, Math.min(0.5, spinX + dy));
        };
        const up = () => {
          dragging = false;
        };
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);

        return {
          // On a wide box the tooth stands to the right of the words; on a square one in the middle.
          resize: (w, h) => {
            const half = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * (w / h);
            holder.position.x = w / h > 1.25 ? Math.min(half * 0.48, half - 1.3) : 0;
          },
          update: (t) => {
            if (!dragging) {
              spinY += velY;
              velY *= 0.94;
              spinY *= 0.965;
              spinX *= 0.94;
            }
            pivot.rotation.y = Math.sin(t * 0.45) * 0.42 + spinY;
            pivot.rotation.x = Math.sin(t * 0.3) * 0.06 + spinX;
            pivot.position.y = Math.sin(t * 0.9) * 0.07;
            glow.scale.setScalar(1 - pivot.position.y * 0.6);
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
