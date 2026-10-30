// 3 · GQ & AP The Extraordinary Lab: one object, rendered live on black reflective glass under studio light — a
// zirconia crown on a titanium implant. Scrolling turns it, dragging turns it further; behind the glass the six
// dentists' portraits hang as soft projections.
import { t, onLang } from './i18n.js';
import { DOCTORS } from './data.js';
import { reduced, hasWebGL, clamp } from './fx.js';

export async function initLab(section) {
  const canvas = section.querySelector('.lab-canvas');
  const tags = [...section.querySelectorAll('.lab-tags span')];
  const angleEl = section.querySelector('[data-angle]');
  if (!hasWebGL()) {
    section.classList.add('nogl');
    section.querySelector('.lab-fallback').innerHTML = `<p class="mono" style="color:#9FDDF6">${t('lab.fallback')}</p>`;
    onLang(() => (section.querySelector('.lab-fallback p').textContent = t('lab.fallback')));
    return;
  }
  const THREE = await import('three');
  const { Reflector } = await import('three/addons/objects/Reflector.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { implantGeometry, abutmentGeometry, implantCrownGeometry, materials } = await import('./geometry.js');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor('#02050C', 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#02050C', 90, 210);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  // Studio light: a soft key from above, a cold rim from behind, a low fill.
  const key = new THREE.SpotLight('#ffffff', 2600, 160, 0.42, 0.8, 1.6);
  key.position.set(-18, 48, 26);
  key.target.position.set(0, 6, 0);
  const rim = new THREE.SpotLight('#5FCBF5', 2200, 140, 0.5, 0.9, 1.6);
  rim.position.set(20, 22, -34);
  rim.target.position.set(0, 8, 0);
  const fill = new THREE.PointLight('#9DB7FF', 60, 80, 1.6);
  fill.position.set(10, 4, 22);
  scene.add(key, key.target, rim, rim.target, fill, new THREE.AmbientLight('#1a2440', 0.4));

  // The object: implant, abutment and crown, standing on the glass.
  const mats = materials();
  mats.titanium.roughness = 0.24;
  const object = new THREE.Group();
  const implant = new THREE.Mesh(implantGeometry(), mats.titanium);
  const abutment = new THREE.Mesh(abutmentGeometry(), mats.titanium);
  const crown = new THREE.Mesh(implantCrownGeometry(72), mats.zirconia);
  object.add(implant, abutment, crown);
  object.position.y = 0.6;
  const turn = new THREE.Group();
  turn.add(object);
  scene.add(turn);

  // Black glass: a mirror, darkened and faded towards the edges.
  const mirror = new Reflector(new THREE.CircleGeometry(80, 64), {
    color: 0x3a4152,
    textureWidth: Math.round(innerWidth * dpr * 0.5),
    textureHeight: Math.round(innerHeight * dpr * 0.5),
  });
  mirror.rotation.x = -Math.PI / 2;
  scene.add(mirror);
  const fadeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, 'rgba(2,5,12,0.35)');
    grad.addColorStop(0.35, 'rgba(2,5,12,0.62)');
    grad.addColorStop(1, 'rgba(2,5,12,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const veil = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false }));
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = 0.02;
  scene.add(veil);

  // Behind the glass: the dentists, as soft cold projections.
  const loader = new THREE.TextureLoader();
  const portraitMat = (tex) => new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uSeed: { value: Math.random() * 10 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uTime; uniform float uSeed; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(map, vUv, 2.5).rgb;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        float figure = smoothstep(0.92, 0.55, l);
        float circle = smoothstep(0.5, 0.36, length(vUv - 0.5));
        float flicker = 0.92 + 0.08 * sin(uTime * 1.3 + uSeed);
        vec3 tint = mix(vec3(0.06, 0.24, 0.5), vec3(0.45, 0.82, 1.0), 1.0 - l);
        float a = circle * mix(0.12, 0.5, figure) * flicker;
        gl_FragColor = vec4(tint * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const portraits = DOCTORS.map((d, i) => {
    const tex = loader.load(`img/team-${d.id}-sm.webp`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), portraitMat(tex));
    const a = ((i - 2.5) / 2.5) * 0.95;
    mesh.position.set(Math.sin(a) * 78, 22 + (i % 2) * 6, -Math.cos(a) * 78 + 12);
    mesh.lookAt(0, 18, 20);
    scene.add(mesh);
    return mesh;
  });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  let W = 0, H = 0, narrow = false;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    narrow = W < 760;
    renderer.setSize(W, H, false);
    camera.aspect = W / Math.max(H, 1);
    camera.fov = narrow ? 40 : 30;
    camera.updateProjectionMatrix();
    mirror.getRenderTarget().setSize(Math.round(W * dpr * 0.5), Math.round(H * dpr * 0.5));
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Scroll turns it; a drag adds a spin that slowly runs out.
  let drag = null;
  let spin = 0;
  let vel = 0;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    drag.x = e.clientX;
    spin += dx * 0.01;
    vel = dx * 0.01;
  });
  const up = () => (drag = null);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' }).observe(section);
  section.classList.add('ready');
  const still = reduced();
  const anchors = { crown: new THREE.Vector3(5.6, 15.5, 0), abutment: new THREE.Vector3(2.2, 9.7, 0), implant: new THREE.Vector3(2.0, 4.5, 0) };
  const v = new THREE.Vector3();
  let prev = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const r = section.getBoundingClientRect();
    const progress = clamp(-r.top / Math.max(r.height - innerHeight, 1));
    if (!drag) {
      spin += vel;
      vel *= Math.pow(0.05, dt);
    }
    const angle = progress * Math.PI * 2.2 + spin + (still ? 0 : now / 9000);
    turn.rotation.y = angle;
    object.position.y = 0.6 + (still ? 0 : Math.sin(now / 1400) * 0.25);
    // The camera rises a little as you scroll: from eye level to a three-quarter view.
    const dist = narrow ? 92 : 78;
    camera.position.set(narrow ? 4 : -13, 9 + progress * 12, dist - progress * 8);
    camera.lookAt(narrow ? 4 : -13, narrow ? -1 : 9.5, 0);
    portraits.forEach((p, i) => (p.material.uniforms.uTime.value = now / 1000 + i));
    renderer.render(scene, camera);
    const deg = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
    angleEl.textContent = `${String(Math.round(deg)).padStart(3, '0')}°`;
    // The part labels sit beside the object, at the side facing the reader.
    const rtl = document.documentElement.dir === 'rtl';
    tags.forEach((el) => {
      const a = anchors[el.dataset.part];
      v.copy(a);
      if (rtl) v.x = -v.x;
      v.applyMatrix4(object.matrixWorld.clone().premultiply(new THREE.Matrix4().makeRotationY(-turn.rotation.y)));
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      el.style.transform = rtl ? `translate3d(calc(${x.toFixed(1)}px - 100%), ${(y - 6).toFixed(1)}px, 0)` : `translate3d(${x.toFixed(1)}px, ${(y - 6).toFixed(1)}px, 0)`;
      el.style.flexDirection = rtl ? 'row-reverse' : 'row';
    });
  };
  requestAnimationFrame(loop);
}
