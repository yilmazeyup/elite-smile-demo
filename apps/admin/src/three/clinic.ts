import { doctorById, DOCTORS, memberById, roomById, tr, trHtml, treatmentById, type DoctorId, type LocationId, type RoomId, type ThemeMode } from '@smile/shared';
import * as THREE from 'three';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { momentOf, ROOM_STATUS, shortName, type ClinicDay, type DoctorNow, type PanelVisit, type RoomView } from '../data';
import { at, Backdrop, blob, box, canvasTexture, cyl, glow, lightPool, live, mat, mergeStatic, oak, plate, resetKit, seeded, terrazzo, toothEmblem, wallShade } from './kit';
import { doctorSpec, Figure, patientSpec, Plumbob } from './people';
import { damp, dampAngle, el, type Stage, type Vec } from './stage';

/*
 * The clinic as an architect's model, cut open: six treatment rooms along the back behind frosted glass, a corridor,
 * the lobby with the reception desk and the logo wall, the waiting room, the kids' corner, the X-ray room and the
 * sterilisation room. The demo day drives everything: patients walk in, sit and wait, are called to their room, lie
 * in the chair while their dentist works at the head end, and walk out again. Each room glows in its status colour.
 */

export type ClinicHandlers = {
  doctor: (id: DoctorId) => void;
  room: (id: RoomId) => void;
  pauseOk: (room: RoomId, doctor: DoctorId) => void;
};

export type ClinicModel = {
  day: ClinicDay;
  /** Clinic minute (fractional) at the moment of this update, and clinic minutes per real minute. */
  minute: number;
  speed: number;
  rooms: RoomView[];
  doctors: DoctorNow[];
  selected: DoctorId | null;
};

// ---------------------------------------------------------------------------------------------------------- the plan

type RoomSpot = { id: RoomId; x: number; z: number; door: number };

type Layout = {
  loc: LocationId;
  minX: number;
  maxX: number;
  backZ: number;
  roomDepth: number;
  corridor: number;
  frontZ: number;
  rooms: RoomSpot[];
  /** X-ray and sterilisation rooms on the left (Eindhoven). */
  service: boolean;
  kids: boolean;
  seats: { x: number; z: number; yaw: number; kid?: boolean }[];
  desk: { x: number; z: number; w: number };
  entrance: number;
  logoWall: [number, number];
  /** Where the lobby opens into the corridor (x range). */
  gate: [number, number];
  /** A third back room (Hoogland): the instrument room. */
  store?: { x: number; w: number };
};

const ROOM_W = 4;

function layout(loc: LocationId): Layout {
  if (loc === 'hoogland') {
    const rooms: RoomSpot[] = (['k1', 'k2'] as RoomId[]).map((id, i) => ({ id, x: -4 + i * ROOM_W, z: 0, door: -4 + i * ROOM_W + 1.1 }));
    const seats = [-3.6, -2.8, -2.0, -1.2].flatMap((x) => [
      { x, z: 2.0, yaw: 0 },
      { x, z: 4.4, yaw: Math.PI },
    ]);
    return { loc, minX: -6, maxX: 6, backZ: -7.5, roomDepth: 4.5, corridor: 1.8, frontZ: 6.0, rooms, service: false, kids: false, seats, desk: { x: 3.4, z: 1.8, w: 2.8 }, entrance: 3.4, logoWall: [1.6, 5.6], gate: [-5.2, 1.0], store: { x: 4, w: 4 } };
  }
  const ids: RoomId[] = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
  const rooms = ids.map((id, i) => ({ id, x: -10 + i * ROOM_W, z: 0, door: -10 + i * ROOM_W + 1.1 }));
  const xs = [-3.1, -2.3, -1.5, -0.7, 0.7, 1.5, 2.3, 3.1];
  const seats = [...xs.map((x) => ({ x, z: 1.9, yaw: 0 })), ...xs.map((x) => ({ x, z: 4.7, yaw: Math.PI }))];
  // Small stools around the kids' table.
  const kidSeats = [0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    return { x: -6.6 + Math.cos(a) * 0.62, z: 4.4 + Math.sin(a) * 0.62, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), kid: true };
  });
  return { loc, minX: -12, maxX: 12, backZ: -7.5, roomDepth: 4.5, corridor: 1.8, frontZ: 6.5, rooms, service: true, kids: true, seats: [...seats, ...kidSeats], desk: { x: 8, z: 1.7, w: 3.6 }, entrance: 8, logoWall: [5.4, 10.6], gate: [-8.2, 4.9] };
}

/** Camera views; rooms get theirs from where they are. */
export function overviewView(loc: LocationId): { camera: Vec; target: Vec } {
  return loc === 'hoogland' ? { camera: [-2.6, 24, 28], target: [0, 0.2, -0.4] } : { camera: [-3.2, 29.5, 33.5], target: [0.4, 0.2, -0.4] };
}

/** Looking down into a room over its glass front, from the corridor side and a little to the right. */
const ROOM_CAMERA = (x: number, z: number): { camera: Vec; target: Vec } => ({ camera: [x - 1.5, 10, z + 9.6], target: [x - 0.1, 0.6, z - 0.5] });

// ------------------------------------------------------------------------------------------------------- materials

type Mats = ReturnType<typeof materials>;

function materials() {
  return {
    porcelain: mat('#F7F9FC', 0.82),
    wall: mat('#FBFCFE', 0.88),
    cap: mat('#DCE3EE', 0.7),
    plinth: mat('#FFFFFF', 0.9),
    frosted: new THREE.MeshPhysicalMaterial({ color: '#E8F3FC', roughness: 0.25, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    window: live(new THREE.MeshPhysicalMaterial({ color: '#BFE3F7', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, emissive: '#000000' })),
    alu: mat('#C9D1DC', 0.35, { metalness: 0.6 }),
    chrome: mat('#DDE3EA', 0.18, { metalness: 0.9 }),
    white: mat('#FFFFFF', 0.4),
    plastic: mat('#EEF2F6', 0.35),
    grey: mat('#AEB8C6', 0.5),
    dark: mat('#1B2436', 0.45),
    oak: mat('#D9BF9C', 0.55),
    sky: live(mat('#2DB4E8', 0.4, { emissive: '#2DB4E8', emissiveIntensity: 0.4 })),
    fabric: mat('#DCE7F1', 0.95),
    fabric2: mat('#E9DFD3', 0.95),
    leaf: mat('#7FAE8C', 0.8, { flatShading: true }),
    leaf2: mat('#96BE97', 0.8, { flatShading: true }),
    pot: mat('#EDE7DF', 0.85),
    screen: new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }),
  };
}

/** The X-ray on the dentist's monitor: a molar on navy, its roots and the canal lines in light blue. */
function xrayTexture() {
  return canvasTexture(256, 160, (ctx) => {
    ctx.fillStyle = '#0B1A3A';
    ctx.fillRect(0, 0, 256, 160);
    const g = ctx.createRadialGradient(128, 70, 10, 128, 80, 110);
    g.addColorStop(0, 'rgba(180,220,255,0.55)');
    g.addColorStop(1, 'rgba(180,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#CFE9FF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(96, 40);
    ctx.bezierCurveTo(100, 20, 156, 20, 160, 40);
    ctx.bezierCurveTo(164, 70, 150, 80, 146, 130);
    ctx.lineTo(136, 132);
    ctx.bezierCurveTo(134, 100, 122, 100, 120, 132);
    ctx.lineTo(110, 130);
    ctx.bezierCurveTo(106, 80, 92, 70, 96, 40);
    ctx.stroke();
    ctx.strokeStyle = '#2DB4E8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(116, 60);
    ctx.lineTo(114, 124);
    ctx.moveTo(140, 60);
    ctx.lineTo(141, 124);
    ctx.stroke();
    ctx.fillStyle = 'rgba(45,180,232,0.9)';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillText('36', 16, 26);
  });
}

// ------------------------------------------------------------------------------------------------ building blocks

/** A straight wall between two floor points; `h` high, rounded, casting soft shadows, with a shade strip on the floor. */
function wall(group: THREE.Group, m: THREE.Material, x1: number, z1: number, x2: number, z2: number, h: number, t = 0.14, shade = true) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.02) return;
  const w = box(len + t * 0.5, h, t, m, 0.03);
  w.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2);
  w.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  group.add(w);
  if (shade) {
    // A strip of soft shade on the floor on both sides, darkest against the wall.
    const angle = -Math.atan2(z2 - z1, x2 - x1);
    const nx = -(z2 - z1) / len;
    const nz = (x2 - x1) / len;
    for (const side of [1, -1]) {
      const s = wallShade(len, 0.38, 0.13);
      s.rotation.order = 'YXZ';
      s.rotation.y = angle + (side > 0 ? 0 : Math.PI);
      s.position.set((x1 + x2) / 2 + nx * side * (t / 2 + 0.19), 0.004, (z1 + z2) / 2 + nz * side * (t / 2 + 0.19));
      group.add(s);
    }
  }
}

/** Frosted glass between two points, from `y0` to `y1`, with a slim aluminium rail on top. */
function glass(group: THREE.Group, mats: Mats, x1: number, z1: number, x2: number, z2: number, y0: number, y1: number) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.02) return;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, y1 - y0), mats.frosted);
  pane.position.set((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2);
  pane.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  pane.renderOrder = 3;
  group.add(pane);
  const rail = box(len, 0.035, 0.05, mats.alu, 0.01, false);
  rail.position.set((x1 + x2) / 2, y1, (z1 + z2) / 2);
  rail.rotation.y = pane.rotation.y;
  group.add(rail);
}

function plant(mats: Mats, size = 1, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const r = seeded(seed);
  const pot = cyl(0.17 * size, 0.36 * size, mats.pot, 0.2 * size);
  pot.position.y = 0.18 * size;
  g.add(pot);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry((0.16 + r() * 0.12) * size, 0), r() > 0.5 ? mats.leaf : mats.leaf2);
    leaf.position.set((r() - 0.5) * 0.36 * size, (0.5 + r() * 0.75) * size, (r() - 0.5) * 0.36 * size);
    leaf.rotation.set(r() * 3, r() * 3, r() * 3);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.add(blob(0.7 * size, 0.7 * size, 0.25));
  return g;
}

function lounge(mats: Mats, fabric: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const seat = box(0.62, 0.16, 0.6, fabric, 0.07);
  seat.position.y = 0.38;
  const back = box(0.62, 0.48, 0.14, fabric, 0.07);
  back.position.set(0, 0.62, -0.25);
  back.rotation.x = -0.12;
  const base = box(0.5, 0.04, 0.48, mats.oak, 0.02);
  base.position.y = 0.28;
  g.add(seat, back, base);
  for (const [x, z] of [
    [-0.24, -0.22],
    [0.24, -0.22],
    [-0.24, 0.22],
    [0.24, 0.22],
  ]) {
    const leg = cyl(0.018, 0.28, mats.oak, 0.018, 8, false);
    leg.position.set(x, 0.14, z);
    g.add(leg);
  }
  g.add(blob(0.85, 0.8, 0.22));
  return g;
}

type Unit = {
  group: THREE.Group;
  back: THREE.Group;
  legs: THREE.Group;
  lamp: THREE.MeshBasicMaterial;
  lampGlow: THREE.Sprite;
  screen: THREE.MeshBasicMaterial;
  /** 0 upright … 1 reclined for a patient. */
  recline: number;
};

/**
 * A dental unit, the chair's axis along z with the patient's head toward −z: base and lift, seat, leg rest and a
 * backrest that reclines, headrest, armrest, spittoon, delivery tray with handpieces, the operating light on its arm
 * and a monitor with an X-ray. Upholstery in the dentist's colour.
 */
function dentalUnit(mats: Mats, upholstery: string, xray: THREE.Texture): Unit {
  const g = new THREE.Group();
  // The dentist's colour, softened toward porcelain so the chairs read as furniture, not as blocks.
  const up = mat(new THREE.Color(upholstery).lerp(new THREE.Color('#F4F7FB'), 0.3), 0.6);
  const base = box(0.55, 0.1, 0.95, mats.plastic, 0.04);
  base.position.set(0, 0.05, -0.1);
  const lift = cyl(0.12, 0.34, mats.white);
  lift.position.set(0, 0.28, -0.15);
  const seat = box(0.58, 0.12, 0.6, up, 0.05);
  seat.position.set(0, 0.52, -0.05);
  const shell = box(0.52, 0.06, 0.56, mats.white, 0.03);
  shell.position.set(0, 0.44, -0.05);
  g.add(base, lift, seat, shell, at(blob(1.3, 2.4, 0.3), 0, 0.006, -0.3));

  const legs = new THREE.Group();
  legs.position.set(0, 0.54, 0.24);
  const legRest = box(0.5, 0.1, 0.72, up, 0.05);
  legRest.position.set(0, 0, 0.36);
  legs.add(legRest);
  legs.userData.dynamic = true;
  g.add(legs);

  const back = new THREE.Group();
  back.position.set(0, 0.56, -0.34);
  const rest = box(0.56, 0.1, 0.8, up, 0.05);
  // Built lying along +y in the pivot's space: the pivot tilts it back.
  rest.rotation.x = Math.PI / 2;
  rest.position.set(0, 0.42, -0.01);
  const restShell = box(0.5, 0.05, 0.74, mats.white, 0.025);
  restShell.rotation.x = Math.PI / 2;
  restShell.position.set(0, 0.42, -0.07);
  const head = box(0.3, 0.08, 0.22, up, 0.04);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.92, 0.0);
  back.add(rest, restShell, head);
  back.userData.dynamic = true;
  g.add(back);

  const arm = box(0.06, 0.06, 0.46, mats.white, 0.025);
  arm.position.set(0.33, 0.66, -0.02);
  g.add(arm);

  // Spittoon and cup on the patient's left.
  const post = cyl(0.04, 0.5, mats.plastic);
  post.position.set(0.48, 0.45, -0.62);
  const bowl = cyl(0.11, 0.07, mats.white, 0.13);
  bowl.position.set(0.5, 0.73, -0.58);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), mat('#A9DDF4', 0.1));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0.5, 0.768, -0.58);
  const cup = cyl(0.03, 0.08, mat('#CBEAF8', 0.3), 0.035, 12);
  cup.position.set(0.44, 0.8, -0.4);
  g.add(post, bowl, water, cup);

  // The delivery tray on the patient's right, with instruments and the handpieces in their holders.
  const tray = box(0.44, 0.035, 0.3, mats.white, 0.012);
  tray.position.set(-0.62, 0.95, -0.1);
  const trayArm = box(0.04, 0.04, 0.42, mats.plastic, 0.015);
  trayArm.position.set(-0.45, 0.82, -0.2);
  trayArm.rotation.y = 0.6;
  const mat1 = box(0.36, 0.008, 0.22, mat('#BFE6F6', 0.6), 0.004, false);
  mat1.position.set(-0.62, 0.972, -0.1);
  g.add(tray, trayArm, mat1);
  for (let i = 0; i < 5; i++) {
    const tool = cyl(0.006, 0.17, mats.chrome, 0.006, 6, false);
    tool.rotation.z = Math.PI / 2;
    tool.rotation.y = 0.15;
    tool.position.set(-0.62, 0.983, -0.18 + i * 0.04);
    g.add(tool);
  }
  for (let i = 0; i < 4; i++) {
    const hp = cyl(0.012, 0.15, i === 0 ? mats.dark : mats.chrome, 0.012, 8, false);
    hp.position.set(-0.8, 1.02, -0.2 + i * 0.065);
    hp.rotation.z = 0.25;
    g.add(hp);
  }

  // The operating light on its arm, over the patient's mouth.
  const pole = cyl(0.035, 2.12, mats.white, 0.035, 14);
  pole.position.set(-0.95, 1.06, -1.38);
  const armH = box(0.75, 0.05, 0.05, mats.white, 0.02);
  armH.position.set(-0.62, 2.1, -1.12);
  armH.rotation.y = -0.65;
  const drop = cyl(0.022, 0.24, mats.white, 0.022, 10);
  drop.position.set(-0.28, 1.99, -0.86);
  const lampHead = box(0.4, 0.09, 0.2, mats.white, 0.045);
  lampHead.position.set(-0.28, 1.84, -0.86);
  lampHead.rotation.set(0.35, 0.3, 0);
  const lamp = live(new THREE.MeshBasicMaterial({ color: '#FFF8E6', toneMapped: false }));
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.12), lamp);
  lens.rotation.x = Math.PI / 2;
  lens.position.y = -0.047;
  lampHead.add(lens);
  const lampGlow = glow('#FFF4D8', 0.9, 0);
  lampGlow.position.set(-0.28, 1.78, -0.84);
  g.add(pole, armH, drop, lampHead, lampGlow);

  // Monitor on a slim pole, turned toward the chair.
  const mpole = cyl(0.025, 1.2, mats.alu, 0.025, 10);
  mpole.position.set(0.98, 0.6, 0.34);
  const monitor = box(0.52, 0.32, 0.035, mats.dark, 0.015);
  monitor.position.set(0.98, 1.32, 0.34);
  monitor.rotation.y = -0.85;
  const screen = live(new THREE.MeshBasicMaterial({ map: xray, toneMapped: false, color: '#9AA8BF' }));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), screen);
  panel.position.z = 0.019;
  monitor.add(panel);
  g.add(mpole, monitor, at(blob(0.5, 0.5, 0.2), 0.98, 0.006, 0.34));

  // Stools: the dentist's at the head end, the assistant's on the left.
  for (const [x, z, h] of [
    [-0.42, -1.52, 0.52],
    [0.86, -0.85, 0.6],
  ] as const) {
    const seatS = cyl(0.19, 0.08, up, 0.2, 20);
    seatS.position.set(x, h, z);
    const gas = cyl(0.025, h - 0.06, mats.chrome, 0.025, 10);
    gas.position.set(x, (h - 0.06) / 2 + 0.03, z);
    const star = cyl(0.22, 0.03, mats.dark, 0.22, 5);
    star.position.set(x, 0.04, z);
    g.add(seatS, gas, star, at(blob(0.5, 0.5, 0.18), x, 0.006, z));
  }
  return { group: g, back, legs, lamp, lampGlow, screen, recline: 0 };
}

/** Cabinets along the room's right wall: drawers, a worktop with a sink and wall cupboards above. */
function cabinets(mats: Mats, length: number): THREE.Group {
  const g = new THREE.Group();
  const low = box(0.5, 0.86, length, mats.white, 0.03);
  low.position.y = 0.43;
  const top = box(0.54, 0.04, length + 0.02, mats.oak, 0.015);
  top.position.y = 0.88;
  const sink = box(0.34, 0.03, 0.42, mats.chrome, 0.02, false);
  sink.position.set(0, 0.905, -length / 2 + 0.5);
  const tap = cyl(0.012, 0.22, mats.chrome, 0.012, 8, false);
  tap.position.set(0.17, 1.0, -length / 2 + 0.5);
  const upper = box(0.34, 0.6, length * 0.7, mats.white, 0.03);
  upper.position.set(0.08, 1.75, -length * 0.15);
  g.add(low, top, sink, tap, upper);
  for (let i = 0; i < Math.floor(length / 0.5); i++) {
    const handle = box(0.012, 0.012, 0.16, mats.alu, 0.004, false);
    handle.position.set(-0.256, 0.74, -length / 2 + 0.25 + i * 0.5);
    g.add(handle);
  }
  // Gloves and a box of masks on the worktop, in the logo's sky.
  const gloves = box(0.12, 0.06, 0.24, mat('#9FD8F2', 0.6), 0.01);
  gloves.position.set(0, 0.93, length / 2 - 0.4);
  g.add(gloves, at(blob(0.7, length + 0.4, 0.18), 0, 0.006, 0));
  return g;
}

// ------------------------------------------------------------------------------------------------------- the scene

type RoomParts = {
  spot: RoomSpot;
  unit: Unit;
  pool: THREE.Mesh;
  beacon: THREE.MeshBasicMaterial;
  rings: THREE.Mesh[];
  label: HTMLDivElement;
  labelObject: CSS2DObject;
  alert: HTMLDivElement;
  alertObject: CSS2DObject;
  light: THREE.PointLight;
  view: RoomView | null;
};

type DoctorParts = {
  id: DoctorId;
  figure: Figure;
  plumbob: Plumbob;
  ring: THREE.Mesh;
  tag: HTMLDivElement;
  tagObject: CSS2DObject;
  hover: number;
  yaw: number;
  x: number;
  z: number;
};

type PatientParts = { figure: Figure; seat: number; marker: THREE.Mesh | null; tag: CSS2DObject | null };

/** Minutes of clinic time for walking: in, to the room, out. */
const WALK_IN = 0.55;
const WALK_CALL = 0.7;
const WALK_OUT = 0.8;

export class ClinicScene {
  private readonly root = new THREE.Group();
  private readonly mats = materials();
  private readonly backdrop = new Backdrop();
  private readonly lights: { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; fill: THREE.DirectionalLight; lobby: THREE.PointLight[] };
  private readonly rooms = new Map<RoomId, RoomParts>();
  private readonly doctors = new Map<DoctorId, DoctorParts>();
  private readonly patients = new Map<string, PatientParts>();
  private readonly staff: { figure: Figure; x: number; z: number; yaw: number; pose: 'stand' | 'work' | 'crossed' }[] = [];
  private readonly assistants = new Map<string, Figure>();
  private readonly glowing: THREE.MeshStandardMaterial[] = [];
  private readonly windows: THREE.MeshPhysicalMaterial;
  private autoclave: THREE.MeshBasicMaterial | null = null;
  private readonly labels: CSS2DObject[] = [];
  private readonly waitTag: HTMLDivElement;
  private readonly plan: Layout;
  private model: ClinicModel | null = null;
  private modelAt = performance.now();
  private hovered: DoctorId | null = null;
  private night = 0;
  private nightTarget = 0;
  private lightApplied = false;
  private readonly unsubscribe: () => void;

  constructor(private readonly stage: Stage, private readonly handlers: ClinicHandlers, loc: LocationId) {
    this.plan = layout(loc);
    const p = this.plan;
    const m = this.mats;
    stage.scene.add(this.root);
    stage.scene.background = this.backdrop.texture;
    this.windows = m.window;

    // ---------------------------------------------------------------- light
    const hemi = new THREE.HemisphereLight('#F5F9FF', '#D5DCE7', 1.55);
    const sun = new THREE.DirectionalLight('#FFF5E8', 2.3);
    sun.position.set(-13, 24, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const span = (p.maxX - p.minX) / 2 + 3;
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.far = 70;
    sun.shadow.radius = 5;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    const fill = new THREE.DirectionalLight('#DDEBFF', 0.55);
    fill.position.set(16, 9, -8);
    const lobby = [new THREE.PointLight('#FFE7C4', 0, 9, 1.6), new THREE.PointLight('#FFE7C4', 0, 9, 1.6)];
    lobby[0].position.set(-1, 2.6, 3.2);
    lobby[1].position.set(p.desk.x, 2.6, 2.8);
    this.root.add(hemi, sun, sun.target, fill, ...lobby);
    this.lights = { hemi, sun, fill, lobby };

    // ---------------------------------------------------------------- ground, plinth, floors
    const W = p.maxX - p.minX;
    const D = p.frontZ - p.backZ;
    const cx = (p.maxX + p.minX) / 2;
    const cz = (p.frontZ + p.backZ) / 2;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ color: '#0B1A3A', opacity: 0.1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.36;
    ground.receiveShadow = true;
    const halo = blob(W + 9, D + 9, 0.12);
    halo.position.set(cx, -0.355, cz);
    const plinth = box(W + 1.1, 0.36, D + 1.1, m.plinth, 0.16);
    plinth.position.set(cx, -0.18, cz);
    plinth.castShadow = true;
    this.root.add(ground, halo, plinth);

    const corridorZ0 = p.backZ + p.roomDepth;
    const lobbyZ0 = corridorZ0 + p.corridor;
    const floor = (x0: number, x1: number, z0: number, z1: number, material: THREE.Material) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), material);
      f.rotation.x = -Math.PI / 2;
      f.position.set((x0 + x1) / 2, 0.002, (z0 + z1) / 2);
      f.receiveShadow = true;
      this.root.add(f);
    };
    const tz = mat('#FFFFFF', 0.62, { map: terrazzo([W / 3.2, p.roomDepth / 3.2]) });
    const tzC = mat('#FFFFFF', 0.62, { map: terrazzo([W / 3.2, p.corridor / 3.2]) });
    const wood = mat('#FFFFFF', 0.68, { map: oak([W / 4.5, (p.frontZ - lobbyZ0) / 4.5]) });
    floor(p.minX, p.maxX, p.backZ, corridorZ0, tz);
    floor(p.minX, p.maxX, corridorZ0, lobbyZ0, tzC);
    floor(p.service ? -8.8 : p.minX, p.maxX, lobbyZ0, p.frontZ, wood);
    if (p.service) floor(p.minX, -8.8, lobbyZ0, p.frontZ, tzC);

    // ---------------------------------------------------------------- outer walls
    const H = 2.8;
    // The back wall with a tall window in each room.
    const back = p.backZ;
    const windowsAt = [...p.rooms.map((r) => r.x), ...(p.store ? [p.store.x] : [])];
    let x0 = p.minX;
    for (const wx of windowsAt.sort((a, b) => a - b)) {
      wall(this.root, m.wall, x0, back, wx - 0.85, back, H, 0.2);
      const sill = box(1.7, 0.9, 0.2, m.wall, 0.03);
      sill.position.set(wx, 0.45, back);
      const lintel = box(1.7, 0.42, 0.2, m.wall, 0.03);
      lintel.position.set(wx, H - 0.21, back);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.48), this.windows);
      pane.position.set(wx, 1.64, back + 0.02);
      const frame = box(1.72, 0.04, 0.24, m.alu, 0.01, false);
      frame.position.set(wx, 0.92, back + 0.02);
      const mullion = box(0.035, 1.48, 0.06, m.alu, 0.01, false);
      mullion.position.set(wx, 1.64, back + 0.04);
      this.root.add(sill, lintel, pane, frame, mullion);
      x0 = wx + 0.85;
    }
    wall(this.root, m.wall, x0, back, p.maxX, back, H, 0.2);
    // Side walls are cut low, like a section model, so the rooms stay in view.
    wall(this.root, m.wall, p.minX, back, p.minX, p.frontZ, 1.15, 0.2);
    wall(this.root, m.wall, p.maxX, back, p.maxX, p.frontZ, 1.15, 0.2);
    // The front: a low sill, glass, and the entrance with sliding doors.
    const e0 = p.entrance - 1.1;
    const e1 = p.entrance + 1.1;
    for (const [a, b] of [
      [p.minX, e0],
      [e1, p.maxX],
    ]) {
      wall(this.root, m.wall, a, p.frontZ, b, p.frontZ, 0.42, 0.2);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 0.8), this.windows);
      pane.position.set((a + b) / 2, 0.82, p.frontZ);
      this.root.add(pane);
      const rail = box(b - a, 0.04, 0.08, m.alu, 0.01, false);
      rail.position.set((a + b) / 2, 1.22, p.frontZ);
      this.root.add(rail);
      for (let x = a + 1.5; x < b - 0.2; x += 1.5) {
        const mullion = box(0.04, 0.8, 0.06, m.alu, 0.01, false);
        mullion.position.set(x, 0.82, p.frontZ);
        this.root.add(mullion);
      }
    }
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), this.windows);
      door.position.set(p.entrance + side * 0.95, 0.62, p.frontZ - 0.05);
      const frame = box(0.92, 0.04, 0.05, m.alu, 0.01, false);
      frame.position.set(p.entrance + side * 0.95, 1.22, p.frontZ - 0.05);
      this.root.add(door, frame);
    }
    const mat0 = box(1.6, 0.012, 0.9, mat('#AEB9CB', 0.95), 0.005, false);
    mat0.position.set(p.entrance, 0.008, p.frontZ - 0.75);
    this.root.add(mat0);
    // The path to the door outside, and the name on the plinth.
    const step = box(2.6, 0.06, 1.2, m.plinth, 0.04);
    step.position.set(p.entrance, -0.05, p.frontZ + 1.05);
    this.root.add(step);

    // ---------------------------------------------------------------- treatment rooms
    const xray = xrayTexture();
    for (const spot of p.rooms) this.buildRoom(spot, xray);
    // Partitions between the rooms: a solid lower part and frosted glass above.
    const partitions = [...new Set(p.rooms.flatMap((r) => [r.x - ROOM_W / 2, r.x + ROOM_W / 2]))].filter((x) => x > p.minX + 0.1 && x < p.maxX - 0.1);
    if (p.store) partitions.push(p.store.x - p.store.w / 2);
    for (const x of [...new Set(partitions)]) {
      wall(this.root, m.wall, x, back, x, corridorZ0, 1.05, 0.12);
      glass(this.root, m, x, back + 0.1, x, corridorZ0, 1.05, 2.45);
      const post = box(0.12, 2.45, 0.12, m.wall, 0.03);
      post.position.set(x, 1.225, corridorZ0);
      this.root.add(post);
    }
    if (p.store) this.buildStore(p.store.x, back + p.roomDepth / 2, p.store.w);

    // ---------------------------------------------------------------- service rooms (Eindhoven)
    if (p.service) this.buildService(lobbyZ0);

    // ---------------------------------------------------------------- lobby
    this.buildLobby(lobbyZ0);

    // The building never moves: one mesh per look keeps it to a few dozen draw calls.
    mergeStatic(this.root);

    // ---------------------------------------------------------------- people
    const working = p.loc === 'eindhoven' ? DOCTORS : DOCTORS.filter((d) => d.id === 'ahmad' || d.id === 'najla');
    const hoverTargets: THREE.Object3D[] = [];
    for (const d of working) {
      const figure = new Figure(doctorSpec(d));
      const plumbob = new Plumbob(0.07);
      figure.root.add(plumbob.group);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 48), new THREE.MeshBasicMaterial({ color: '#2DB4E8', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      ring.renderOrder = 2;
      figure.root.add(ring);
      const tag = el('person-tag');
      const tagObject = stage.label(tag, figure.root, [0, figure.headHeight + 0.42, 0], { priority: () => (this.hovered === d.id ? 900 : this.model?.selected === d.id ? 800 : -1), pinned: () => this.hovered === d.id });
      this.labels.push(tagObject);
      const spot = p.rooms.find((r) => this.roomDoctor(r.id) === d.id)!;
      const start = this.doorSpot(spot);
      figure.root.position.set(start.x, 0, start.z);
      this.root.add(figure.root);
      figure.root.userData.doctor = d.id;
      hoverTargets.push(figure.root);
      this.doctors.set(d.id, { id: d.id, figure, plumbob, ring, tag, tagObject, hover: 0, yaw: 0, x: start.x, z: start.z });
    }
    stage.setHoverTargets(hoverTargets, (object) => {
      this.hovered = (object?.userData.doctor as DoctorId | undefined) ?? null;
    });
    stage.onSelect((object) => {
      const id = object?.userData.doctor as DoctorId | undefined;
      if (id) this.handlers.doctor(id);
    });
    stage.onDouble((object, point) => {
      const id = object?.userData.doctor as DoctorId | undefined;
      if (id) {
        const spot = p.rooms.find((r) => this.roomDoctor(r.id) === id);
        if (spot) this.focusRoom(spot.id);
        return;
      }
      if (!point) return;
      const spot = p.rooms.find((r) => Math.abs(point.x - r.x) < ROOM_W / 2 && point.z > back && point.z < corridorZ0);
      if (spot) {
        this.focusRoom(spot.id);
        this.handlers.room(spot.id);
      } else if (point.z > lobbyZ0 && point.x > p.minX && point.x < p.maxX) {
        stage.flyTo([point.x + 1.5, 7.5, point.z + 8.5], [point.x, 0.6, point.z]);
      }
    });

    // Nadia at the desk; Ruben in sterilisation; Fleur in Hoogland.
    if (p.loc === 'eindhoven') {
      this.addStaff('nadia', p.desk.x - 0.4, p.desk.z - 0.75, 0, 'work');
      this.addStaff('ruben', -10.4, 1.35, Math.PI, 'work');
    } else {
      this.addStaff('fleur', p.desk.x - 0.3, p.desk.z - 0.75, 0, 'work');
    }

    this.waitTag = el('zone-tag');
    this.labels.push(stage.label(this.waitTag, this.root, [p.kids ? 0 : -2.4, 1.5, 3.3], { priority: () => 40, far: 40 }));

    this.unsubscribe = stage.onFrame((time, delta) => this.frame(time, delta));
    this.applyLight();
  }

  /** The dentist in a room at this location. */
  private roomDoctor(id: RoomId): DoctorId {
    if (this.plan.loc === 'hoogland') return id === 'k1' ? 'ahmad' : 'najla';
    return roomById(id).doctor;
  }

  private roomCentre(spot: RoomSpot) {
    return { x: spot.x, z: this.plan.backZ + this.plan.roomDepth / 2 };
  }

  /** Where the dentist waits between patients: inside, at the foot of the chair, in full view of the corridor. */
  private doorSpot(spot: RoomSpot) {
    const c = this.roomCentre(spot);
    return { x: c.x + 0.6, z: c.z + 1.05 };
  }

  private chairSpot(spot: RoomSpot) {
    const c = this.roomCentre(spot);
    return { x: c.x - 0.3, z: c.z - 0.1 };
  }

  private buildRoom(spot: RoomSpot, xray: THREE.Texture) {
    const p = this.plan;
    const m = this.mats;
    const c = this.roomCentre(spot);
    const doctor = doctorById(this.roomDoctor(spot.id));
    const corridorZ0 = p.backZ + p.roomDepth;
    const group = new THREE.Group();
    this.root.add(group);

    // The corridor side: low wall, frosted glass, the door with its frame, and the name plate over it.
    const x0 = spot.x - ROOM_W / 2;
    const x1 = spot.x + ROOM_W / 2;
    const d0 = spot.door - 0.55;
    const d1 = spot.door + 0.55;
    wall(group, m.wall, x0, corridorZ0, d0, corridorZ0, 0.95, 0.12);
    wall(group, m.wall, d1, corridorZ0, x1, corridorZ0, 0.95, 0.12);
    glass(group, m, x0 + 0.06, corridorZ0, d0, corridorZ0, 0.95, 2.45);
    glass(group, m, d1, corridorZ0, x1 - 0.06, corridorZ0, 0.95, 2.45);
    for (const x of [d0, d1]) {
      const post = box(0.08, 2.45, 0.16, m.wall, 0.02);
      post.position.set(x, 1.225, corridorZ0);
      group.add(post);
    }
    const header = box(1.18, 0.34, 0.16, m.wall, 0.03);
    header.position.set(spot.door, 2.28, corridorZ0);
    group.add(header);
    const leaf = box(0.98, 2.05, 0.045, m.oak, 0.02);
    leaf.position.set(d1 - 0.06, 1.03, corridorZ0 - 0.5);
    leaf.rotation.y = Math.PI / 2 - 0.12;
    group.add(leaf);
    const name = plate(
      [
        { text: tr(roomById(spot.id).name), font: '600 104px Sora, sans-serif', color: '#0B1A3A' },
        { text: doctor.name, font: '500 78px Figtree, sans-serif', color: '#5A6A8C' },
      ],
      { width: 0.98, height: 0.27, bg: '#FFFFFF', accent: doctor.color },
    );
    name.position.set(spot.door, 2.28, corridorZ0 + 0.1);
    group.add(name);
    const beacon = live(new THREE.MeshBasicMaterial({ color: '#12A27A', toneMapped: false }));
    const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.22, 4, 10), beacon);
    pill.rotation.z = Math.PI / 2;
    pill.position.set(spot.door, 2.49, corridorZ0 + 0.05);
    group.add(pill);

    // Inside: the unit, cabinets, a print on the back wall and a plant.
    const unit = dentalUnit(m, doctor.color, xray);
    const chair = this.chairSpot(spot);
    unit.group.position.set(chair.x, 0, chair.z);
    group.add(unit.group);
    const cab = cabinets(m, 2.4);
    cab.position.set(x1 - 0.33, 0, c.z - 0.75);
    group.add(cab);
    const art = canvasTexture(256, 320, (ctx) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 256, 320);
      const r = seeded(spot.id.charCodeAt(1) * 7);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = [doctor.color, '#2DB4E8', '#234282', '#E9EEF6'][Math.floor(r() * 4)];
        ctx.globalAlpha = 0.55 + r() * 0.35;
        ctx.beginPath();
        ctx.arc(60 + r() * 140, 70 + r() * 180, 30 + r() * 60, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    const frame = box(0.62, 0.78, 0.04, m.oak, 0.01, false);
    frame.position.set(x0 + 0.95, 1.65, p.backZ + 0.13);
    const print = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.7), new THREE.MeshStandardMaterial({ map: art, roughness: 0.9 }));
    print.position.set(x0 + 0.95, 1.65, p.backZ + 0.17);
    group.add(frame, print);
    const pl = plant(m, 0.8, spot.id.charCodeAt(1));
    pl.position.set(x0 + 0.38, 0, corridorZ0 - 0.45);
    group.add(pl);

    // Status: a pool of light, rings for a pause, a lamp in the room at night.
    const pool = lightPool(3.2, 3.6, '#12A27A');
    pool.position.set(chair.x, 0.012, chair.z - 0.2);
    pool.userData.dynamic = true;
    group.add(pool);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.02, 64), new THREE.MeshBasicMaterial({ color: '#E2434B', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(chair.x, 0.02, chair.z - 0.3);
      ring.visible = false;
      ring.userData.dynamic = true;
      group.add(ring);
      rings.push(ring);
    }
    const light = new THREE.PointLight('#FFF1DC', 0, 6.5, 1.5);
    light.position.set(c.x, 2.5, c.z);
    group.add(light);

    const label = el('room-tag');
    const labelObject = this.stage.label(label, group, [c.x, 2.95, c.z - 0.4], {
      priority: () => {
        const v = this.rooms.get(spot.id)?.view;
        return v ? ({ pauze: 500, uitloop: 300, bezig: 200, vrij: 120, lunch: 100, dicht: 50 } as const)[v.status] : 0;
      },
    });
    const alert = el('pause-alert interactive');
    const alertObject = this.stage.label(alert, group, [chair.x + 0.4, 2.2, chair.z + 0.6], { priority: () => 1000, pinned: () => !!this.rooms.get(spot.id)?.view?.pause });
    alertObject.visible = false;
    alert.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target) return;
      this.handlers.pauseOk(spot.id, this.roomDoctor(spot.id));
    });
    this.labels.push(labelObject, alertObject);
    this.rooms.set(spot.id, { spot, unit, pool, beacon, rings, label, labelObject, alert, alertObject, light, view: null });
  }

  /** Hoogland's third back room: instruments and a small autoclave. */
  private buildStore(x: number, z: number, w: number) {
    const m = this.mats;
    const p = this.plan;
    const corridorZ0 = p.backZ + p.roomDepth;
    wall(this.root, m.wall, x - w / 2, corridorZ0, x + 0.4, corridorZ0, 0.95, 0.12);
    glass(this.root, m, x - w / 2 + 0.06, corridorZ0, x + 0.4, corridorZ0, 0.95, 2.45);
    const counter = box(w - 0.6, 0.9, 0.6, m.white, 0.03);
    counter.position.set(x, 0.45, p.backZ + 0.45);
    const top = box(w - 0.58, 0.04, 0.62, m.oak, 0.015);
    top.position.set(x, 0.92, p.backZ + 0.45);
    const clave = box(0.55, 0.42, 0.5, m.plastic, 0.05);
    clave.position.set(x - 0.6, 1.15, p.backZ + 0.45);
    this.root.add(counter, top, clave, at(blob(w, 1.4, 0.2), x, 0.006, p.backZ + 0.5));
    this.labels.push(this.stage.label(el('zone-tag small', trHtml('<b>Instrumenten</b>')), this.root, [x, 1.9, z], { priority: () => 10, far: 30 }));
  }

  /** Eindhoven's X-ray (OPG) room and the sterilisation room, on the left of the lobby. */
  private buildService(lobbyZ0: number) {
    const m = this.mats;
    const p = this.plan;
    const xw = -8.8;
    const mid = 2.6;
    // Walls: toward the corridor, toward the lobby (with the OPG door), and between the two rooms.
    wall(this.root, m.wall, p.minX, lobbyZ0, -11.0, lobbyZ0, 0.95, 0.12);
    wall(this.root, m.wall, -9.8, lobbyZ0, xw, lobbyZ0, 0.95, 0.12);
    glass(this.root, m, p.minX + 0.1, lobbyZ0, -11.0, lobbyZ0, 0.95, 2.3);
    glass(this.root, m, -9.8, lobbyZ0, xw, lobbyZ0, 0.95, 2.3);
    wall(this.root, m.wall, xw, lobbyZ0, xw, 2.9, 0.95, 0.12);
    wall(this.root, m.wall, xw, 3.9, xw, p.frontZ, 0.95, 0.12);
    glass(this.root, m, xw, lobbyZ0, xw, 2.9, 0.95, 2.3);
    glass(this.root, m, xw, 3.9, xw, p.frontZ - 0.1, 0.95, 2.3);
    wall(this.root, m.wall, p.minX, mid, xw, mid, 2.3, 0.16);
    for (const [x, z] of [
      [-11.0, lobbyZ0],
      [-9.8, lobbyZ0],
      [xw, 2.9],
      [xw, 3.9],
    ]) {
      const post = box(0.1, 2.3, 0.1, m.wall, 0.02);
      post.position.set(x, 1.15, z);
      this.root.add(post);
    }
    // Sterilisation: the counter, two autoclaves, the washer-disinfector and trays ready to go.
    const counter = box(0.62, 0.9, 3.0, m.white, 0.03);
    counter.position.set(-11.55, 0.45, 0.75);
    const top = box(0.66, 0.04, 3.02, m.chrome, 0.015);
    top.position.set(-11.55, 0.92, 0.75);
    this.root.add(counter, top, at(blob(1.2, 3.6, 0.22), -11.5, 0.006, 0.75));
    const ringMat = live(new THREE.MeshBasicMaterial({ color: '#2DB4E8', toneMapped: false }));
    this.autoclave = ringMat;
    for (const z of [-0.2, 0.55]) {
      const clave = box(0.55, 0.46, 0.6, m.plastic, 0.05);
      clave.position.set(-11.55, 1.17, z);
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32), m.chrome);
      door.rotation.z = Math.PI / 2;
      door.position.set(-11.26, 1.17, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.012, 8, 40), ringMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(-11.255, 1.17, z);
      this.root.add(clave, door, ring);
    }
    const washer = box(0.6, 0.85, 0.6, m.plastic, 0.04);
    washer.position.set(-11.55, 0.43, 1.85);
    this.root.add(washer);
    for (let i = 0; i < 4; i++) {
      const tray = box(0.34, 0.035, 0.24, mat(i % 2 ? '#BFE6F6' : '#E7EEF7', 0.5), 0.01);
      tray.position.set(-11.6 + (i % 2) * 0.02, 0.96 + Math.floor(i / 2) * 0.04, 1.3 + (i % 2) * 0.28);
      this.root.add(tray);
    }
    // The OPG: a column, the rotating arm with the sensor and the tube, a chin rest and a lead apron.
    const col = box(0.32, 2.1, 0.32, m.white, 0.06);
    col.position.set(-11.4, 1.05, 4.6);
    const head = box(0.28, 0.18, 0.5, m.white, 0.05);
    head.position.set(-11.12, 1.62, 4.6);
    const cArm = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 12, 40, Math.PI), m.plastic);
    cArm.position.set(-10.92, 1.68, 4.6);
    cArm.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    const chin = box(0.12, 0.03, 0.18, m.sky, 0.01);
    chin.position.set(-10.9, 1.35, 4.6);
    const apron = box(0.42, 0.62, 0.05, mat('#4F6BED', 0.7), 0.04);
    apron.position.set(-9.4, 1.45, 6.3);
    this.root.add(col, head, cArm, chin, apron, at(blob(1.4, 1.4, 0.24), -11.2, 0.006, 4.6));
    this.labels.push(
      this.stage.label(el('zone-tag small', trHtml('<b>Röntgen (OPG)</b>')), this.root, [-10.4, 2.5, 4.6], { priority: () => 20, far: 34 }),
      this.stage.label(el('zone-tag small steri', trHtml('<b>Sterilisatie</b>')), this.root, [-10.4, 2.5, 0.7], { priority: () => 20, far: 34 }),
    );
  }

  private buildLobby(lobbyZ0: number) {
    const m = this.mats;
    const p = this.plan;
    // The logo wall behind the desk, between the lobby and the corridor.
    const [w0, w1] = p.logoWall;
    wall(this.root, m.wall, w0, lobbyZ0, w1, lobbyZ0, 2.7, 0.2);
    const logoTex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}brand/logo-light.png`);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    logoTex.anisotropy = 8;
    const logoW = Math.min(3.8, (w1 - w0) - 0.8);
    const logoMat = live(new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.6, emissive: '#FFFFFF', emissiveMap: logoTex, emissiveIntensity: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.glowing.push(logoMat);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, (logoW * 196) / 900), logoMat);
    logo.position.set((w0 + w1) / 2, 1.85, lobbyZ0 + 0.13);
    this.root.add(logo);
    // A soft line of light under the logo.
    const strip = box(logoW * 0.9, 0.02, 0.02, m.sky, 0.008, false);
    strip.position.set((w0 + w1) / 2, 1.28, lobbyZ0 + 0.12);
    this.root.add(strip);

    // The reception desk: white, an oak top, a sky line along the base, two screens.
    const d = p.desk;
    const desk = box(d.w, 1.05, 0.7, m.white, 0.08);
    desk.position.set(d.x, 0.525, d.z);
    const top = box(d.w + 0.1, 0.05, 0.78, m.oak, 0.02);
    top.position.set(d.x, 1.07, d.z);
    const line = box(d.w - 0.2, 0.025, 0.02, m.sky, 0.008, false);
    line.position.set(d.x, 0.12, d.z + 0.36);
    const work = box(d.w - 0.3, 0.04, 0.5, m.oak, 0.02);
    work.position.set(d.x, 0.76, d.z - 0.5);
    this.root.add(desk, top, line, work, at(blob(d.w + 1, 1.8, 0.28), d.x, 0.006, d.z - 0.2));
    for (const dx of [-0.9, 0.3]) {
      const screen = box(0.5, 0.32, 0.03, m.dark, 0.012);
      screen.position.set(d.x + dx, 1.0, d.z - 0.6);
      const stand = cyl(0.02, 0.2, m.alu, 0.02, 8, false);
      stand.position.set(d.x + dx, 0.86, d.z - 0.62);
      this.root.add(screen, stand);
    }
    const tooth = toothEmblem(0.32, 0.05);
    tooth.position.set(d.x + 1.25, 1.1, d.z + 0.1);
    tooth.rotation.y = -0.2;
    this.root.add(tooth);
    this.labels.push(this.stage.label(el('zone-tag small', trHtml(`<b>Balie</b><span>${p.loc === 'eindhoven' ? 'Nadia' : 'Fleur'}</span>`)), this.root, [d.x, 2.5, d.z - 0.4], { priority: () => 30, far: 30 }));

    // The waiting room: lounge chairs facing each other, two round tables, plants, a water cooler.
    p.seats.forEach((s, i) => {
      if (s.kid) return;
      const chair = lounge(m, i % 5 === 2 ? m.fabric2 : m.fabric);
      chair.position.set(s.x, 0, s.z);
      chair.rotation.y = s.yaw;
      this.root.add(chair);
    });
    const tableXs = p.kids ? [-1.9, 1.9] : [-2.4];
    for (const x of tableXs) {
      const t = cyl(0.42, 0.04, m.oak, 0.42, 36);
      t.position.set(x, 0.45, (p.seats[0].z + p.seats[p.seats.length - (p.kids ? 5 : 1)].z) / 2);
      const leg = cyl(0.05, 0.44, m.white, 0.05, 12);
      leg.position.set(x, 0.22, t.position.z);
      const vase = cyl(0.06, 0.18, mat('#BFE6F6', 0.2), 0.045, 16);
      vase.position.set(x + 0.12, 0.56, t.position.z - 0.06);
      const mag = box(0.22, 0.012, 0.3, mat('#234282', 0.6), 0.004, false);
      mag.position.set(x - 0.12, 0.475, t.position.z + 0.05);
      mag.rotation.y = 0.3;
      this.root.add(t, leg, vase, mag, at(blob(1.2, 1.2, 0.2), x, 0.006, t.position.z));
    }
    const plants: [number, number, number][] = p.loc === 'eindhoven'
      ? [
          [-4.1, 1.2, 1.1],
          [4.4, 5.6, 1.15],
          [-4.1, 5.8, 0.9],
          [4.9, 0.6, 1],
          [11.3, 5.8, 1.1],
        ]
      : [
          [-5.4, 5.3, 1],
          [0.2, 5.2, 0.9],
        ];
    plants.forEach(([x, z, s], i) => this.root.add(at(plant(m, s, i + 3), x, 0, z)));
    const cooler = new THREE.Group();
    const body = box(0.32, 1.0, 0.32, m.white, 0.05);
    body.position.y = 0.5;
    const bottle = cyl(0.13, 0.36, new THREE.MeshPhysicalMaterial({ color: '#9FD8F2', transparent: true, opacity: 0.55, roughness: 0.05 }), 0.13, 20);
    bottle.position.y = 1.2;
    cooler.add(body, bottle, blob(0.6, 0.6, 0.2));
    cooler.position.set(p.loc === 'eindhoven' ? 4.6 : -0.4, 0, p.loc === 'eindhoven' ? 2.2 : 1.6);
    this.root.add(cooler);

    // The kids' corner: a round rug, a little table with stools, blocks, books and a big soft tooth.
    if (p.kids) {
      const rug = new THREE.Mesh(
        new THREE.CircleGeometry(1.55, 64),
        new THREE.MeshStandardMaterial({
          roughness: 1,
          map: canvasTexture(512, 512, (ctx) => {
            ctx.fillStyle = '#FFF4DC';
            ctx.fillRect(0, 0, 512, 512);
            ['#FFE0A3', '#FFF4DC', '#D7F0E8', '#FFF4DC', '#FFD8CF'].forEach((c, i) => {
              ctx.fillStyle = c;
              ctx.beginPath();
              ctx.arc(256, 256, 250 - i * 46, 0, Math.PI * 2);
              ctx.fill();
            });
          }),
        }),
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(-6.6, 0.008, 4.4);
      rug.receiveShadow = true;
      const table = cyl(0.42, 0.04, mat('#FFFFFF', 0.4), 0.42, 32);
      table.position.set(-6.6, 0.44, 4.4);
      const tleg = cyl(0.05, 0.42, mat('#FFB12E', 0.5), 0.05, 12);
      tleg.position.set(-6.6, 0.21, 4.4);
      this.root.add(rug, table, tleg);
      const colors = ['#FFB12E', '#17BFA3', '#8E7CF8', '#FF6F61'];
      p.seats.filter((s) => s.kid).forEach((s, i) => {
        const stool = cyl(0.15, 0.28, mat(colors[i % 4], 0.6), 0.15, 20);
        stool.position.set(s.x, 0.14, s.z);
        this.root.add(stool);
      });
      for (let i = 0; i < 6; i++) {
        const b = box(0.16, 0.16, 0.16, mat(colors[i % 4], 0.55), 0.03);
        b.position.set(-5.5 + (i % 3) * 0.18, 0.08 + Math.floor(i / 3) * 0.16, 5.4 + (i % 2) * 0.05);
        b.rotation.y = i * 0.4;
        this.root.add(b);
      }
      const shelf = box(1.2, 0.9, 0.32, mats0(m), 0.04);
      shelf.position.set(-7.7, 0.45, 6.15);
      this.root.add(shelf);
      for (let i = 0; i < 7; i++) {
        const book = box(0.05, 0.24 + (i % 3) * 0.03, 0.2, mat(colors[(i + 1) % 4], 0.7), 0.01, false);
        book.position.set(-8.15 + i * 0.07, 0.62, 6.15);
        this.root.add(book);
      }
      const plush = toothEmblem(0.62, 0.22);
      plush.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = mat(o === plush.children[2] ? '#2DB4E8' : '#FFFFFF', 0.95);
      });
      plush.position.set(-5.3, 0, 3.4);
      plush.rotation.y = 0.5;
      this.root.add(plush, at(blob(0.9, 0.6, 0.22), -5.3, 0.006, 3.4));
      this.labels.push(this.stage.label(el('zone-tag small kids', trHtml('<b>Kinderhoek</b>')), this.root, [-6.6, 1.5, 4.4], { priority: () => 15, far: 36 }));
    }
  }

  private addStaff(id: 'nadia' | 'ruben' | 'fleur', x: number, z: number, yaw: number, pose: 'stand' | 'work' | 'crossed') {
    const look = { nadia: { top: '#1B2F66', bottom: '#1B2F66', skin: '#D3A080', hair: '#2A1C16' }, ruben: { top: '#9AA9C9', bottom: '#7F8FB2', skin: '#EBC3A4', hair: '#6B4A2E' }, fleur: { top: '#B9E3D6', bottom: '#A6D6C6', skin: '#F2CDB2', hair: '#8A5A33' } }[id];
    const figure = new Figure({ height: id === 'ruben' ? 1.8 : 1.68, ...look, hairStyle: id === 'ruben' ? 'short' : 'bun', sleeves: 'short', matte: true, badge: '#2DB4E8' });
    figure.root.position.set(x, 0, z);
    figure.root.rotation.y = yaw;
    figure.pose = pose;
    figure.lean = pose === 'work' ? 0.12 : 0;
    this.root.add(figure.root);
    this.staff.push({ figure, x, z, yaw, pose });
  }

  // --------------------------------------------------------------------------------------------- live updates

  update(model: ClinicModel) {
    this.model = model;
    this.modelAt = performance.now();
    const fresh = new Set<string>();

    for (const view of model.rooms) {
      const parts = this.rooms.get(view.room.id);
      if (!parts) continue;
      parts.view = view;
      const color = ROOM_STATUS[view.status].color;
      (parts.pool.material as THREE.MeshBasicMaterial).color.set(color);
      parts.beacon.color.set(color);
      parts.label.dataset.status = view.status;
      parts.label.innerHTML = this.roomLabel(view);
      parts.alertObject.visible = !!view.pause;
      if (view.pause) {
        const who = memberById(view.pause.who).first;
        parts.alert.innerHTML = trHtml(`<div class="pa-pulse"></div><div class="pa-body"><b>${who} vraagt om een pauze</b><span>${tr(view.room.name)} · ${view.doctor.name}</span></div><button type="button">Gezien</button>`);
      }
      parts.rings.forEach((r) => (r.visible = !!view.pause));
    }

    for (const dn of model.doctors) {
      const parts = this.doctors.get(dn.doctor.id);
      if (!parts) continue;
      parts.plumbob.setColor(dn.color);
      const m = model.minute;
      const status = dn.current
        ? `In behandeling · nog ${Math.max(1, Math.ceil(dn.current.end - m))} min`
        : dn.next
          ? `Vrij · volgende om ${hhmm(dn.next.begin)}`
          : 'Vrij voor de rest van de dag';
      parts.tag.innerHTML = trHtml(`<i style="background:${dn.color}"></i><b>${dn.doctor.name}</b><span>${status}</span>`);
      parts.tag.classList.toggle('selected', model.selected === dn.doctor.id);
    }

    // Who is in the building: from the moment they walk in until they are out of the door.
    for (const v of model.day.visits) {
      if (v.noShow) continue;
      if (model.minute >= v.arrive - 0.05 && model.minute <= this.outAt(v) + 0.05) fresh.add(v.id);
    }
    for (const [id, parts] of this.patients) {
      if (fresh.has(id)) continue;
      parts.figure.root.removeFromParent();
      if (parts.tag) this.stage.forgetLabel(parts.tag);
      this.patients.delete(id);
    }
    for (const id of fresh) {
      if (this.patients.has(id)) continue;
      const v = model.day.visits.find((x) => x.id === id)!;
      const accent = v.who ? memberById(v.who).color : undefined;
      const figure = new Figure(patientSpec(hashSeed(v.id), v.patient.age, accent));
      this.root.add(figure.root);
      let marker: THREE.Mesh | null = null;
      let tag: CSS2DObject | null = null;
      if (v.mine) {
        // From the app: a soft sky ring under them and their name, so the link between the screens is seen.
        marker = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: accent ?? '#2DB4E8', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = 0.015;
        figure.root.add(marker);
        tag = this.stage.label(el('person-tag app', trHtml(`<i></i><b>${shortName(v.patient.name)}</b><span>via de app</span>`)), figure.root, [0, figure.height + 0.3, 0], { priority: () => 700 });
      }
      this.patients.set(id, { figure, seat: -1, marker, tag });
    }

    // Seats: the waiting keep theirs; newcomers take the first free one (children the kids' corner first).
    const taken = new Set([...this.patients.values()].map((p) => p.seat).filter((s) => s >= 0));
    for (const [id, parts] of this.patients) {
      if (parts.seat >= 0) continue;
      const v = model.day.visits.find((x) => x.id === id)!;
      const kid = v.patient.age < 13;
      const order = this.plan.seats.map((s, i) => ({ s, i })).sort((a, b) => Number(!!b.s.kid === kid) - Number(!!a.s.kid === kid) || seatRank(a.i, v.id) - seatRank(b.i, v.id));
      const free = order.find(({ s, i }) => !taken.has(i) && (kid || !s.kid));
      parts.seat = free ? free.i : hashSeed(v.id) % this.plan.seats.length;
      taken.add(parts.seat);
    }

    const waiting = model.day.visits.filter((v) => !v.noShow && momentOf(v, model.minute).state === 'wachtkamer');
    this.waitTag.innerHTML = trHtml(`<b>Wachtkamer</b><span>${waiting.length === 0 ? 'niemand wacht' : waiting.length === 1 ? '1 wachtend' : `${waiting.length} wachtend`}</span>`);
  }

  private roomLabel(view: RoomView): string {
    const head = `<div class="rt-head"><i></i><b>${tr(view.room.name)}</b><span>${view.doctor.name}</span></div>`;
    if (view.current && view.moment) {
      const mo = view.moment;
      const v = view.current;
      const late = view.late >= 5 ? `<em>+${view.late} min</em>` : '';
      return trHtml(
        `${head}<div class="rt-body"><div class="rt-who"><b>${shortName(v.patient.name)}</b>${v.mine ? '<u>app</u>' : ''}${late}</div><div class="rt-what">${treatmentById(v.treatment).name}</div><div class="rt-step">Stap ${mo.step + 1}/${mo.steps.length} · ${mo.stepLabel}</div><div class="rt-left"><i style="--p:${Math.round(mo.progress * 100)}%"></i><span>nog ${mo.left} min</span></div></div>`,
      );
    }
    const status = ROOM_STATUS[view.status].label;
    const next = view.next && view.status !== 'dicht' ? `<div class="rt-body"><div class="rt-next">${status} · volgende ${hhmm(view.next.begin)}</div></div>` : `<div class="rt-body"><div class="rt-next">${status}</div></div>`;
    return trHtml(`${head}${next}`);
  }

  setTheme(mode: ThemeMode) {
    this.nightTarget = mode === 'night' ? 1 : 0;
    // The first look is there at once; later switches fade like the light changing.
    if (!this.themed) {
      this.themed = true;
      this.night = this.nightTarget;
      this.lightApplied = false;
    }
  }

  private themed = false;

  focusRoom(id: RoomId) {
    const spot = this.plan.rooms.find((r) => r.id === id);
    if (!spot) return;
    const c = this.roomCentre(spot);
    const v = ROOM_CAMERA(c.x, c.z);
    this.stage.flyTo(v.camera, v.target, 1400);
  }

  focusDoctor(id: DoctorId) {
    const spot = this.plan.rooms.find((r) => this.roomDoctor(r.id) === id);
    if (spot) this.focusRoom(spot.id);
  }

  overview() {
    const v = overviewView(this.plan.loc);
    this.stage.flyTo(v.camera, v.target, 1400);
  }

  private applyLight() {
    const n = this.night;
    const top = new THREE.Color('#E6EFF9').lerp(new THREE.Color('#040A1A'), n);
    const horizon = new THREE.Color('#F2F6FB').lerp(new THREE.Color('#0A1531'), n);
    const bottom = new THREE.Color('#F7F9FC').lerp(new THREE.Color('#0D1938'), n);
    this.backdrop.paint(top, bottom, horizon);
    this.lights.hemi.intensity = THREE.MathUtils.lerp(1.55, 0.42, n);
    this.lights.hemi.color.set('#F5F9FF').lerp(new THREE.Color('#5F76B8'), n);
    this.lights.hemi.groundColor.set('#D5DCE7').lerp(new THREE.Color('#141C33'), n);
    this.lights.sun.intensity = THREE.MathUtils.lerp(2.3, 0.35, n);
    this.lights.sun.color.set('#FFF5E8').lerp(new THREE.Color('#8FA6E8'), n);
    this.lights.fill.intensity = THREE.MathUtils.lerp(0.55, 0.12, n);
    this.stage.scene.environmentIntensity = THREE.MathUtils.lerp(0.48, 0.16, n);
    for (const l of this.lights.lobby) l.intensity = THREE.MathUtils.lerp(0, 6, n);
    this.windows.color.set('#BFE3F7').lerp(new THREE.Color('#1B2C55'), n);
    this.windows.opacity = THREE.MathUtils.lerp(0.32, 0.5, n);
    for (const g of this.glowing) g.emissiveIntensity = THREE.MathUtils.lerp(0.05, 0.6, n);
    this.mats.sky.emissiveIntensity = THREE.MathUtils.lerp(0.4, 2.2, n);
    this.stage.renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.12, n);
  }

  /** When a patient is out of the door again. */
  private outAt(v: PanelVisit) {
    const inEnd = v.arrive + WALK_IN;
    const call = Math.max(v.begin - WALK_CALL, inEnd);
    return Math.max(v.end, call + WALK_CALL + 0.1) + WALK_OUT;
  }

  /** Where a patient is at minute `m`: walking in, waiting, walking to the room, in the chair, or walking out. */
  private patientPose(v: PanelVisit, seat: number, m: number): { x: number; z: number; y: number; yaw: number; pose: 'walk' | 'sit' | 'lie' | 'stand'; speed: number } | null {
    const p = this.plan;
    const s = p.seats[seat] ?? p.seats[0];
    const spot = p.rooms.find((r) => r.id === v.room) ?? p.rooms[0];
    const chair = this.chairSpot(spot);
    const corridorZ = p.backZ + p.roomDepth + p.corridor / 2;
    const lobbyZ0 = p.backZ + p.roomDepth + p.corridor;
    const gateX = THREE.MathUtils.clamp(s.x, p.gate[0], p.gate[1]);
    const doorZ = p.backZ + p.roomDepth;
    const seatPt: [number, number] = [s.x, s.z];
    const approach: [number, number] = [s.x, s.z + (s.kid ? 0 : Math.cos(s.yaw) * 0.75)];
    const inPath: [number, number][] = [
      [p.entrance, p.frontZ + 1.4],
      [p.entrance, p.frontZ - 0.6],
      [p.desk.x - 0.6, p.desk.z + 0.95],
      approach,
      seatPt,
    ];
    const callPath: [number, number][] = [seatPt, approach, [gateX, lobbyZ0 + 0.6], [THREE.MathUtils.clamp(spot.door, p.gate[0], p.gate[1]), corridorZ], [spot.door, corridorZ], [spot.door, doorZ - 0.5], [chair.x + 0.55, chair.z + 0.15]];
    const outPath: [number, number][] = [[chair.x + 0.55, chair.z + 0.15], [spot.door, doorZ - 0.5], [spot.door, corridorZ], [THREE.MathUtils.clamp(spot.door, p.gate[0], p.gate[1]), corridorZ], [THREE.MathUtils.clamp(spot.door, p.gate[0], p.gate[1]), lobbyZ0 + 0.7], [p.desk.x - 1.2, p.desk.z + 1.3], [p.entrance, p.frontZ - 0.6], [p.entrance, p.frontZ + 1.6]];

    const inEnd = v.arrive + WALK_IN;
    const call = Math.max(v.begin - WALK_CALL, inEnd);
    const inChair = call + WALK_CALL;
    const out = Math.max(v.end, inChair + 0.1);
    const gone = out + WALK_OUT;
    const speed = this.model?.speed ?? 1;
    if (m < v.arrive || m > gone) return null;
    if (m < inEnd) return walkAlong(inPath, (m - v.arrive) / WALK_IN, WALK_IN, speed);
    if (m < call) return { x: s.x, z: s.z, y: 0, yaw: s.yaw, pose: 'sit', speed: 0 };
    if (m < inChair) return walkAlong(callPath, (m - call) / WALK_CALL, WALK_CALL, speed);
    if (m < out) return { x: chair.x, z: chair.z - 0.1, y: 0.66, yaw: 0, pose: 'lie', speed: 0 };
    return walkAlong(outPath, (m - out) / WALK_OUT, WALK_OUT, speed);
  }

  /** Where a dentist stands at minute `m`: at the head end of the chair while treating, otherwise at the door. */
  private doctorPlace(id: DoctorId, m: number): { x: number; z: number; working: boolean; walking: boolean } {
    const spot = this.plan.rooms.find((r) => this.roomDoctor(r.id) === id)!;
    const door = this.doorSpot(spot);
    const chair = this.chairSpot(spot);
    const work = { x: chair.x + 0.02, z: chair.z - 1.72 };
    const visits = this.model?.day.visits.filter((v) => v.doctor === id && !v.noShow && v.room === spot.id) ?? [];
    const v = visits.find((x) => m >= x.begin - 0.35 && m < x.end + 0.35);
    if (!v) return { ...door, working: false, walking: false };
    const k = THREE.MathUtils.clamp(m < v.begin ? (m - (v.begin - 0.35)) / 0.35 : m >= v.end ? 1 - (m - v.end) / 0.35 : 1, 0, 1);
    // From the door along the cabinet side, behind the assistant, to the head end of the chair.
    const route: [number, number][] = [
      [door.x, door.z],
      [door.x + 0.4, chair.z + 0.2],
      [door.x + 0.4, chair.z - 1.7],
      [work.x, work.z],
    ];
    const [x, z] = pointAlong(route, k);
    return { x, z, working: k >= 1, walking: k > 0 && k < 1 };
  }

  private frame(time: number, delta: number) {
    const before = this.night;
    this.night = damp(this.night, this.nightTarget, 2.4, delta);
    if (Math.abs(before - this.night) > 1e-4 || !this.lightApplied) {
      this.applyLight();
      this.lightApplied = true;
    }
    const model = this.model;
    if (!model) return;
    const m = model.minute + ((performance.now() - this.modelAt) / 60000) * model.speed;
    const camera = this.stage.camera.position;

    // Rooms: the chair reclines for a patient, the lamp is on, the status light breathes, a pause pulses.
    for (const parts of this.rooms.values()) {
      const view = parts.view;
      const busy = !!view?.current && m >= (view.current.begin ?? 0);
      parts.unit.recline = damp(parts.unit.recline, busy ? 1 : 0, 2.2, delta);
      const r = parts.unit.recline;
      parts.unit.back.rotation.x = -THREE.MathUtils.lerp(0.22, 1.18, r);
      parts.unit.legs.rotation.x = THREE.MathUtils.lerp(0.62, -0.06, r);
      parts.unit.lamp.color.set(busy ? '#FFF8E6' : '#C9D2DE');
      (parts.unit.lampGlow.material as THREE.SpriteMaterial).opacity = damp((parts.unit.lampGlow.material as THREE.SpriteMaterial).opacity, busy ? 0.75 : 0, 3, delta);
      parts.unit.screen.color.set(busy ? '#FFFFFF' : '#6F7C93');
      const pool = parts.pool.material as THREE.MeshBasicMaterial;
      const pulse = view?.status === 'pauze' ? 0.5 + Math.sin(time * 4) * 0.25 : 0.32 + Math.sin(time * 1.2) * 0.04;
      pool.opacity = (view?.status === 'dicht' ? 0.1 : pulse) * (this.night ? 1 + this.night * 0.4 : 1);
      parts.light.intensity = this.night * (busy ? 7 : 3.5);
      parts.rings.forEach((ring, i) => {
        if (!ring.visible) return;
        const t = (time * 0.6 + i * 0.5) % 1;
        ring.scale.setScalar(0.6 + t * 1.4);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
      });
    }
    if (this.autoclave) this.autoclave.color.setHSL(0.55, 0.8, 0.5 + Math.sin(time * 2) * 0.12);

    // Dentists: in place, turning to the camera when idle, waving when hovered.
    for (const parts of this.doctors.values()) {
      const place = this.doctorPlace(parts.id, m);
      const f = parts.figure;
      const dx = place.x - parts.x;
      const dz = place.z - parts.z;
      const step = Math.hypot(dx, dz);
      parts.x = damp(parts.x, place.x, 5, delta);
      parts.z = damp(parts.z, place.z, 5, delta);
      f.speed = step > 0.04 ? Math.min(1.4, step * 4) : 0;
      f.root.position.set(parts.x, 0, parts.z);
      const hovered = this.hovered === parts.id;
      const selected = model.selected === parts.id;
      let yaw: number;
      if (f.speed > 0) yaw = Math.atan2(dx, dz);
      else if (place.working) yaw = 0;
      else yaw = Math.atan2(camera.x - parts.x, camera.z - parts.z);
      parts.yaw = dampAngle(parts.yaw, yaw, 4, delta);
      f.root.rotation.y = parts.yaw;
      f.pose = f.speed > 0 ? 'walk' : hovered && !place.working ? 'wave' : place.working ? 'work' : 'crossed';
      f.lean = place.working ? 0.32 : 0;
      f.look = camera;
      f.lookRange = place.working ? 0.9 : 1.15;
      f.frame(time, delta);
      parts.hover = damp(parts.hover, hovered || selected ? 1 : 0, 8, delta);
      for (const material of f.materials) {
        if (material.emissiveMap) continue;
        material.emissive.set('#2DB4E8');
        material.emissiveIntensity = parts.hover * 0.16;
      }
      const ringMat = parts.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = parts.hover * (0.7 + Math.sin(time * 3) * 0.2);
      parts.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.04 * parts.hover);
      parts.plumbob.frame(time, delta, f.headHeight + 0.2 + (place.working ? -0.05 : 0));
      parts.tag.classList.toggle('on', hovered || selected);
    }

    // Patients along their way through the clinic.
    for (const [id, parts] of this.patients) {
      const v = model.day.visits.find((x) => x.id === id);
      if (!v) continue;
      const pose = this.patientPose(v, parts.seat, m);
      const f = parts.figure;
      if (!pose) {
        f.root.visible = false;
        continue;
      }
      f.root.visible = true;
      const glide = pose.pose === 'walk' ? 1 : Math.min(1, delta * 6);
      f.root.position.x += (pose.x - f.root.position.x) * glide;
      f.root.position.z += (pose.z - f.root.position.z) * glide;
      f.root.position.y += (pose.y - f.root.position.y) * Math.min(1, delta * 6);
      f.root.rotation.y = dampAngle(f.root.rotation.y, pose.yaw, pose.pose === 'walk' ? 10 : 6, delta);
      f.pose = pose.pose;
      f.speed = pose.speed;
      f.recline = 1.12;
      f.frame(time, delta);
      if (parts.marker) (parts.marker.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(time * 3) * 0.3;
    }

    // Staff: the assistant of each busy room sits at the chair; Nadia and Ruben at their work.
    for (const s of this.staff) {
      s.figure.look = camera;
      s.figure.frame(time, delta);
    }
    this.placeAssistants(m, time, delta);

    // Up close the labels show their details; from afar only the essentials.
    const distance = this.stage.distance;
    this.stage.host.classList.toggle('near', distance < 17);
    this.stage.host.classList.toggle('far', distance > 30);
  }

  /** One assistant per busy room (each covers two rooms in the demo; the earlier patient gets them). */
  private placeAssistants(m: number, time: number, delta: number) {
    if (this.plan.loc !== 'eindhoven' || !this.model) return;
    const wanted = new Map<string, RoomId>();
    const busyRooms = this.model.rooms.filter((r) => r.current && m >= r.current.begin).sort((a, b) => (a.current!.begin ?? 0) - (b.current!.begin ?? 0));
    for (const r of busyRooms) if (!wanted.has(r.room.assistant)) wanted.set(r.room.assistant, r.room.id);
    const look = { sara: { top: '#7FC3E8', bottom: '#6FB3DA', skin: '#E2B394', hair: '#5A3A24' }, lotte: { top: '#7FC3E8', bottom: '#6FB3DA', skin: '#F0C7AA', hair: '#C9A26A' }, imane: { top: '#7FC3E8', bottom: '#6FB3DA', skin: '#C99472', hair: '#1E1512' } } as const;
    for (const id of ['sara', 'lotte', 'imane'] as const) {
      const room = wanted.get(id);
      let figure = this.assistants.get(id);
      if (!figure) {
        figure = new Figure({ height: 1.66, ...look[id], hairStyle: id === 'imane' ? 'long' : 'bun', sleeves: 'short', matte: true, badge: '#2DB4E8' });
        this.assistants.set(id, figure);
        this.root.add(figure.root);
      }
      figure.root.visible = !!room;
      if (!room) continue;
      const spot = this.plan.rooms.find((r) => r.id === room)!;
      const chair = this.chairSpot(spot);
      figure.root.position.set(chair.x + 0.86, 0.1, chair.z - 0.85);
      figure.root.rotation.y = -Math.PI / 2 - 0.35;
      figure.pose = 'sit';
      figure.look = null;
      figure.frame(time, delta);
    }
  }

  dispose() {
    this.unsubscribe();
    for (const l of this.labels) this.stage.forgetLabel(l);
    for (const p of this.patients.values()) if (p.tag) this.stage.forgetLabel(p.tag);
    this.root.removeFromParent();
    resetKit();
  }
}

// ------------------------------------------------------------------------------------------------------ helpers

const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483646 + 1;
}

/** Spreads newcomers over the seats instead of filling them left to right. */
const seatRank = (i: number, id: string) => ((i * 7 + hashSeed(id)) % 23);

/** A shelf in the kids' corner: the porcelain white. */
const mats0 = (m: Mats) => m.white;

/** The point at fraction `t` of the way along a path. */
function pointAlong(path: [number, number][], t: number): [number, number] {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let d = t * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, d / lengths[i]) : 1;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    }
    d -= lengths[i];
  }
  return path[path.length - 1];
}

/** A point along a walk at fraction `f` (eased at both ends), facing the way it goes, with the walking speed. */
function walkAlong(path: [number, number][], f: number, minutes: number, speed: number) {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const eased = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
  let d = eased * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? Math.min(1, d / lengths[i]) : 1;
      const [ax, az] = path[i];
      const [bx, bz] = path[i + 1];
      // Metres per real second: the path over the walk's clinic minutes, sped up with the clock.
      const mps = (total / (minutes * 60)) * speed;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, y: 0, yaw: Math.atan2(bx - ax, bz - az), pose: 'walk' as const, speed: Math.min(2.5, mps) };
    }
    d -= lengths[i];
  }
  const [x, z] = path[path.length - 1];
  return { x, z, y: 0, yaw: 0, pose: 'walk' as const, speed: 0 };
}
