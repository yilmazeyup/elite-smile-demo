import { LOGO_BLUE, TOOTH_PATH } from '@smile/shared';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/*
 * Building blocks shared by the 3D clinic and the team studio: rounded shapes, porcelain materials, procedural
 * textures (terrazzo, light oak, soft contact shadows, glows), the Elite Smile tooth in 3D and small printed plates.
 * Geometries and textures that repeat are made once and shared, so the scene stays light on the GPU.
 */

export const mat = (color: THREE.ColorRepresentation, roughness = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

const boxCache = new Map<string, THREE.BufferGeometry>();

/** A rounded box; the same sizes share one geometry. */
export function box(w: number, h: number, d: number, material: THREE.Material, r = 0.03, shadows = true): THREE.Mesh {
  const radius = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius.toFixed(3)}`;
  let geometry = boxCache.get(key);
  if (!geometry) {
    // Small parts need fewer segments for the same soft edge.
    geometry = new RoundedBoxGeometry(w, h, d, Math.min(w, h, d) < 0.12 || radius < 0.02 ? 1 : 2, radius);
    boxCache.set(key, geometry);
  }
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadows;
  m.receiveShadow = true;
  return m;
}

/** Forgets the shared geometries (after a scene has disposed them). */
export const resetKit = () => boxCache.clear();

export function cyl(radius: number, height: number, material: THREE.Material, top = radius, segments = 28, shadows = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, height, segments), material);
  m.castShadow = shadows;
  m.receiveShadow = true;
  return m;
}

export function sphere(radius: number, material: THREE.Material, segments = 20): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.round(segments * 0.75)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function at<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  return object;
}

/** A small, repeatable random for the textures and the furniture, so the clinic looks the same every time. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
}

/** Light terrazzo: porcelain ground with chips of grey, sky and a little warm stone. */
export function terrazzo(repeat: [number, number]) {
  const r = seeded(11);
  return canvasTexture(
    512,
    512,
    (ctx) => {
      ctx.fillStyle = '#EEF1F5';
      ctx.fillRect(0, 0, 512, 512);
      const chips = ['#C9D2DF', '#AFBCCD', '#DCE3EC', '#9FD3EE', '#E4D6C6', '#8D9BB0', '#FFFFFF'];
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = chips[Math.floor(r() * chips.length)];
        ctx.globalAlpha = 0.45 + r() * 0.5;
        const x = r() * 512;
        const y = r() * 512;
        const s = 1 + r() * (r() < 0.08 ? 7 : 3);
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    repeat,
  );
}

/** Pale oak planks, long and calm, with a whisper of grain. */
export function oak(repeat: [number, number]) {
  const r = seeded(29);
  return canvasTexture(
    512,
    512,
    (ctx) => {
      ctx.fillStyle = '#E7D7C1';
      ctx.fillRect(0, 0, 512, 512);
      const rows = 8;
      for (let row = 0; row < rows; row++) {
        let x = -r() * 300;
        while (x < 512) {
          const len = 220 + r() * 260;
          const tone = 214 + Math.floor(r() * 22);
          ctx.fillStyle = `rgb(${tone + 14},${tone},${tone - 22})`;
          ctx.fillRect(x + 1, row * 64 + 1, len - 2, 62);
          ctx.strokeStyle = 'rgba(150,115,80,0.08)';
          for (let g = 0; g < 7; g++) {
            ctx.beginPath();
            const gy = row * 64 + 6 + r() * 52;
            ctx.moveTo(x, gy);
            ctx.bezierCurveTo(x + len * 0.3, gy + r() * 6 - 3, x + len * 0.6, gy + r() * 6 - 3, x + len, gy);
            ctx.stroke();
          }
          x += len;
        }
      }
    },
    repeat,
  );
}

let blobTexture: THREE.Texture | null = null;

/** A soft dark disc that grounds furniture and people: the contact shadow an ambient-occlusion pass would draw. */
export function blob(width: number, depth: number, opacity = 0.32): THREE.Mesh {
  blobTexture ??= canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(20,30,60,1)');
    g.addColorStop(0.45, 'rgba(20,30,60,0.55)');
    g.addColorStop(1, 'rgba(20,30,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.006;
  m.renderOrder = 1;
  return m;
}

let edgeTexture: THREE.Texture | null = null;

/** The darkening where a wall meets the floor, as a strip on the floor along the wall. */
export function wallShade(length: number, width = 0.42, opacity = 0.2): THREE.Mesh {
  edgeTexture ??= canvasTexture(4, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(18,28,58,1)');
    g.addColorStop(0.35, 'rgba(18,28,58,0.35)');
    g.addColorStop(1, 'rgba(18,28,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 64);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(length, width), new THREE.MeshBasicMaterial({ map: edgeTexture, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

let glowTexture: THREE.Texture | null = null;

/** A round glow that adds light, for lamps, beacons and plumbobs. */
export function glow(color: THREE.ColorRepresentation, size: number, opacity = 0.6): THREE.Sprite {
  glowTexture ??= canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(size);
  return sprite;
}

let poolTexture: THREE.Texture | null = null;

/** A pool of coloured light on the floor: the room's status, soft at the edges. */
export function lightPool(width: number, depth: number, color: THREE.ColorRepresentation): THREE.Mesh {
  poolTexture ??= canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: poolTexture, color, transparent: true, opacity: 0.4, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 2;
  return m;
}

/** A vertical sky gradient for the background, redrawn when the look changes. */
export class Backdrop {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas = document.createElement('canvas');

  constructor() {
    this.canvas.width = 4;
    this.canvas.height = 256;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  paint(top: THREE.Color, bottom: THREE.Color, horizon?: THREE.Color) {
    const ctx = this.canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, `#${top.getHexString()}`);
    if (horizon) g.addColorStop(0.62, `#${horizon.getHexString()}`);
    g.addColorStop(1, `#${bottom.getHexString()}`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    this.texture.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------------ the logo in 3D

/**
 * The Elite Smile tooth from the logo, extruded: the left half in the deep blue, the right in sky, the smile with its
 * braces in navy. `size` is the height in metres; it stands upright, facing +z, its base at y = 0.
 */
export function toothEmblem(size: number, depth = 0.06, glowing = false): THREE.Group {
  const group = new THREE.Group();
  const pieces = TOOTH_PATH.split(/ (?=M)/);
  const colors = [LOGO_BLUE.sky, LOGO_BLUE.deep, '#234282'];
  const loader = new SVGLoader();
  // The traced path lives in a 1024 box, flipped (see brand.ts): x 40…942, y 80…964 after the flip.
  const scale = size / 884;
  pieces.forEach((d, i) => {
    const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => p.toShapes());
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: (i === 2 ? depth * 1.4 : depth) / (scale * 0.1), bevelEnabled: true, bevelSize: 18, bevelThickness: 18, bevelSegments: 3, curveSegments: 10 });
    // Into metres: the traced units point up already (SVG's flip and potrace's cancel out in 3D); centred on x and
    // standing on y = 0 (the view box runs x 40…942, y 80…964 after the logo's own 0.1 scale).
    geometry.scale(0.1 * scale, 0.1 * scale, 0.1 * scale);
    geometry.translate(-491 * scale, -60 * scale, 0);
    geometry.computeVertexNormals();
    const material = mat(colors[i], 0.32, { metalness: 0.08, side: THREE.DoubleSide, emissive: glowing ? colors[i] : '#000000', emissiveIntensity: glowing ? 0.25 : 0 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.z = i === 2 ? depth * 0.25 : 0;
    group.add(mesh);
  });
  return group;
}

// ------------------------------------------------------------------------------------------------ printed plates

/** A small printed plate (room names over the doors): text on a rounded card, as a texture on a plane. */
export function plate(lines: { text: string; font: string; color: string }[], options: { width: number; height: number; bg: string; accent?: string; px?: number }): THREE.Mesh {
  const px = options.px ?? 512;
  const h = Math.round((px * options.height) / options.width);
  const texture = canvasTexture(px, h, () => {});
  const canvas = texture.image as HTMLCanvasElement;
  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, px, h);
    ctx.fillStyle = options.bg;
    const r = h * 0.22;
    ctx.beginPath();
    ctx.roundRect(0, 0, px, h, r);
    ctx.fill();
    if (options.accent) {
      ctx.fillStyle = options.accent;
      ctx.beginPath();
      ctx.arc(h * 0.42, h / 2, h * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'start';
    const x = options.accent ? h * 0.72 : h * 0.34;
    const step = h / (lines.length + 1);
    lines.forEach((line, i) => {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, x, step * (i + 1) + (lines.length > 1 ? (i === 0 ? step * 0.12 : -step * 0.08) : 0), px - x - h * 0.2);
    });
    texture.needsUpdate = true;
  };
  draw();
  // Webfonts may arrive after the first draw.
  document.fonts?.ready.then(draw).catch(() => {});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(options.width, options.height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  return m;
}

// ------------------------------------------------------------------------------------------------- static merging

/** Marks a material that changes while the scene runs (a lamp, a status colour): never shared with a look-alike. */
export function live<T extends THREE.Material>(material: T): T {
  material.userData.live = true;
  return material;
}

/** Two materials that look the same get one key, so their meshes can be drawn together. */
function signature(m: THREE.Material): string {
  if (m.userData.live) return m.uuid;
  const any = m as THREE.Material & Partial<THREE.MeshStandardMaterial & THREE.MeshBasicMaterial>;
  return [
    m.type,
    any.color?.getHexString(),
    any.roughness,
    any.metalness,
    any.map?.uuid,
    any.emissive?.getHexString(),
    any.emissiveIntensity,
    any.emissiveMap?.uuid,
    m.transparent,
    m.opacity,
    m.depthWrite,
    m.side,
    any.flatShading,
    any.toneMapped,
    m.blending,
    m.polygonOffset,
  ].join('|');
}

/**
 * Bakes every mesh under `root` that never moves into one mesh per look, so the building costs tens of draw calls
 * instead of hundreds. Anything under an object marked `userData.dynamic` stays as it is, and so do sprites and lights.
 */
export function mergeStatic(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; order: number; geos: THREE.BufferGeometry[] }>();
  const merged: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    for (let p: THREE.Object3D | null = mesh; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const material = mesh.material as THREE.Material;
    const key = `${signature(material)}#${mesh.castShadow}#${mesh.renderOrder}`;
    let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld));
    g.clearGroups();
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { material, cast: mesh.castShadow, order: mesh.renderOrder, geos: [] }));
    bucket.geos.push(g);
    merged.push(mesh);
  });
  // Detach the originals; their children that are not meshes (lights, labels, sprites) move to the root.
  for (const mesh of merged) {
    for (const child of [...mesh.children]) if (!(child as THREE.Mesh).isMesh) root.attach(child);
    mesh.removeFromParent();
  }
  for (const { material, cast, order, geos } of buckets.values()) {
    const geometry = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.renderOrder = order;
    root.add(mesh);
  }
}
