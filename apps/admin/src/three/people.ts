import type { Doctor } from '@smile/shared';
import * as THREE from 'three';

import { canvasTexture, glow, mat } from './kit';
import { damp, dampAngle } from './stage';

/*
 * People in the 3D clinic. One rig for everyone: legs with knees, a torso that leans and reclines, arms with elbows
 * that blend between poses (at rest, arms crossed as in the team photos, working at the chair, waving, walking), and
 * a head that turns toward the camera. The six dentists get their real faces from the photos on elitesmile.nl,
 * projected on the front of the head, their outfit colours from team.ts and a Sims plumbob that shows how busy they
 * are. Patients are calm model figures without faces; children are smaller.
 */

export type Pose = 'stand' | 'crossed' | 'work' | 'walk' | 'sit' | 'lie' | 'wave';

export type FigureSpec = {
  height: number;
  top: string;
  bottom: string;
  skin: string;
  hair: string;
  shoes?: string;
  sleeves?: 'short' | 'long';
  hairStyle?: 'none' | 'short' | 'long' | 'hijab' | 'bun';
  hijab?: string;
  coat?: string;
  tie?: string;
  shirt?: string;
  /** The real face, already cropped (see faceTexture). */
  face?: THREE.Texture;
  /** A small badge on the chest in this colour. */
  badge?: string;
  /** Dental loupes on a band around the neck. */
  loupes?: boolean;
  /** Broader or slimmer, 1 is average. */
  build?: number;
  /** Matte model-figure look (patients). */
  matte?: boolean;
};

const UP = new THREE.Vector3(0, -1, 0);
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

/** The rotation that turns a limb hanging down (0,-1,0) to point along `dir`. */
const aim = (dir: THREE.Vector3, out: THREE.Quaternion) => out.setFromUnitVectors(UP, tmpV.copy(dir).normalize());

/** Arm directions in the torso's space (the figure faces +z; side is +1 for the arm at +x). */
function armPose(pose: Pose, side: number, t: number): { upper: THREE.Vector3; fore: THREE.Vector3 } {
  switch (pose) {
    case 'crossed':
      // Forearms folded across the chest, one over the other, like every portrait on the site.
      return { upper: new THREE.Vector3(side * 0.2, -1, 0.42), fore: new THREE.Vector3(-side * 1, side > 0 ? 0.2 : 0.06, 0.5) };
    case 'work':
      return { upper: new THREE.Vector3(side * 0.18, -0.75, 0.75), fore: new THREE.Vector3(-side * 0.35, -0.45 + Math.sin(t * 2.3 + side) * 0.08, 1) };
    case 'wave':
      return side > 0
        ? { upper: new THREE.Vector3(0.95, 0.55, 0.15), fore: new THREE.Vector3(0.35 + Math.sin(t * 9) * 0.45, 1, 0.25) }
        : { upper: new THREE.Vector3(side * 0.14, -1, 0.04), fore: new THREE.Vector3(side * 0.05, -1, 0.18) };
    case 'sit':
      return { upper: new THREE.Vector3(side * 0.12, -1, 0.35), fore: new THREE.Vector3(side * 0.12, -0.25, 1) };
    case 'lie':
      return { upper: new THREE.Vector3(side * 0.22, -1, 0.15), fore: new THREE.Vector3(side * 0.1, -0.2, 1) };
    case 'walk': {
      const s = Math.sin(t) * side;
      return { upper: new THREE.Vector3(side * 0.12, -1, s * 0.45), fore: new THREE.Vector3(side * 0.08, -1, 0.25 + s * 0.45) };
    }
    default:
      return { upper: new THREE.Vector3(side * 0.13, -1, 0.02), fore: new THREE.Vector3(side * 0.06, -1, 0.14) };
  }
}

/** A head: the front half carries the face (projected straight on), the back half the hair colour. */
function headGeometry(radius: number, front: boolean): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(radius, 32, 22, front ? 0 : Math.PI, Math.PI);
  if (front) {
    // Planar projection on the front: seen from the front the crop circle lands exactly on the head's outline.
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * radius), 0.5 + pos.getY(i) / (2 * radius));
    uv.needsUpdate = true;
  }
  return g;
}

/** The back of the head: hair down to the ears, then the skin of the neck (all hair for long hair and a hijab). */
function backTexture(hair: string, skin: string, full: boolean) {
  return canvasTexture(8, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, hair);
    g.addColorStop(full ? 1 : 0.62, hair);
    if (!full) {
      g.addColorStop(0.74, skin);
      g.addColorStop(1, skin);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
  });
}

const faceCache = new Map<string, THREE.CanvasTexture>();

/**
 * The doctor's face from the 800 × 800 portrait: the circle `doctor.face` cut out with a soft elliptical edge, the
 * lavender background keyed out at the rim, laid over the hair (or hijab) colour so it melts into the back of the
 * head. Shared by every figure of that doctor.
 */
export function faceTexture(doctor: Doctor): THREE.CanvasTexture {
  const hit = faceCache.get(doctor.id);
  if (hit) return hit;
  const size = 512;
  const hair = doctor.outfit.extra?.hijab ?? doctor.outfit.hair;
  const skin = doctor.outfit.skin;
  const full = Boolean(doctor.outfit.extra?.hijab || doctor.outfit.extra?.longHair);
  const base = (ctx: CanvasRenderingContext2D) => {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, hair);
    g.addColorStop(full ? 1 : 0.55, hair);
    if (!full) g.addColorStop(0.82, skin);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  };
  const texture = canvasTexture(size, size, base);
  texture.anisotropy = 8;
  faceCache.set(doctor.id, texture);

  const img = new Image();
  img.decoding = 'async';
  img.src = `${import.meta.env.BASE_URL}team/${doctor.photo}.webp`;
  img.onload = () => {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    base(ctx);
    // The crop on its own canvas, so its edge can be faded and the background keyed out before it is laid down.
    const crop = document.createElement('canvas');
    crop.width = crop.height = size;
    const c = crop.getContext('2d', { willReadFrequently: true })!;
    const { x, y, r } = doctor.face;
    c.drawImage(img, x - r, y - r, r * 2, r * 2, 0, 0, size, size);
    const data = c.getImageData(0, 0, size, size);
    const px = data.data;
    // The background colour, from a corner of the lavender circle in the portrait.
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    const p = probe.getContext('2d', { willReadFrequently: true })!;
    p.drawImage(img, 120, 400, 1, 1, 0, 0, 1, 1);
    const [br, bg, bb] = p.getImageData(0, 0, 1, 1).data;
    const rx = 0.86;
    const ry = 0.99;
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        const k = (j * size + i) * 4;
        const nx = (i / size - 0.5) * 2;
        const ny = (j / size - 0.5) * 2;
        const e = Math.sqrt((nx / rx) ** 2 + (ny / ry) ** 2);
        // A soft ellipse: fully the photo inside, gone at the edge.
        let a = 1 - THREE.MathUtils.smoothstep(e, 0.84, 1);
        // Toward the rim, what looks like the lavender (or the white outside it) becomes the hair colour instead.
        if (e > 0.6) {
          const d = Math.hypot(px[k] - br, px[k + 1] - bg, px[k + 2] - bb);
          const white = px[k] > 236 && px[k + 1] > 236 && px[k + 2] > 236;
          const key = white ? 0 : THREE.MathUtils.smoothstep(d, 18, 46);
          a *= THREE.MathUtils.lerp(1, key, THREE.MathUtils.smoothstep(e, 0.6, 0.78));
        }
        px[k + 3] = Math.round(px[k + 3] * a);
      }
    c.putImageData(data, 0, 0);
    ctx.drawImage(crop, 0, 0);
    texture.needsUpdate = true;
  };
  return texture;
}

/** One person. The root sits on the floor at the feet and faces +z; scenes move and turn the root. */
export class Figure {
  readonly root = new THREE.Group();
  readonly materials: THREE.MeshStandardMaterial[] = [];
  readonly headHeight: number;
  readonly height: number;
  pose: Pose = 'stand';
  /** Extra forward lean of the torso, e.g. over a patient. */
  lean = 0;
  /** Recline of the torso while lying in the dental chair (radians back from upright). */
  recline = 1.15;
  /** Turns the head toward this world point when set (the camera, usually). */
  look: THREE.Vector3 | null = null;
  /** Head turn allowed relative to the body. */
  lookRange = 1.15;

  private readonly scale: number;
  private readonly body = new THREE.Group();
  private readonly pelvis = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly hips: THREE.Group[] = [];
  private readonly knees: THREE.Group[] = [];
  private readonly shoulders: THREE.Group[] = [];
  private readonly elbows: THREE.Group[] = [];
  private readonly hipY: number;
  private readonly phase = Math.random() * 10;
  private walk = 0;
  private headYaw = 0;
  private headPitch = 0;
  private torsoPitch = 0;
  private pelvisY = 0;
  private sitBlend = 0;
  private lieBlend = 0;

  constructor(readonly spec: FigureSpec) {
    const s = (this.scale = spec.height / 1.75);
    this.height = spec.height;
    const build = spec.build ?? 1;
    const rough = spec.matte ? 0.92 : 0.72;
    const top = this.m(spec.top, rough);
    const bottom = this.m(spec.bottom, rough);
    const skin = this.m(spec.skin, 0.58);
    const shoes = this.m(spec.shoes ?? '#222838', 0.5);
    const sleeve = spec.sleeves === 'long' ? (spec.coat ? this.m(spec.coat, rough) : top) : top;
    const fore = spec.sleeves === 'long' ? sleeve : skin;

    // Sims proportions: a big head, a short neck, sturdy limbs and slightly shorter legs.
    this.hipY = 0.86 * s;
    this.root.add(this.body);
    this.body.add(this.pelvis);
    this.pelvis.position.y = this.hipY;

    // Pelvis and legs.
    const pelvisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 18, 12), bottom);
    pelvisMesh.scale.set(1.04 * build, 0.6, 0.74);
    pelvisMesh.position.y = 0.01 * s;
    pelvisMesh.castShadow = true;
    this.pelvis.add(pelvisMesh);
    for (const side of [1, -1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.088 * s * build, -0.02 * s, 0);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.086 * s, 0.26 * s, 5, 12), bottom);
      thigh.position.y = -0.19 * s;
      thigh.castShadow = true;
      const knee = new THREE.Group();
      knee.position.y = -0.4 * s;
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.073 * s, 0.24 * s, 5, 12), bottom);
      shin.position.y = -0.18 * s;
      shin.castShadow = true;
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 12, 8), shoes);
      shoe.scale.set(0.82, 0.52, 1.5);
      shoe.position.set(0, -0.395 * s, 0.05 * s);
      shoe.castShadow = true;
      knee.add(shin, shoe);
      hip.add(thigh, knee);
      this.pelvis.add(hip);
      this.hips.push(hip);
      this.knees.push(knee);
    }

    // Torso: a lathed body, rounder at the chest, flattened front to back.
    this.pelvis.add(this.torso);
    const profile = [
      [0.001, -0.03],
      [0.158, 0.0],
      [0.168, 0.12],
      [0.18, 0.27],
      [0.197, 0.39],
      [0.178, 0.465],
      [0.105, 0.515],
      [0.001, 0.53],
    ].map(([r, y]) => new THREE.Vector2(r * s, y * s));
    const torsoMesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), top);
    torsoMesh.scale.set(build, 1, 0.66);
    torsoMesh.castShadow = true;
    this.torso.add(torsoMesh);
    const chestZ = 0.197 * s * 0.66;

    if (spec.coat) {
      // A white coat: the skirt to mid-thigh over the trousers.
      const coatMat = this.m(spec.coat, rough);
      const skirt = new THREE.Mesh(
        new THREE.LatheGeometry([new THREE.Vector2(0.2 * s, -0.36 * s), new THREE.Vector2(0.178 * s, -0.12 * s), new THREE.Vector2(0.165 * s, 0.1 * s), new THREE.Vector2(0.176 * s, 0.3 * s)], 32),
        coatMat,
      );
      skirt.scale.set(build, 1, 0.72);
      skirt.castShadow = true;
      this.torso.add(skirt);
      // Buttons down the front.
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.008 * s, 8, 6), this.m('#C9CED8', 0.4));
        b.position.set(0.01 * s, (0.36 - i * 0.13) * s, (i < 2 ? chestZ : 0.168 * s * 0.72) + 0.004 * s);
        this.torso.add(b);
      }
    }
    if (spec.tie) {
      // The suit's shirt V and the tie.
      const shirt = new THREE.Mesh(new THREE.CircleGeometry(0.06 * s, 3), this.m(spec.shirt ?? '#FFFFFF', 0.6));
      shirt.rotation.z = -Math.PI / 2;
      shirt.scale.set(1.25, 0.8, 1);
      shirt.position.set(0, 0.43 * s, chestZ - 0.012 * s);
      shirt.rotation.x = -0.32;
      const tie = new THREE.Mesh(new THREE.CapsuleGeometry(0.016 * s, 0.17 * s, 4, 8), this.m(spec.tie, 0.45));
      tie.scale.z = 0.35;
      tie.position.set(0, 0.33 * s, chestZ + 0.004 * s);
      tie.rotation.x = -0.12;
      this.torso.add(shirt, tie);
    } else if (!spec.coat && !spec.matte) {
      // Scrubs: the V of the neckline and a breast pocket.
      const v = new THREE.Mesh(new THREE.CircleGeometry(0.05 * s, 3), skin);
      v.rotation.z = -Math.PI / 2;
      v.scale.set(1.3, 0.75, 1);
      v.position.set(0, 0.45 * s, chestZ - 0.02 * s);
      v.rotation.x = -0.4;
      const pocket = new THREE.Mesh(new THREE.PlaneGeometry(0.075 * s, 0.07 * s), this.m(new THREE.Color(spec.top).multiplyScalar(0.9).getStyle(), rough));
      pocket.position.set(0.085 * s, 0.33 * s, chestZ + 0.002 * s);
      pocket.rotation.x = -0.1;
      this.torso.add(v, pocket);
    }
    if (spec.badge) {
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.06 * s, 0.022 * s), new THREE.MeshBasicMaterial({ color: spec.badge, toneMapped: false }));
      badge.position.set(-0.085 * s, 0.37 * s, chestZ + 0.004 * s);
      badge.rotation.x = -0.12;
      this.torso.add(badge);
    }
    if (spec.loupes) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.1 * s, 0.004 * s, 6, 28, Math.PI), this.m('#C8A15E', 0.35, 0.6));
      band.rotation.z = Math.PI;
      band.position.set(0, 0.47 * s, 0.03 * s);
      band.rotation.x = -0.9;
      const lens = this.m('#20242E', 0.3, 0.4);
      for (const side of [1, -1]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s, 0.014 * s, 0.03 * s, 12), lens);
        l.rotation.x = Math.PI / 2;
        l.position.set(side * 0.022 * s, 0.33 * s, chestZ + 0.02 * s);
        this.torso.add(l);
      }
      this.torso.add(band);
    }

    // Shoulders and arms.
    for (const side of [1, -1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.212 * s * build, 0.44 * s, 0);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 12, 9), sleeve);
      cap.castShadow = true;
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062 * s, 0.16 * s, 4, 10), sleeve);
      upper.position.y = -0.13 * s;
      upper.castShadow = true;
      const elbow = new THREE.Group();
      elbow.position.y = -0.27 * s;
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.054 * s, 0.15 * s, 4, 10), fore);
      forearm.position.y = -0.12 * s;
      forearm.castShadow = true;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.056 * s, 10, 8), skin);
      hand.scale.set(0.9, 1.1, 0.75);
      hand.position.y = -0.26 * s;
      elbow.add(forearm, hand);
      shoulder.add(cap, upper, elbow);
      this.torso.add(shoulder);
      this.shoulders.push(shoulder);
      this.elbows.push(elbow);
    }

    // Neck and head.
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048 * s, 0.056 * s, 0.12 * s, 16), skin);
    neck.position.y = 0.545 * s;
    this.torso.add(neck);
    this.head.position.y = 0.74 * s;
    this.torso.add(this.head);
    const r = (spec.face ? 0.162 : 0.13) * s;
    this.headHeight = this.hipY + 0.74 * s + r * 1.1;
    const style = spec.hairStyle ?? 'short';
    const full = style === 'long' || style === 'hijab';
    const hairColor = spec.hijab ?? spec.hair;
    const headScale = new THREE.Vector3(0.92, 1.1, 0.94);
    if (spec.face) {
      const faceMat = new THREE.MeshStandardMaterial({ map: spec.face, roughness: 0.62, emissive: '#FFFFFF', emissiveMap: spec.face, emissiveIntensity: 0.24 });
      this.materials.push(faceMat);
      const front = new THREE.Mesh(headGeometry(r, true), faceMat);
      front.scale.copy(headScale);
      front.castShadow = true;
      this.head.add(front);
    } else {
      const front = new THREE.Mesh(headGeometry(r, false), skin);
      front.rotation.y = Math.PI;
      front.scale.copy(headScale);
      front.castShadow = true;
      this.head.add(front);
    }
    const backMat = new THREE.MeshStandardMaterial({ map: backTexture(hairColor, spec.skin, full), roughness: style === 'hijab' ? 0.85 : 0.7 });
    this.materials.push(backMat);
    const back = new THREE.Mesh(headGeometry(r, false), backMat);
    back.scale.copy(headScale);
    back.castShadow = true;
    this.head.add(back);

    const hairMat = this.m(hairColor, style === 'hijab' ? 0.85 : 0.66);
    if (style === 'short' || style === 'long' || style === 'bun') {
      // Volume at the back and the crown, behind the face so it never covers it.
      const shell = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 32, 20, Math.PI * 0.94, Math.PI * 1.12, 0, Math.PI * (style === 'long' ? 0.66 : 0.56)), hairMat);
      shell.scale.copy(headScale);
      shell.castShadow = true;
      this.head.add(shell);
    }
    if (style === 'long') {
      const fall = new THREE.Mesh(new THREE.CapsuleGeometry(0.15 * s, 0.2 * s, 8, 16), hairMat);
      fall.scale.set(1.12, 1, 0.46);
      fall.position.set(0, -0.19 * s, -0.085 * s);
      fall.castShadow = true;
      this.head.add(fall);
      for (const side of [1, -1]) {
        const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.036 * s, 0.2 * s, 6, 10), hairMat);
        lock.position.set(side * r * 0.86, -0.18 * s, -0.02 * s);
        lock.rotation.z = side * 0.08;
        lock.castShadow = true;
        this.head.add(lock);
      }
    }
    if (style === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 16, 12), hairMat);
      bun.position.set(0, 0.06 * s, -0.12 * s);
      this.head.add(bun);
    }
    if (style === 'hijab') {
      // The scarf: over the back of the head, falling over the neck onto the shoulders.
      const wrap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.07, 32, 22, Math.PI * 0.9, Math.PI * 1.2, 0, Math.PI * 0.86), hairMat);
      wrap.scale.copy(headScale);
      wrap.castShadow = true;
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.225 * s, 0.24 * s, 32, 1, true), hairMat);
      drape.scale.z = 0.78;
      drape.position.y = -0.22 * s;
      drape.castShadow = true;
      (drape.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      this.head.add(wrap, drape);
    }
    if (style === 'short' || style === 'none') {
      // Ears, just at the edge of the face.
      for (const side of [1, -1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026 * s, 12, 10), skin);
        ear.scale.set(0.5, 1, 0.8);
        ear.position.set(side * r * 0.93, -0.012 * s, -0.012 * s);
        this.head.add(ear);
      }
    }

    // Contact shadow under the feet.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.26 * s, 24), new THREE.MeshBasicMaterial({ color: '#13203F', transparent: true, opacity: 0.16, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.008;
    shadow.renderOrder = 1;
    this.root.add(shadow);
    // Model figures cast a shadow only with their body and head: half the shadow work, the same look from afar.
    if (spec.matte) {
      const core = new Set<THREE.Object3D>([pelvisMesh, torsoMesh]);
      this.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !core.has(o) && o.parent !== this.head) o.castShadow = false;
      });
    }
    this.applyPose(0, 1);
  }

  private m(color: THREE.ColorRepresentation, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
    const material = mat(color, roughness, { metalness });
    this.materials.push(material);
    return material;
  }

  /** Where the head is in the world, for labels and the plumbob. */
  headWorld(out = new THREE.Vector3()) {
    return this.head.getWorldPosition(out);
  }

  /** Walking speed in metres per second, set by the scene while it moves the figure. */
  speed = 0;

  frame(time: number, delta: number) {
    this.applyPose(time, delta);
  }

  private applyPose(time: number, delta: number) {
    const s = this.scale;
    const k = Math.min(1, delta * 7);
    const walking = this.pose === 'walk' || this.speed > 0.05;
    const pose: Pose = walking ? 'walk' : this.pose;
    if (walking) this.walk += delta * (4.2 + this.speed * 2.2);
    const t = this.walk;
    const idle = time + this.phase;

    this.sitBlend = damp(this.sitBlend, pose === 'sit' ? 1 : 0, 8, delta || 1);
    this.lieBlend = damp(this.lieBlend, pose === 'lie' ? 1 : 0, 6, delta || 1);

    // Legs: hips and knees, from standing to sitting and lying, or a stride.
    for (const [i, side] of [1, -1].entries()) {
      let hip = 0;
      let knee = 0;
      if (walking) {
        const swing = Math.sin(t + (i ? Math.PI : 0));
        hip = -swing * 0.42;
        knee = Math.max(0, -Math.cos(t + (i ? Math.PI : 0))) * 0.75;
      } else {
        // Weight shifts from one leg to the other now and then.
        const shift = Math.sin(idle * 0.33) * side;
        knee = Math.max(0, shift) * 0.08;
        hip = -Math.max(0, shift) * 0.03;
      }
      hip = THREE.MathUtils.lerp(hip, -Math.PI / 2 + 0.06, this.sitBlend);
      knee = THREE.MathUtils.lerp(knee, Math.PI / 2 - 0.08, this.sitBlend);
      hip = THREE.MathUtils.lerp(hip, -Math.PI / 2 + 0.28, this.lieBlend);
      knee = THREE.MathUtils.lerp(knee, 0.42, this.lieBlend);
      this.hips[i].rotation.x = THREE.MathUtils.lerp(this.hips[i].rotation.x, hip, walking ? 1 : k);
      this.knees[i].rotation.x = THREE.MathUtils.lerp(this.knees[i].rotation.x, knee, walking ? 1 : k);
    }

    // Pelvis: lower when sitting, a little bob when walking, a sway when standing.
    const seat = 0.45 * s;
    let y = this.hipY;
    if (walking) y += Math.abs(Math.cos(t)) * 0.02 * s - 0.01 * s;
    y = THREE.MathUtils.lerp(y, seat + 0.04 * s, this.sitBlend);
    y = THREE.MathUtils.lerp(y, 0, this.lieBlend);
    this.pelvisY = walking ? y : damp(this.pelvisY || y, y, 8, delta || 1);
    this.pelvis.position.y = this.pelvisY;
    this.pelvis.position.x = walking || this.sitBlend > 0.5 || this.lieBlend > 0.5 ? 0 : Math.sin(idle * 0.33) * 0.012 * s;
    this.pelvis.rotation.z = walking ? Math.sin(t) * 0.03 : Math.sin(idle * 0.33) * -0.02;

    // Torso: lean over a patient, recline in the chair, breathe.
    let pitch = this.lean + (walking ? 0.05 : 0);
    pitch = THREE.MathUtils.lerp(pitch, -0.12, this.sitBlend);
    pitch = THREE.MathUtils.lerp(pitch, -this.recline, this.lieBlend);
    this.torsoPitch = damp(this.torsoPitch, pitch, 6, delta || 1);
    this.torso.rotation.x = this.torsoPitch;
    this.torso.rotation.y = walking ? Math.sin(t) * 0.08 : 0;
    const breath = 1 + Math.sin(idle * 1.7) * 0.007;
    this.torso.scale.set(1, breath, 1 + (breath - 1) * 1.6);

    // Arms: blend toward the pose's directions.
    for (const [i, side] of [1, -1].entries()) {
      const target = armPose(pose, side, pose === 'walk' ? t : idle);
      const upperQ = aim(target.upper, new THREE.Quaternion());
      const foreLocal = target.fore.clone().applyQuaternion(upperQ.clone().invert());
      const foreQ = aim(foreLocal, tmpQ.clone());
      const rate = pose === 'walk' || pose === 'wave' ? 0.5 : k;
      this.shoulders[i].quaternion.slerp(upperQ, rate);
      this.elbows[i].quaternion.slerp(foreQ, rate);
    }

    // Head: toward the camera (or what it looks at), within what a neck can do; up a little when seen from above.
    let yaw = 0;
    let tilt = 0;
    if (this.look && this.lieBlend < 0.5) {
      this.root.updateWorldMatrix(true, false);
      const local = this.root.worldToLocal(tmpV.copy(this.look));
      const head = this.hipY + 0.74 * s;
      yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z) - this.torso.rotation.y, -this.lookRange, this.lookRange);
      const flat = Math.hypot(local.x, local.z);
      tilt = -THREE.MathUtils.clamp(Math.atan2(local.y - head, flat) * 0.55, -0.1, 0.42);
    }
    this.headYaw = dampAngle(this.headYaw, yaw, 5, delta || 1);
    this.headPitch = damp(this.headPitch, tilt - this.torsoPitch * 0.75 * (1 - this.lieBlend), 5, delta || 1);
    this.head.rotation.set(this.headPitch, this.headYaw, Math.sin(idle * 0.5) * 0.025, 'YXZ');
  }
}

/** The plumbob over a Sims head: a faceted diamond that spins and bobs, its colour how busy the dentist is. */
export class Plumbob {
  readonly group = new THREE.Group();
  private readonly material: THREE.MeshStandardMaterial;
  private readonly halo: THREE.Sprite;
  private readonly color = new THREE.Color('#22C38E');
  private readonly phase = Math.random() * 6;

  constructor(size = 0.075) {
    this.material = new THREE.MeshStandardMaterial({ color: this.color, emissive: this.color, emissiveIntensity: 0.32, roughness: 0.22, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.94 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), this.material);
    gem.scale.set(0.82, 1.7, 0.82);
    this.halo = glow(this.color, size * 5, 0.22);
    this.group.add(gem, this.halo);
  }

  setColor(color: string) {
    this.color.set(color);
  }

  frame(time: number, delta: number, base: number) {
    this.material.color.lerp(this.color, Math.min(1, delta * 4));
    this.material.emissive.copy(this.material.color);
    (this.halo.material as THREE.SpriteMaterial).color.copy(this.material.color);
    this.group.rotation.y = time * 1.3 + this.phase;
    this.group.position.y = base + Math.sin(time * 1.6 + this.phase) * 0.035;
  }
}

/** A dentist from team.ts: their colours, hair or hijab, their real face, a badge and (for some) loupes. */
export function doctorSpec(doctor: Doctor): FigureSpec {
  const o = doctor.outfit;
  const x = o.extra ?? {};
  const scrubs = !x.coat && !x.tie;
  return {
    height: doctor.height,
    top: x.coat ?? o.top,
    bottom: o.bottom,
    skin: o.skin,
    hair: o.hair,
    hijab: x.hijab,
    coat: x.coat,
    tie: x.tie,
    shirt: x.shirt,
    sleeves: x.coat || x.tie ? 'long' : 'short',
    hairStyle: x.hijab ? 'hijab' : x.longHair ? 'long' : doctor.id === 'omar' ? 'none' : 'short',
    shoes: scrubs ? '#EEF2F8' : '#1A1E28',
    face: faceTexture(doctor),
    badge: doctor.color,
    loupes: doctor.id === 'buthaina',
    build: doctor.id === 'omar' || doctor.id === 'ayman' ? 1.06 : 1,
  };
}


/** Calm pastel clothes for patients, like the white-and-pastel figures in an architect's model. */
const TOPS = ['#CFE3F2', '#E8D9CC', '#D9E6D3', '#E9D6DE', '#DAD6EE', '#F1E6C9', '#D3DEE9', '#ECDCD0'];
const BOTTOMS = ['#4D5C7A', '#6A7488', '#3F4A60', '#8A93A6', '#5B6B86', '#776E66'];
const SKINS = ['#F1CDB3', '#E3B596', '#C99472', '#A8735A', '#7E5440', '#EBC3A4', '#D9A88A'];
const HAIRS = ['#2A1C16', '#4A3022', '#6B4A2E', '#C9A26A', '#151515', '#8A5A33', '#9B9B9B'];

/** A fictional patient from a seed: colours, height and hair; a child is smaller. */
export function patientSpec(seed: number, age: number, accent?: string): FigureSpec {
  const r = (n: number) => {
    seed = (seed * 16807 + 11) % 2147483647;
    return Math.floor((seed / 2147483647) * n);
  };
  const kid = age < 13;
  const teen = age < 17;
  const height = kid ? 0.95 + age * 0.045 : teen ? 1.55 : 1.58 + r(25) / 100;
  const style = (['short', 'long', 'bun', 'short', 'none'] as const)[r(5)];
  return {
    height,
    top: accent ?? TOPS[r(TOPS.length)],
    bottom: BOTTOMS[r(BOTTOMS.length)],
    skin: SKINS[r(SKINS.length)],
    hair: age > 66 ? '#B9B9B9' : HAIRS[r(HAIRS.length)],
    hairStyle: style === 'none' && (kid || age < 30) ? 'short' : style,
    sleeves: r(2) ? 'long' : 'short',
    shoes: ['#2A2F3A', '#F2F2F2', '#8A6A50'][r(3)],
    matte: true,
    build: kid ? 1.08 : 0.94 + r(14) / 100,
  };
}
