import type { Tooth, ToothStatus } from '@smile/shared';
import * as THREE from 'three';

import {
  archLayout,
  enamelMaterial,
  ghostMaterial,
  makeArchGum,
  makeFillingPatch,
  makeImplant,
  makeTooth,
  gumMaterial,
  radialTexture,
  rootMaterial,
  zirconiaMaterial,
  placeTooth,
  type Jaw,
  type Slot,
} from './teeth';

/**
 * Both arches of a patient, built from the tooth library: crowns on translucent gum, roots and the implant visible
 * through it, each tooth dressed by its status (a zirconia crown, blue filling patches on the filled surfaces, an amber
 * glow where the dentist wants to look again, a ghost where a tooth is missing). The arches open like a mouth on a
 * hinge behind the molars, so the chewing surfaces of both face you.
 */

export type MouthTooth = {
  fdi: number;
  status: ToothStatus;
  slot: Slot;
  /** Placed group (arch position). */
  outer: THREE.Group;
  /** Moves along the tooth's own axis (lift on selection). */
  lift: THREE.Group;
  meshes: THREE.Mesh[];
  /** Crown materials that can glow. */
  glow: THREE.MeshPhysicalMaterial[];
};

export type Mouth = {
  group: THREE.Group;
  upper: THREE.Group;
  lower: THREE.Group;
  items: Map<number, MouthTooth>;
  pickables: THREE.Object3D[];
  gums: THREE.Mesh[];
  /** Opening of the mouth in radians (each arch turns by this). */
  setOpen: (a: number) => void;
  /** Centre of a tooth's crown in world space. */
  crownCentre: (fdi: number, out?: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
};

export const HINGE_Z = -24;

export function buildMouth(teeth: Tooth[], opts: { gap?: number; open?: number; clip?: THREE.Plane[]; gumOpacity?: number; ghostFuture?: boolean } = {}): Mouth {
  const gap = opts.gap ?? 3;
  const byN = new Map(teeth.map((t) => [t.n, t]));
  const group = new THREE.Group();
  const items = new Map<number, MouthTooth>();
  const pickables: THREE.Object3D[] = [];
  const gums: THREE.Mesh[] = [];
  const shared = { root: rootMaterial({ clip: opts.clip }) };
  const owned: THREE.Material[] = [shared.root];
  const textures: THREE.Texture[] = [];

  const jawGroup = (jaw: Jaw) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, jaw === 'upper' ? gap / 2 : -gap / 2, HINGE_Z);
    const inner = new THREE.Group();
    inner.position.z = -HINGE_Z;
    pivot.add(inner);
    group.add(pivot);
    const slots = archLayout(jaw);
    const missing = slots.filter((s) => byN.get(s.fdi)?.status === 'ontbreekt').map((s) => s.fdi);
    const gumGeo = makeArchGum(jaw, slots, { missing });
    const gumMat = gumMaterial({ opacity: opts.gumOpacity ?? 0.74, clip: opts.clip });
    owned.push(gumMat);
    const gum = new THREE.Mesh(gumGeo, gumMat);
    gum.renderOrder = 3;
    gum.receiveShadow = true;
    gums.push(gum);
    inner.add(gum);
    for (const slot of slots) {
      const t = byN.get(slot.fdi) ?? { n: slot.fdi, status: 'gezond' as ToothStatus };
      const lift = new THREE.Group();
      const meshes: THREE.Mesh[] = [];
      const glow: THREE.MeshPhysicalMaterial[] = [];
      if (t.status === 'implantaat') {
        const implant = makeImplant({ stage: 'healing', clip: opts.clip, platform: -1.6 });
        lift.add(implant);
        implant.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            meshes.push(o as THREE.Mesh);
            owned.push((o as THREE.Mesh).material as THREE.Material);
          }
        });
        if (opts.ghostFuture !== false) {
          // the crown still to come, as a faint outline
          const future = makeTooth(slot.fdi, { style: 'ghost' });
          const m = future.userData.mesh;
          (m.material as THREE.Material[]).forEach((mm) => owned.push(mm));
          (m.material as THREE.ShaderMaterial[])[0].uniforms.uStrength.value = 0.42;
          (m.material as THREE.ShaderMaterial[])[1].uniforms.uStrength.value = 0.0;
          m.renderOrder = 4;
          lift.add(future);
          meshes.push(m);
        }
      } else if (t.status === 'ontbreekt') {
        const ghost = makeTooth(slot.fdi, { style: 'ghost' });
        (ghost.userData.mesh.material as THREE.Material[]).forEach((mm) => owned.push(mm));
        ghost.userData.mesh.renderOrder = 4;
        lift.add(ghost);
        meshes.push(ghost.userData.mesh);
      } else {
        const crownMat = t.status === 'kroon' ? zirconiaMaterial({ clip: opts.clip }) : enamelMaterial({ clip: opts.clip });
        owned.push(crownMat);
        glow.push(crownMat);
        if (t.status === 'aandacht') {
          crownMat.emissive.set('#FFB12E');
          crownMat.emissiveIntensity = 0.32;
        }
        const tooth = makeTooth(slot.fdi, { materials: [crownMat, shared.root] });
        lift.add(tooth);
        meshes.push(tooth.userData.mesh);
        if (t.status === 'vulling' || t.status === 'aandacht') {
          const patch = makeFillingPatch(slot.fdi, t.status === 'aandacht' ? 'O' : t.surfaces ?? 'O', {
            color: t.status === 'aandacht' ? '#FFB12E' : '#2DB4E8',
            emissive: t.status === 'aandacht' ? 0.55 : 0.4,
            size: t.status === 'aandacht' ? 0.6 : 1,
          });
          owned.push(patch.material as THREE.Material);
          tooth.add(patch);
          meshes.push(patch);
        }
      }
      const outer = placeTooth(lift, slot);
      inner.add(outer);
      for (const m of meshes) {
        m.userData.fdi = slot.fdi;
        pickables.push(m);
      }
      items.set(slot.fdi, { fdi: slot.fdi, status: t.status, slot, outer, lift, meshes, glow });
    }
    return pivot;
  };

  const upper = jawGroup('upper');
  const lower = jawGroup('lower');

  // a soft contact shadow under the lower arch
  const shadowTex = radialTexture('rgba(11,26,58,0.9)', 'rgba(11,26,58,0)');
  textures.push(shadowTex);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -34, 0);
  shadow.renderOrder = -1;
  group.add(shadow);
  owned.push(shadow.material as THREE.Material);

  const setOpen = (a: number) => {
    upper.rotation.x = -a;
    lower.rotation.x = a * 0.75;
  };
  setOpen(opts.open ?? 0.5);

  const box = new THREE.Box3();
  const crownCentre = (fdi: number, out = new THREE.Vector3()) => {
    const item = items.get(fdi);
    if (!item) return out.set(0, 0, 0);
    box.makeEmpty();
    for (const m of item.meshes) box.expandByObject(m);
    // the crown: the occlusal part of the box
    const h = item.slot.info.dims.crownH;
    out.set(0, h * 0.55, 0);
    return item.lift.localToWorld(out);
  };

  return {
    group,
    upper,
    lower,
    items,
    pickables,
    gums,
    setOpen,
    crownCentre,
    dispose: () => {
      for (const m of owned) m.dispose();
      for (const t of textures) t.dispose();
      for (const g of gums) g.geometry.dispose();
      shadow.geometry.dispose();
    },
  };
}

/** The glow sprite that sits behind a selected tooth. */
export function glowSprite(color = 'rgba(45,180,232,0.75)') {
  const tex = radialTexture(color, 'rgba(45,180,232,0)');
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  s.scale.set(16, 16, 1);
  s.renderOrder = 10;
  return s;
}

export { ghostMaterial };
