import type { Tooth } from '@smile/shared';
import * as THREE from 'three';

import { tr } from '../i18n';
import { archLayout, healingCapGeometry, implantFixtureGeometry, toothParts, type Jaw } from './teeth';

/**
 * A panoramic X-ray (OPG) drawn from the 3D jaw, the way X-rays work: every structure has a radiodensity, and each
 * pixel adds up density × thickness along its ray (front faces subtract their depth, back faces add theirs, so the sum
 * is the path length through each closed mesh). Enamel, titanium and zirconia stop the most and turn white; dentin
 * and bone grey; the pulp, the sinuses and the nerve canal let more through and stay dark. The arch is unrolled flat,
 * as a panoramic machine does when it swings round the head.
 *
 * Demo picture: it is computed from a drawn model, it is not a radiograph of anyone.
 */

export type OpgSpot = { fdi: number; x: number; y: number };
export type Opg = { url: string; width: number; height: number; spots: OpgSpot[] };

export const VIEW = { left: -104, right: 104, top: 54, bottom: -50 };

/** A point on the film (mm, the unrolled jaw) as 0 … 1 across and down the picture. */
export const opgUv = (x: number, y: number) => ({ x: (x - VIEW.left) / (VIEW.right - VIEW.left), y: (VIEW.top - y) / (VIEW.top - VIEW.bottom) });

const densityMaterial = (density: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uDensity: { value: density } },
    vertexShader: `
      varying float vDepth;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z - 60.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uDensity; varying float vDepth;
      void main(){
        float s = gl_FrontFacing ? -1.0 : 1.0;
        gl_FragColor = vec4(s * vDepth * uDensity, 0.0, 0.0, 1.0);
      }`,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });

/** The arch unrolled: each tooth stands at its distance along the arch, buccal side to the film. */
function unrolledSlots(jaw: Jaw) {
  return archLayout(jaw).map((slot) => {
    // a panoramic shows a gentle smile: the occlusal plane curves up towards the back
    const x = slot.s;
    const smile = 0.0028 * x * x;
    const y = jaw === 'lower' ? -slot.info.dims.crownH - 0.8 + smile : slot.info.dims.crownH + 0.8 + smile;
    // roots lean in towards the middle of the picture a little, as on a real OPG
    const lean = THREE.MathUtils.clamp(-x * 0.0016, -0.09, 0.09) * (jaw === 'lower' ? 1 : -1);
    return { slot, x, y, lean };
  });
}

function shapeFrom(points: [number, number][]) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

const mirrorHalf = (half: [number, number][]): [number, number][] => [...half, ...[...half].reverse().filter(([x]) => x !== 0).map(([x, y]) => [-x, y] as [number, number])];

function smooth(points: [number, number][], steps = 6): [number, number][] {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'centripetal',
  );
  return curve.getSpacedPoints(points.length * steps).map((p) => [p.x, p.y] as [number, number]);
}

export function renderOpg(teeth: Tooth[], size = { width: 2000, height: 1000 }): Opg {
  const by = new Map(teeth.map((t) => [t.n, t]));
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(size.width, size.height, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const floatOk = !!gl.getExtension('EXT_color_buffer_float') && !!gl.getExtension('EXT_float_blend');
  const target = new THREE.WebGLRenderTarget(size.width, size.height, { type: floatOk ? THREE.FloatType : THREE.HalfFloatType, depthBuffer: false });
  const camera = new THREE.OrthographicCamera(VIEW.left, VIEW.right, VIEW.top, VIEW.bottom, 0.1, 200);
  camera.position.set(0, 0, 60);
  camera.lookAt(0, 0, 0);
  const scene = new THREE.Scene();
  const owned: THREE.BufferGeometry[] = [];
  const mats = new Map<number, THREE.ShaderMaterial>();
  const mat = (d: number) => {
    let m = mats.get(d);
    if (!m) {
      m = densityMaterial(d);
      mats.set(d, m);
    }
    return m;
  };
  const add = (geo: THREE.BufferGeometry, density: number, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(geo, mat(density));
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };

  // ------------------------------------------------------------------------------------------------- the bones
  const crest = (x: number) => 0.0028 * x * x;
  const mandibleHalf: [number, number][] = [
    [0, -41],
    [-18, -40.5],
    [-36, -39],
    [-54, -36.5],
    [-68, -33],
    [-78, -27],
    [-83, -17],
    [-85, -2],
    [-86.5, 13],
    [-88, 24],
    [-91, 32],
    [-89, 38],
    [-83, 37.5],
    [-80, 31],
    [-76, 23],
    [-71, 22],
    [-67, 27],
    [-64.5, 34],
    [-61.5, 26],
    [-60, 12],
    [-58.5, 0],
    [-55, -10.2 + crest(55)],
    [-40, -10.8 + crest(40)],
    [-20, -12.6 + crest(20)],
    [-6, -12],
  ];
  const mandible = smooth(mirrorHalf(mandibleHalf), 5);
  const extrude = (pts: [number, number][], depth: number) => {
    const g = new THREE.ExtrudeGeometry(shapeFrom(pts), { depth, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    owned.push(g);
    return g;
  };
  add(extrude(mandible, 11), 0.62);
  // medullary bone is lighter than the cortex: the spongy inside of the body and the ramus, a little lower in density
  const medullaHalf: [number, number][] = [
    [0, -37.6],
    [-36, -36.2],
    [-56, -33],
    [-70, -28.4],
    [-78.5, -20],
    [-82, -6],
    [-83, 8],
    [-82.5, 19],
    [-76, 18.5],
    [-66, 19],
    [-63, 9],
    [-61.5, 0],
    [-55, -13 + crest(55)],
    [-40, -14 + crest(40)],
    [-20, -15.5 + crest(20)],
    [-6, -15.6],
  ];
  add(extrude(smooth(mirrorHalf(medullaHalf), 4), 9), -0.34);

  const maxillaHalf: [number, number][] = [
    [0, 13],
    [-20, 12.4 + crest(20)],
    [-40, 11 + crest(40)],
    [-58, 10.5 + crest(58)],
    [-66, 16],
    [-68, 26],
    [-66, 40],
    [-58, 50],
    [-30, 53],
    [-8, 54],
  ];
  const maxilla = smooth(mirrorHalf(maxillaHalf), 5);
  add(extrude(maxilla, 12), 0.5);
  const maxMedullaHalf: [number, number][] = [
    [0, 16],
    [-20, 15.4 + crest(20)],
    [-40, 14 + crest(40)],
    [-56, 13.5 + crest(56)],
    [-63, 26],
    [-63, 38],
    [-56, 47],
    [-30, 50],
    [-8, 51],
  ];
  add(extrude(smooth(mirrorHalf(maxMedullaHalf), 4), 10), -0.22);
  // the maxillary sinuses and the nose: air, so darker
  const sphere = new THREE.SphereGeometry(1, 40, 24);
  owned.push(sphere);
  for (const side of [-1, 1]) {
    const sinus = add(sphere, -0.42);
    sinus.position.set(side * 42, 33, 0);
    sinus.scale.set(21, 13.5, 6.5);
  }
  const nose = add(sphere, -0.38);
  nose.position.set(0, 45, 0);
  nose.scale.set(13, 9, 6);
  const septum = new THREE.BoxGeometry(1.6, 20, 9);
  owned.push(septum);
  add(septum, 0.5).position.set(0, 46, 0);
  // the hard palate: a horizontal plate, seen edge-on as a bright band above the apices
  const palate = new THREE.BoxGeometry(92, 2.2, 26);
  owned.push(palate);
  add(palate, 0.32).position.set(0, 30.5, 0);
  // the nerve canal in the lower jaw, with its thin bright wall
  for (const side of [-1, 1]) {
    const path = new THREE.CatmullRomCurve3(
      [
        [26, -21],
        [40, -24.5],
        [55, -23],
        [66, -14],
        [71, -1],
        [72, 8],
      ].map(([x, y]) => new THREE.Vector3(side * x, y, 0)),
    );
    const wall = new THREE.TubeGeometry(path, 60, 2.0, 12, false);
    const lumen = new THREE.TubeGeometry(path, 60, 1.35, 12, false);
    owned.push(wall, lumen);
    add(wall, 0.4);
    add(lumen, -0.85);
    // the mental foramen, where the nerve leaves the bone
    const foramen = add(sphere, -0.6);
    foramen.position.set(side * 25, -19, 0);
    foramen.scale.set(2.2, 1.9, 2.5);
  }
  // soft tissue: a faint haze over the face
  const haze = new THREE.BoxGeometry(220, 120, 30);
  owned.push(haze);
  add(haze, 0.012);
  const tongue = add(sphere, 0.05);
  tongue.position.set(0, -6, 0);
  tongue.scale.set(55, 12, 12);

  // ---------------------------------------------------------------------------------------------- the teeth
  const spots: OpgSpot[] = [];
  const toUv = opgUv;
  for (const jaw of ['upper', 'lower'] as Jaw[]) {
    for (const { slot, x, y, lean } of unrolledSlots(jaw)) {
      const t = by.get(slot.fdi);
      const status = t?.status ?? 'gezond';
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      g.rotation.z = lean;
      const inner = new THREE.Group();
      inner.scale.set(slot.mirrorX ? -1 : 1, slot.flipY ? -1 : 1, 1);
      g.add(inner);
      scene.add(g);
      const parts = toothParts(slot.fdi);
      const crownY = jaw === 'lower' ? y + parts.top * 0.55 : y - parts.top * 0.55;
      spots.push({ fdi: slot.fdi, ...toUv(x, crownY) });
      if (status === 'ontbreekt') continue;
      if (status === 'implantaat') {
        const fixture = implantFixtureGeometry({ diameter: 4.1, length: 10 });
        const cap = healingCapGeometry(4.1);
        owned.push(fixture, cap);
        add(fixture, 7.5, inner).position.y = -1.6;
        add(cap, 7.5, inner).position.y = -1.6;
        // grafted bone around it: a little denser and grainier
        const graft = add(sphere, 0.18, inner);
        graft.position.set(0, -5, 0);
        graft.scale.set(5.5, 6.5, 5);
        continue;
      }
      // enamel: the outside of the whole tooth, then the dentin body less dense, then the pulp
      add(parts.geometry, 2.6, inner);
      add(parts.dentin, -1.05, inner);
      if (status === 'kroon') {
        // zirconia crown (very radiopaque) and a filled root canal (gutta-percha: a bright line)
        add(parts.crown, 4.2, inner);
        add(parts.pulp, 3.4, inner);
        const core = add(sphere, 2.5, inner);
        core.position.set(0, 1.6, 0);
        core.scale.set(1.6, 2.2, 1.6);
      } else {
        add(parts.pulp, -1.25, inner);
      }
      if (status === 'vulling') {
        // composite is radiopaque: a bright inlay in the crown
        const o = add(sphere, 3.6, inner);
        o.position.set(0.4, parts.top - 1.4, 0);
        o.scale.set(slot.info.dims.md * 0.22, 1.25, slot.info.dims.bl * 0.2);
        if ((t?.surfaces ?? '').includes('M')) {
          const m = add(sphere, 3.6, inner);
          m.position.set(slot.info.dims.md / 2 - 1.3, parts.top - 2.6, 0);
          m.scale.set(1.3, 2.4, slot.info.dims.bl * 0.22);
        }
      }
      if (status === 'aandacht') {
        // a hint of a darker spot in the fissure
        const spot = add(sphere, -1.1, inner);
        spot.position.set(0.2, parts.top - 1.6, 0);
        spot.scale.set(0.9, 0.8, 1.6);
      }
    }
  }

  // ------------------------------------------------------------------------------------------- render density
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  // ------------------------------------------------------------------------------------- develop the "film"
  const post = new THREE.ShaderMaterial({
    uniforms: { tDensity: { value: target.texture }, uPx: { value: new THREE.Vector2(1 / size.width, 1 / size.height) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDensity; uniform vec2 uPx; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float dens(vec2 uv){ return texture2D(tDensity, uv).r; }
      void main(){
        // a panoramic is a little soft, more so away from the focal trough (top and bottom)
        float spread = 1.0 + 2.5 * pow(abs(vUv.y - 0.5) * 2.0, 2.0);
        vec2 o = uPx * spread;
        float d = dens(vUv) * 0.36
          + (dens(vUv + vec2(o.x, 0.0)) + dens(vUv - vec2(o.x, 0.0)) + dens(vUv + vec2(0.0, o.y)) + dens(vUv - vec2(0.0, o.y))) * 0.12
          + (dens(vUv + o) + dens(vUv - o) + dens(vUv + vec2(o.x, -o.y)) + dens(vUv + vec2(-o.x, o.y))) * 0.04;
        float v = 1.0 - exp(-max(d, 0.0) * 0.062);
        v = pow(v, 0.92);
        // film grain and a soft vignette
        v += (hash(vUv * 1731.0) - 0.5) * 0.035;
        vec2 c = vUv - 0.5;
        v *= 1.0 - 0.55 * dot(c * vec2(0.9, 1.3), c * vec2(0.9, 1.3));
        v = clamp(v, 0.0, 1.0);
        // a cool blue-black film tint
        vec3 col = mix(vec3(0.015, 0.025, 0.045), vec3(0.93, 0.96, 1.0), v);
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);
  renderer.render(postScene, camera);

  // labels on the film, as a panoramic machine prints them
  const out = document.createElement('canvas');
  out.width = size.width;
  out.height = size.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);
  ctx.fillStyle = 'rgba(235,242,255,0.85)';
  ctx.font = `600 ${Math.round(size.height * 0.05)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText('R', size.width * 0.03, size.height * 0.1);
  ctx.textAlign = 'right';
  ctx.fillText('L', size.width * 0.97, size.height * 0.1);
  ctx.font = `500 ${Math.round(size.height * 0.022)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = 'rgba(235,242,255,0.55)';
  ctx.fillText(tr('DEMO · getekend uit het 3D-model · geen echte röntgenfoto'), size.width * 0.97, size.height * 0.955);
  ctx.textAlign = 'left';
  ctx.fillText('ELITE SMILE · OPG', size.width * 0.03, size.height * 0.955);
  const url = out.toDataURL('image/jpeg', 0.92);

  // clean up the GPU
  for (const g of owned) g.dispose();
  for (const m of mats.values()) m.dispose();
  post.dispose();
  quad.geometry.dispose();
  target.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return { url, width: size.width, height: size.height, spots };
}
