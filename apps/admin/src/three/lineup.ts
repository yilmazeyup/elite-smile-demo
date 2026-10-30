import { doctorById, trHtml, type DoctorId, type ThemeMode } from '@smile/shared';
import * as THREE from 'three';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import type { DoctorNow } from '../data';
import { Backdrop, canvasTexture, lightPool, mat } from './kit';
import { doctorSpec, Figure, Plumbob } from './people';
import { damp, dampAngle, disposeTree, el, type Stage, type Vec } from './stage';

/*
 * The team as a character select: the six dentists on round podiums in a soft studio, each podium as high as their
 * day is full, a plumbob over every head. Hover one and they wave; click and their profile opens.
 */

export type LineupModel = { doctors: DoctorNow[]; occupancy: Partial<Record<DoctorId, number>>; selected: DoctorId | null };

export const LINEUP_VIEW: { camera: Vec; target: Vec } = { camera: [0, 2.05, 10.6], target: [0, 1.22, -0.5] };

type Spot = {
  id: DoctorId;
  figure: Figure;
  plumbob: Plumbob;
  podium: THREE.Mesh;
  inlay: THREE.MeshStandardMaterial;
  pool: THREE.Mesh;
  height: number;
  shown: number;
  x: number;
  z: number;
  hover: number;
  card: HTMLDivElement;
  cardObject: CSS2DObject;
  yaw: number;
};

/** A podium: a short cylinder with softly rounded edges, 1 unit high so it can be scaled to the day. */
function podiumGeometry(radius: number) {
  const r = 0.05;
  const points: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(radius - r, 0)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - r + Math.cos(a) * r, r + Math.sin(a) * r));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - r + Math.cos(a) * r, 1 - r + Math.sin(a) * r));
  }
  points.push(new THREE.Vector2(0, 1));
  return new THREE.LatheGeometry(points, 64);
}

/** The studio's floor and wall in one sweep (a cyclorama), so there is no corner behind the team. */
function cyclorama(width: number) {
  const profile: [number, number][] = [];
  for (let z = 10; z > -2.6; z -= 0.5) profile.push([z, 0]);
  const radius = 3.6;
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    profile.push([-2.6 - Math.sin(a) * radius, radius - Math.cos(a) * radius]);
  }
  for (let y = radius + 0.5; y <= 14; y += 1.5) profile.push([-2.6 - radius, y]);
  const cols = 24;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j < profile.length; j++)
    for (let i = 0; i <= cols; i++) positions.push(-width / 2 + (i / cols) * width, profile[j][1], profile[j][0]);
  for (let j = 0; j < profile.length - 1; j++)
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + cols + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export class LineupScene {
  private readonly root = new THREE.Group();
  private readonly backdrop = new Backdrop();
  private readonly spots = new Map<DoctorId, Spot>();
  private readonly studio: THREE.MeshStandardMaterial;
  private readonly wash: THREE.SpotLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly key: THREE.DirectionalLight;
  private readonly rim: THREE.DirectionalLight;
  private readonly spot: THREE.SpotLight;
  private readonly dust: THREE.Points;
  private hovered: DoctorId | null = null;
  private model: LineupModel | null = null;
  private night = 0;
  private nightTarget = 0;
  private lit = false;
  private readonly unsubscribe: () => void;

  constructor(private readonly stage: Stage, private readonly onDoctor: (id: DoctorId) => void, doctors: DoctorId[]) {
    stage.scene.add(this.root);
    stage.scene.background = this.backdrop.texture;

    this.studio = mat('#F2F5FA', 0.96);
    const sweep = new THREE.Mesh(cyclorama(44), this.studio);
    sweep.receiveShadow = true;
    this.root.add(sweep);
    // A soft wash of light on the studio wall behind the team.
    this.wash = new THREE.SpotLight('#FFFFFF', 26, 22, 0.55, 1, 1.4);
    this.wash.position.set(0, 0.6, 4);
    this.wash.target.position.set(0, 3.4, -6.2);
    this.root.add(this.wash, this.wash.target);

    this.hemi = new THREE.HemisphereLight('#F7FAFF', '#D8DEE9', 1.35);
    this.key = new THREE.DirectionalLight('#FFF6EC', 2.2);
    this.key.position.set(-5, 9, 8);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -4, far: 30 });
    this.key.shadow.radius = 7;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.rim = new THREE.DirectionalLight('#9ED8F5', 1.6);
    this.rim.position.set(2, 6, -9);
    const fill = new THREE.DirectionalLight('#E4EEFF', 0.5);
    fill.position.set(7, 3, 6);
    this.spot = new THREE.SpotLight('#FFFFFF', 0, 16, 0.32, 0.8, 1.2);
    this.spot.position.set(0, 9, 4);
    this.root.add(this.hemi, this.key, this.key.target, this.rim, fill, this.spot, this.spot.target);

    // A few motes of light floating in the studio air.
    const count = 140;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 4.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = canvasTexture(32, 32, (ctx) => {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    });
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.05, map: dot, color: '#7FCDF0', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.root.add(this.dust);

    const n = doctors.length;
    const targets: THREE.Object3D[] = [];
    doctors.forEach((id, i) => {
      const offset = i - (n - 1) / 2;
      const x = offset * 1.62;
      const z = -offset * offset * 0.13;
      const d = doctorById(id);
      const figure = new Figure(doctorSpec(d));
      const podium = new THREE.Mesh(podiumGeometry(0.6), mat('#FFFFFF', 0.35, { metalness: 0.02 }));
      podium.castShadow = true;
      podium.receiveShadow = true;
      podium.position.set(x, 0, z);
      podium.scale.y = 0.15;
      const inlay = new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.6, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.012, 8, 72), inlay);
      ring.rotation.x = Math.PI / 2;
      podium.add(ring);
      ring.position.y = 0.985;
      ring.scale.z = 1;
      const pool = lightPool(2.4, 2.4, d.color);
      pool.position.set(x, 0.005, z);
      (pool.material as THREE.MeshBasicMaterial).opacity = 0.18;
      const plumbob = new Plumbob(0.08);
      figure.root.add(plumbob.group);
      figure.root.position.set(x, 0.15, z);
      figure.root.userData.doctor = id;
      podium.userData.doctor = id;
      const group = new THREE.Group();
      group.userData.doctor = id;
      group.add(figure.root, podium);
      this.root.add(group, pool);
      targets.push(group);
      const card = el('podium-card interactive');
      card.addEventListener('click', () => this.onDoctor(id));
      card.addEventListener('pointerenter', () => (this.hovered = id));
      card.addEventListener('pointerleave', () => (this.hovered = null));
      const cardObject = stage.label(card, this.root, [x, 0, z + 0.62], { center: [0.5, 0] });
      this.spots.set(id, { id, figure, plumbob, podium, inlay, pool, height: 0.15, shown: 0.15, x, z, hover: 0, card, cardObject, yaw: 0 });
    });
    stage.setHoverTargets(targets, (object) => {
      this.hovered = (object?.userData.doctor as DoctorId | undefined) ?? null;
    });
    stage.onSelect((object) => {
      const id = object?.userData.doctor as DoctorId | undefined;
      if (id) this.onDoctor(id);
    });

    this.unsubscribe = stage.onFrame((time, delta) => this.frame(time, delta));
  }

  update(model: LineupModel) {
    this.model = model;
    for (const dn of model.doctors) {
      const spot = this.spots.get(dn.doctor.id);
      if (!spot) continue;
      const occ = model.occupancy[dn.doctor.id] ?? 0;
      spot.height = 0.12 + occ * 0.62;
      spot.plumbob.setColor(dn.color);
      const status = dn.current ? 'In behandeling' : dn.busy === 'vol' ? 'Vol vandaag' : 'Vrij';
      spot.card.innerHTML = trHtml(
        `<b>${dn.doctor.name}</b><span>${dn.doctor.title}</span><div class="pc-meta"><i style="background:${dn.color}"></i><em>${status}</em><u>${Math.round(occ * 100)}%</u></div>`,
      );
      spot.card.classList.toggle('selected', model.selected === dn.doctor.id);
    }
  }

  setTheme(mode: ThemeMode) {
    this.nightTarget = mode === 'night' ? 1 : 0;
    // The first look is there at once; later switches fade like the light changing.
    if (!this.themed) {
      this.themed = true;
      this.night = this.nightTarget;
      this.lit = false;
    }
  }

  private themed = false;

  /** Moves the camera to one dentist (or back to the whole team). */
  focus(id: DoctorId | null) {
    const spot = id ? this.spots.get(id) : null;
    if (!spot) {
      this.stage.flyTo(LINEUP_VIEW.camera, LINEUP_VIEW.target, 1300);
      return;
    }
    // A little to the side, so the dentist stands left of the profile panel, head and plumbob in view.
    this.stage.flyTo([spot.x + 0.4, 1.8 + spot.height * 0.5, spot.z + 7.8], [spot.x + 1.3, 1.15 + spot.height * 0.6, spot.z], 1300);
  }

  private applyLight() {
    const n = this.night;
    this.backdrop.paint(new THREE.Color('#EAF1F9').lerp(new THREE.Color('#050B1C'), n), new THREE.Color('#F4F7FB').lerp(new THREE.Color('#0B1633'), n));
    this.studio.color.set('#F2F5FA').lerp(new THREE.Color('#0E1A38'), n);
    this.hemi.intensity = THREE.MathUtils.lerp(1.35, 0.4, n);
    this.hemi.groundColor.set('#D8DEE9').lerp(new THREE.Color('#0A1228'), n);
    this.key.intensity = THREE.MathUtils.lerp(2.2, 1.1, n);
    this.rim.intensity = THREE.MathUtils.lerp(1.6, 2.6, n);
    this.stage.scene.environmentIntensity = THREE.MathUtils.lerp(0.5, 0.18, n);
    (this.dust.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp(0.5, 0.9, n);
    this.wash.intensity = THREE.MathUtils.lerp(26, 14, n);
    this.wash.color.set('#FFFFFF').lerp(new THREE.Color('#6FA8FF'), n);
  }

  private frame(time: number, delta: number) {
    const before = this.night;
    this.night = damp(this.night, this.nightTarget, 2.4, delta);
    if (!this.lit || Math.abs(before - this.night) > 1e-4) {
      this.applyLight();
      this.lit = true;
    }
    const camera = this.stage.camera.position;
    const selected = this.model?.selected ?? null;
    let lit: Spot | null = null;
    for (const spot of this.spots.values()) {
      spot.shown = damp(spot.shown, spot.height, 3, delta);
      spot.podium.scale.y = spot.shown;
      const f = spot.figure;
      f.root.position.y = spot.shown;
      const hovered = this.hovered === spot.id;
      const on = hovered || selected === spot.id;
      if (on) lit = spot;
      spot.hover = damp(spot.hover, on ? 1 : 0, 7, delta);
      spot.yaw = dampAngle(spot.yaw, Math.atan2(camera.x - spot.x, camera.z - spot.z), 4, delta);
      f.root.rotation.y = spot.yaw;
      f.pose = hovered ? 'wave' : 'crossed';
      f.look = camera;
      f.frame(time, delta);
      for (const material of f.materials) {
        if (material.emissiveMap) continue;
        material.emissive.set('#2DB4E8');
        material.emissiveIntensity = spot.hover * 0.12;
      }
      spot.inlay.emissiveIntensity = 0.5 + spot.hover * 1.4 + Math.sin(time * 2 + spot.x) * 0.1;
      (spot.pool.material as THREE.MeshBasicMaterial).opacity = 0.14 + spot.hover * 0.3;
      spot.plumbob.frame(time, delta, f.headHeight + 0.22);
      spot.card.classList.toggle('on', on);
      // Others step back a little when one is chosen.
      const dim = selected && selected !== spot.id ? 0.55 : 1;
      spot.card.style.opacity = String(dim);
    }
    // The spotlight follows whoever is hovered or chosen.
    this.spot.intensity = damp(this.spot.intensity, lit ? 40 : 0, 5, delta);
    if (lit) {
      this.spot.position.x = damp(this.spot.position.x, lit.x, 6, delta);
      this.spot.target.position.set(lit.x, lit.shown, lit.z);
    }
    const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + delta * (0.05 + (i % 7) * 0.012);
      if (y > 4.6) y = 0;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(time * 0.3 + i) * delta * 0.03);
    }
    pos.needsUpdate = true;
    this.stage.host.classList.toggle('near', this.stage.distance < 8);
  }

  dispose() {
    this.unsubscribe();
    for (const spot of this.spots.values()) this.stage.forgetLabel(spot.cardObject);
    disposeTree(this.root);
    this.root.removeFromParent();
  }
}
