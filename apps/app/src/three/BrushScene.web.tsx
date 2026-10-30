import type { Tooth } from '@smile/shared';
import { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { skinById, type Skin } from '../lib/brushData';
import { Canvas3D } from './Canvas3D';
import { buildMouth } from './mouth';
import { createOrbit, damp, reducedMotion, safeDt, studio } from './teethKit';
import { radialTexture } from './teeth';

export type BrushState = {
  /** -1 idle, 0 … 3 the quadrant being brushed (upper right, upper left, lower left, lower right). */
  quadrant: number;
  /** 0 … 1 through the current quadrant: outside, inside, then the chewing surfaces. */
  phase: number;
  running: boolean;
};

type Props = { teeth: Tooth[]; state: { current: BrushState }; skin: string; style?: StyleProp<ViewStyle> };

const QUADRANT_FDI = [1, 2, 3, 4];

/** A toothbrush in a skin: handle, grip, neck, head and tufts of bristles. Head centre at the origin, bristles to -y,
 * handle along +z. */
function makeBrush(skin: Skin) {
  const g = new THREE.Group();
  const handleMat = new THREE.MeshPhysicalMaterial({ color: skin.handle, roughness: skin.metal ? 0.22 : 0.32, metalness: skin.metal ? 0.85 : 0, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: skin.pearl ? 0.8 : 0, iridescenceIOR: 1.5, sheen: skin.pearl ? 0.6 : 0.2, sheenColor: new THREE.Color(skin.accent), emissive: new THREE.Color(skin.glow ? skin.accent : '#000000'), emissiveIntensity: skin.glow ? 0.35 : 0 });
  const accentMat = new THREE.MeshPhysicalMaterial({ color: skin.accent, roughness: 0.55, clearcoat: 0.3, emissive: new THREE.Color(skin.glow ? skin.accent : '#000000'), emissiveIntensity: skin.glow ? 0.8 : 0 });
  const bristleMat = new THREE.MeshPhysicalMaterial({ color: skin.bristles, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color('#FFFFFF'), emissive: new THREE.Color(skin.glow ? skin.accent : '#000000'), emissiveIntensity: skin.glow ? 0.25 : 0 });
  // the handle: a long, softly waisted lathe along +z
  const profile: [number, number][] = [
    [0.001, 0],
    [2.2, 0.3],
    [2.6, 3],
    [2.0, 18],
    [2.4, 30],
    [4.4, 60],
    [5.0, 85],
    [4.6, 108],
    [3.2, 116],
    [0.001, 118],
  ];
  const handleGeo = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    40,
  );
  handleGeo.rotateX(Math.PI / 2);
  handleGeo.scale(1, 0.62, 1);
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.z = 9;
  g.add(handle);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 22, 8, 24), accentMat);
  grip.rotation.x = Math.PI / 2;
  grip.scale.set(1.06, 1, 0.66);
  grip.position.set(0, 0.6, 78);
  g.add(grip);
  // the head: a rounded block, bristles under it
  const headGeo = new THREE.CapsuleGeometry(4.6, 15, 8, 24);
  headGeo.rotateX(Math.PI / 2);
  headGeo.scale(1, 0.42, 1);
  const head = new THREE.Mesh(headGeo, handleMat);
  head.position.set(0, 0.9, 0);
  g.add(head);
  const tuft = new THREE.CylinderGeometry(0.62, 0.55, 8.5, 10);
  const rows = 9;
  const cols = 4;
  const tufts = new THREE.InstancedMesh(tuft, bristleMat, rows * cols);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const z = -9.5 + r * 2.4;
      const x = -2.7 + c * 1.8;
      // the outer rows are a little longer and lean out, as on a good brush
      const outer = c === 0 || c === cols - 1;
      const len = outer ? 1.08 : 1;
      m.compose(new THREE.Vector3(x, -3.3 - (len - 1) * 4, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, outer ? (c === 0 ? -0.12 : 0.12) : 0)), new THREE.Vector3(1, len, 1));
      tufts.setMatrixAt(i++, m);
    }
  g.add(tufts);
  g.traverse((o) => {
    o.castShadow = true;
  });
  const apply = (s: Skin) => {
    handleMat.color.set(s.handle);
    handleMat.metalness = s.metal ? 0.85 : 0;
    handleMat.roughness = s.metal ? 0.22 : 0.32;
    handleMat.iridescence = s.pearl ? 0.8 : 0;
    handleMat.sheenColor.set(s.accent);
    handleMat.emissive.set(s.glow ? s.accent : '#000000');
    handleMat.emissiveIntensity = s.glow ? 0.35 : 0;
    accentMat.color.set(s.accent);
    accentMat.emissive.set(s.glow ? s.accent : '#000000');
    accentMat.emissiveIntensity = s.glow ? 0.8 : 0;
    bristleMat.color.set(s.bristles);
    bristleMat.emissive.set(s.glow ? s.accent : '#000000');
    bristleMat.emissiveIntensity = s.glow ? 0.25 : 0;
  };
  return { group: g, apply, dispose: () => [handleGeo, headGeo, tuft, grip.geometry].forEach((x) => x.dispose()) };
}

/**
 * The brushing coach in 3D: Layla's mouth, open, with the quadrant to brush now lit up, and a toothbrush (in the skin
 * you chose) gliding along it: outside first, then inside, then the chewing surfaces.
 */
export function BrushScene({ teeth, state, skin, style }: Props) {
  const api = useRef<{ skin: (id: string) => void } | null>(null);
  const skinRef = useRef(skin);
  skinRef.current = skin;
  useEffect(() => {
    api.current?.skin(skin);
  }, [skin]);
  return (
    <Canvas3D
      style={style}
      fov={32}
      setup={(stage) => {
        const { scene, camera } = stage;
        const lights = studio(stage, { exposure: 1.02 });
        lights.key.position.set(20, 110, 100);
        const mouth = buildMouth(teeth, { open: 0.55, ghostFuture: false });
        scene.add(mouth.group);
        const brush = makeBrush(skinById(skinRef.current));
        scene.add(brush.group);
        brush.group.scale.setScalar(0.62);
        const glowTex = radialTexture('rgba(45,180,232,0.55)', 'rgba(45,180,232,0)');
        const spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
        spot.scale.set(34, 34, 1);
        spot.renderOrder = 9;
        scene.add(spot);
        api.current = { skin: (id) => brush.apply(skinById(id)) };
        const orbit = createOrbit(stage, { theta: 0, phi: 1.3, radius: 210, minRadius: 110, maxRadius: 300, minPhi: 0.6, maxPhi: 2.2, touch: 'pan-y' });
        orbit.go({ target: new THREE.Vector3(0, 10, 4) }, true);

        // quadrant teeth, from the back molar to the central incisor
        const quads = QUADRANT_FDI.map((q) =>
          [...mouth.items.values()]
            .filter((it) => Math.floor(it.fdi / 10) === q && it.status !== 'ontbreekt')
            .sort((a, b) => (b.fdi % 10) - (a.fdi % 10)),
        );
        const cur = { quat: new THREE.Quaternion(), pos: new THREE.Vector3(0, 0, 60) };
        const goalPos = new THREE.Vector3();
        const goalQuat = new THREE.Quaternion();
        const v = new THREE.Vector3();
        const n = new THREE.Vector3();
        const occ = new THREE.Vector3();
        const tan = new THREE.Vector3();
        const basis = new THREE.Matrix4();
        const glowK = new Map<number, number>();
        let fit = 190;

        const along = (list: typeof quads[number], u: number) => {
          // position on the quadrant, 0 = back molar, 1 = front incisor
          const f = Math.min(list.length - 1, Math.max(0, u * (list.length - 1)));
          const i = Math.floor(f);
          const j = Math.min(list.length - 1, i + 1);
          const a = mouth.crownCentre(list[i].fdi, new THREE.Vector3());
          const b = mouth.crownCentre(list[j].fdi, new THREE.Vector3());
          return { p: a.lerp(b, f - i), item: list[Math.round(f)] };
        };

        return {
          resize: (w, h) => {
            fit = 200 / Math.min(1, (w / h) * 1.15);
            orbit.go({ radius: fit }, true);
          },
          update: (t, rawDt) => {
            const dt = safeDt(rawDt);
            const st = state.current;
            const q = st.running ? st.quadrant : -1;
            // the lit quadrant
            for (const it of mouth.items.values()) {
              const on = q >= 0 && Math.floor(it.fdi / 10) === QUADRANT_FDI[q];
              const k = damp(glowK.get(it.fdi) ?? 0, on ? 1 : 0, 5, dt);
              glowK.set(it.fdi, k);
              for (const m of it.glow) {
                m.emissive.set('#2DB4E8');
                m.emissiveIntensity = (it.status === 'aandacht' ? 0.1 : 0) + 0.24 * k;
              }
            }
            if (q >= 0) {
              const list = quads[q];
              const phase = st.phase;
              const side = phase < 0.4 ? 'out' : phase < 0.8 ? 'in' : 'top';
              const local = side === 'out' ? phase / 0.4 : side === 'in' ? (phase - 0.4) / 0.4 : (phase - 0.8) / 0.2;
              // sweep back and forth along the quadrant
              const sweep = 0.5 - 0.5 * Math.cos(local * Math.PI * 2);
              const { p, item } = along(list, sweep);
              const parent = item.outer.parent!;
              n.copy(item.slot.normal).transformDirection(parent.matrixWorld);
              occ.set(0, item.slot.flipY ? -1 : 1, 0).transformDirection(parent.matrixWorld);
              tan.copy(item.slot.tangent).multiplyScalar(-1).transformDirection(parent.matrixWorld);
              const half = item.slot.info.dims.bl / 2;
              let up: THREE.Vector3;
              if (side === 'out') {
                goalPos.copy(p).addScaledVector(n, half + 2.4).addScaledVector(occ, -1.0);
                up = n.clone().addScaledVector(occ, -0.75).normalize();
              } else if (side === 'in') {
                goalPos.copy(p).addScaledVector(n, -(half + 2.4)).addScaledVector(occ, -1.0);
                up = n.clone().multiplyScalar(-1).addScaledVector(occ, -0.75).normalize();
              } else {
                goalPos.copy(p).addScaledVector(occ, 4.2);
                up = occ.clone();
              }
              // tiny circles: the gentle scrub of a good technique
              if (!reducedMotion()) goalPos.addScaledVector(tan, Math.sin(t * 22) * 0.7).addScaledVector(up, Math.cos(t * 22) * 0.35);
              // handle along the arch to the front, out of the mouth
              // the handle leaves the mouth through the lips, towards you
              const z = tan.clone().addScaledVector(up, -tan.dot(up)).normalize().add(new THREE.Vector3(0, 0, side === 'top' ? 1.4 : 0.9));
              z.addScaledVector(up, -z.dot(up)).normalize();
              const x = new THREE.Vector3().crossVectors(up, z).normalize();
              basis.makeBasis(x, up, new THREE.Vector3().crossVectors(x, up));
              goalQuat.setFromRotationMatrix(basis);
              spot.visible = true;
              spot.position.copy(p);
            } else {
              // waiting: the brush hovers just outside the upper right molars, where it will start
              const { p, item } = along(quads[0], 0.15);
              const parent = item.outer.parent!;
              n.copy(item.slot.normal).transformDirection(parent.matrixWorld);
              tan.copy(item.slot.tangent).multiplyScalar(-1).transformDirection(parent.matrixWorld);
              goalPos.copy(p).addScaledVector(n, 12 + Math.sin(t * 1.4) * 1.2);
              const up = n.clone();
              const z = tan.clone().addScaledVector(up, -tan.dot(up)).add(new THREE.Vector3(0, 0, 0.6)).normalize();
              const x = new THREE.Vector3().crossVectors(up, z).normalize();
              basis.makeBasis(x, up, new THREE.Vector3().crossVectors(x, up));
              goalQuat.setFromRotationMatrix(basis);
              spot.visible = false;
            }
            const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 9);
            cur.pos.lerp(goalPos, k);
            cur.quat.slerp(goalQuat, k);
            brush.group.position.copy(cur.pos);
            brush.group.quaternion.copy(cur.quat);
            (spot.material as THREE.SpriteMaterial).opacity = 0.5 + 0.2 * Math.sin(t * 4);
            orbit.update(dt);
          },
          dispose: () => {
            api.current = null;
            orbit.dispose();
            mouth.dispose();
            brush.dispose();
            glowTex.dispose();
            lights.dispose();
          },
        };
      }}
    />
  );
}
