import * as THREE from 'three';

/**
 * A procedural tooth library: every permanent tooth by its FDI number, built from rings like a lathe but with
 * superelliptic sections, cusps on a height field and one, two or three tapered roots. Sizes are textbook averages
 * (Wheeler) in millimetres; 1 unit is 1 mm. Each tooth is made in one "canonical" frame and placed by mirroring:
 *
 *   +x mesial (towards the midline), +y occlusal (the crown points up), +z buccal / labial (towards the cheek or lip).
 *
 * The cemento-enamel junction (CEJ) sits at y = 0, the crown above, the roots below. A tooth on the patient's left is
 * the mirror image of the one on the right (scale.x = -1), an upper tooth is a lower-style tooth flipped (scale.y = -1);
 * `archLayout()` and `placeTooth()` do that, so the anatomy is written once.
 *
 * Besides teeth: arch layouts (upper and lower U-shaped arches), the gum along an arch, a threaded implant fixture with
 * its healing cap, abutment and screw, a crown cap, filling patches (a shader mask on the crown), a gum-and-bone block
 * in section with a painted cut face, brackets, and the section (cut-away) outlines of enamel, dentin and pulp.
 */

// ------------------------------------------------------------------------------------------------------------ types

export type Jaw = 'upper' | 'lower';
export type Family = 'incisor' | 'canine' | 'premolar' | 'molar';

export type Dims = {
  /** CEJ to cusp tip / incisal edge. */
  crownH: number;
  /** CEJ to apex (the longest root). */
  rootH: number;
  /** Mesiodistal and buccolingual widths: at the height of contour and at the CEJ. */
  md: number;
  mdC: number;
  bl: number;
  blC: number;
};

export type ToothInfo = {
  fdi: number;
  quadrant: number;
  /** 1 central incisor … 8 third molar. */
  index: number;
  jaw: Jaw;
  /** The patient's left (quadrants 2 and 3). */
  left: boolean;
  family: Family;
  dims: Dims;
  roots: number;
};

type Relief = (u: number, v: number) => number;

/** One ring of a tooth surface: a superellipse of half-axes w × d around (ox, oz), at height y. */
type Ring = { y: number; w: number; d: number; ox: number; oz: number; f: number; c: number; n: number; lingual: number };

type Comp = { rings: Ring[]; bottom: number | null; top: number | null; H: Relief; A: number; crown: boolean };

export type Poly = [number, number][];

export type Section = {
  /** Outlines in the plane z = 0 of the tooth (x mesial, y occlusal), in mm. */
  outer: Poly[];
  enamel: Poly[];
  dentin: Poly[];
  pulp: Poly[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

export type ToothParts = {
  info: ToothInfo;
  /** Crown (material 0, enamel) and roots (material 1). */
  geometry: THREE.BufferGeometry;
  /** The crown alone, closed at the CEJ: for crown caps. */
  crown: THREE.BufferGeometry;
  /** Pulp chamber and canals. */
  pulp: THREE.BufferGeometry;
  /** The dentin body (the tooth without its enamel shell): for X-ray density. */
  dentin: THREE.BufferGeometry;
  section: Section;
  /** Highest point of the crown (mm above the CEJ). */
  top: number;
  /** Lowest point of the roots. */
  apex: number;
};

// ------------------------------------------------------------------------------------------------------------ data

const UPPER: Record<number, Dims> = {
  1: { crownH: 10.5, rootH: 13, md: 8.6, mdC: 6.6, bl: 7.0, blC: 6.2 },
  2: { crownH: 9.0, rootH: 13, md: 6.6, mdC: 5.0, bl: 6.0, blC: 5.6 },
  3: { crownH: 10.0, rootH: 17, md: 7.6, mdC: 5.6, bl: 8.0, blC: 7.4 },
  4: { crownH: 8.5, rootH: 14, md: 7.0, mdC: 5.0, bl: 9.0, blC: 8.0 },
  5: { crownH: 8.0, rootH: 14, md: 6.8, mdC: 5.0, bl: 9.0, blC: 8.0 },
  6: { crownH: 7.5, rootH: 13, md: 10.2, mdC: 8.0, bl: 11.0, blC: 10.0 },
  7: { crownH: 7.0, rootH: 12, md: 9.2, mdC: 7.2, bl: 11.0, blC: 9.8 },
  8: { crownH: 6.5, rootH: 11, md: 8.6, mdC: 6.6, bl: 10.0, blC: 9.2 },
};

const LOWER: Record<number, Dims> = {
  1: { crownH: 9.0, rootH: 12.5, md: 5.2, mdC: 3.6, bl: 6.0, blC: 5.4 },
  2: { crownH: 9.5, rootH: 14, md: 5.8, mdC: 4.0, bl: 6.4, blC: 5.8 },
  3: { crownH: 11.0, rootH: 16, md: 7.0, mdC: 5.4, bl: 7.6, blC: 7.0 },
  4: { crownH: 8.5, rootH: 14, md: 7.0, mdC: 5.0, bl: 7.6, blC: 6.6 },
  5: { crownH: 8.0, rootH: 14.5, md: 7.2, mdC: 5.0, bl: 8.2, blC: 7.0 },
  6: { crownH: 7.5, rootH: 14, md: 11.0, mdC: 9.0, bl: 10.4, blC: 9.0 },
  7: { crownH: 7.0, rootH: 13, md: 10.4, mdC: 8.2, bl: 10.0, blC: 9.0 },
  8: { crownH: 7.0, rootH: 11, md: 10.0, mdC: 7.8, bl: 9.6, blC: 8.8 },
};

/** Roots of the multi-rooted teeth: centre (rx mesial, rz buccal), half-widths, length, spread and distal curve. */
type RootSpec = { rx: number; rz: number; rw: number; rd: number; len: number; sx: number; sz: number; curve: number };

function rootSpecs(jaw: Jaw, index: number): { trunk: number; roots: RootSpec[] } | null {
  // Root tops sit flush with the narrowing trunk, so the furcation reads as one piece; apices are blunt.
  if (jaw === 'upper') {
    if (index === 4)
      return {
        trunk: 5.5,
        roots: [
          { rx: 0, rz: 1.9, rw: 1.95, rd: 1.75, len: 13.5, sx: 0, sz: 0.4, curve: 0.5 },
          { rx: 0, rz: -1.95, rw: 1.85, rd: 1.7, len: 13, sx: 0, sz: -0.45, curve: 0.4 },
        ],
      };
    if (index === 6)
      return {
        trunk: 4,
        roots: [
          { rx: 1.7, rz: 2.5, rw: 1.55, rd: 2.1, len: 12.4, sx: 0.3, sz: 0.4, curve: 1.4 },
          { rx: -1.85, rz: 2.7, rw: 1.4, rd: 1.75, len: 11.8, sx: -0.35, sz: 0.35, curve: 0.6 },
          { rx: 0, rz: -2.5, rw: 2.1, rd: 2.1, len: 13, sx: 0, sz: -0.9, curve: 0.2 },
        ],
      };
    if (index === 7)
      return {
        trunk: 4.6,
        roots: [
          { rx: 1.45, rz: 2.4, rw: 1.5, rd: 2.0, len: 11.6, sx: 0.15, sz: 0.25, curve: 1.4 },
          { rx: -1.55, rz: 2.6, rw: 1.35, rd: 1.7, len: 11, sx: -0.2, sz: 0.2, curve: 0.9 },
          { rx: 0, rz: -2.4, rw: 1.95, rd: 2.0, len: 12, sx: 0, sz: -0.5, curve: 0.3 },
        ],
      };
    if (index === 8)
      return {
        trunk: 5.5,
        roots: [
          { rx: 1.1, rz: 1.8, rw: 1.6, rd: 2.2, len: 10.6, sx: 0, sz: 0, curve: 1.6 },
          { rx: -1.1, rz: 1.9, rw: 1.5, rd: 2.0, len: 10.2, sx: 0, sz: 0, curve: 1.4 },
          { rx: 0, rz: -1.9, rw: 1.9, rd: 2.1, len: 11, sx: 0, sz: -0.2, curve: 1.0 },
        ],
      };
    return null;
  }
  if (index === 6)
    return {
      trunk: 3.6,
      roots: [
        { rx: 2.0, rz: 0, rw: 1.7, rd: 4.0, len: 14, sx: 0.3, sz: 0, curve: 1.6 },
        { rx: -2.05, rz: 0, rw: 1.65, rd: 3.8, len: 13, sx: -0.35, sz: 0, curve: 0.6 },
      ],
    };
  if (index === 7)
    return {
      trunk: 4,
      roots: [
        { rx: 1.75, rz: 0, rw: 1.6, rd: 3.9, len: 13, sx: 0.1, sz: 0, curve: 1.5 },
        { rx: -1.8, rz: 0, rw: 1.55, rd: 3.7, len: 12.3, sx: -0.1, sz: 0, curve: 1.0 },
      ],
    };
  if (index === 8)
    return {
      trunk: 5,
      roots: [
        { rx: 1.5, rz: 0, rw: 1.7, rd: 3.8, len: 11, sx: -0.2, sz: 0, curve: 2.0 },
        { rx: -1.5, rz: 0, rw: 1.6, rd: 3.6, len: 10.4, sx: -0.2, sz: 0, curve: 1.8 },
      ],
    };
  return null;
}

export function toothInfo(fdi: number): ToothInfo {
  const quadrant = Math.floor(fdi / 10);
  const index = fdi % 10;
  const jaw: Jaw = quadrant === 1 || quadrant === 2 ? 'upper' : 'lower';
  const left = quadrant === 2 || quadrant === 3;
  const family: Family = index <= 2 ? 'incisor' : index === 3 ? 'canine' : index <= 5 ? 'premolar' : 'molar';
  const dims = (jaw === 'upper' ? UPPER : LOWER)[Math.min(8, Math.max(1, index))];
  const spec = rootSpecs(jaw, index);
  return { fdi, quadrant, index, jaw, left, family, dims, roots: spec ? spec.roots.length : 1 };
}

/** The number of roots of a tooth, as a dentist counts them. */
export const rootCount = (fdi: number) => toothInfo(fdi).roots;

// ------------------------------------------------------------------------------------------------------------ math

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 2.2);
/** Signed power for superellipses. */
const se = (c: number, n: number) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
const gauss = (u: number, v: number, cu: number, cv: number, s: number) => Math.exp(-((u - cu) ** 2 + (v - cv) ** 2) / (s * s));

// ------------------------------------------------------------------------------------------------- occlusal relief

type Cusp = [number, number, number, number]; // u (mesial +), v (buccal +), height, spread

function cuspsFor(info: ToothInfo): Cusp[] {
  const { jaw, index } = info;
  if (info.family === 'molar') {
    if (jaw === 'upper')
      return index === 8
        ? [
            [0.38, 0.42, 1, 0.48],
            [-0.42, 0.42, 0.75, 0.42],
            [0.25, -0.42, 0.95, 0.5],
          ]
        : [
            [0.42, 0.44, 1, 0.42],
            [-0.44, 0.46, 0.88, 0.4],
            [0.36, -0.42, 1, 0.48],
            [-0.5, -0.5, index === 6 ? 0.62 : 0.5, 0.36],
          ];
    return index === 6
      ? [
          [0.52, 0.48, 0.92, 0.36],
          [-0.04, 0.54, 0.86, 0.34],
          [-0.62, 0.34, 0.7, 0.3],
          [0.46, -0.48, 1, 0.38],
          [-0.34, -0.5, 0.95, 0.36],
        ]
      : [
          [0.45, 0.48, 0.92, 0.4],
          [-0.45, 0.48, 0.86, 0.4],
          [0.45, -0.48, 1, 0.4],
          [-0.45, -0.48, 0.94, 0.4],
        ];
  }
  // premolars
  if (jaw === 'upper')
    return [
      [0.02, 0.44, 1, 0.5],
      [0.02, -0.46, index === 4 ? 0.82 : 0.95, 0.48],
    ];
  return index === 4
    ? [
        [0.02, 0.36, 1, 0.55],
        [0.02, -0.56, 0.42, 0.38],
      ]
    : [
        [0.02, 0.4, 1, 0.5],
        [0.32, -0.5, 0.66, 0.34],
        [-0.3, -0.52, 0.56, 0.34],
      ];
}

const reliefCache = new Map<string, Relief>();

/** The occlusal height field over the unit superellipse, scaled so the highest cusp is 1. */
function reliefFor(info: ToothInfo): Relief {
  const key = `${info.jaw}${info.index}`;
  const hit = reliefCache.get(key);
  if (hit) return hit;
  let raw: Relief;
  if (info.family === 'incisor') {
    const distalDrop = info.index === 2 ? 0.55 : 0.28;
    raw = (u, v) => 0.62 * Math.pow(Math.max(0, 1 - u * u), 0.5) - distalDrop * smoothstep(0.45, 1, -u) - 0.18 * smoothstep(0, 1, -v) + 0.04 * Math.cos(u * Math.PI * 3) * smoothstep(0.2, 1, v + 0.4);
  } else if (info.family === 'canine') {
    const u0 = 0.08;
    const v0 = 0.12;
    raw = (u, v) => {
      const du = (u - u0) * (u > u0 ? 1.18 : 0.96);
      return 1 - Math.sqrt(du * du + 0.42 * (v - v0) ** 2 + 0.01) + 0.08 * gauss(u, v, u0, 0.7, 0.35);
    };
  } else {
    const cusps = cuspsFor(info);
    const molar = info.family === 'molar';
    const vg = info.jaw === 'lower' && molar ? -0.04 : 0;
    raw = (u, v) => {
      let h = 0;
      for (const [cu, cv, ch, cs] of cusps) h += ch * gauss(u, v, cu, cv, cs * (molar ? 0.86 : 0.92));
      const rho = Math.pow(Math.pow(Math.abs(u), 2.6) + Math.pow(Math.abs(v), 2.6), 1 / 2.6);
      const ridge = Math.exp(-(((rho - 0.84) / 0.13) ** 2));
      const groove = Math.exp(-(((v - vg) / 0.075) ** 2)) * (1 - smoothstep(0.5, 0.86, Math.abs(u)));
      let side = 0;
      if (molar) {
        // buccal and lingual grooves between the cusps
        const ub = info.jaw === 'lower' ? 0.24 : 0.0;
        side = Math.exp(-(((u - ub) / 0.07) ** 2)) * smoothstep(0.05, 0.75, Math.abs(v));
      }
      const pit = gauss(u, v, 0.05, vg, 0.16);
      return h + 0.3 * ridge - (molar ? 0.3 : 0.24) * groove - 0.2 * side - 0.14 * pit;
    };
  }
  let max = -Infinity;
  for (let i = 0; i <= 40; i++)
    for (let j = 0; j <= 40; j++) {
      const u = -1 + (2 * i) / 40;
      const v = -1 + (2 * j) / 40;
      if (Math.abs(u) ** 2.5 + Math.abs(v) ** 2.5 > 1) continue;
      max = Math.max(max, raw(u, v));
    }
  const norm: Relief = (u, v) => Math.max(-0.35, raw(u, v) / max);
  reliefCache.set(key, norm);
  return norm;
}

const flat: Relief = () => 0;

// -------------------------------------------------------------------------------------------------------- the rings

type Layer = 'outer' | 'dentin' | 'pulp';

const N_EXP: Record<Family, number> = { incisor: 2.3, canine: 2.2, premolar: 2.4, molar: 2.75 };
const AMP: Record<Family, number> = { incisor: 0.55, canine: 3.1, premolar: 2.6, molar: 2.5 };
const ROUND: Record<Family, number> = { incisor: 0.42, canine: 0.8, premolar: 0.9, molar: 0.95 };

/** Half-width (mesiodistal), half-depth (buccolingual) and the lingual "shovel" of the crown, CEJ (0) to rim (1). */
function sideProfile(info: ToothInfo, s: number) {
  const { md, mdC, bl, blC } = info.dims;
  const cw = md / 2;
  const nw = mdC / 2;
  const cd = bl / 2;
  const nd = blC / 2;
  switch (info.family) {
    case 'incisor': {
      const w = lerp(nw, cw, easeOut(s / 0.82)) * (1 - 0.05 * smoothstep(0.9, 1, s));
      const edge = info.jaw === 'upper' ? 0.62 : 0.55;
      const d = s < 0.22 ? lerp(nd, cd, easeOut(s / 0.22)) : lerp(cd, edge, Math.pow((s - 0.22) / 0.78, 1.1));
      const lingual = 0.26 * smoothstep(0.22, 0.55, s) * (1 - smoothstep(0.8, 1, s));
      return { w, d, lingual };
    }
    case 'canine': {
      const w = lerp(nw, cw, easeOut(s / 0.6)) * (1 - 0.2 * smoothstep(0.68, 1, s));
      const d = s < 0.3 ? lerp(nd, cd, easeOut(s / 0.3)) : lerp(cd, cd * 0.58, smoothstep(0.3, 1, s));
      return { w, d, lingual: 0.12 * smoothstep(0.3, 0.6, s) * (1 - smoothstep(0.8, 1, s)) };
    }
    case 'premolar': {
      const w = lerp(nw, cw, easeOut(s / 0.55)) * (1 - 0.13 * smoothstep(0.6, 1, s));
      const d = lerp(nd, cd, easeOut(s / 0.36)) * (1 - 0.2 * smoothstep(0.42, 1, s));
      return { w, d, lingual: 0 };
    }
    default: {
      // the flare from the neck is gradual (contacts sit in the occlusal third), then the cusps lean in
      const w = lerp(nw, cw, smoothstep(0, 0.68, s)) * (1 - 0.17 * smoothstep(0.66, 1, s));
      const d = lerp(nd, cd, easeOut(s / 0.38)) * (1 - 0.24 * smoothstep(0.42, 1, s));
      return { w, d, lingual: 0 };
    }
  }
}

const SIDE = 16;
const CAP = 12;

/** The crown from the CEJ (y = 0) to its occlusal pole. `inset` peels off enamel (dentin) or makes the pulp. */
function crownRings(info: ToothInfo, layer: Layer, H: Relief): { rings: Ring[]; top: number; A: number } {
  const fam = info.family;
  const n = N_EXP[fam];
  const A = AMP[fam];
  const round = ROUND[fam];
  const crownH = info.dims.crownH;
  const sideH = crownH - A * 0.85 - round * 0.55;
  const rings: Ring[] = [];
  const enamelSide = (s: number) => lerp(0.06, fam === 'incisor' ? 0.75 : 1.05, smoothstep(0, 0.45, s)) + (fam === 'incisor' ? 0 : 0.35) * smoothstep(0.6, 1, s);
  const enamelTop = fam === 'incisor' ? 0.9 : fam === 'canine' ? 1.6 : 1.7;

  if (layer === 'pulp') {
    // The pulp chamber: from just below the CEJ to under the cusps, with horns under each cusp.
    const nw = info.dims.mdC / 2;
    const nd = info.dims.blC / 2;
    const chamberTop = fam === 'incisor' ? crownH * 0.55 : fam === 'canine' ? crownH * 0.5 : crownH * 0.36;
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const w = fam === 'incisor' ? lerp(nw * 0.3, nw * 0.55, s) : nw * lerp(0.42, 0.52, Math.sin(s * Math.PI * 0.8));
      const d = fam === 'incisor' ? lerp(nd * 0.32, 0.25, smoothstep(0.2, 1, s)) : nd * lerp(0.4, 0.46, Math.sin(s * Math.PI * 0.8));
      rings.push({ y: lerp(-1.4, chamberTop, s), w, d, ox: 0, oz: 0, f: 1, c: smoothstep(0.5, 1, s), n: 2.2, lingual: 0 });
    }
    const last = rings[rings.length - 1];
    for (let k = 1; k < 6; k++) {
      const kk = k / 6;
      rings.push({ ...last, y: chamberTop + 0.35 * Math.sin((kk * Math.PI) / 2), f: Math.cos((kk * Math.PI) / 2), c: 1 });
    }
    return { rings, top: chamberTop + 0.35, A: fam === 'incisor' ? 0.4 : A * 0.75 };
  }

  for (let i = 0; i <= SIDE; i++) {
    const s = i / SIDE;
    const p = sideProfile(info, s);
    const inset = layer === 'dentin' ? enamelSide(s) : 0;
    rings.push({
      y: s * sideH - (layer === 'dentin' ? enamelTop * smoothstep(0.55, 1, s) : 0),
      w: Math.max(0.3, p.w - inset),
      d: Math.max(0.25, p.d - inset * (fam === 'incisor' ? 0.5 : 1)),
      ox: 0,
      oz: fam === 'incisor' ? -0.15 * s : 0,
      f: 1,
      c: Math.pow(smoothstep(0.42, 1, s), 1.5),
      n,
      lingual: p.lingual,
    });
  }
  const rim = rings[rings.length - 1];
  const r0 = layer === 'dentin' ? round * 0.8 : round;
  for (let k = 1; k < CAP; k++) {
    const kk = k / CAP;
    rings.push({ ...rim, y: rim.y + r0 * Math.sin((kk * Math.PI) / 2), f: Math.cos((kk * Math.PI) / 2), c: 1, lingual: rim.lingual * (1 - kk) });
  }
  return { rings, top: rim.y + r0, A: layer === 'dentin' ? A * 0.82 : A };
}

/** A tapered root from y0 down to the apex at -len, its apex closed by a rounded dome. */
function rootRings(
  top: { y: number; w: number; d: number; ox: number; oz: number },
  len: number,
  r: { sx: number; sz: number; curve: number; n: number; apexW?: number; apexD?: number },
  layer: Layer,
): Ring[] {
  const rings: Ring[] = [];
  const steps = 16;
  const pulp = layer === 'pulp';
  const span = len + top.y;
  const aw = r.apexW ?? 0.4;
  const ad = r.apexD ?? 0.36;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const tw = 1 - (1 - aw) * Math.pow(s, 1.35);
    const td = 1 - (1 - ad) * Math.pow(s, 1.25);
    const ox = top.ox + r.sx * s * 2 - r.curve * s * s;
    const oz = top.oz + r.sz * s * 2;
    const w = pulp ? Math.max(0.14, top.w * 0.24 * (1 - 0.6 * s)) : Math.max(0.3, top.w * tw);
    const d = pulp ? Math.max(0.14, top.d * 0.2 * (1 - 0.5 * s)) : Math.max(0.3, top.d * td);
    rings.push({ y: top.y - s * (span - (pulp ? 0.9 : Math.min(top.w * aw, top.d * ad) * 0.85)), w, d, ox, oz, f: 1, c: 0, n: r.n, lingual: 0 });
  }
  const end = rings[rings.length - 1];
  const drop = pulp ? 0.2 : Math.min(end.w, end.d) * 0.85;
  for (let k = 1; k <= 4; k++) {
    const a = (k / 5) * (Math.PI / 2);
    rings.push({ ...end, y: end.y - drop * Math.sin(a), f: Math.cos(a) });
  }
  // rings go apex → top
  return rings.reverse();
}

function components(info: ToothInfo, layer: Layer): Comp[] {
  const H = layer === 'pulp' ? reliefFor(info) : reliefFor(info);
  const crown = crownRings(info, layer, H);
  const spec = rootSpecs(info.jaw, info.index);
  const nw = info.dims.mdC / 2;
  const nd = info.dims.blC / 2;
  const fam = info.family;
  if (!spec) {
    // One root continuing the crown.
    const curve = fam === 'incisor' ? 0.5 : fam === 'canine' ? 0.9 : 0.8;
    const rootTop = layer === 'pulp' ? crown.rings[0] : { y: 0, w: nw, d: nd, ox: 0, oz: 0 };
    const roots = rootRings(
      layer === 'pulp' ? { y: rootTop.y, w: nw, d: nd, ox: 0, oz: 0 } : rootTop,
      info.dims.rootH,
      { sx: 0, sz: fam === 'incisor' && info.jaw === 'upper' ? -0.25 : 0, curve, n: fam === 'canine' ? 2.1 : 2.2, apexW: fam === 'premolar' ? 0.34 : 0.3, apexD: fam === 'premolar' ? 0.3 : 0.28 },
      layer,
    );
    // drop the shared ring (the crown's first ring is the CEJ)
    const rings = [...roots.slice(0, -1), ...crown.rings];
    return [{ rings, bottom: rings[0].y - (layer === 'pulp' ? 0.08 : Math.min(rings[0].w, rings[0].d) * 0.25), top: crown.top, H, A: crown.A, crown: true }];
  }
  // Crown with a root trunk, then separate roots below the furcation.
  const trunk: Ring[] = [];
  const t = spec.trunk;
  if (layer === 'pulp') {
    const floor = -t + 1.2;
    const first = crown.rings[0];
    for (let i = 3; i >= 1; i--) trunk.push({ ...first, y: first.y + (floor - first.y) * (i / 3), w: first.w * (1 - 0.15 * (i / 3)), d: first.d * (1 - 0.1 * (i / 3)) });
  } else {
    const inset = layer === 'dentin' ? 0.15 : 0;
    for (let i = 6; i >= 1; i--) {
      const s = i / 6;
      trunk.push({ y: -s * t, w: nw * (1 - 0.18 * s) - inset, d: nd * (1 - 0.08 * s) - inset, ox: 0, oz: 0, f: 1, c: 0, n: 2.5, lingual: 0 });
    }
    // the furcation: a rounded saddle that dips between the roots instead of a flat shelf
    const low = trunk[0];
    for (let k = 1; k <= 4; k++) {
      const a = (k / 5) * (Math.PI / 2);
      trunk.unshift({ ...low, y: low.y - 1.9 * Math.sin(a), f: Math.cos(a) * (1 - 0.08 * k) });
    }
  }
  const crownRings2 = layer === 'pulp' ? crown.rings : crown.rings;
  const main = [...trunk, ...crownRings2];
  const comps: Comp[] = [{ rings: main, bottom: main[0].y - (layer === 'pulp' ? 0.25 : 0.25), top: crown.top, H, A: crown.A, crown: true }];
  for (const r of spec.roots) {
    const top = { y: layer === 'pulp' ? -t + 1.4 : -t + 1.6, w: r.rw, d: r.rd, ox: r.rx, oz: r.rz };
    const rings = rootRings(top, r.len, { sx: r.sx, sz: r.sz, curve: r.curve, n: 2.2, apexW: 0.48, apexD: 0.34 }, layer);
    comps.push({ rings, bottom: rings[0].y - (layer === 'pulp' ? 0.1 : 0.22), top: rings[rings.length - 1].y + 0.05, H: flat, A: 0, crown: false });
  }
  return comps;
}

// ---------------------------------------------------------------------------------------------------- the surface

function ringPoint(r: Ring, cosT: number, sinT: number, comp: Comp, out: THREE.Vector3) {
  const cu = se(cosT, r.n);
  const sv = se(sinT, r.n);
  const x = r.ox + r.f * r.w * cu;
  let z = r.oz + r.f * r.d * sv;
  if (r.lingual && sv < 0) z = r.oz + r.f * r.d * sv * (1 - r.lingual * (1 - cu * cu));
  const y = r.y + (r.c ? r.c * comp.A * comp.H(r.f * cu, r.f * sv) : 0);
  return out.set(x, y, z);
}

const ENAMEL_RGB = new THREE.Color('#FBF8F1');
const CERVICAL_RGB = new THREE.Color('#EEDFC2');
const EDGE_RGB = new THREE.Color('#E4EBF0');
const ROOT_RGB = new THREE.Color('#E9D8B6');
const APEX_RGB = new THREE.Color('#D9C095');

type Built = { geometry: THREE.BufferGeometry; wire: Float32Array };

/** Rings to a mesh: crown faces use material 0, root faces material 1. Also iso-lines for the CAD wireframe. */
function buildSurface(comps: Comp[], info: ToothInfo, U: number, scaleY: (y: number) => number, colors: boolean): Built {
  const pos: number[] = [];
  const col: number[] = [];
  const crownIdx: number[] = [];
  const rootIdx: number[] = [];
  const wire: number[] = [];
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  const cos = Array.from({ length: U }, (_, j) => Math.cos((2 * Math.PI * j) / U));
  const sin = Array.from({ length: U }, (_, j) => Math.sin((2 * Math.PI * j) / U));
  const crownH = info.dims.crownH;
  const tint = (x: number, y: number, z: number) => {
    if (y >= 0) {
      const t = y / crownH;
      c.copy(ENAMEL_RGB).lerp(CERVICAL_RGB, 1 - smoothstep(0.02, 0.38, t));
      if (info.family === 'incisor' || info.family === 'canine') c.lerp(EDGE_RGB, 0.55 * smoothstep(0.78, 1, t));
    } else {
      c.copy(ROOT_RGB).lerp(APEX_RGB, smoothstep(0.2, 1, -y / info.dims.rootH));
      c.lerp(CERVICAL_RGB, 1 - smoothstep(0, 1.2, -y));
    }
    void x;
    void z;
    col.push(c.r, c.g, c.b);
  };
  for (const comp of comps) {
    const base = pos.length / 3;
    const R = comp.rings.length;
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < U; j++) {
        ringPoint(comp.rings[i], cos[j], sin[j], comp, v);
        v.y = scaleY(v.y);
        pos.push(v.x, v.y, v.z);
        if (colors) tint(v.x, v.y, v.z);
      }
    }
    const first = comp.rings[0];
    const last = comp.rings[R - 1];
    const bottomI = pos.length / 3;
    const bottom = comp.bottom ?? first.y;
    pos.push(first.ox, scaleY(bottom), first.oz);
    if (colors) tint(first.ox, scaleY(bottom), first.oz);
    const topI = pos.length / 3;
    const topY = scaleY((comp.top ?? last.y) + comp.A * comp.H(0, 0) * last.c);
    pos.push(last.ox, topY, last.oz);
    if (colors) tint(last.ox, topY, last.oz);
    for (let i = 0; i < R - 1; i++) {
      const crownFace = comp.crown && comp.rings[i].y >= -1e-6 && comp.rings[i + 1].y >= -1e-6;
      const list = crownFace ? crownIdx : rootIdx;
      for (let j = 0; j < U; j++) {
        const a = base + i * U + j;
        const b = base + i * U + ((j + 1) % U);
        const cc = base + (i + 1) * U + ((j + 1) % U);
        const d = base + (i + 1) * U + j;
        list.push(a, d, b, b, d, cc);
      }
    }
    for (let j = 0; j < U; j++) {
      rootIdx.push(base + j, base + ((j + 1) % U), bottomI);
      (comp.crown ? crownIdx : rootIdx).push(base + (R - 1) * U + j, topI, base + (R - 1) * U + ((j + 1) % U));
    }
    // CAD iso-lines: every other ring and sixteen meridians
    const P = (k: number) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
    for (let i = 0; i < R; i += 2)
      for (let j = 0; j < U; j++) wire.push(...P(base + i * U + j), ...P(base + i * U + ((j + 1) % U)));
    const step = Math.max(1, Math.round(U / 16));
    for (let j = 0; j < U; j += step) {
      wire.push(...P(bottomI), ...P(base + j));
      for (let i = 0; i < R - 1; i++) wire.push(...P(base + i * U + j), ...P(base + (i + 1) * U + j));
      wire.push(...P(base + (R - 1) * U + j), ...P(topI));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex([...rootIdx, ...crownIdx]);
  g.addGroup(0, rootIdx.length, 1);
  g.addGroup(rootIdx.length, crownIdx.length, 0);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return { geometry: g, wire: new Float32Array(wire) };
}

/** The outline of each component where it crosses the plane z = 0. */
function sectionOf(comps: Comp[], scaleY: (y: number) => number): Poly[] {
  const polys: Poly[] = [];
  for (const comp of comps) {
    const right: [number, number][] = [];
    const left: [number, number][] = [];
    for (const r of comp.rings) {
      const fd = r.f * r.d;
      if (Math.abs(r.oz) >= fd) continue;
      const e = r.f * r.w * Math.pow(1 - Math.pow(Math.abs(r.oz) / fd, r.n), 1 / r.n);
      const vN = r.d > 0 ? -r.oz / r.d : 0;
      const yR = r.y + (r.c ? r.c * comp.A * comp.H(e / r.w, vN) : 0);
      const yL = r.y + (r.c ? r.c * comp.A * comp.H(-e / r.w, vN) : 0);
      right.push([r.ox + e, scaleY(yR)]);
      left.push([r.ox - e, scaleY(yL)]);
    }
    if (right.length < 2) continue;
    const last = comp.rings[comp.rings.length - 1];
    const poly: Poly = [];
    if (comp.bottom !== null && Math.abs(comp.rings[0].oz) < comp.rings[0].d) poly.push([comp.rings[0].ox, scaleY(comp.bottom)]);
    poly.push(...right);
    if (comp.top !== null && Math.abs(last.oz) < last.d * 0.5) poly.push([last.ox, scaleY(comp.top + comp.A * comp.H(0, -last.oz / Math.max(0.01, last.d)) * last.c)]);
    poly.push(...left.reverse());
    polys.push(poly);
  }
  return polys;
}

const partsCache = new Map<string, ToothParts>();

/**
 * The geometry of one tooth in the canonical frame (right side, crown up). Mirror images share it: 11 and 21, 36 and
 * 46 differ only by placement. Cached; do not dispose it (it is shared), dispose the materials.
 */
export function toothParts(fdi: number, detail: 'high' | 'normal' = 'normal'): ToothParts {
  const info = toothInfo(fdi);
  const key = `${info.jaw}${info.index}-${detail}`;
  const hit = partsCache.get(key);
  if (hit) return { ...hit, info };
  const U = detail === 'high' ? 72 : 48;
  const outer = components(info, 'outer');
  // Scale the crown so its highest point is exactly the textbook crown height.
  let maxY = 0;
  const v = new THREE.Vector3();
  for (const comp of outer)
    for (const r of comp.rings)
      for (let j = 0; j < 24; j++) {
        ringPoint(r, Math.cos((j / 24) * Math.PI * 2), Math.sin((j / 24) * Math.PI * 2), comp, v);
        maxY = Math.max(maxY, v.y);
      }
  for (const comp of outer) if (comp.top !== null && comp.crown) maxY = Math.max(maxY, comp.top + comp.A * comp.H(0, 0));
  const k = info.dims.crownH / maxY;
  const scaleY = (y: number) => (y > 0 ? y * k : y);
  const built = buildSurface(outer, info, U, scaleY, true);
  const pulpComps = components(info, 'pulp');
  const pulp = buildSurface(pulpComps, info, 24, scaleY, false).geometry;
  const dentinComps = components(info, 'dentin');
  const dentin = buildSurface(dentinComps, info, 28, scaleY, false).geometry;
  // The crown alone: the crown rings with a slightly hollow base, for a crown cap.
  const crownComp = outer[0];
  const crownOnly: Comp = { ...crownComp, rings: crownComp.rings.filter((r) => r.y >= -1e-6), bottom: 0.6, crown: true };
  const crownBuilt = buildSurface([crownOnly], info, U, scaleY, true);
  crownBuilt.geometry.clearGroups();
  crownBuilt.geometry.addGroup(0, crownBuilt.geometry.index!.count, 0);

  const outerPolys = sectionOf(outer, scaleY);
  const dentinPolys = sectionOf(dentinComps, scaleY);
  const pulpPolys = sectionOf(pulpComps, scaleY);
  const enamelPolys = sectionOf([{ ...crownComp, rings: crownComp.rings.filter((r) => r.y >= -1e-6), bottom: null }], scaleY);
  const all = outerPolys.flat();
  const bounds = {
    minX: Math.min(...all.map((p) => p[0])),
    maxX: Math.max(...all.map((p) => p[0])),
    minY: Math.min(...all.map((p) => p[1])),
    maxY: Math.max(...all.map((p) => p[1])),
  };
  built.geometry.userData.wire = built.wire;
  crownBuilt.geometry.userData.wire = crownBuilt.wire;
  const bb = built.geometry.boundingBox!;
  const parts: ToothParts = {
    info,
    geometry: built.geometry,
    crown: crownBuilt.geometry,
    pulp,
    dentin,
    section: { outer: outerPolys, enamel: enamelPolys, dentin: dentinPolys, pulp: pulpPolys, bounds },
    top: bb.max.y,
    apex: bb.min.y,
  };
  partsCache.set(key, parts);
  return parts;
}

// ------------------------------------------------------------------------------------------------------- materials

export type MaterialOptions = { clip?: THREE.Plane[]; translucent?: boolean };

/** Enamel: warm porcelain white, a wet clearcoat, a faint blue sheen at the edges and (optionally) light through it. */
export function enamelMaterial(o: MaterialOptions & { color?: THREE.ColorRepresentation } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: o.color ?? '#FFFFFF',
    vertexColors: true,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.75,
    clearcoatRoughness: 0.16,
    sheen: 0.35,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#DCEBFA'),
    specularIntensity: 0.7,
    ior: 1.62,
    transmission: o.translucent ? 0.18 : 0,
    thickness: o.translucent ? 3.5 : 0,
    attenuationColor: new THREE.Color('#F3E3C4'),
    attenuationDistance: 8,
    envMapIntensity: 1.05,
    clippingPlanes: o.clip ?? null,
    clipShadows: !!o.clip,
  });
}

/** Root surface (cementum over dentin): ivory, matte. */
export function rootMaterial(o: MaterialOptions = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    vertexColors: true,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.2,
    sheenColor: new THREE.Color('#FFF1D6'),
    envMapIntensity: 0.85,
    clippingPlanes: o.clip ?? null,
    clipShadows: !!o.clip,
  });
}

/** Zirconia crown: bright, glassy, with a white-gold warmth. */
export function zirconiaMaterial(o: MaterialOptions = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: '#FFF0D8',
    vertexColors: false,
    roughness: 0.16,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    sheen: 0.6,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color('#F2D59A'),
    iridescence: 0.18,
    iridescenceIOR: 1.4,
    envMapIntensity: 1.25,
    clippingPlanes: o.clip ?? null,
    clipShadows: !!o.clip,
  });
}

/** Grade 4 titanium, machined: cool grey metal with fine streaks of light. */
export function titaniumMaterial(o: MaterialOptions & { tint?: THREE.ColorRepresentation; roughness?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: o.tint ?? '#C3C8D0',
    metalness: 1,
    roughness: o.roughness ?? 0.26,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.35,
    clippingPlanes: o.clip ?? null,
    clipShadows: !!o.clip,
  });
}

/** Gold-anodised titanium for the abutment. */
export const anodisedMaterial = (o: MaterialOptions = {}) => titaniumMaterial({ ...o, tint: '#E2C48A', roughness: 0.22 });

/** Gum: wet, pink and slightly see-through, so the roots and the implant show through it like through glass. */
export function gumMaterial(o: MaterialOptions & { opacity?: number } = {}) {
  const opacity = o.opacity ?? 0.62;
  return new THREE.MeshPhysicalMaterial({
    color: '#EA7E8E',
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    sheen: 0.7,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color('#FFD0D8'),
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: THREE.FrontSide,
    envMapIntensity: 0.9,
    clippingPlanes: o.clip ?? null,
  });
}

/** Bone surface (outside of the block): ivory, porous, matte. */
export function boneMaterial(o: MaterialOptions = {}) {
  return new THREE.MeshPhysicalMaterial({ color: '#EADFC8', roughness: 0.8, metalness: 0, sheen: 0.3, sheenColor: new THREE.Color('#FFF6E4'), clippingPlanes: o.clip ?? null });
}

/** A ghost: a fresnel rim of light with nothing inside, for missing teeth. */
export function ghostMaterial(color: THREE.ColorRepresentation = '#7FB6E6', strength = 0.55) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      #include <clipping_planes_pars_vertex>
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        #include <clipping_planes_vertex>
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vV;
      #include <clipping_planes_pars_fragment>
      void main(){
        #include <clipping_planes_fragment>
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        gl_FragColor = vec4(uColor, (0.06 + f * 0.9) * uStrength);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** The pulp: soft living red. `inflamed` glows. */
export function pulpMaterial(inflamed = false) {
  return new THREE.MeshPhysicalMaterial({
    color: inflamed ? '#E2434B' : '#E98A8F',
    emissive: new THREE.Color(inflamed ? '#C81E32' : '#7A2030'),
    emissiveIntensity: inflamed ? 0.65 : 0.15,
    roughness: 0.45,
    clearcoat: 0.4,
  });
}

/** Line material for the CAD wireframe. */
export function wireMaterial(color: THREE.ColorRepresentation = '#2DB4E8', opacity = 0.75, clip?: THREE.Plane[]) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, clippingPlanes: clip ?? null });
}

/** The CAD iso-lines of a procedural geometry (teeth, implant parts), or the triangle edges of any other. */
export function wireOf(geometry: THREE.BufferGeometry, material: THREE.LineBasicMaterial): THREE.LineSegments {
  const data = geometry.userData.wire as Float32Array | undefined;
  const g = data ? new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(data, 3)) : new THREE.WireframeGeometry(geometry);
  const lines = new THREE.LineSegments(g, material);
  lines.userData.ownGeometry = true;
  return lines;
}

// ------------------------------------------------------------------------------------------------------ one tooth

export type ToothStyle = 'natural' | 'zirconia' | 'ghost';

export type MadeTooth = THREE.Group & { userData: { fdi: number; mesh: THREE.Mesh; parts: ToothParts } };

/**
 * One tooth as a group in its canonical frame (crown up, +x mesial, +z buccal). `materials` overrides
 * [crown, root]; `style` picks a zirconia crown or a ghost.
 */
export function makeTooth(fdi: number, opts: { style?: ToothStyle; materials?: THREE.Material[]; detail?: 'high' | 'normal'; clip?: THREE.Plane[]; translucent?: boolean } = {}): MadeTooth {
  const parts = toothParts(fdi, opts.detail);
  const style = opts.style ?? 'natural';
  const mats =
    opts.materials ??
    (style === 'ghost'
      ? [ghostMaterial(), ghostMaterial('#9AB0CC', 0.3)]
      : [style === 'zirconia' ? zirconiaMaterial({ clip: opts.clip }) : enamelMaterial({ clip: opts.clip, translucent: opts.translucent }), rootMaterial({ clip: opts.clip })]);
  const mesh = new THREE.Mesh(parts.geometry, mats);
  mesh.castShadow = style !== 'ghost';
  mesh.receiveShadow = style !== 'ghost';
  mesh.userData.fdi = fdi;
  mesh.userData.sharedGeometry = true;
  const group = new THREE.Group() as MadeTooth;
  group.add(mesh);
  group.userData = { fdi, mesh, parts };
  return group;
}

/** A crown cap (the crown alone), e.g. zirconia on a prepared tooth or on an implant abutment. */
export function makeCrownCap(fdi: number, material?: THREE.Material): THREE.Mesh {
  const parts = toothParts(fdi, 'high');
  const mesh = new THREE.Mesh(parts.crown, material ?? zirconiaMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.sharedGeometry = true;
  return mesh;
}

/** A prepared stump: the crown made smaller and flatter, as a dentist shapes a tooth for a crown. */
export function prepGeometry(fdi: number): THREE.BufferGeometry {
  const parts = toothParts(fdi, 'high');
  const g = parts.geometry.clone();
  const p = g.attributes.position as THREE.BufferAttribute;
  const top = parts.top;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y <= 0) continue;
    const t = smoothstep(0, 1.4, y);
    const inset = 1.15 * t;
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z) || 1;
    const k = Math.max(0.2, (r - inset) / r) * (1 - 0.1 * smoothstep(0.3 * top, top, y));
    p.setXYZ(i, x * k, Math.min(y, top * 0.66 + 0.25 * Math.sin(x * 0.8)), z * k);
  }
  g.computeVertexNormals();
  g.userData.wire = undefined;
  return g;
}

/**
 * A veneer (facing): a thin shell over the labial face of a front tooth. Built from the crown's own rings: every
 * lingual vertex is moved to sit just behind its labial twin, so the shell follows the tooth exactly.
 */
export function veneerGeometry(fdi: number, thickness = 0.6): THREE.BufferGeometry {
  const parts = toothParts(fdi, 'high');
  const g = parts.crown.clone();
  const p = g.attributes.position as THREE.BufferAttribute;
  const U = 72;
  const rings = Math.floor((p.count - 2) / U);
  for (let i = 0; i < rings; i++)
    for (let j = U / 2 + 1; j < U; j++) {
      const k = i * U + j;
      const m = i * U + (U - j);
      p.setXYZ(k, p.getX(m) * 0.98, p.getY(m), p.getZ(m) - thickness);
    }
  // the poles: the cervical one to the labial side, the incisal one stays on the edge
  const bottom = rings * U;
  const q = U / 4;
  p.setXYZ(bottom, 0, p.getY(q), p.getZ(q) - thickness * 0.5);
  g.computeVertexNormals();
  g.userData.wire = undefined;
  return g;
}

// ------------------------------------------------------------------------------------------------- filling patches

/** Surfaces as a dentist writes them: M mesial, O occlusal, D distal, B buccal, L lingual (P palatal). */
export type Surface = 'M' | 'O' | 'D' | 'B' | 'L';

/**
 * A filling as a patch over the crown: the crown's own geometry drawn again on top, with a shader mask that keeps only
 * the filled surfaces (a soft-edged occlusal inlay that runs over the marginal ridge for M or D).
 */
export function makeFillingPatch(fdi: number, surfaces: string, opts: { color?: THREE.ColorRepresentation; emissive?: number; material?: THREE.MeshPhysicalMaterial; size?: number } = {}): THREE.Mesh {
  const parts = toothParts(fdi);
  const { md, bl } = parts.info.dims;
  const mat =
    opts.material ??
    new THREE.MeshPhysicalMaterial({
      color: opts.color ?? '#2DB4E8',
      emissive: new THREE.Color(opts.color ?? '#2DB4E8'),
      emissiveIntensity: opts.emissive ?? 0.35,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
  const has = (s: string) => (surfaces.toUpperCase().includes(s) ? 1 : 0);
  const uniforms = {
    uHalf: { value: new THREE.Vector3(md / 2, parts.top, bl / 2) },
    uSurf: { value: new THREE.Vector4(has('M'), has('D'), has('B'), has('L') || has('P')) },
    uO: { value: has('O') },
    uSize: { value: opts.size ?? 1 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal; uniform vec3 uHalf; uniform vec4 uSurf; uniform float uO; uniform float uSize;')
      .replace(
        'void main() {',
        `void main() {
          vec3 q = vLocal / uHalf;
          float wob = 0.06 * sin(q.x * 9.0 + q.z * 5.0) + 0.04 * sin(q.z * 13.0 - q.x * 4.0);
          float occl = smoothstep(0.62, 0.7, q.y);
          float inlay = (1.0 - smoothstep((0.48 + wob) * uSize, (0.56 + wob) * uSize, length(vec2(q.x * 0.82, q.z * 1.15)))) * occl * uO;
          float m = smoothstep(0.4 + wob, 0.48 + wob, q.x) * smoothstep(0.48, 0.55, q.y) * (1.0 - smoothstep(0.3, 0.38, abs(q.z))) * uSurf.x;
          float d = smoothstep(0.4 + wob, 0.48 + wob, -q.x) * smoothstep(0.48, 0.55, q.y) * (1.0 - smoothstep(0.3, 0.38, abs(q.z))) * uSurf.y;
          float b = smoothstep(0.5 + wob, 0.58 + wob, q.z) * smoothstep(0.25, 0.32, q.y) * (1.0 - smoothstep(0.75, 0.82, q.y)) * uSurf.z;
          float l = smoothstep(0.5 + wob, 0.58 + wob, -q.z) * smoothstep(0.25, 0.32, q.y) * (1.0 - smoothstep(0.75, 0.82, q.y)) * uSurf.w;
          // the occlusal part reaches over the marginal ridge to an M or D box
          float bridgeM = smoothstep(0.0, 0.1, q.x) * occl * (1.0 - smoothstep(0.3, 0.38, abs(q.z))) * uSurf.x * uO;
          float bridgeD = smoothstep(0.0, 0.1, -q.x) * occl * (1.0 - smoothstep(0.3, 0.38, abs(q.z))) * uSurf.y * uO;
          float mask = max(max(max(inlay, m), max(d, b)), max(l, max(bridgeM, bridgeD)));
          if (mask < 0.5) discard;`,
      );
  };
  mat.customProgramCacheKey = () => 'filling-patch';
  // the whole tooth is drawn with one material; the mask discards everything outside the filled surfaces
  const mesh = new THREE.Mesh(parts.geometry, mat);
  mesh.userData.sharedGeometry = true;
  mesh.renderOrder = 2;
  return mesh;
}

// ------------------------------------------------------------------------------------------------------ the arches

export type Slot = {
  fdi: number;
  info: ToothInfo;
  /** Where the CEJ centre of the tooth sits. */
  position: THREE.Vector3;
  rotY: number;
  mirrorX: boolean;
  flipY: boolean;
  /** Crown tip towards the lip or cheek (rad), in the canonical frame. */
  tilt: number;
  /** Arc length from the midline (negative on the patient's right). */
  s: number;
  /** Outward (buccal) normal and distal tangent in the arch plane. */
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
};

const ARCH_POINTS: Record<Jaw, [number, number][]> = {
  upper: [
    [0, 0],
    [-8, -1.5],
    [-15.5, -6],
    [-20.5, -13],
    [-23.5, -21],
    [-25.5, -30],
    [-27, -40],
    [-28, -50],
    [-28.6, -58],
    [-28.9, -64],
  ],
  lower: [
    [0, 0],
    [-6.5, -1.3],
    [-12.5, -5],
    [-17.5, -11],
    [-21, -18.5],
    [-23, -27],
    [-24.5, -37],
    [-25.5, -47],
    [-26.1, -55],
    [-26.4, -61],
  ],
};

/** How far the arches are shifted so the arch sits around the origin. */
export const ARCH_Z = 30;

const curves = new Map<Jaw, THREE.CatmullRomCurve3>();
/** The right half of an arch (the line through the crown centres), from the midline backwards, z centred. */
export function archCurve(jaw: Jaw): THREE.CatmullRomCurve3 {
  const hit = curves.get(jaw);
  if (hit) return hit;
  const c = new THREE.CatmullRomCurve3(
    ARCH_POINTS[jaw].map(([x, z]) => new THREE.Vector3(x, 0, z + ARCH_Z)),
    false,
    'centripetal',
  );
  c.arcLengthDivisions = 400;
  curves.set(jaw, c);
  return c;
}

const TILT: Record<Jaw, number[]> = {
  // degrees per tooth index 1 … 8 (crown towards lip/cheek, +)
  upper: [17, 14, 9, 2, 1, -2, -4, -6],
  lower: [16, 14, 8, -4, -8, -14, -16, -18],
};

/** Where each tooth of a jaw sits: crowns touching, the occlusal plane at y = 0 (crown tips), arches centred. */
export function archLayout(jaw: Jaw): Slot[] {
  const curve = archCurve(jaw);
  const L = curve.getLength();
  const slots: Slot[] = [];
  for (const side of [1, 2] as const) {
    let s = 0.1;
    for (let i = 1; i <= 8; i++) {
      const quadrant = jaw === 'upper' ? (side === 1 ? 1 : 2) : side === 1 ? 4 : 3;
      const fdi = quadrant * 10 + i;
      const info = toothInfo(fdi);
      const half = info.dims.md / 2;
      s += half;
      const u = Math.min(1, s / L);
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u).setY(0).normalize();
      const normal = new THREE.Vector3(t.z, 0, -t.x);
      const tilt = THREE.MathUtils.degToRad(TILT[jaw][i - 1]);
      const crownH = info.dims.crownH * Math.cos(tilt);
      const position = new THREE.Vector3(p.x, jaw === 'lower' ? -crownH : crownH, p.z);
      let rotY = Math.atan2(normal.x, normal.z);
      const left = side === 2;
      if (left) {
        position.x = -position.x;
        normal.x = -normal.x;
        t.x = -t.x;
        rotY = -rotY;
      }
      slots.push({ fdi, info, position, rotY, mirrorX: left, flipY: jaw === 'upper', tilt, s: left ? s : -s, normal, tangent: t });
      s += half + 0.18;
    }
  }
  return slots;
}

/** Wraps a canonical tooth (or implant) in its arch placement: position → turn → mirror → tilt. */
export function placeTooth(obj: THREE.Object3D, slot: Slot): THREE.Group {
  const outer = new THREE.Group();
  outer.position.copy(slot.position);
  outer.rotation.y = slot.rotY;
  const mirror = new THREE.Group();
  mirror.scale.set(slot.mirrorX ? -1 : 1, slot.flipY ? -1 : 1, 1);
  const tilt = new THREE.Group();
  tilt.rotation.x = slot.tilt;
  tilt.add(obj);
  mirror.add(tilt);
  outer.add(mirror);
  outer.userData.slot = slot;
  outer.userData.tilt = tilt;
  return outer;
}

/**
 * The gum along an arch, as a closed horseshoe: a rounded ridge whose margin follows each tooth's CEJ, rises into a
 * papilla between teeth and closes behind the last molars. Built in the lower-jaw frame; the upper one is mirrored.
 */
export function makeArchGum(jaw: Jaw, slots: Slot[], opts: { missing?: number[]; depth?: number } = {}): THREE.BufferGeometry {
  const curve = archCurve(jaw);
  const L = curve.getLength();
  const ordered = [...slots].sort((a, b) => a.s - b.s);
  const present = ordered.filter((sl) => !opts.missing?.includes(sl.fdi));
  const sMin = Math.min(...present.map((p) => p.s - p.info.dims.md / 2)) - 2.5;
  const sMax = Math.max(...present.map((p) => p.s + p.info.dims.md / 2)) + 2.5;
  const depth = opts.depth ?? 17;
  const sign = jaw === 'upper' ? -1 : 1;
  const nearest = (s: number) => {
    let best = ordered[0];
    let bd = Infinity;
    for (const sl of ordered) {
      const d = Math.abs(sl.s - s);
      if (d < bd) {
        bd = d;
        best = sl;
      }
    }
    return best;
  };
  const contacts: number[] = [];
  for (let i = 0; i < present.length - 1; i++) {
    const a = present[i];
    const b = present[i + 1];
    if (b.s - a.s < (a.info.dims.md + b.info.dims.md) / 2 + 1.5) contacts.push((a.s + a.info.dims.md / 2 + b.s - b.info.dims.md / 2) / 2);
  }
  const point = (s: number) => {
    const u = Math.min(1, Math.abs(s) / L);
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).setY(0).normalize();
    const n = new THREE.Vector3(t.z, 0, -t.x);
    if (s > 0) {
      p.x = -p.x;
      n.x = -n.x;
    }
    return { p, n };
  };
  const STATIONS = 200;
  const PROFILE = 36;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= STATIONS; i++) {
    const s = lerp(sMin, sMax, i / STATIONS);
    const { p, n } = point(s);
    const sl = nearest(s);
    const halfBL = lerp(sl.info.dims.blC / 2, sl.info.dims.bl / 2, 0.4) + 0.9;
    let margin = -sl.info.dims.crownH * Math.cos(sl.tilt) + 1.1;
    for (const c of contacts) margin += 2.3 * Math.exp(-(((s - c) / 1.35) ** 2));
    if (opts.missing?.includes(sl.fdi)) margin -= 1.0;
    const endFade = Math.min(1, (s - sMin) / 3.2, (sMax - s) / 3.2);
    const k = Math.sqrt(Math.max(0.02, endFade * (2 - endFade)));
    for (let j = 0; j < PROFILE; j++) {
      const a = (j / PROFILE) * Math.PI * 2;
      const yy = se(Math.sin(a), 2.6);
      const along = se(Math.cos(a), 2.6);
      const widen = 1 + 0.32 * (1 - yy) * 0.5;
      const off = along * halfBL * widen * k;
      const yTop = margin;
      const y = lerp(yTop - depth, yTop, (yy + 1) / 2);
      const yC = lerp(y, yTop - depth * 0.45, 1 - k);
      pos.push(p.x + n.x * off, sign * yC, p.z + n.z * off);
    }
  }
  const ring = (i: number, j: number) => i * PROFILE + (j % PROFILE);
  for (let i = 0; i < STATIONS; i++)
    for (let j = 0; j < PROFILE; j++) {
      const a = ring(i, j);
      const b = ring(i, j + 1);
      const c = ring(i + 1, j + 1);
      const d = ring(i + 1, j);
      if (jaw === 'upper') idx.push(a, b, d, b, c, d);
      else idx.push(a, d, b, b, d, c);
    }
  // end caps
  for (const end of [0, STATIONS]) {
    const centre = pos.length / 3;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < PROFILE; j++) {
      cx += pos[ring(end, j) * 3];
      cy += pos[ring(end, j) * 3 + 1];
      cz += pos[ring(end, j) * 3 + 2];
    }
    pos.push(cx / PROFILE, cy / PROFILE, cz / PROFILE);
    for (let j = 0; j < PROFILE; j++) {
      const a = ring(end, j);
      const b = ring(end, j + 1);
      const flipCap = (end !== 0) !== (jaw === 'upper');
      if (flipCap) idx.push(a, centre, b);
      else idx.push(a, b, centre);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------------------------------------------- implants

export type ImplantSpec = { diameter: number; length: number; pitch?: number };

type LatheRing = { y: number; r: (theta: number) => number };

/** A closed surface from rings around the y axis, each with its own radius function (threads, hexes). */
function ringSurface(rings: LatheRing[], U: number, poles: { bottom?: number; top?: number }): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const wire: number[] = [];
  const R = rings.length;
  for (const ring of rings)
    for (let j = 0; j < U; j++) {
      const th = (j / U) * Math.PI * 2;
      const r = ring.r(th);
      pos.push(Math.cos(th) * r, ring.y, Math.sin(th) * r);
    }
  for (let i = 0; i < R - 1; i++)
    for (let j = 0; j < U; j++) {
      const a = i * U + j;
      const b = i * U + ((j + 1) % U);
      const c = (i + 1) * U + ((j + 1) % U);
      const d = (i + 1) * U + j;
      // rings run top → bottom here: flip the winding so normals point out
      idx.push(a, b, d, b, c, d);
    }
  if (poles.top !== undefined) {
    const t = pos.length / 3;
    pos.push(0, poles.top, 0);
    for (let j = 0; j < U; j++) idx.push(j, t, (j + 1) % U);
  }
  if (poles.bottom !== undefined) {
    const b = pos.length / 3;
    pos.push(0, poles.bottom, 0);
    for (let j = 0; j < U; j++) idx.push((R - 1) * U + j, (R - 1) * U + ((j + 1) % U), b);
  }
  const P = (k: number) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
  const every = Math.max(1, Math.floor(R / 40));
  for (let i = 0; i < R; i += every) for (let j = 0; j < U; j++) wire.push(...P(i * U + j), ...P(i * U + ((j + 1) % U)));
  for (let j = 0; j < U; j += Math.max(1, Math.round(U / 12))) for (let i = 0; i < R - 1; i++) wire.push(...P(i * U + j), ...P((i + 1) * U + j));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.wire = new Float32Array(wire);
  return g;
}

const hex = (r: number) => (th: number) => {
  const a = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
  return r / Math.cos(a - Math.PI / 6);
};

/**
 * A tapered implant fixture: the platform at y = 0 with an internal hex, a polished collar, a true helical thread
 * (pitch 0.8 mm) and a rounded apex at y = -length. Ø 4.1 × 10 mm by default.
 */
export function implantFixtureGeometry(spec: ImplantSpec = { diameter: 4.1, length: 10 }): THREE.BufferGeometry {
  const R = spec.diameter / 2;
  const L = spec.length;
  const pitch = spec.pitch ?? 0.8;
  const depth = R * 0.17;
  const rings: LatheRing[] = [];
  // the hex socket, from its floor up to the platform
  rings.push({ y: -2.1, r: hex(R * 0.5) });
  rings.push({ y: -0.25, r: hex(R * 0.5) });
  rings.push({ y: 0, r: () => R * 0.6 });
  rings.push({ y: 0.02, r: () => R * 0.78 });
  rings.push({ y: 0, r: () => R - 0.05 });
  rings.push({ y: -0.12, r: () => R - 0.02 });
  rings.push({ y: -0.8, r: () => R - 0.03 });
  const threadTop = -0.95;
  const threadBottom = -L + 0.7;
  const rows = Math.ceil(((threadTop - threadBottom) / pitch) * 11);
  for (let i = 0; i <= rows; i++) {
    const y = lerp(threadTop, threadBottom, i / rows);
    const depthIn = -y;
    const taper = 1 - 0.2 * smoothstep(L - 3.6, L - 0.6, depthIn);
    const fadeIn = smoothstep(0.85, 1.6, depthIn);
    rings.push({
      y,
      r: (th) => {
        const phase = (((-y / pitch + th / (Math.PI * 2)) % 1) + 1) % 1;
        const tri = 1 - Math.abs(2 * phase - 1);
        const crest = Math.min(1, tri * 1.3);
        return (R - depth) * taper + depth * crest * fadeIn * taper;
      },
    });
  }
  const tipR = (R - depth) * 0.8;
  for (let k = 1; k <= 5; k++) {
    const a = (k / 6) * (Math.PI / 2);
    rings.push({ y: threadBottom - 0.7 * Math.sin(a), r: () => tipR * Math.cos(a) });
  }
  // the socket floor is the "top pole" of this ring list (it starts there)
  const g = ringSurface(rings, 64, { top: -2.1, bottom: -L });
  return g;
}

function lathe(points: [number, number][], segments = 64): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  const wire: number[] = [];
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rows = points.length;
  const at = (seg: number, row: number) => {
    const k = seg * rows + row;
    return [pos.getX(k), pos.getY(k), pos.getZ(k)];
  };
  for (let row = 0; row < rows; row++) for (let seg = 0; seg < segments; seg++) wire.push(...at(seg, row), ...at(seg + 1, row));
  for (let seg = 0; seg < segments; seg += 4) for (let row = 0; row < rows - 1; row++) wire.push(...at(seg, row), ...at(seg, row + 1));
  g.userData.wire = new Float32Array(wire);
  return g;
}

/** The healing cap that sits on the implant while the gum heals: a polished dome, 3 mm high. */
export function healingCapGeometry(diameter = 4.1): THREE.BufferGeometry {
  const R = diameter / 2;
  return lathe([
    [0.001, 0],
    [R - 0.05, 0],
    [R + 0.12, 0.5],
    [R + 0.35, 1.4],
    [R + 0.38, 2.4],
    [R + 0.3, 2.85],
    [R * 0.9, 3.1],
    [R * 0.55, 3.18],
    [R * 0.55, 2.95],
    [0.001, 2.95],
  ]);
}

/** The abutment: a gold-anodised collar through the gum and a tapered post for the crown, with a screw channel. */
export function abutmentGeometry(diameter = 4.1): THREE.BufferGeometry {
  const R = diameter / 2;
  return lathe(
    [
      [0.001, 0],
      [R - 0.05, 0],
      [R + 0.3, 0.9],
      [R + 0.62, 2.0],
      [R + 0.66, 2.35],
      [R + 0.1, 2.5],
      [R - 0.05, 2.62],
      [R - 0.3, 5.0],
      [R - 0.42, 6.2],
      [R - 0.6, 6.55],
      [0.95, 6.6],
      [0.82, 6.45],
      [0.82, 3.0],
      [0.001, 3.0],
    ],
    72,
  );
}

/** The small screw that holds the abutment in the implant. */
export function abutmentScrewGeometry(): THREE.BufferGeometry {
  const rings: LatheRing[] = [];
  rings.push({ y: 0.25, r: () => 0.001 });
  rings.push({ y: 0.25, r: hex(0.42) });
  rings.push({ y: 0, r: hex(0.42) });
  rings.push({ y: 0, r: () => 0.78 });
  rings.push({ y: -0.6, r: () => 0.78 });
  rings.push({ y: -0.8, r: () => 0.6 });
  rings.push({ y: -1.6, r: () => 0.6 });
  const rows = 60;
  for (let i = 0; i <= rows; i++) {
    const y = lerp(-1.7, -5.4, i / rows);
    rings.push({
      y,
      r: (th) => {
        const phase = (((-y / 0.4 + th / (Math.PI * 2)) % 1) + 1) % 1;
        return 0.5 + 0.12 * Math.min(1, (1 - Math.abs(2 * phase - 1)) * 1.3);
      },
    });
  }
  rings.push({ y: -5.6, r: () => 0.35 });
  return ringSurface(rings, 40, { bottom: -5.7 });
}

export type ImplantStage = 'fixture' | 'healing' | 'abutment' | 'crown';

/**
 * An implant as one group in the canonical frame: the fixture with its platform at the bone crest (y = `platform`), and
 * on it a healing cap, an abutment, or an abutment with a crown. Children are named fixture, cap, abutment, screw, crown.
 */
export function makeImplant(opts: { stage?: ImplantStage; spec?: ImplantSpec; fdi?: number; platform?: number; clip?: THREE.Plane[] } = {}): THREE.Group {
  const spec = opts.spec ?? { diameter: 4.1, length: 10 };
  const stage = opts.stage ?? 'healing';
  const group = new THREE.Group();
  const platform = opts.platform ?? -1.5;
  const fixture = new THREE.Mesh(implantFixtureGeometry(spec), titaniumMaterial({ clip: opts.clip }));
  fixture.name = 'fixture';
  fixture.position.y = platform;
  fixture.castShadow = true;
  group.add(fixture);
  if (stage === 'healing') {
    const cap = new THREE.Mesh(healingCapGeometry(spec.diameter), titaniumMaterial({ clip: opts.clip, roughness: 0.14, tint: '#D5D9DF' }));
    cap.name = 'cap';
    cap.position.y = platform;
    cap.castShadow = true;
    group.add(cap);
  }
  if (stage === 'abutment' || stage === 'crown') {
    const ab = new THREE.Mesh(abutmentGeometry(spec.diameter), anodisedMaterial({ clip: opts.clip }));
    ab.name = 'abutment';
    ab.position.y = platform;
    ab.castShadow = true;
    group.add(ab);
    const screw = new THREE.Mesh(abutmentScrewGeometry(), titaniumMaterial({ clip: opts.clip, tint: '#AEB4BE' }));
    screw.name = 'screw';
    screw.position.y = platform + 3.0;
    group.add(screw);
  }
  if (stage === 'crown') {
    const crown = makeCrownCap(opts.fdi ?? 36, zirconiaMaterial({ clip: opts.clip }));
    crown.name = 'crown';
    crown.position.y = platform + 2.3;
    group.add(crown);
  }
  return group;
}

// ----------------------------------------------------------------------------------------------------- orthodontics

/** A metal bracket with a slot for the wire, glued to the labial face. Faces +z; the slot runs along x. */
export function bracketGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = 1.6;
  const h = 1.5;
  const r = 0.45;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const base = new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  const wingShape = new THREE.Shape();
  wingShape.moveTo(-1.2, -0.5);
  wingShape.lineTo(1.2, -0.5);
  wingShape.lineTo(1.2, 0.5);
  wingShape.lineTo(-1.2, 0.5);
  wingShape.lineTo(-1.2, -0.5);
  const top = new THREE.ExtrudeGeometry(wingShape, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 });
  const t1 = top.clone().translate(0, 0.85, 0.45);
  const t2 = top.clone().translate(0, -0.85, 0.45);
  const merged = mergeSimple([base, t1, t2]);
  base.dispose();
  top.dispose();
  t1.dispose();
  t2.dispose();
  return merged;
}

/** Concatenates non-indexed or indexed geometries with the same attributes (position, normal). */
export function mergeSimple(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute | undefined;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      if (n) nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (g !== g0) g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (nor.length === pos.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  else out.computeVertexNormals();
  return out;
}

// ----------------------------------------------------------------------------------------------- gum and bone block

export type BlockState = {
  /** 0 … 1: the drill hole for the implant. */
  hole: number;
  /** 0 … 1: bone that has grown onto the threads. */
  integration: number;
  /** A bone graft (granules) in the socket. */
  graft: number;
  /** The socket of an extracted tooth (0 … 1, healing closes it). */
  socket: number;
  /** Gum opened over the site (0 … 1). */
  flap: number;
};

/**
 * A block of jaw in section, as in a textbook drawing: bone (dense cortex, spongy inside) under gum, cut open along
 * the front face (z = 0) and running back to z = -depth. The cut face is painted on a canvas, so a drill hole, bone
 * growing onto an implant or a graft can be drawn into it step by step with `paint(state)`.
 */
export function makeBoneBlock(opts: { width?: number; height?: number; depth?: number; gum?: number; implantR?: number; implantL?: number; platform?: number; clip?: THREE.Plane[] } = {}) {
  const W = opts.width ?? 26;
  const Hb = opts.height ?? 18;
  const D = opts.depth ?? 11;
  const gumT = opts.gum ?? 2.6;
  const implantR = opts.implantR ?? 2.05;
  const implantL = opts.implantL ?? 10;
  const platform = opts.platform ?? -0.4;
  const crest = 0;
  // bone outline in the x–y plane: a ridge with a softly rounded crest
  const bone = new THREE.Shape();
  const x0 = -W / 2;
  const x1 = W / 2;
  bone.moveTo(x0, -Hb);
  bone.lineTo(x1, -Hb);
  bone.lineTo(x1, crest - 1.2);
  bone.bezierCurveTo(x1, crest - 0.2, x1 - 1.4, crest, x1 - 3, crest);
  bone.lineTo(x0 + 3, crest);
  bone.bezierCurveTo(x0 + 1.4, crest, x0, crest - 0.2, x0, crest - 1.2);
  bone.lineTo(x0, -Hb);
  const gum = new THREE.Shape();
  gum.moveTo(x1 + 0.6, crest - 2.2);
  gum.bezierCurveTo(x1 + 0.6, crest + gumT - 0.4, x1 - 1, crest + gumT, x1 - 3, crest + gumT);
  gum.lineTo(x0 + 3, crest + gumT);
  gum.bezierCurveTo(x0 + 1, crest + gumT, x0 - 0.6, crest + gumT - 0.4, x0 - 0.6, crest - 2.2);
  gum.bezierCurveTo(x0 - 0.2, crest - 0.6, x0 + 0.6, crest + 0.05, x0 + 3, crest + 0.05);
  gum.lineTo(x1 - 3, crest + 0.05);
  gum.bezierCurveTo(x1 - 0.6, crest + 0.05, x1 + 0.2, crest - 0.6, x1 + 0.6, crest - 2.2);
  const extrude = (shape: THREE.Shape, depth: number) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4, curveSegments: 24 });
    g.translate(0, 0, -depth - 0.5);
    return g;
  };
  const boneGeo = extrude(bone, D);
  const gumGeo = extrude(gum, D + 0.6);
  gumGeo.translate(0, 0, 0.3);

  const SIZE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // shape coordinates (mm) → texture: x0 … x1, -Hb … crest + gumT + 1
  const top = crest + gumT + 1;
  const spanX = W + 2;
  const spanY = Hb + gumT + 1;
  const span = Math.max(spanX, spanY);
  tex.repeat.set(1 / span, 1 / span);
  tex.offset.set(-(x0 - 1) / span, -(-Hb) / span);
  const px = (x: number) => ((x - (x0 - 1)) / span) * SIZE;
  const py = (y: number) => SIZE - ((y + Hb) / span) * SIZE;
  const mm = SIZE / span;

  // a fixed scatter of trabecular pores
  const rnd = mulberry(7);
  const pores = Array.from({ length: 420 }, () => ({ x: lerp(x0 + 1.2, x1 - 1.2, rnd()), y: lerp(-Hb + 1.2, crest - 1.2, rnd()), r: lerp(0.18, 0.62, rnd() ** 1.6), a: rnd() * Math.PI }));
  const granules = Array.from({ length: 140 }, () => ({ x: (rnd() - 0.5) * 2, y: rnd(), r: lerp(0.12, 0.32, rnd()) }));

  const paint = (s: Partial<BlockState> = {}) => {
    const st: BlockState = { hole: 0, integration: 0, graft: 0, socket: 0, flap: 0, ...s };
    ctx.clearRect(0, 0, SIZE, SIZE);
    // bone: cortex first, then the spongy core
    const boneGrad = ctx.createLinearGradient(0, py(crest), 0, py(-Hb));
    boneGrad.addColorStop(0, '#F3E9D4');
    boneGrad.addColorStop(1, '#E7D7B6');
    ctx.fillStyle = boneGrad;
    ctx.beginPath();
    tracePath(ctx, bone, px, py);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    tracePath(ctx, bone, px, py);
    ctx.clip();
    ctx.fillStyle = '#E6CFA6';
    ctx.fillRect(px(x0 + 1.1), py(crest - 1.1), (W - 2.2) * mm, (Hb - 2.2) * mm);
    for (const p of pores) {
      ctx.fillStyle = `rgba(196,150,108,${0.28 + 0.3 * Math.sin(p.a) ** 2})`;
      ctx.beginPath();
      ctx.ellipse(px(p.x), py(p.y), p.r * mm, p.r * mm * 0.7, p.a, 0, Math.PI * 2);
      ctx.fill();
    }
    // a soft vignette inside the bone
    const vg = ctx.createRadialGradient(px(0), py(-Hb / 2), 0, px(0), py(-Hb / 2), (W / 1.6) * mm);
    vg.addColorStop(0, 'rgba(255,248,236,0)');
    vg.addColorStop(1, 'rgba(160,120,80,0.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // socket of an extracted tooth, healing (graft granules inside)
    if (st.socket > 0 || st.graft > 0) {
      const sw = 3.2 * Math.max(st.socket, st.graft * 0.9);
      ctx.fillStyle = `rgba(150,40,50,${0.5 * st.socket})`;
      ctx.beginPath();
      ctx.ellipse(px(0), py(-4), sw * mm, 4.6 * mm, 0, 0, Math.PI * 2);
      ctx.fill();
      if (st.graft > 0)
        for (const g of granules) {
          ctx.fillStyle = `rgba(255,252,244,${0.85 * st.graft})`;
          ctx.beginPath();
          ctx.arc(px(g.x * 2.8), py(-0.6 - g.y * 7.5), g.r * mm, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    // the drill hole (osteotomy) and the bone that grows back onto the threads
    if (st.hole > 0) {
      const holeL = implantL * st.hole;
      const r = implantR * (0.86 + 0.14 * st.hole);
      ctx.fillStyle = '#4A1F22';
      ctx.beginPath();
      ctx.moveTo(px(-r), py(crest + 0.1));
      ctx.lineTo(px(-r * 0.92), py(platform - holeL + 1.0));
      ctx.quadraticCurveTo(px(0), py(platform - holeL - 0.3), px(r * 0.92), py(platform - holeL + 1.0));
      ctx.lineTo(px(r), py(crest + 0.1));
      ctx.closePath();
      ctx.fill();
      if (st.integration > 0) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = `rgba(240,226,196,${0.9 * st.integration})`;
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.strokeStyle = `rgba(214,182,132,${0.6 * st.integration})`;
        ctx.lineWidth = 1.5;
        for (let y = crest; y > platform - holeL; y -= 0.8) {
          ctx.beginPath();
          ctx.moveTo(px(-r), py(y));
          ctx.lineTo(px(r), py(y - 0.4));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
    // the cortex line around the bone
    ctx.lineWidth = 1.05 * mm;
    ctx.strokeStyle = '#FBF5E8';
    ctx.beginPath();
    tracePath(ctx, bone, px, py);
    ctx.stroke();
    ctx.lineWidth = 0.15 * mm;
    ctx.strokeStyle = 'rgba(170,130,90,0.5)';
    ctx.stroke();
    // gum
    const gg = ctx.createLinearGradient(0, py(crest + gumT), 0, py(crest - 2));
    gg.addColorStop(0, '#F59AA7');
    gg.addColorStop(1, '#E36E80');
    ctx.fillStyle = gg;
    ctx.beginPath();
    tracePath(ctx, gum, px, py);
    ctx.fill();
    if (st.flap > 0 || st.hole > 0) {
      // the gum opened over the implant
      const r = implantR * 1.05;
      ctx.clearRect(px(-r), py(crest + gumT + 0.5), 2 * r * mm, (gumT + 0.6) * mm);
    }
    ctx.lineWidth = 0.12 * mm;
    ctx.strokeStyle = 'rgba(160,40,60,0.45)';
    ctx.stroke();
    tex.needsUpdate = true;
  };
  paint();

  const capMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.02, roughness: 0.7, metalness: 0, clippingPlanes: opts.clip ?? null });
  const boneMesh = new THREE.Mesh(boneGeo, [capMat, boneMaterial({ clip: opts.clip })]);
  const gumMat = gumMaterial({ opacity: 1, clip: opts.clip });
  const gumMesh = new THREE.Mesh(gumGeo, [capMat, gumMat]);
  boneMesh.receiveShadow = true;
  gumMesh.receiveShadow = true;
  boneMesh.name = 'bone';
  gumMesh.name = 'gum';
  const group = new THREE.Group();
  group.add(boneMesh, gumMesh);
  return { group, bone: boneMesh, gum: gumMesh, paint, texture: tex, canvas, dispose: () => tex.dispose() };
}

function tracePath(ctx: CanvasRenderingContext2D, shape: THREE.Shape, px: (x: number) => number, py: (y: number) => number) {
  const pts = shape.getPoints(32);
  pts.forEach((p, i) => (i ? ctx.lineTo(px(p.x), py(p.y)) : ctx.moveTo(px(p.x), py(p.y))));
  ctx.closePath();
}

/** A small seeded random, so a drawing looks the same every time. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------------------------------------ the cut-away face

export type SectionStyle = {
  /** Pulp: healthy, inflamed (red glow), cleaned (empty canals), filled (gutta-percha). */
  pulp?: 'healthy' | 'inflamed' | 'open' | 'cleaned' | 'filled' | 'none';
  /** An access opening through the crown into the chamber (0 … 1). */
  access?: number;
  /** A temporary filling in the access opening. */
  temporary?: number;
  /** Decay (caries) in the occlusal fissure: 0 none … 1 into the dentin; `removed` drills it out, `filled` restores. */
  decay?: number;
  decayRemoved?: number;
  decayFilled?: number;
  /** Highlight colour of a restoration (blue in the app). */
  fillColor?: string;
  /** The crown cut down for a crown (0 … 1). */
  prep?: number;
  /** A zirconia crown over the prepared tooth (0 … 1). */
  crown?: number;
};

/**
 * Paints a tooth's section (plane z = 0) on a canvas: enamel with its fine prisms, dentin, the pulp and its canals,
 * and treatment states for the explainers. Returns a plane mesh that sits exactly on the cut.
 */
export function makeSectionFace(fdi: number, opts: { size?: number; clip?: THREE.Plane[] } = {}) {
  const parts = toothParts(fdi, 'high');
  const { bounds } = parts.section;
  const pad = 0.6;
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minY = bounds.minY - pad;
  const maxY = bounds.maxY + pad;
  const w = maxX - minX;
  const h = maxY - minY;
  const SIZE = opts.size ?? 1024;
  const scale = SIZE / Math.max(w, h);
  const cw = Math.ceil(w * scale);
  const ch = Math.ceil(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  const X = (x: number) => (x - minX) * scale;
  const Y = (y: number) => (maxY - y) * scale;
  const path = (poly: Poly) => {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.closePath();
  };
  /** Several outlines as one path (for clipping to their union). */
  const multi = (polys: Poly[]) => {
    ctx.beginPath();
    for (const poly of polys) {
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
    }
  };
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const top = parts.top;
  const rnd = mulberry(fdi);
  const tubules = Array.from({ length: 160 }, () => ({ x: lerp(minX, maxX, rnd()), y: lerp(minY, top, rnd()), l: lerp(0.6, 1.6, rnd()) }));

  const paint = (style: SectionStyle = {}) => {
    const st = { pulp: 'healthy', access: 0, temporary: 0, decay: 0, decayRemoved: 0, decayFilled: 0, fillColor: '#F4EEE2', prep: 0, crown: 0, ...style } as Required<SectionStyle>;
    ctx.clearRect(0, 0, cw, ch);
    // roots and dentin
    for (const poly of parts.section.outer) {
      path(poly);
      ctx.fillStyle = '#E8CD98';
      ctx.fill();
    }
    // cementum line
    ctx.lineWidth = Math.max(1, 0.12 * scale);
    ctx.strokeStyle = '#D6B783';
    for (const poly of parts.section.outer) {
      path(poly);
      ctx.stroke();
    }
    // enamel cap, then dentin inside it
    for (const poly of parts.section.enamel) {
      path(poly);
      const g = ctx.createLinearGradient(0, Y(top), 0, Y(0));
      if (st.crown > 0.5) {
        // zirconia: brighter and warmer than enamel, no prisms
        g.addColorStop(0, '#FFFEFA');
        g.addColorStop(1, '#F5E6C8');
      } else {
        g.addColorStop(0, '#FFFFFF');
        g.addColorStop(0.7, '#F6F2EA');
        g.addColorStop(1, '#EFE5D2');
      }
      ctx.fillStyle = g;
      ctx.fill();
    }
    // prisms: fine radial strokes in the enamel
    ctx.save();
    multi(parts.section.enamel);
    ctx.clip();
    ctx.strokeStyle = st.crown > 0.5 ? 'rgba(0,0,0,0)' : 'rgba(190,200,215,0.28)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x = lerp(minX, maxX, i / 90);
      ctx.beginPath();
      ctx.moveTo(X(x), Y(0));
      ctx.lineTo(X(x * 1.1), Y(top + 1));
      ctx.stroke();
    }
    ctx.restore();
    for (const poly of parts.section.dentin) {
      path(poly);
      const g = ctx.createLinearGradient(0, Y(top), 0, Y(parts.apex));
      g.addColorStop(0, '#EED39F');
      g.addColorStop(1, '#DDBB80');
      ctx.fillStyle = g;
      ctx.fill();
    }
    // dentinal tubules
    ctx.save();
    multi(parts.section.dentin);
    ctx.clip();
    ctx.strokeStyle = 'rgba(176,132,76,0.16)';
    for (const t of tubules) {
      ctx.beginPath();
      ctx.moveTo(X(t.x), Y(t.y));
      ctx.quadraticCurveTo(X(t.x + t.l * 0.2), Y(t.y + t.l * 0.5), X(t.x + t.l * 0.1), Y(t.y + t.l));
      ctx.stroke();
    }
    ctx.restore();
    // the pulp
    if (st.pulp !== 'none') {
      for (const poly of parts.section.pulp) {
        path(poly);
        if (st.pulp === 'healthy') {
          const g = ctx.createLinearGradient(0, Y(top * 0.4), 0, Y(parts.apex));
          g.addColorStop(0, '#EE8C93');
          g.addColorStop(1, '#D9707D');
          ctx.fillStyle = g;
        } else if (st.pulp === 'inflamed') ctx.fillStyle = '#D8323F';
        else if (st.pulp === 'open' || st.pulp === 'cleaned') ctx.fillStyle = st.pulp === 'open' ? '#B8434C' : '#FFF8EE';
        else ctx.fillStyle = '#E8743A';
        ctx.fill();
        if (st.pulp === 'cleaned') {
          ctx.strokeStyle = 'rgba(150,120,90,0.6)';
          ctx.lineWidth = Math.max(1, 0.06 * scale);
          ctx.stroke();
        }
      }
      if (st.pulp === 'inflamed') {
        const cx = X(0);
        const cy = Y(top * 0.2);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6 * scale);
        g.addColorStop(0, 'rgba(255,60,70,0.55)');
        g.addColorStop(1, 'rgba(255,60,70,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        // a small dark spot at the apex: inflammation in the bone
        const ay = Y(parts.apex);
        const ga = ctx.createRadialGradient(X(0), ay, 0, X(0), ay, 2.4 * scale);
        ga.addColorStop(0, 'rgba(120,20,30,0.55)');
        ga.addColorStop(1, 'rgba(120,20,30,0)');
        ctx.fillStyle = ga;
        ctx.fillRect(0, 0, cw, ch);
      }
    }
    // decay in the occlusal fissure, its removal and the filling
    if (st.decay > 0) {
      const depth = lerp(0.6, top * 0.45, st.decay);
      const r = lerp(0.6, 2.1, st.decay);
      const cy = top - 0.6 - depth / 2;
      ctx.save();
      multi(parts.section.outer);
      ctx.clip();
      if (st.decayRemoved < 1 || st.decayFilled > 0) {
        if (st.decayFilled > 0) ctx.fillStyle = st.fillColor;
        else ctx.fillStyle = `rgba(92,60,30,${0.85 * (1 - st.decayRemoved)})`;
        ctx.beginPath();
        ctx.ellipse(X(0.2), Y(cy), r * scale, (depth / 2 + 0.9) * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (st.decayRemoved > 0 && st.decayFilled < 1) {
        ctx.fillStyle = `rgba(250,246,238,${st.decayRemoved * (1 - st.decayFilled)})`;
        ctx.beginPath();
        ctx.ellipse(X(0.2), Y(cy), r * scale, (depth / 2 + 0.9) * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(120,100,80,${0.5 * st.decayRemoved})`;
        ctx.stroke();
      }
      ctx.restore();
    }
    // the access opening for a root canal, and the temporary filling in it
    if (st.access > 0) {
      const aw = lerp(0.4, 1.7, st.access);
      ctx.fillStyle = st.temporary > 0 ? `rgba(236,232,224,1)` : '#3A1A1E';
      ctx.beginPath();
      ctx.moveTo(X(-aw - 0.4), Y(top + 1));
      ctx.lineTo(X(-aw * 0.7), Y(top * lerp(1, 0.35, st.access)));
      ctx.lineTo(X(aw * 0.7), Y(top * lerp(1, 0.35, st.access)));
      ctx.lineTo(X(aw + 0.4), Y(top + 1));
      ctx.closePath();
      ctx.save();
      multi(parts.section.outer);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(X(-aw - 0.4), Y(top + 1));
      ctx.lineTo(X(-aw * 0.7), Y(top * lerp(1, 0.35, st.access)));
      ctx.lineTo(X(aw * 0.7), Y(top * lerp(1, 0.35, st.access)));
      ctx.lineTo(X(aw + 0.4), Y(top + 1));
      ctx.closePath();
      ctx.fill();
      if (st.temporary > 0) {
        ctx.strokeStyle = 'rgba(160,150,140,0.8)';
        ctx.lineWidth = Math.max(1, 0.08 * scale);
        ctx.stroke();
      }
      ctx.restore();
    }
    // a zirconia crown: the enamel shell becomes ceramic, with the cement line of the prepared stump inside it
    if (st.crown > 0) {
      ctx.save();
      ctx.globalAlpha = st.crown;
      ctx.strokeStyle = 'rgba(176,144,92,0.75)';
      ctx.lineWidth = Math.max(1, 0.1 * scale);
      ctx.setLineDash([0.35 * scale, 0.25 * scale]);
      for (const poly of parts.section.dentin) {
        const cut = poly.filter(([, y]) => y > 0.3);
        if (cut.length < 2) continue;
        ctx.beginPath();
        cut.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y + 0.15)) : ctx.moveTo(X(x), Y(y + 0.15))));
        ctx.stroke();
      }
      ctx.restore();
    }
    // a crown preparation: the outer shell taken away
    if (st.prep > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 2.2 * scale * st.prep;
      ctx.lineJoin = 'round';
      for (const poly of parts.section.enamel) {
        const cut = poly.filter(([, y]) => y > 0.6);
        if (cut.length < 2) continue;
        ctx.beginPath();
        cut.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
        ctx.stroke();
      }
      ctx.restore();
    }
    tex.needsUpdate = true;
  };
  paint();
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(minX + w / 2, minY + h / 2, 0.012);
  // unlit and not tone-mapped: the cut face shows exactly the colours it was painted with
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, toneMapped: false, clippingPlanes: opts.clip ?? null });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'section';
  return { mesh, paint, texture: tex, dispose: () => tex.dispose() };
}

// ------------------------------------------------------------------------------------------------------- helpers

/** A soft radial gradient on a canvas, for contact shadows and glows. */
export function radialTexture(inner: string, outer: string, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft contact shadow under an object: a blurred dark ellipse on the floor. */
export function contactShadow(width: number, depth: number, opacity = 0.32): THREE.Mesh {
  const tex = radialTexture('rgba(11,26,58,1)', 'rgba(11,26,58,0)');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}

/** Disposes geometries (unless shared), materials and their textures under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.userData.sharedGeometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}

/** Frees the cached tooth geometries (only when no scene uses them any more). */
export function clearToothCache() {
  for (const p of partsCache.values()) {
    p.geometry.dispose();
    p.crown.dispose();
    p.pulp.dispose();
    p.dentin.dispose();
  }
  partsCache.clear();
}
