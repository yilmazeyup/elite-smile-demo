// 10 · Lando Norris: the portrait has a second layer. A trail that follows the cursor (or a finger, or a slow scanner
// while nobody moves) uncovers an X-ray look of the same smile: a jaw drawn with code, with roots, one root canal
// filling and one implant, aligned to the photo's teeth. The headline runs behind the portrait and shows through it
// as an outline. Without WebGL a still of the same render is uncovered with a CSS mask.
import { onLang } from './i18n.js';
import { reduced, hasWebGL, clamp } from './fx.js';

// The photo (1400 × 934): where the teeth meet, how many photo pixels make a millimetre, and its framing.
const PHOTO = { w: 1400, h: 934, mouth: [742, 512], mm: 3.95, pos: [0.56, 0.5] };
const TAGS = { 14: null, 21: null, 36: null };

export function initHero(hero) {
  const frame = hero.querySelector('[data-frame]');
  const title = hero.querySelector('.hero-title');
  const ghost = hero.querySelector('[data-ghost]');
  const type = hero.querySelector('.hero-type');
  const typeIn = hero.querySelector('.hero-type-in');
  const debug = new URLSearchParams(location.search).get('xray');

  // ------------------------------------------------------------------------------ the headline, fitted and clipped
  const layout = () => {
    for (const el of [title, ghost]) el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(title).fontSize);
    const lines = [...title.children];
    const widest = Math.max(...lines.map((l) => l.getBoundingClientRect().width));
    const tall = title.getBoundingClientRect().height;
    const fr = frame.getBoundingClientRect();
    const tr = type.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl';
    const stacked = getComputedStyle(frame).position !== 'absolute';
    const hr = hero.getBoundingClientRect();
    const gutter = parseFloat(getComputedStyle(hero).paddingInlineStart) || 16;
    // Side by side, a line may run halfway into the portrait; stacked, it must fit the screen.
    const available = stacked ? hr.width - 2 * gutter : rtl ? tr.right - (fr.left + fr.width * 0.42) : fr.right - fr.width * 0.42 - tr.left;
    // Side by side, it must also fit the height between the kicker and the buttons.
    const byHeight = stacked ? Infinity : base * ((tr.height - 8) / tall);
    const size = Math.max(32, Math.min(base, base * (available / widest), byHeight));
    for (const el of [title, ghost]) el.style.fontSize = `${size}px`;
    hero.style.setProperty('--fs', `${size}px`);
    clip();
  };
  const clip = () => {
    const fr = frame.getBoundingClientRect();
    const gr = ghost.getBoundingClientRect();
    const r = fr.width / 2;
    ghost.style.setProperty('--clip', `inset(${fr.top - gr.top}px ${gr.right - fr.right}px ${gr.bottom - fr.bottom}px ${fr.left - gr.left}px round ${r}px ${r}px 26px 26px)`);
  };
  layout();
  document.fonts?.ready.then(layout);
  addEventListener('resize', layout, { passive: true });
  onLang(() => requestAnimationFrame(layout));

  // ------------------------------------------------------------------------------------------- the trail (mask)
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d', { willReadFrequently: false });
  let W = 0, H = 0;
  const pointer = { x: 0.5, y: 0.55, px: 0.5, py: 0.55, last: -1e9, active: false };
  const trail = [];
  const sizeMask = () => {
    const r = frame.getBoundingClientRect();
    W = r.width;
    H = r.height;
    mask.width = 256;
    mask.height = Math.max(64, Math.round((256 * H) / W));
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, mask.width, mask.height);
  };
  sizeMask();
  const toLocal = (e) => {
    const r = frame.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const move = (e) => {
    const [x, y] = toLocal(e);
    pointer.x = x;
    pointer.y = y;
    pointer.last = performance.now();
    if (!pointer.active) {
      pointer.px = x;
      pointer.py = y;
    }
    pointer.active = true;
    hero.classList.add('touched');
  };
  frame.addEventListener('pointermove', move, { passive: true });
  frame.addEventListener('pointerdown', move, { passive: true });
  frame.addEventListener('pointerleave', () => (pointer.active = false));

  // The photo's mouth, in the frame's pixels (object-fit: cover).
  const photoMap = () => {
    const s = Math.max(W / PHOTO.w, H / PHOTO.h);
    const dw = PHOTO.w * s, dh = PHOTO.h * s;
    const ox = (W - dw) * PHOTO.pos[0], oy = (H - dh) * PHOTO.pos[1];
    return { s, mouth: [ox + PHOTO.mouth[0] * s, oy + PHOTO.mouth[1] * s], pxPerMm: PHOTO.mm * s };
  };

  /** One frame of the trail: fade what was there, then paint soft blobs from the last point to this one. */
  const paintTrail = (now, dt, time) => {
    let x, y;
    const idle = now - pointer.last > 2400 || !pointer.active;
    if (idle && !reduced()) {
      // The scanner: a slow figure of eight around the mouth.
      const m = photoMap();
      x = m.mouth[0] / W + Math.sin(time * 0.55) * 0.26;
      y = m.mouth[1] / H + Math.sin(time * 1.1) * 0.1 - 0.02;
    } else if (idle) {
      x = pointer.px;
      y = pointer.py;
    } else {
      x = pointer.x;
      y = pointer.y;
    }
    const fade = 1 - Math.exp(-dt * (idle ? 1.6 : 2.4));
    mctx.globalCompositeOperation = 'source-over';
    mctx.fillStyle = `rgba(0,0,0,${fade.toFixed(4)})`;
    mctx.fillRect(0, 0, mask.width, mask.height);
    const dx = x - pointer.px, dy = y - pointer.py;
    const speed = Math.hypot(dx * W, dy * H) / Math.max(dt, 0.001);
    const radius = clamp(54 + speed * 0.045, 54, 120) * (W < 500 ? 0.8 : 1);
    const steps = Math.max(1, Math.ceil(Math.hypot(dx * W, dy * H) / 10));
    mctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= steps; i++) {
      const px = (pointer.px + (dx * i) / steps) * mask.width;
      const py = (pointer.py + (dy * i) / steps) * mask.height;
      const rr = (radius / W) * mask.width;
      const g = mctx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(255,255,255,0.24)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      mctx.fillStyle = g;
      mctx.beginPath();
      mctx.arc(px, py, rr, 0, Math.PI * 2);
      mctx.fill();
    }
    trail.push({ x: x * W, y: y * H, r: radius, t: now });
    while (trail.length && now - trail[0].t > 1600) trail.shift();
    pointer.px = x;
    pointer.py = y;
    return { x, y, radius };
  };

  /** How uncovered a point in the frame is, from the recent trail (for the HTML tooth labels). */
  const coverage = (x, y, now) => {
    let v = 0;
    for (const p of trail) {
      const d = Math.hypot(p.x - x, p.y - y) / p.r;
      v = Math.max(v, (1 - clamp(d, 0, 1)) * Math.exp(-(now - p.t) / 650));
    }
    return clamp(v * 2.2);
  };

  const labels = [...frame.querySelectorAll('.xray-labels span')];

  if (!hasWebGL() || debug === 'off') {
    startFallback();
    return;
  }
  import('three')
    .then((THREE) => startGL(THREE))
    .catch(() => startFallback());

  // --------------------------------------------------------------------------------------------------- fallback
  function startFallback() {
    hero.classList.add('nogl');
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(frame);
    let prev = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const p = paintTrail(now, dt, now / 1000);
      frame.style.setProperty('--mx', `${(p.x * 100).toFixed(2)}%`);
      frame.style.setProperty('--my', `${(p.y * 100).toFixed(2)}%`);
      frame.style.setProperty('--r', `${Math.round(p.radius * 1.4)}px`);
    };
    requestAnimationFrame(loop);
  }

  // ----------------------------------------------------------------------------------------------------- WebGL
  async function startGL(THREE) {
    const { TOOTH_SIZES, toothGeometry, pulpGeometry, implantGeometry, abutmentGeometry, implantCrownGeometry, meshSDF } = await import('./geometry.js');
    const canvas = frame.querySelector('canvas.xray');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    } catch {
      startFallback();
      return;
    }
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    // The X-ray scene renders brightness into a target: overlapping material adds up, the pulp takes away.
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -500, 500);
    const target = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });

    const xrayVert = /* glsl */ `
      varying vec3 vN; varying float vY;
      void main() {
        vN = normalize(normalMatrix * normal);
        vY = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`;
    const xrayFrag = /* glsl */ `
      uniform float uGain; uniform float uEnamel; uniform float uRim;
      varying vec3 vN; varying float vY;
      void main() {
        float facing = abs(normalize(vN).z);
        float body = pow(facing, 0.9);
        float rim = pow(1.0 - facing, 3.0);
        float enamel = smoothstep(-0.6, 1.4, vY);
        float I = uGain * (0.62 * body + uRim * rim) * (1.0 + uEnamel * enamel);
        gl_FragColor = vec4(I, I, I, 1.0);
      }`;
    const xray = (gain, { enamel = 0.9, rim = 0.5, subtract = false } = {}) =>
      new THREE.ShaderMaterial({
        uniforms: { uGain: { value: gain }, uEnamel: { value: enamel }, uRim: { value: rim } },
        vertexShader: xrayVert,
        fragmentShader: xrayFrag,
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: subtract ? THREE.ReverseSubtractEquation : THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      });
    const mTooth = xray(0.12, { enamel: 0.6 });
    const mPulp = xray(0.1, { enamel: 0, rim: 0.1, subtract: true });
    const mFill = xray(0.42, { enamel: 0, rim: 0.3 });
    const mMetal = xray(0.5, { enamel: 0, rim: 0.6 });
    const mCrown = xray(0.24, { enamel: 0, rim: 0.6 });
    const mBone = xray(0.045, { enamel: 0, rim: 0.25 });

    // The arches: teeth along an ellipse, front teeth at z = 0, molars at the back.
    const jaw = new THREE.Group();
    scene.add(jaw);
    const arch = (A, B) => {
      const pts = [];
      for (let i = 0; i <= 400; i++) {
        const th = -2.3 + (4.6 * i) / 400;
        pts.push({ th, x: A * Math.sin(th), z: -B * (1 - Math.cos(th)) });
      }
      let s = 0;
      pts.forEach((p, i) => {
        if (i) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
        p.s = s;
      });
      const mid = pts[200].s;
      pts.forEach((p) => (p.s -= mid));
      return { A, B, pts };
    };
    const along = (a, s) => {
      const { pts, A, B } = a;
      let i = pts.findIndex((p) => p.s >= s);
      if (i < 1) i = 1;
      const p0 = pts[i - 1], p1 = pts[i];
      const k = (s - p0.s) / (p1.s - p0.s || 1);
      const x = p0.x + (p1.x - p0.x) * k, z = p0.z + (p1.z - p0.z) * k;
      const tangent = new THREE.Vector3(p1.x - p0.x, 0, p1.z - p0.z).normalize();
      const normal = new THREE.Vector3(x / (A * A), 0, (z + B) / (B * B)).normalize();
      return { pos: new THREE.Vector3(x, 0, z), tangent, normal };
    };
    const upper = arch(27.5, 41), lower = arch(25.5, 39);
    const cache = new Map();
    const geo = (jawName, i) => {
      const key = `${jawName}${i}`;
      if (!cache.has(key)) {
        const s = TOOTH_SIZES[jawName][i];
        cache.set(key, { tooth: toothGeometry(s, 34), pulp: pulpGeometry(s, 30), size: s });
      }
      return cache.get(key);
    };
    const anchors = {};
    const place = (jawName, side, i, objects) => {
      const a = jawName === 'upper' ? upper : lower;
      const sizes = TOOTH_SIZES[jawName];
      let s = 0;
      for (let k = 0; k < i; k++) s += sizes[k].w + 0.15;
      s += sizes[i].w / 2;
      const { pos, tangent, normal } = along(a, side * s);
      const holder = new THREE.Group();
      const basis = new THREE.Matrix4().makeBasis(tangent, new THREE.Vector3(0, 1, 0), normal);
      holder.quaternion.setFromRotationMatrix(basis);
      const size = sizes[i];
      const tilt = size.kind === 'incisor' ? 0.2 : size.kind === 'canine' ? 0.1 : 0.02;
      const inner = new THREE.Group();
      if (jawName === 'upper') {
        inner.rotation.z = Math.PI;
        inner.rotation.x = tilt;
        holder.position.set(pos.x, size.ch - (i < 3 ? 1.4 : 0.4), pos.z);
      } else {
        inner.rotation.x = -tilt * 0.7;
        holder.position.set(pos.x, -size.ch + 0.2, pos.z - (i < 3 ? 1.6 : 0));
      }
      objects.forEach((o) => inner.add(o));
      holder.add(inner);
      jaw.add(holder);
      return holder;
    };
    for (const jawName of ['upper', 'lower']) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const fdi = `${jawName === 'upper' ? (side < 0 ? 1 : 2) : side < 0 ? 4 : 3}${i + 1}`;
          const g = geo(jawName, i);
          let objects;
          if (fdi === '36') {
            // The implant: a titanium screw in the bone, an abutment and a crown, where the first molar was.
            const imp = new THREE.Group();
            imp.add(new THREE.Mesh(implantGeometry(), mMetal), new THREE.Mesh(abutmentGeometry(), mMetal), new THREE.Mesh(implantCrownGeometry(30), mCrown));
            imp.position.y = -10.3;
            imp.children.forEach((m) => (m.renderOrder = 2));
            const wrap = new THREE.Group();
            wrap.add(imp);
            objects = [wrap];
          } else {
            const tooth = new THREE.Mesh(g.tooth, mTooth);
            const pulp = new THREE.Mesh(g.pulp, fdi === '14' ? mFill : mPulp);
            pulp.renderOrder = fdi === '14' ? 2 : 1;
            objects = [tooth, pulp];
          }
          const holder = place(jawName, side, i, objects);
          if (fdi in TAGS) anchors[fdi] = { holder, y: fdi === '14' ? -g.size.rl * 0.55 : fdi === '21' ? g.size.ch * 0.55 : -g.size.rl * 0.35 };
        }
      }
    }
    // The bone around the roots: a faint horseshoe above and below.
    const boneSDF = (a, y0, y1, half) => {
      const poly = a.pts.filter((_, i) => i % 8 === 0 && Math.abs(a.pts[i].th) < 1.5);
      return (x, y, z) => {
        let d = Infinity;
        for (const p of poly) d = Math.min(d, Math.hypot(x - p.x, z - p.z));
        const band = d - half;
        const slab = Math.max(y0 - y, y - y1);
        return Math.hypot(Math.max(band, 0), Math.max(slab, 0)) + Math.min(Math.max(band, slab), 0) - 1.5;
      };
    };
    jaw.add(new THREE.Mesh(meshSDF(boneSDF(upper, 4, 24, 5.5), [-38, 0, -52], [38, 28, 10], 36), mBone));
    jaw.add(new THREE.Mesh(meshSDF(boneSDF(lower, -30, -4, 6.5), [-36, -34, -50], [36, 0, 10], 36), mBone));

    // The composite: brightness into a cold X-ray ramp on deep navy, grain, scan lines, a grid, then the trail mask.
    const maskTex = new THREE.CanvasTexture(mask);
    maskTex.minFilter = THREE.LinearFilter;
    maskTex.generateMipmaps = false;
    const quadScene = new THREE.Scene();
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const photoEl = hero.querySelector('.hero-photo');
    const photoTex = new THREE.Texture(photoEl);
    photoTex.colorSpace = THREE.NoColorSpace;
    const loadPhoto = () => (photoTex.needsUpdate = true);
    if (photoEl.complete && photoEl.naturalWidth) loadPhoto();
    else photoEl.addEventListener('load', loadPhoto, { once: true });
    const comp = new THREE.ShaderMaterial({
      uniforms: {
        tPhoto: { value: photoTex },
        uCover: { value: new THREE.Vector4(1, 1, 0, 0) },
        tX: { value: target.texture },
        tMask: { value: maskTex },
        uRes: { value: new THREE.Vector2(1, 1) },
        uMouth: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uFull: { value: debug ? 1 : 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D tX; uniform sampler2D tMask; uniform sampler2D tPhoto; uniform vec4 uCover;
        uniform vec2 uRes; uniform vec2 uMouth; uniform float uTime; uniform float uFull;
        float luma(vec2 uv) { return dot(texture2D(tPhoto, uv).rgb, vec3(0.299, 0.587, 0.114)); }
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        vec3 ramp(float v) {
          vec3 a = vec3(0.04, 0.16, 0.34), b = vec3(0.16, 0.58, 0.84), c = vec3(0.93, 0.98, 1.0);
          v = clamp(v, 0.0, 1.0);
          return v < 0.45 ? mix(vec3(0.0), mix(a, b, v / 0.45), smoothstep(0.0, 0.45, v)) : mix(b, c, smoothstep(0.45, 0.95, v));
        }
        void main() {
          vec2 px = 1.0 / uRes;
          float I = texture2D(tX, vUv).r;
          float glow = 0.0;
          glow += texture2D(tX, vUv + px * vec2(4.0, 4.0)).r;
          glow += texture2D(tX, vUv + px * vec2(-4.0, 4.0)).r;
          glow += texture2D(tX, vUv + px * vec2(4.0, -4.0)).r;
          glow += texture2D(tX, vUv + px * vec2(-4.0, -4.0)).r;
          glow *= 0.25;
          vec2 q = (vUv - uMouth) * vec2(uRes.x / uRes.y, 1.0);
          vec3 col = mix(vec3(0.008, 0.02, 0.05), vec3(0.03, 0.075, 0.16), smoothstep(0.95, 0.0, length(q)));
          // Soft tissue: the photo's own contours, faint, so the face is still there under the X-ray.
          vec2 puv = vec2((vUv.x - uCover.z) / uCover.x, 1.0 - ((1.0 - vUv.y) - uCover.w) / uCover.y);
          vec2 d = vec2(1.6 / uRes.x / uCover.x, 1.6 / uRes.y / uCover.y);
          float gx = luma(puv + vec2(d.x, 0.0)) - luma(puv - vec2(d.x, 0.0));
          float gy = luma(puv + vec2(0.0, d.y)) - luma(puv - vec2(0.0, d.y));
          float edge = smoothstep(0.04, 0.22, length(vec2(gx, gy)));
          float skin = luma(puv);
          col += vec3(0.1, 0.36, 0.6) * edge * 0.32 + vec3(0.04, 0.12, 0.22) * skin * 0.5;
          float trab = noise(vUv * uRes / 3.2) * 0.6 + noise(vUv * uRes / 9.0) * 0.4;
          float v = 1.0 - exp(-I * (1.5 + 0.5 * trab));
          col += ramp(v) + glow * vec3(0.05, 0.3, 0.55) * 0.35;
          vec2 g = abs(fract(vUv * uRes / 28.0) - 0.5);
          col += smoothstep(0.47, 0.5, max(g.x, g.y)) * vec3(0.04, 0.12, 0.22) * 0.7;
          col *= 0.95 + 0.05 * sin(vUv.y * uRes.y * 1.4 - uTime * 3.0);
          col += (hash(vUv * uRes + fract(uTime)) - 0.5) * 0.035;
          float n = noise(vUv * 7.0 + uTime * 0.18);
          float m = max(texture2D(tMask, vUv + (n - 0.5) * 0.04).r, uFull);
          float a = smoothstep(0.2, 0.5, m);
          float rim = smoothstep(0.12, 0.2, m) * (1.0 - smoothstep(0.22, 0.32, m)) * (1.0 - uFull);
          vec3 rimCol = vec3(0.3, 0.78, 0.98);
          vec3 outc = col * a + rimCol * rim * 0.75;
          float alpha = clamp(max(a, rim * 0.9), 0.0, 1.0);
          gl_FragColor = vec4(min(outc, vec3(alpha)), alpha);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp));

    let map = photoMap();
    const resize = () => {
      sizeMask();
      renderer.setSize(W, H, false);
      target.setSize(Math.round(W * dpr * 0.8), Math.round(H * dpr * 0.8));
      camera.left = 0;
      camera.right = W;
      camera.top = H;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
      map = photoMap();
      jaw.position.set(map.mouth[0], H - map.mouth[1], 0);
      jaw.scale.setScalar(map.pxPerMm);
      comp.uniforms.uRes.value.set(W * dpr * 0.8, H * dpr * 0.8);
      comp.uniforms.uMouth.value.set(map.mouth[0] / W, 1 - map.mouth[1] / H);
      const dw = PHOTO.w * map.s, dh = PHOTO.h * map.s;
      comp.uniforms.uCover.value.set(dw / W, dh / H, ((W - dw) * PHOTO.pos[0]) / W, ((H - dh) * PHOTO.pos[1]) / H);
    };
    resize();
    new ResizeObserver(resize).observe(frame);

    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(frame);
    hero.classList.add('gl');
    const v = new THREE.Vector3();
    let prev = performance.now();
    const still = reduced();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const time = now / 1000;
      paintTrail(now, dt, time);
      maskTex.needsUpdate = true;
      // The jaw turns a little with the pointer, so it reads as three-dimensional.
      const ax = still ? 0 : (pointer.x - 0.5) * 0.32 + Math.sin(time * 0.35) * 0.05;
      const ay = still ? 0 : (pointer.y - 0.55) * 0.12;
      jaw.rotation.y += (ax - jaw.rotation.y) * Math.min(1, dt * 3);
      jaw.rotation.x += (0.3 + ay - jaw.rotation.x) * Math.min(1, dt * 3);
      comp.uniforms.uTime.value = time;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(quadScene, quadCam);
      // Tooth labels follow their teeth and appear only where the trail has uncovered them.
      for (const el of labels) {
        const a = anchors[el.dataset.tag];
        if (!a) continue;
        v.set(0, a.y, 0);
        a.holder.children[0].localToWorld(v);
        const x = v.x, y = H - v.y;
        const show = debug ? 1 : coverage(x, y, now);
        el.style.opacity = show.toFixed(3);
        const start = el.classList.contains('to-start');
        const dy = el.dataset.tag === '36' ? 6 : -34;
        el.style.transform = start
          ? `translate3d(calc(${(x + 4).toFixed(1)}px - 100%), ${(y + dy).toFixed(1)}px, 0)`
          : `translate3d(${(x - 4).toFixed(1)}px, ${(y + dy).toFixed(1)}px, 0)`;
      }
    };
    requestAnimationFrame(loop);
  }
}
