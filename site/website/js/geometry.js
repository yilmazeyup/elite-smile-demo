// Dental objects drawn with code, in millimetres: teeth, a zirconia crown, a veneer, a bracket, an implant and a retainer.
// Organic shapes are signed distance functions turned into meshes with surface nets; turned parts (the implant, the
// abutment) are lathes. Nothing here is a scan: simplified shapes, true to proportion, not to any patient.
import * as THREE from 'three';

// --------------------------------------------------------------------------------------------- signed distances

const hypot3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

export const sphere = (cx, cy, cz, r) => (x, y, z) => hypot3(x - cx, y - cy, z - cz) - r;

export const ellipsoid = (cx, cy, cz, rx, ry, rz) => (x, y, z) => {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const k1 = Math.sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
};

export const roundBox = (cx, cy, cz, bx, by, bz, r) => (x, y, z) => {
  const qx = Math.abs(x - cx) - bx + r, qy = Math.abs(y - cy) - by + r, qz = Math.abs(z - cz) - bz + r;
  return hypot3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

/** A cone with round ends, from a (radius r1) to b (radius r2). */
export const roundCone = (a, b, r1, r2) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const xvx = pax * l2 - bax * yy, xvy = pay * l2 - bay * yy, xvz = paz * l2 - baz * yy;
    const x2 = xvx * xvx + xvy * xvy + xvz * xvz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  };
};

export const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a, b, k) => -smin(-a, -b, k);

const unionAll = (fns, k) => (x, y, z) => {
  let d = fns[0](x, y, z);
  for (let i = 1; i < fns.length; i++) d = smin(d, fns[i](x, y, z), k);
  return d;
};

// ------------------------------------------------------------------------------------------------- surface nets

const EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * Turns a distance function into a smooth indexed mesh. `res` is the number of cells along the longest side of the
 * box; normals come from the field's gradient, and each quad is wound to face along it.
 */
export function meshSDF(sdf, min, max, res, { color } = {}) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const step = Math.max(...size) / res;
  const nx = Math.ceil(size[0] / step), ny = Math.ceil(size[1] / step), nz = Math.ceil(size[2] / step);
  const cx = nx + 1, cy = ny + 1, cz = nz + 1;
  const values = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) {
    const z = min[2] + k * step;
    for (let j = 0; j < cy; j++) {
      const y = min[1] + j * step;
      let o = cx * (j + cy * k);
      for (let i = 0; i < cx; i++) values[o++] = sdf(min[0] + i * step, y, z);
    }
  }
  const at = (i, j, k) => values[i + cx * (j + cy * k)];
  const cellIndex = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corner = new Float32Array(8);
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1));
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a], vb = corner[b];
          if (va < 0 === vb < 0) continue;
          const tt = va / (va - vb);
          sx += (a & 1) + ((b & 1) - (a & 1)) * tt;
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * tt;
          sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * tt;
          n++;
        }
        cellIndex[i + nx * (j + ny * k)] = pos.length / 3;
        pos.push(min[0] + (i + sx / n) * step, min[1] + (j + sy / n) * step, min[2] + (k + sz / n) * step);
      }
    }
  }
  const cell = (i, j, k) => cellIndex[i + nx * (j + ny * k)];
  const quads = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) quads.push(a, d, c, b);
    else quads.push(a, b, c, d);
  };
  for (let k = 0; k < cz; k++) {
    for (let j = 0; j < cy; j++) {
      for (let i = 0; i < cx; i++) {
        const v0 = at(i, j, k) < 0;
        if (i < nx && j > 0 && k > 0 && j < ny && k < nz && v0 !== at(i + 1, j, k) < 0)
          quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), v0);
        if (j < ny && i > 0 && k > 0 && i < nx && k < nz && v0 !== at(i, j + 1, k) < 0)
          quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), v0);
        if (k < nz && i > 0 && j > 0 && i < nx && j < ny && v0 !== at(i, j, k + 1) < 0)
          quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), v0);
      }
    }
  }
  // Normals from the field.
  const count = pos.length / 3;
  const normals = new Float32Array(count * 3);
  const h = step * 0.5;
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = sdf(x + h, y, z) - sdf(x - h, y, z);
    let gy = sdf(x, y + h, z) - sdf(x, y - h, z);
    let gz = sdf(x, y, z + h) - sdf(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    normals[v * 3] = gx / l;
    normals[v * 3 + 1] = gy / l;
    normals[v * 3 + 2] = gz / l;
  }
  // Wind every quad along the gradient, split along the shorter diagonal.
  const index = [];
  const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  for (let q = 0; q < quads.length; q += 4) {
    let [a, b, c, d] = [quads[q], quads[q + 1], quads[q + 2], quads[q + 3]];
    const pa = P(a), pb = P(b), pc = P(c);
    const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
    const wx = pc[0] - pa[0], wy = pc[1] - pa[1], wz = pc[2] - pa[2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    const nxv = normals[a * 3] + normals[c * 3], nyv = normals[a * 3 + 1] + normals[c * 3 + 1], nzv = normals[a * 3 + 2] + normals[c * 3 + 2];
    if (fx * nxv + fy * nyv + fz * nzv < 0) [b, d] = [d, b];
    const pd = P(d);
    const ac = Math.hypot(pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]);
    const bd = Math.hypot(pd[0] - P(b)[0], pd[1] - P(b)[1], pd[2] - P(b)[2]);
    if (ac <= bd) index.push(a, b, c, a, c, d);
    else index.push(a, b, d, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (color) {
    const colors = new Float32Array(count * 3);
    const tmp = new THREE.Color();
    for (let v = 0; v < count; v++) {
      color(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], tmp);
      colors.set([tmp.r, tmp.g, tmp.b], v * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  geometry.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// ------------------------------------------------------------------------------------------------------- teeth

/** Typical sizes in mm: width (mesio-distal), thickness (labio-lingual), crown height, root length, roots. */
export const TOOTH_SIZES = {
  upper: [
    { kind: 'incisor', w: 8.6, t: 7.0, ch: 10.5, rl: 13, roots: 1 },
    { kind: 'incisor', w: 6.6, t: 6.0, ch: 9.0, rl: 13, roots: 1 },
    { kind: 'canine', w: 7.6, t: 8.0, ch: 10.0, rl: 17, roots: 1 },
    { kind: 'premolar', w: 7.0, t: 9.0, ch: 8.5, rl: 14, roots: 1 },
    { kind: 'premolar', w: 6.6, t: 9.0, ch: 7.8, rl: 14, roots: 1 },
    { kind: 'molar', w: 10.2, t: 11.0, ch: 7.5, rl: 12.5, roots: 3 },
    { kind: 'molar', w: 9.0, t: 11.0, ch: 7.0, rl: 11.5, roots: 3 },
  ],
  lower: [
    { kind: 'incisor', w: 5.2, t: 5.8, ch: 9.0, rl: 12.5, roots: 1 },
    { kind: 'incisor', w: 5.8, t: 6.2, ch: 9.2, rl: 14, roots: 1 },
    { kind: 'canine', w: 7.0, t: 7.6, ch: 10.5, rl: 16, roots: 1 },
    { kind: 'premolar', w: 7.0, t: 7.8, ch: 8.0, rl: 14, roots: 1 },
    { kind: 'premolar', w: 7.2, t: 8.2, ch: 7.8, rl: 14.5, roots: 1 },
    { kind: 'molar', w: 11.2, t: 10.4, ch: 7.5, rl: 14, roots: 2 },
    { kind: 'molar', w: 10.5, t: 10.0, ch: 7.0, rl: 13, roots: 2 },
  ],
};

/** The crown alone, cut at the gum line (y = 0), pointing up (+y); labial is +z. */
export function crownSDF(s) {
  const { w, t, ch } = s;
  if (s.kind === 'incisor') {
    return unionAll([
      ellipsoid(0, ch * 0.4, 0, w * 0.5, ch * 0.62, t * 0.5),
      roundBox(0, ch * 0.7, t * 0.02, w * 0.46, ch * 0.3, t * 0.14, t * 0.12),
    ], t * 0.45);
  }
  if (s.kind === 'canine') {
    return unionAll([
      ellipsoid(0, ch * 0.4, 0, w * 0.5, ch * 0.58, t * 0.5),
      ellipsoid(0, ch * 0.78, t * 0.04, w * 0.24, ch * 0.26, t * 0.3),
    ], 2.2);
  }
  if (s.kind === 'premolar') {
    const body = unionAll([
      ellipsoid(0, ch * 0.42, 0, w * 0.5, ch * 0.55, t * 0.5),
      sphere(0, ch * 0.78, t * 0.2, t * 0.24),
      sphere(0, ch * 0.74, -t * 0.2, t * 0.21),
    ], 1.6);
    const groove = ellipsoid(0, ch * 1.02, 0, w * 0.32, ch * 0.1, t * 0.07);
    return (x, y, z) => smax(body(x, y, z), -groove(x, y, z), 0.8);
  }
  // Molar: a boxy body, four cusps and a central fossa.
  const cusps = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => sphere(sx * w * 0.22, ch * 0.78, sz * t * 0.2, w * 0.21)));
  const body = unionAll([
    ellipsoid(0, ch * 0.42, 0, w * 0.53, ch * 0.6, t * 0.51),
    roundBox(0, ch * 0.42, 0, w * 0.4, ch * 0.32, t * 0.37, 1.4),
    ...cusps,
  ], 1.7);
  const fossa = sphere(0, ch * 1.12, 0, w * 0.2);
  return (x, y, z) => smax(body(x, y, z), -fossa(x, y, z), 1.1);
}

/** The roots, from the gum line (y = 0) down to the apex. */
function rootSDF(s) {
  const { w, t, rl } = s;
  if (s.roots === 1) {
    const r0 = Math.min(w, t) * 0.36;
    return roundCone([0, 1.2, 0], [0, -rl, -0.4], r0, 1.05);
  }
  const trunk = roundCone([0, 1.2, 0], [0, -3.2, 0], Math.min(w, t) * 0.42, Math.min(w, t) * 0.34);
  if (s.roots === 2) {
    return unionAll([
      trunk,
      roundCone([-w * 0.24, -2.4, 0], [-w * 0.3, -rl, 0.2], w * 0.19, 1.05),
      roundCone([w * 0.24, -2.4, 0], [w * 0.22, -rl + 0.8, 0.2], w * 0.18, 1.05),
    ], 1.4);
  }
  return unionAll([
    trunk,
    roundCone([-w * 0.24, -2.2, t * 0.16], [-w * 0.32, -rl + 1, t * 0.2], w * 0.16, 0.7),
    roundCone([w * 0.24, -2.2, t * 0.16], [w * 0.28, -rl + 1.5, t * 0.22], w * 0.15, 0.7),
    roundCone([0, -2.2, -t * 0.2], [0, -rl, -t * 0.42], w * 0.18, 0.8),
  ], 1.4);
}

export function toothSDF(s) {
  const crown = crownSDF(s);
  const root = rootSDF(s);
  return (x, y, z) => smin(crown(x, y, z), root(x, y, z), 1.6);
}

/** The pulp: a chamber in the crown and a canal down every root. */
export function pulpSDF(s) {
  const { w, t, ch, rl } = s;
  const chamber = ellipsoid(0, ch * 0.22, 0, w * 0.2, ch * 0.24, t * 0.16);
  const canals = [];
  if (s.roots === 1) canals.push(roundCone([0, 0.5, 0], [0, -rl + 1, -0.35], 0.75, 0.16));
  else if (s.roots === 2) {
    canals.push(roundCone([-w * 0.18, -1, 0], [-w * 0.3, -rl + 1.2, 0.2], 0.55, 0.15));
    canals.push(roundCone([w * 0.18, -1, 0], [w * 0.22, -rl + 1.8, 0.2], 0.5, 0.15));
  } else {
    canals.push(roundCone([-w * 0.18, -1, t * 0.1], [-w * 0.32, -rl + 1.8, t * 0.2], 0.45, 0.14));
    canals.push(roundCone([w * 0.18, -1, t * 0.1], [w * 0.28, -rl + 2.2, t * 0.22], 0.45, 0.14));
    canals.push(roundCone([0, -1, -t * 0.12], [0, -rl + 1, -t * 0.4], 0.55, 0.15));
  }
  return unionAll([chamber, ...canals], 0.9);
}

const boundsOf = (s, crownOnly = false) => {
  const r = Math.max(s.w, s.t) * 0.62 + 1;
  return { min: [-r, crownOnly ? -1.5 : -s.rl - 1.5, -r], max: [r, s.ch + 1.5, r] };
};

const enamel = new THREE.Color('#F5F2EA');
const dentin = new THREE.Color('#E4D3B4');

export function toothGeometry(s, res = 44, { colors = false } = {}) {
  const b = boundsOf(s);
  const color = colors ? (x, y, z, out) => out.copy(dentin).lerp(enamel, THREE.MathUtils.smoothstep(y, -1.2, 1.2)) : undefined;
  return meshSDF(toothSDF(s), b.min, b.max, res, { color });
}

export function pulpGeometry(s, res = 40) {
  const b = boundsOf(s);
  return meshSDF(pulpSDF(s), b.min, b.max, res);
}

export function crownGeometry(s, res = 40) {
  const crown = crownSDF(s);
  const b = boundsOf(s, true);
  return meshSDF((x, y, z) => smax(crown(x, y, z), -y, 0.6), b.min, b.max, res);
}

// --------------------------------------------------------------------------------------------- catalogue models

const MOLAR = TOOTH_SIZES.lower[5];
const INCISOR = TOOTH_SIZES.upper[0];

/** A zirconia crown: the molar's outside, hollow inside where the prepared tooth goes. */
export function zirconiaCrownGeometry(res = 64) {
  const outer = crownSDF(MOLAR);
  const prep = (x, y, z) => {
    const taper = 1 - 0.05 * y;
    return roundBox(0, 2.2, 0, MOLAR.w * 0.33, 3.3, MOLAR.t * 0.3, 1.3)(x / taper, y, z / taper);
  };
  const sdf = (x, y, z) => smax(smax(outer(x, y, z), -prep(x, y, z), 0.5), -(y + 0.2), 0.4);
  const b = boundsOf(MOLAR, true);
  return meshSDF(sdf, b.min, b.max, res);
}

/** A veneer: a 0.7 mm shell of the front tooth's labial face. */
export function veneerGeometry(res = 72) {
  const outer = crownSDF(INCISOR);
  const sdf = (x, y, z) => {
    const shell = Math.max(outer(x, y, z), -(outer(x, y, z) + 0.7));
    return smax(smax(shell, -(z - 0.4), 0.3), -(y - 0.6), 0.3);
  };
  return meshSDF(sdf, [-5.4, -0.5, -1], [5.4, 11.6, 4.6], res);
}

/** A twin bracket: base pad, body, four tie-wings and the slot for the archwire. */
export function bracketGeometry(res = 80) {
  const solid = unionAll([
    roundBox(0, 0, 0.22, 1.85, 1.65, 0.22, 0.16),
    roundBox(0, 0, 0.9, 1.25, 1.05, 0.55, 0.14),
    roundBox(-0.95, 1.12, 1.25, 0.42, 0.34, 0.36, 0.13),
    roundBox(0.95, 1.12, 1.25, 0.42, 0.34, 0.36, 0.13),
    roundBox(-0.95, -1.12, 1.25, 0.42, 0.34, 0.36, 0.13),
    roundBox(0.95, -1.12, 1.25, 0.42, 0.34, 0.36, 0.13),
  ], 0.12);
  const slot = roundBox(0, 0, 1.5, 3, 0.28, 0.5, 0.02);
  const vertical = roundBox(0, 0, 1.7, 0.18, 3, 0.25, 0.02);
  const sdf = (x, y, z) => smax(smax(solid(x, y, z), -slot(x, y, z), 0.05), -vertical(x, y, z), 0.05);
  return meshSDF(sdf, [-2.2, -2.2, -0.2], [2.2, 2.2, 1.9], res);
}

function lathe(points, segments = 72) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  g.computeVertexNormals();
  g.userData.profile = points;
  return g;
}

const lathePoints = (g) => g.userData.profile.map(([r, y]) => new THREE.Vector2(r, y));

/** The implant: a tapered titanium screw (10 mm), its collar and platform. */
export function implantGeometry() {
  const pts = [[0, 0], [0.7, 0.05], [1.2, 0.35], [1.45, 0.8]];
  const pitch = 0.8;
  for (let y = 1.0; y < 8.9; y += pitch) {
    const core = 1.42 + 0.3 * THREE.MathUtils.smoothstep(y, 0, 5);
    pts.push([core, y], [core + 0.42, y + pitch * 0.45]);
  }
  pts.push([1.8, 9.0], [2.05, 9.3], [2.1, 9.9], [1.95, 10.0], [1.2, 10.0], [1.2, 9.7], [0, 9.7]);
  return lathe(pts);
}

/** The abutment: screwed onto the implant, it carries the crown. */
export function abutmentGeometry() {
  return lathe([[0, 9.95], [1.95, 9.95], [2.25, 10.5], [2.05, 10.9], [1.7, 11.2], [1.35, 15.0], [1.1, 15.4], [0, 15.5]]);
}

/** The crown that goes on the abutment: the molar's crown, sitting from y = 10.3 up. */
export function implantCrownGeometry(res = 56) {
  const g = crownGeometry(MOLAR, res);
  g.translate(0, 10.3, 0);
  return g;
}

/** An upper Hawley retainer: an acrylic palate plate, a labial bow and two clasps. */
export function retainerGeometries(q = 1) {
  const shape = new THREE.Shape();
  const N = 40;
  const outer = [];
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI * 0.5 + (Math.PI * i) / N;
    outer.push([Math.sin(a) * 20.5, -Math.cos(a) * 26 + 29]);
  }
  // The outline runs along the teeth (shape y becomes depth: y = 3 is just behind the front teeth) and closes
  // across the back of the palate.
  shape.moveTo(outer[0][0], outer[0][1]);
  for (const [x, y] of outer.slice(1)) shape.lineTo(x, y);
  shape.bezierCurveTo(12, 24, -12, 24, outer[0][0], outer[0][1]);
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.9, bevelSegments: q < 1 ? 1 : 4, curveSegments: q < 1 ? 12 : 48 });
  plate.rotateX(-Math.PI / 2);
  // The bow: from the plate over the canines, a U-loop each side, along the front teeth.
  const side = (s) => [
    [s * 13.0, 0.8, -10.5], [s * 15.2, 3.4, -8.6], [s * 16.8, 2.2, -6.2], [s * 17.2, -1.5, -5.0], [s * 16.7, -4.2, -4.0],
    [s * 15.2, -4.6, -3.2], [s * 14.2, -2.6, -2.6], [s * 12.8, -2.4, -0.6],
  ];
  const bowPts = [...side(-1), [-9.2, -2.6, 2.6], [-4.8, -2.8, 4.3], [0, -2.9, 4.9], [4.8, -2.8, 4.3], [9.2, -2.6, 2.6], ...side(1).reverse()];
  const bow = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bowPts.map((p) => new THREE.Vector3(...p))), q < 1 ? 60 : 200, 0.42, q < 1 ? 5 : 10, false);
  const clasp = (s) => {
    const pts = [[s * 16.5, 0.8, -21], [s * 19.5, 3, -21.5], [s * 21.8, 1, -20], [s * 22.2, -2.6, -18.6], [s * 22.4, -3.4, -21], [s * 22.2, -2.6, -23.6], [s * 21.6, 1, -24.6], [s * 19.4, 3, -23.4], [s * 16.5, 0.8, -24]];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), q < 1 ? 30 : 90, 0.38, q < 1 ? 4 : 8, false);
  };
  return { plate, wires: [bow, clasp(-1), clasp(1)] };
}

// ------------------------------------------------------------------------------------------------------ materials

export function materials() {
  return {
    tooth: new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: '#fff6e6' }),
    zirconia: new THREE.MeshPhysicalMaterial({ color: '#F4F2EC', roughness: 0.26, clearcoat: 0.85, clearcoatRoughness: 0.18, sheen: 0.5, sheenColor: '#e9f3ff' }),
    porcelain: new THREE.MeshPhysicalMaterial({ color: '#F6F1E6', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide }),
    titanium: new THREE.MeshStandardMaterial({ color: '#AEB6C1', metalness: 1, roughness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: '#D9DEE6', metalness: 1, roughness: 0.18 }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: '#8FD3F2', roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.86, side: THREE.DoubleSide }),
  };
}

/**
 * One of the catalogue's models as a group, centred on its bounding box; `mats` from materials(). The group's
 * children carry a `userData.part` used by the model card's .obj file.
 */
export function buildModel(id, mats, { q = 1 } = {}) {
  const group = new THREE.Group();
  const r = (n) => Math.max(14, Math.round(n * q));
  const add = (geometry, material, part) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.part = part;
    group.add(mesh);
    return mesh;
  };
  if (id === 'implant') {
    const lowPoly = (g) => (q < 1 ? new THREE.LatheGeometry(lathePoints(g), r(72)) : g);
    add(lowPoly(implantGeometry()), mats.titanium, 'implant');
    add(lowPoly(abutmentGeometry()), mats.titanium, 'abutment');
    add(implantCrownGeometry(r(56)), mats.zirconia, 'crown');
  } else if (id === 'crown') {
    add(zirconiaCrownGeometry(r(64)), mats.zirconia, 'crown');
    group.rotation.x = 0.5;
  } else if (id === 'veneer') {
    add(veneerGeometry(r(72)), mats.porcelain, 'veneer');
  } else if (id === 'bracket') {
    add(bracketGeometry(r(80)), mats.steel, 'bracket');
    const wire = new THREE.CylinderGeometry(0.22, 0.22, 7, r(16));
    wire.rotateZ(Math.PI / 2);
    wire.translate(0, 0, 1.5);
    add(wire, mats.steel, 'archwire');
  } else if (id === 'retainer') {
    const { plate, wires } = retainerGeometries(q);
    add(plate, mats.acrylic, 'plate');
    wires.forEach((w, i) => add(w, mats.steel, i ? 'clasp' : 'labial-bow'));
  } else {
    add(toothGeometry(MOLAR, r(56), { colors: true }), mats.tooth, 'tooth');
  }
  // Centre on the bounding box so it turns about its middle.
  const box = new THREE.Box3().setFromObject(group);
  const centre = box.getCenter(new THREE.Vector3());
  const pivot = new THREE.Group();
  group.position.sub(centre);
  pivot.add(group);
  pivot.userData.size = box.getSize(new THREE.Vector3());
  return pivot;
}

/** The model as a Wavefront .obj, in millimetres. */
export async function toOBJ(object, title) {
  const { OBJExporter } = await import('three/addons/exporters/OBJExporter.js');
  const body = new OBJExporter().parse(object);
  return `# ${title}\n# Elite Smile · simplified model drawn with code, units: mm. Not a medical device.\n${body}`;
}
