import type { ExplainerId } from '@smile/shared';
import * as THREE from 'three';

import { ease, segment, type Label, type LabelOptions, type Reveal } from './teethKit';
import {
  abutmentGeometry,
  abutmentScrewGeometry,
  anodisedMaterial,
  archLayout,
  bracketGeometry,
  enamelMaterial,
  gumMaterial,
  healingCapGeometry,
  implantFixtureGeometry,
  makeArchGum,
  makeBoneBlock,
  makeCrownCap,
  makeFillingPatch,
  makeSectionFace,
  makeTooth,
  placeTooth,
  prepGeometry,
  radialTexture,
  rootMaterial,
  titaniumMaterial,
  toothParts,
  veneerGeometry,
  zirconiaMaterial,
  type Slot,
} from './teeth';

/**
 * The six explainers as 3D scenes on a dark lab stage (the GQ × Audemars Piguet "Extraordinary Lab" idea: one
 * precision object, lit like a watch movement). Each scene takes a continuous progress p (0 … steps − 1) from the
 * scrubber and puts every part where it belongs for that moment, so scrubbing backwards works as well as forwards.
 */

export type ExplainCtx = {
  scene: THREE.Scene;
  reveal: Reveal;
  labels: { add: (text: string, o?: LabelOptions) => Label };
};

export type ExplainScene = {
  /** What the Floema reveal measures (the object, without the stage). */
  root: THREE.Object3D;
  set: (p: number, t: number) => void;
  view: { theta: number; phi: number; radius: number; target: THREE.Vector3 };
  /** The view can follow the story (the exploded implant needs more room). */
  viewAt?: (p: number) => Partial<{ radius: number; target: THREE.Vector3; phi: number }> | null;
  dispose: () => void;
};

type Shown = { label: Label; from: number; to: number };

const showLabels = (list: Shown[], p: number) => {
  for (const l of list) l.label.show = p >= l.from - 0.05 && p <= l.to + 0.05;
};

const lerp = THREE.MathUtils.lerp;

/** The cut that opens a tooth along its middle: keeps z ≤ 0 (scenes keep their teeth unrotated). */
const cutPlane = () => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

/** A blue curing light: a soft cone of light that pulses. */
function curingLight() {
  const tex = radialTexture('rgba(90,170,255,0.9)', 'rgba(90,170,255,0)');
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4, 12, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: '#5AAEFF', transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.set(9, 9, 1);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 10, 32), titaniumMaterial({ tint: '#2B3A55', roughness: 0.35 }));
  const g = new THREE.Group();
  cone.position.y = -6;
  tip.position.y = 5;
  g.add(cone, glow, tip);
  const set = (k: number, t: number) => {
    g.visible = k > 0.01;
    const pulse = 0.75 + 0.25 * Math.sin(t * 9);
    (cone.material as THREE.MeshBasicMaterial).opacity = 0.2 * k * pulse;
    (glow.material as THREE.SpriteMaterial).opacity = 0.9 * k * pulse;
    glow.position.y = -12;
  };
  return { group: g, set, dispose: () => tex.dispose() };
}

/** A sweep of scanner light over an object. */
function scanSweep(width: number) {
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(76,203,247,0)');
    grad.addColorStop(0.5, 'rgba(76,203,247,0.85)');
    grad.addColorStop(1, 'rgba(76,203,247,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 256);
    return new THREE.CanvasTexture(c);
  })();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, 3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

const fadeMaterial = (m: THREE.Material, k: number) => {
  m.transparent = true;
  m.opacity = k;
  m.depthWrite = k > 0.98;
};

// =================================================================================================== implant

function implantScene(ctx: ExplainCtx): ExplainScene {
  const { reveal } = ctx;
  const clip = [reveal.solid];
  const root = new THREE.Group();
  ctx.scene.add(root);
  const block = makeBoneBlock({ width: 36, height: 18, depth: 11, implantR: 2.05, implantL: 10, platform: -0.4, clip });
  root.add(block.group);
  // the neighbours, cut open like the bone
  const cut = cutPlane();
  const neighbours: THREE.Group[] = [];
  const faces: ReturnType<typeof makeSectionFace>[] = [];
  for (const [fdi, x] of [
    [45, 9.6],
    [47, -11.2],
  ] as [number, number][]) {
    const t = makeTooth(fdi, { materials: [enamelMaterial({ clip: [reveal.solid, cut] }), rootMaterial({ clip: [reveal.solid, cut] })], detail: 'high' });
    t.position.set(x, 1.6, 0);
    const face = makeSectionFace(fdi, { clip });
    face.paint({});
    t.add(face.mesh);
    faces.push(face);
    root.add(t);
    reveal.attach(t.userData.mesh);
    neighbours.push(t);
  }
  const fixture = new THREE.Mesh(implantFixtureGeometry(), titaniumMaterial({ clip }));
  const drillGeo = implantFixtureGeometry({ diameter: 2.3, length: 11, pitch: 1.7 });
  const drill = new THREE.Group();
  const bit = new THREE.Mesh(drillGeo, titaniumMaterial({ clip, tint: '#9AA3AF', roughness: 0.3 }));
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 14, 32), titaniumMaterial({ clip, tint: '#B8BEC8', roughness: 0.2 }));
  shank.position.y = 7;
  drill.add(bit, shank);
  const cap = new THREE.Mesh(healingCapGeometry(), titaniumMaterial({ clip, roughness: 0.12, tint: '#D9DDE3' }));
  const abutment = new THREE.Mesh(abutmentGeometry(), anodisedMaterial({ clip }));
  const screw = new THREE.Mesh(abutmentScrewGeometry(), titaniumMaterial({ clip, tint: '#AEB4BE' }));
  const crown = makeCrownCap(46, zirconiaMaterial({ clip }));
  for (const m of [fixture, cap, abutment, screw, crown, bit, shank]) {
    m.castShadow = true;
    root.add(m === bit || m === shank ? drill : m);
    if (m !== shank) reveal.attach(m);
  }
  const L = ctx.labels;
  const labels: Shown[] = [
    { label: L.add('Kaakbot', { follow: block.group, local: new THREE.Vector3(-14, -12, 0), dx: -26, dy: 26 }), from: 0, to: 4.6 },
    { label: L.add('Tandvlees', { follow: block.group, local: new THREE.Vector3(-15, 2, 0), dx: -24, dy: -34 }), from: 0, to: 4.6 },
    { label: L.add('Boortje met water', { follow: drill, local: new THREE.Vector3(1.2, 4, 0), dx: 36, dy: -20 }), from: 1.6, to: 2.4 },
    { label: L.add('Implantaat', { follow: fixture, local: new THREE.Vector3(2.1, -5, 0), dx: 40, dy: 18, sub: 'titanium' }), from: 2.6, to: 7 },
    { label: L.add('Healing cap', { follow: cap, local: new THREE.Vector3(2.4, 2.2, 0), dx: 40, dy: -26 }), from: 3.6, to: 4.4 },
    { label: L.add('Bot groeit vast', { follow: block.group, local: new THREE.Vector3(-2.1, -6, 0), dx: -44, dy: 30 }), from: 3.7, to: 4.4 },
    { label: L.add('Opbouw', { follow: abutment, local: new THREE.Vector3(2.6, 2.0, 0), dx: 40, dy: -8 }), from: 4.7, to: 7 },
    { label: L.add('Schroefje', { follow: screw, local: new THREE.Vector3(-0.8, -2.5, 0), dx: -48, dy: 0 }), from: 6.5, to: 7 },
    { label: L.add('Kroon', { follow: crown, local: new THREE.Vector3(-4, 5, 0), dx: -40, dy: -18, sub: 'zirkonia' }), from: 5.7, to: 7 },
  ];
  const platform = -0.4;
  return {
    root,
    view: { theta: 0.42, phi: 1.32, radius: 96, target: new THREE.Vector3(0, 0, 0) },
    viewAt: (p) => (p > 6.2 ? { radius: lerp(96, 132, segment(p, 6.2, 7)), target: new THREE.Vector3(0, lerp(0, 14, segment(p, 6.2, 7)), 0) } : { radius: 96, target: new THREE.Vector3(0, 0, 0) }),
    set: (p, t) => {
      showLabels(labels, p);
      const open = segment(p, 0.4, 1);
      const drillK = segment(p, 1.2, 2);
      const screwK = ease.inOut(segment(p, 2.3, 3));
      const heal = segment(p, 3.2, 4);
      const abK = ease.inOut(segment(p, 4.3, 5));
      const crownK = ease.inOut(segment(p, 5.3, 6));
      const explode = ease.inOut(segment(p, 6.2, 7));
      block.paint({ flap: open * (1 - heal), hole: Math.max(drillK > 0 ? Math.min(1, drillK * 1.2) : 0, screwK > 0 ? 1 : 0), integration: heal });
      // the drill goes down and up, spinning
      const dive = Math.sin(Math.min(1, drillK) * Math.PI);
      drill.visible = drillK > 0 && drillK < 1;
      drill.position.set(0, lerp(16, platform - 9.5, dive), 0);
      drill.rotation.y = t * 40;
      // the implant screws in
      fixture.visible = p > 2.2;
      fixture.position.set(0, lerp(16, platform, screwK), 0);
      fixture.rotation.y = -(1 - screwK) * Math.PI * 7;
      // healing cap on, then off again for the abutment
      const capIn = ease.out(segment(p, 3.1, 3.6));
      const capOut = ease.inOut(segment(p, 4.2, 4.6));
      cap.visible = capIn > 0 && capOut < 1;
      cap.position.set(capOut * 6, platform + (1 - capIn) * 10 + capOut * 12, 0);
      cap.rotation.y = -(1 - capIn) * Math.PI * 3;
      abutment.visible = abK > 0;
      abutment.position.set(0, platform + (1 - abK) * 14 + explode * 8, 0);
      screw.visible = abK > 0.6;
      screw.position.set(0, platform + 3 + (1 - segment(p, 4.6, 5)) * 8 + explode * 21, 0);
      screw.rotation.y = -(1 - segment(p, 4.6, 5)) * Math.PI * 5;
      crown.visible = crownK > 0;
      crown.position.set(0, platform + 2.3 + (1 - crownK) * 14 + explode * 33, 0);
      // the exploded view: everything apart, the jaw sinks away
      block.group.position.y = -explode * 30;
      block.group.visible = explode < 0.7;
      fixture.position.y += explode * 2;
      for (const n of neighbours) n.visible = explode < 0.5;
      for (const n of neighbours) n.position.y = 1.6 - explode * 30;
      root.rotation.y = explode * 0.35;
    },
    dispose: () => {
      block.dispose();
      for (const f of faces) f.dispose();
    },
  };
}

// ============================================================================================= root canal

function rootCanalScene(ctx: ExplainCtx): ExplainScene {
  const { reveal } = ctx;
  const root = new THREE.Group();
  ctx.scene.add(root);
  const fdi = 46;
  const parts = toothParts(fdi, 'high');
  const cut = cutPlane();
  const clip = [reveal.solid, cut];
  const tooth = makeTooth(fdi, { materials: [enamelMaterial({ clip, translucent: true }), rootMaterial({ clip })], detail: 'high' });
  root.add(tooth);
  reveal.attach(tooth.userData.mesh);
  const face = makeSectionFace(fdi, { clip: [reveal.solid] });
  tooth.add(face.mesh);
  // the rubber dam around the neck
  const dam = new THREE.Mesh(new THREE.RingGeometry(6.0, 15, 64, 1), new THREE.MeshPhysicalMaterial({ color: '#4FB6A6', roughness: 0.55, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: [reveal.solid, cut] }));
  dam.rotation.x = -Math.PI / 2;
  dam.position.y = 1.0;
  root.add(dam);
  // a file in the mesial canal
  const file = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 16, 16, 1), titaniumMaterial({ tint: '#C8CED6', roughness: 0.2 }));
  blade.rotation.z = Math.PI;
  blade.position.y = -8;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 4, 24), new THREE.MeshPhysicalMaterial({ color: '#FFB12E', roughness: 0.4, clearcoat: 0.6 }));
  handle.position.y = 2.5;
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 24), new THREE.MeshPhysicalMaterial({ color: '#E2434B', roughness: 0.5 }));
  stop.position.y = -1;
  file.add(blade, handle, stop);
  file.position.z = 0.35;
  root.add(file);
  const crown = makeCrownCap(fdi, zirconiaMaterial({ clip }));
  crown.scale.set(1.035, 1.02, 1.035);
  root.add(crown);
  reveal.attach(crown);
  const top = parts.top;
  const L = ctx.labels;
  const labels: Shown[] = [
    { label: L.add('Ontstoken zenuw', { follow: tooth, local: new THREE.Vector3(0, top * 0.3, 0.1), dx: -44, dy: -32, tone: 'amber' }), from: 0, to: 1.4 },
    { label: L.add('Ontsteking bij de wortelpunt', { follow: tooth, local: new THREE.Vector3(1.6, parts.apex + 0.8, 0.1), dx: 34, dy: 26, tone: 'amber' }), from: 0, to: 0.6 },
    { label: L.add('Cofferdam', { follow: dam, local: new THREE.Vector3(-12, 0, -4), dx: -30, dy: 30 }), from: 0.8, to: 2.4 },
    { label: L.add('Opening', { follow: tooth, local: new THREE.Vector3(0.8, top - 0.6, 0.1), dx: 40, dy: -40 }), from: 1.7, to: 2.4 },
    { label: L.add('Vijltje', { follow: file, local: new THREE.Vector3(0.6, 1.5, 0), dx: 40, dy: -10 }), from: 2.6, to: 3.4 },
    { label: L.add('Kanalen gevuld', { follow: tooth, local: new THREE.Vector3(-2.2, -7, 0.1), dx: -40, dy: 18 }), from: 3.7, to: 5.3 },
    { label: L.add('Tijdelijke vulling', { follow: tooth, local: new THREE.Vector3(0, top - 0.8, 0.1), dx: 44, dy: -36 }), from: 4.7, to: 5.3 },
    { label: L.add('Kroon', { follow: crown, local: new THREE.Vector3(-4.5, 5, 0), dx: -40, dy: -20, sub: 'zirkonia' }), from: 5.6, to: 6 },
  ];
  let painted = '';
  return {
    root,
    view: { theta: 0.12, phi: 1.42, radius: 64, target: new THREE.Vector3(0, -2, 0) },
    set: (p, t) => {
      showLabels(labels, p);
      const access = segment(p, 1.3, 2);
      const clean = segment(p, 2.3, 3);
      const fill = segment(p, 3.3, 4);
      const temp = segment(p, 4.3, 5);
      const crownK = ease.inOut(segment(p, 5.3, 6));
      const pulp = fill > 0.5 ? 'filled' : clean > 0.5 ? 'cleaned' : access > 0.7 ? 'open' : 'inflamed';
      const key = `${pulp}-${access.toFixed(2)}-${temp > 0.5 ? 1 : 0}-${crownK > 0.95 ? 1 : 0}`;
      if (key !== painted) {
        painted = key;
        face.paint({ pulp, access, temporary: temp > 0.5 ? 1 : 0, crown: crownK > 0.95 ? 1 : 0 });
      }
      const damK = Math.min(segment(p, 0.6, 1.1), 1 - segment(p, 5.0, 5.4));
      dam.visible = damK > 0.01;
      (dam.material as THREE.MeshPhysicalMaterial).opacity = 0.55 * damK;
      const fileK = segment(p, 2.15, 3);
      file.visible = fileK > 0 && fileK < 1;
      const strokes = Math.sin(fileK * Math.PI * 6) * 0.5 + 0.5;
      const depth = lerp(top + 8, 1.5, Math.min(1, fileK * 2.5)) - strokes * 2.2;
      file.position.set(lerp(1.0, 1.7, Math.min(1, fileK * 2.5)), depth, 0.35);
      file.rotation.z = -0.07;
      file.rotation.y = t * 3;
      crown.visible = crownK > 0;
      crown.position.y = (1 - crownK) * 12;
    },
    dispose: () => face.dispose(),
  };
}

// ================================================================================================== crown

function crownScene(ctx: ExplainCtx): ExplainScene {
  const { reveal } = ctx;
  const root = new THREE.Group();
  ctx.scene.add(root);
  const fdi = 46;
  const parts = toothParts(fdi, 'high');
  const top = parts.top;
  // the natural crown is ground away from the top down; the prepared stump inside shows through
  const grind = new THREE.Plane(new THREE.Vector3(0, -1, 0), top + 1);
  const natural = makeTooth(fdi, { materials: [enamelMaterial({ clip: [reveal.solid, grind], translucent: true }), rootMaterial({ clip: [reveal.solid] })], detail: 'high' });
  root.add(natural);
  reveal.attach(natural.userData.mesh);
  const filling = makeFillingPatch(fdi, 'MOD', { color: '#9AA3AF', emissive: 0.05 });
  (filling.material as THREE.MeshPhysicalMaterial).clippingPlanes = [reveal.solid, grind];
  natural.add(filling);
  const keepCrown = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.04);
  const prep = new THREE.Mesh(prepGeometry(fdi), [enamelMaterial({ clip: [reveal.solid, keepCrown], color: '#E8D2A2' }), rootMaterial({ clip: [reveal.solid, keepCrown] })]);
  root.add(prep);
  const temp = makeCrownCap(fdi, new THREE.MeshPhysicalMaterial({ color: '#E9E3D6', roughness: 0.55, clearcoat: 0.2, transparent: true, opacity: 1, clippingPlanes: [reveal.solid] }));
  temp.scale.set(1.02, 1.0, 1.02);
  root.add(temp);
  const crown = makeCrownCap(fdi, zirconiaMaterial({ clip: [reveal.solid] }));
  crown.scale.set(1.02, 1.0, 1.02);
  root.add(crown);
  reveal.attach(crown);
  const sweep = scanSweep(18);
  root.add(sweep);
  const prepWire = new THREE.LineSegments(new THREE.WireframeGeometry(prep.geometry), new THREE.LineBasicMaterial({ color: '#4CCBF7', transparent: true, opacity: 0, depthWrite: false }));
  prep.add(prepWire);
  const L = ctx.labels;
  const labels: Shown[] = [
    { label: L.add('Grote oude vulling', { follow: natural, local: new THREE.Vector3(0, top - 0.6, 3), dx: 40, dy: -40 }), from: 0, to: 0.7 },
    { label: L.add('Geslepen tand', { follow: prep, local: new THREE.Vector3(3, top * 0.5, 2), dx: 42, dy: -24 }), from: 1.5, to: 2.6 },
    { label: L.add('Digitale afdruk', { follow: prep, local: new THREE.Vector3(-3, top * 0.6, 2), dx: -44, dy: -30 }), from: 1.8, to: 2.4 },
    { label: L.add('Tijdelijke kroon', { follow: temp, local: new THREE.Vector3(-4, 5, 2), dx: -40, dy: -24 }), from: 2.7, to: 3.4 },
    { label: L.add('Zirkonia kroon', { follow: crown, local: new THREE.Vector3(4.5, 5, 2), dx: 40, dy: -26 }), from: 3.7, to: 5 },
    { label: L.add('Cement', { follow: crown, local: new THREE.Vector3(-4.6, 0.6, 2), dx: -40, dy: 18 }), from: 4.7, to: 5 },
  ];
  return {
    root,
    view: { theta: 0.5, phi: 1.22, radius: 54, target: new THREE.Vector3(0, -1.5, 0) },
    set: (p, t) => {
      showLabels(labels, p);
      const g = ease.inOut(segment(p, 0.3, 1));
      grind.constant = lerp(top + 1, 0.3, g);
      prep.visible = g > 0.01;
      const scan = segment(p, 1.3, 2);
      sweep.visible = scan > 0 && scan < 1;
      sweep.position.set(0, lerp(top + 1, -1, scan), 0);
      (sweep.material as THREE.MeshBasicMaterial).opacity = Math.sin(scan * Math.PI);
      (prepWire.material as THREE.LineBasicMaterial).opacity = 0.35 * Math.sin(scan * Math.PI);
      const tempIn = ease.out(segment(p, 2.3, 2.8));
      const tempOut = ease.inOut(segment(p, 3.2, 3.6));
      temp.visible = tempIn > 0 && tempOut < 1;
      temp.position.y = (1 - tempIn) * 10 + tempOut * 12;
      const crownK = ease.inOut(segment(p, 3.4, 4));
      crown.visible = crownK > 0;
      crown.position.y = (1 - crownK) * 14;
      // a glint when it is cemented
      const set = segment(p, 4.3, 5);
      (crown.material as THREE.MeshPhysicalMaterial).emissive.set('#FFE7B0');
      (crown.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.25 * Math.sin(set * Math.PI) * (0.6 + 0.4 * Math.sin(t * 5));
    },
    dispose: () => prepWire.geometry.dispose(),
  };
}

// ================================================================================================= veneer

function frontTeeth(ctx: ExplainCtx, clip: THREE.Plane[], fdis: number[]) {
  const slots = archLayout('upper').filter((s) => fdis.includes(s.fdi));
  const group = new THREE.Group();
  // gum only where there are teeth, so the segment ends cleanly
  const gum = new THREE.Mesh(makeArchGum('upper', slots), gumMaterial({ opacity: 0.94, clip }));
  group.add(gum);
  const teeth = new Map<number, { outer: THREE.Group; tilt: THREE.Group; mesh: THREE.Mesh; slot: Slot; enamel: THREE.MeshPhysicalMaterial }>();
  for (const slot of slots) {
    const enamel = enamelMaterial({ clip, translucent: false });
    const t = makeTooth(slot.fdi, { materials: [enamel, rootMaterial({ clip })], detail: 'high' });
    const outer = placeTooth(t, slot);
    group.add(outer);
    ctx.reveal.attach(t.userData.mesh);
    teeth.set(slot.fdi, { outer, tilt: outer.userData.tilt as THREE.Group, mesh: t.userData.mesh, slot, enamel });
  }
  // centre the front of the arch
  group.position.set(0, -6, -30 + 4);
  return { group, gum, teeth };
}

function veneerScene(ctx: ExplainCtx): ExplainScene {
  const { reveal } = ctx;
  const clip = [reveal.solid];
  const root = new THREE.Group();
  ctx.scene.add(root);
  const { group, teeth } = frontTeeth(ctx, clip, [13, 12, 11, 21, 22, 23]);
  root.add(group);
  const t11 = teeth.get(11)!;
  const stain = new THREE.Color('#E6D3A6');
  const white = new THREE.Color('#FFFFFF');
  const mark = makeFillingPatch(11, 'B', { color: '#4CCBF7', emissive: 0.5 });
  (mark.material as THREE.MeshPhysicalMaterial).transparent = true;
  t11.mesh.add(mark);
  const veneer = new THREE.Mesh(veneerGeometry(11, 0.6), new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, sheenColor: new THREE.Color('#E6F3FF'), transmission: 0.08, thickness: 0.6, emissive: new THREE.Color('#5AAEFF'), emissiveIntensity: 0, clippingPlanes: clip }));
  veneer.scale.set(1.01, 1.0, 1.04);
  t11.mesh.add(veneer);
  reveal.attach(veneer);
  const light = curingLight();
  root.add(light.group);
  let aimed = false;
  const aim = () => {
    // in front of 11, a little below, pointing at the middle of its face
    root.updateMatrixWorld(true);
    const centre = t11.mesh.localToWorld(new THREE.Vector3(0, 5, 2.5));
    const pos = centre.clone().add(new THREE.Vector3(-12, -9, 17));
    light.group.position.copy(root.worldToLocal(pos.clone()));
    light.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), centre.clone().sub(pos).normalize());
    aimed = true;
  };
  const sweep = scanSweep(30);
  root.add(sweep);
  const L = ctx.labels;
  const labels: Shown[] = [
    { label: L.add('Verkleurde voortand', { follow: t11.mesh, local: new THREE.Vector3(0, 7, 3), dx: -40, dy: 40 }), from: 0, to: 0.7 },
    { label: L.add('± 0,5 mm', { follow: t11.mesh, local: new THREE.Vector3(2, 5, 3.2), dx: -38, dy: 44, sub: 'glazuur' }), from: 0.8, to: 1.6 },
    { label: L.add('Facing', { follow: veneer, local: new THREE.Vector3(1.5, 6, 3.2), dx: -40, dy: 44, sub: 'porselein' }), from: 2.6, to: 5 },
    { label: L.add('Blauw licht', { follow: light.group, local: new THREE.Vector3(0, 2, 0), dx: 40, dy: 10 }), from: 3.7, to: 4.4 },
  ];
  return {
    root,
    view: { theta: 0, phi: 1.7, radius: 66, target: new THREE.Vector3(0, -1.5, 0) },
    set: (p, t) => {
      showLabels(labels, p);
      t11.enamel.color.copy(stain).lerp(white, segment(p, 4.4, 5));
      const markK = Math.min(segment(p, 0.6, 1), 1 - segment(p, 1.6, 2));
      mark.visible = markK > 0.01;
      (mark.material as THREE.MeshPhysicalMaterial).opacity = 0.75 * markK;
      const scan = segment(p, 1.4, 2);
      sweep.visible = scan > 0 && scan < 1;
      sweep.position.set(0, lerp(10, -14, scan), 2);
      (sweep.material as THREE.MeshBasicMaterial).opacity = Math.sin(scan * Math.PI);
      const v = ease.inOut(segment(p, 2.3, 3));
      veneer.visible = v > 0;
      veneer.position.set(0, 0, (1 - v) * 16);
      veneer.rotation.y = (1 - v) * 0.4;
      if (!aimed) aim();
      const cure = Math.sin(segment(p, 3.4, 4.4) * Math.PI);
      light.set(cure, t);
      (veneer.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.45 * cure;
    },
    dispose: () => light.dispose(),
  };
}

// ================================================================================================ filling

function fillingScene(ctx: ExplainCtx): ExplainScene {
  const { reveal } = ctx;
  const root = new THREE.Group();
  ctx.scene.add(root);
  const fdi = 47;
  const parts = toothParts(fdi, 'high');
  const cut = cutPlane();
  const clip = [reveal.solid, cut];
  const tooth = makeTooth(fdi, { materials: [enamelMaterial({ clip, translucent: true }), rootMaterial({ clip })], detail: 'high' });
  root.add(tooth);
  reveal.attach(tooth.userData.mesh);
  const face = makeSectionFace(fdi, { clip: [reveal.solid] });
  tooth.add(face.mesh);
  const patchMat = new THREE.MeshPhysicalMaterial({ color: '#5C3B1E', emissive: new THREE.Color('#000000'), roughness: 0.5, clearcoat: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, clippingPlanes: clip });
  const patch = makeFillingPatch(fdi, 'O', { material: patchMat, size: 0.7 });
  tooth.add(patch);
  const light = curingLight();
  root.add(light.group);
  light.group.position.set(0, parts.top + 12, 0);
  const top = parts.top;
  const L = ctx.labels;
  const labels: Shown[] = [
    { label: L.add('Gaatje', { follow: tooth, local: new THREE.Vector3(0.2, top - 2, 0.1), dx: 44, dy: -36, tone: 'amber' }), from: 0, to: 1.4 },
    { label: L.add('Glazuur', { follow: tooth, local: new THREE.Vector3(-parts.info.dims.md / 2 + 0.7, top * 0.6, 0.1), dx: -40, dy: -24 }), from: 0, to: 0.8 },
    { label: L.add('Tandbeen', { follow: tooth, local: new THREE.Vector3(-2.2, 1.2, 0.1), dx: -40, dy: 26 }), from: 0, to: 0.8 },
    { label: L.add('Schoon en stevig', { follow: tooth, local: new THREE.Vector3(0.2, top - 2.4, 0.1), dx: 44, dy: -36 }), from: 1.7, to: 2.4 },
    { label: L.add('Witte vulling', { follow: tooth, local: new THREE.Vector3(0.2, top - 1.8, 0.1), dx: 44, dy: -36 }), from: 3.6, to: 5 },
  ];
  const decay = new THREE.Color('#5C3B1E');
  const hole = new THREE.Color('#2A1C17');
  const etch = new THREE.Color('#BFE6F7');
  const comp = new THREE.Color('#8ED6F5');
  const enamel = new THREE.Color('#F7F2E8');
  let painted = '';
  return {
    root,
    view: { theta: 0.22, phi: 1.2, radius: 60, target: new THREE.Vector3(0, 0, 0) },
    set: (p, t) => {
      showLabels(labels, p);
      const removed = segment(p, 1.3, 2);
      const fill = segment(p, 3.3, 4);
      const polish = segment(p, 4.3, 5);
      const key = `${removed.toFixed(2)}-${fill.toFixed(2)}-${polish > 0.5 ? 1 : 0}`;
      if (key !== painted) {
        painted = key;
        face.paint({ decay: 0.7, decayRemoved: removed, decayFilled: fill, fillColor: polish > 0.5 ? '#F2ECE0' : '#8ED6F5' });
      }
      const c = patchMat.color;
      if (p < 2) c.copy(decay).lerp(hole, removed);
      else if (p < 3.3) c.copy(hole).lerp(etch, segment(p, 2.3, 3));
      else if (p < 4.3) c.copy(etch).lerp(comp, fill);
      else c.copy(comp).lerp(enamel, polish);
      const cure = Math.sin(segment(p, 3.4, 4.2) * Math.PI);
      light.set(cure, t);
      patchMat.emissive.set('#5AAEFF');
      patchMat.emissiveIntensity = 0.35 * cure;
      patchMat.roughness = lerp(0.5, 0.15, polish);
    },
    dispose: () => {
      face.dispose();
      light.dispose();
    },
  };
}

// ================================================================================================= braces

function bracesScene(ctx: ExplainCtx): ExplainScene {
  const { reveal } = ctx;
  const clip = [reveal.solid];
  const root = new THREE.Group();
  ctx.scene.add(root);
  const fdis = [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27];
  const { group, teeth } = frontTeeth(ctx, clip, fdis);
  root.add(group);
  // where each tooth starts: turned, pushed in or out, a little high or low
  const crooked: Record<number, { rot: number; out: number; up: number }> = {
    13: { rot: 0.32, out: 1.6, up: 0.6 },
    12: { rot: -0.42, out: -1.5, up: -0.3 },
    11: { rot: 0.22, out: 0.9, up: 0.2 },
    21: { rot: -0.3, out: -0.6, up: -0.4 },
    22: { rot: 0.5, out: -1.8, up: 0.3 },
    23: { rot: -0.25, out: 1.4, up: -0.5 },
    14: { rot: 0.12, out: -0.5, up: 0 },
    24: { rot: -0.15, out: 0.6, up: 0 },
  };
  const bracketGeo = bracketGeometry();
  const steel = titaniumMaterial({ clip, tint: '#C9CED6', roughness: 0.18 });
  const ties = new THREE.MeshPhysicalMaterial({ color: '#2DB4E8', roughness: 0.35, clearcoat: 0.8, clippingPlanes: clip });
  const tie = new THREE.TorusGeometry(1.15, 0.32, 10, 24);
  const ray = new THREE.Raycaster();
  const brackets: { fdi: number; mesh: THREE.Group; local: THREE.Vector3 }[] = [];
  const retainer: { fdi: number; local: THREE.Vector3 }[] = [];
  for (const fdi of fdis) {
    const item = teeth.get(fdi);
    if (!item || item.slot.info.index > 5) continue;
    const parts = toothParts(fdi, 'high');
    const y = parts.top * 0.52;
    const mesh = new THREE.Mesh(parts.geometry);
    ray.set(new THREE.Vector3(0, y, 30), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(mesh)[0];
    const z = hit ? hit.point.z : parts.info.dims.bl / 2;
    ray.set(new THREE.Vector3(0, y * 0.8, -30), new THREE.Vector3(0, 0, 1));
    const back = ray.intersectObject(mesh)[0];
    const b = new THREE.Group();
    const body = new THREE.Mesh(bracketGeo, steel);
    const ring = new THREE.Mesh(tie, ties);
    ring.position.z = 0.9;
    b.add(body, ring);
    b.position.set(0, y, z + 0.05);
    item.mesh.add(b);
    brackets.push({ fdi, mesh: b, local: new THREE.Vector3(0, y, z + 0.9) });
    if (item.slot.info.index <= 3 && back) retainer.push({ fdi, local: new THREE.Vector3(0, y * 0.8, back.point.z - 0.35) });
  }
  const wireMat = titaniumMaterial({ clip, tint: '#D5DAE1', roughness: 0.15 });
  const wire = new THREE.Mesh(new THREE.BufferGeometry(), wireMat);
  root.add(wire);
  const ret = new THREE.Mesh(new THREE.BufferGeometry(), titaniumMaterial({ clip, tint: '#C7CCD4', roughness: 0.2 }));
  root.add(ret);
  const tubeThrough = (points: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal'), 120, r, 8, false);
  const L = ctx.labels;
  const labels: Shown[] = [
    { label: L.add('Gedraaid', { follow: teeth.get(22)!.mesh, local: new THREE.Vector3(0, 6, 2), dx: 36, dy: 40 }), from: 0, to: 0.7 },
    { label: L.add('Slotje', { follow: teeth.get(13)!.mesh, local: new THREE.Vector3(0, 5, 4), dx: -40, dy: 40 }), from: 0.8, to: 1.6 },
    { label: L.add('Draad en elastiekje', { follow: teeth.get(21)!.mesh, local: new THREE.Vector3(1.5, 5, 4), dx: 40, dy: 44 }), from: 1.8, to: 3.4 },
    { label: L.add('Retainer achter je tanden', { follow: teeth.get(11)!.mesh, local: new THREE.Vector3(0, 4, -2), dx: -40, dy: 50 }), from: 4.6, to: 5 },
  ];
  const tmp = new THREE.Vector3();
  let wireKey = -1;
  return {
    root,
    view: { theta: 0, phi: 1.76, radius: 92, target: new THREE.Vector3(0, -4.5, -6) },
    viewAt: (p) => (p > 4.4 ? { phi: lerp(1.76, 2.2, segment(p, 4.4, 5)), target: new THREE.Vector3(0, -4.5, -6) } : { phi: 1.76 }),
    set: (p) => {
      showLabels(labels, p);
      const straight = ease.inOut(segment(p, 2.4, 4));
      for (const [fdi, item] of teeth) {
        const c = crooked[fdi] ?? { rot: 0, out: 0, up: 0 };
        const k = 1 - straight;
        item.tilt.rotation.y = c.rot * k;
        item.tilt.position.set(0, c.up * k, c.out * k);
      }
      const on = segment(p, 0.4, 1);
      brackets.forEach((b, i) => {
        const k = ease.outBack(segment(on * brackets.length - i, 0, 1));
        const off = 1 - segment(p, 3.6, 4);
        b.mesh.visible = k > 0.01 && off > 0.01;
        b.mesh.scale.setScalar(Math.max(0.001, Math.min(k, off)));
      });
      const wireK = segment(p, 1.3, 2) * (1 - segment(p, 3.5, 3.8));
      wire.visible = wireK > 0.01;
      const key = Math.round(straight * 60) + (wire.visible ? 1000 : 0);
      if (wire.visible && key !== wireKey) {
        wireKey = key;
        root.updateMatrixWorld(true);
        const pts = brackets.map((b) => {
          const item = teeth.get(b.fdi)!;
          return item.mesh.localToWorld(tmp.copy(b.local)).clone();
        });
        wire.geometry.dispose();
        wire.geometry = tubeThrough(pts, 0.32);
        wire.geometry.applyMatrix4(root.matrixWorld.clone().invert());
      }
      const r = segment(p, 4.4, 5);
      ret.visible = r > 0.01;
      if (ret.visible && !ret.userData.built) {
        ret.userData.built = true;
        root.updateMatrixWorld(true);
        const pts = retainer.map((q) => teeth.get(q.fdi)!.mesh.localToWorld(tmp.copy(q.local)).clone());
        ret.geometry.dispose();
        ret.geometry = tubeThrough(pts, 0.28);
        ret.geometry.applyMatrix4(root.matrixWorld.clone().invert());
      }
    },
    dispose: () => {
      bracketGeo.dispose();
      tie.dispose();
    },
  };
}

export const EXPLAIN_STEPS: Record<ExplainerId, number> = { implantaat: 8, wortelkanaal: 7, kroon: 6, facing: 6, vulling: 6, beugel: 6 };

export function buildExplainer(id: ExplainerId, ctx: ExplainCtx): ExplainScene {
  switch (id) {
    case 'implantaat':
      return implantScene(ctx);
    case 'wortelkanaal':
      return rootCanalScene(ctx);
    case 'kroon':
      return crownScene(ctx);
    case 'facing':
      return veneerScene(ctx);
    case 'vulling':
      return fillingScene(ctx);
    default:
      return bracesScene(ctx);
  }
}

export { fadeMaterial };
