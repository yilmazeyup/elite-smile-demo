// 5 · Floema: a catalogue of models that frame themselves in their card — corner marks lock onto each model's
// projected outline as it turns. Dragging strips it to a CAD wireframe on a blueprint; letting go, the material
// sweeps back over it. "Bewaar voor mijn consult" keeps a list that travels with the booking link.
import { t, onLang } from './i18n.js';
import { MODELS } from './data.js';
import { esc, reduced, hasWebGL, clamp, ease } from './fx.js';

const KEY = 'smile-consult';
/** How far each model leans towards the reader, so its shape reads at a glance. */
const TILT = { bracket: -0.62, retainer: -0.7, crown: -0.15, veneer: -0.1 };
const readList = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((id) => MODELS.some((m) => m.treatment === id)) : [];
  } catch {
    return [];
  }
};
const writeList = (list) => {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    // Private window: the list lasts for this visit.
  }
};
let saved = readList();

export const consultHref = (list = saved) =>
  `../app/afspraak?behandeling=${encodeURIComponent(list[0] ?? 'controle')}${list.length ? `&consult=${encodeURIComponent(list.join(','))}` : ''}`;

export async function initCatalogue() {
  const grid = document.querySelector('[data-catalogue]');
  const dock = document.querySelector('[data-dock]');
  grid.innerHTML = MODELS.map((m, i) => `<li class="ccard reveal" data-model="${m.id}">
      <div class="cc-stage" data-stage>
        <canvas aria-hidden="true"></canvas>
        <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
        <p class="dims mono" aria-hidden="true"><span>[ 0${i + 1} ]</span><span data-dims></span></p>
        <p class="cc-hint mono" data-i18n="cat.drag">${esc(t('cat.drag'))}</p>
      </div>
      <div class="cc-body">
        <h3 data-i18n="m.${m.id}.n">${esc(t(`m.${m.id}.n`))}</h3>
        <p data-i18n="m.${m.id}.m">${esc(t(`m.${m.id}.m`))}</p>
        <button type="button" class="save" data-save="${m.treatment}" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg><span></span></button>
      </div>
    </li>`).join('');

  const sync = () => {
    grid.querySelectorAll('[data-save]').forEach((b) => {
      const on = saved.includes(b.dataset.save);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('use').setAttribute('href', on ? '#i-check' : '#i-plus');
      b.querySelector('span').textContent = t(on ? 'cat.saved' : 'cat.save');
    });
    dock.hidden = saved.length === 0;
    if (!saved.length) return;
    dock.innerHTML = `<span class="count">${esc(t('cat.dock'))} · ${esc(t('cat.dockCount', { n: saved.length }))}</span>
      <ul>${saved.map((id) => {
        const m = MODELS.find((x) => x.treatment === id);
        const name = t(`m.${m.id}.n`);
        return `<li><button type="button" data-remove="${id}" aria-label="${esc(t('cat.remove', { name }))}">${esc(name)}<svg class="i" aria-hidden="true"><use href="#i-close"/></svg></button></li>`;
      }).join('')}</ul>
      <a class="btn btn-light" href="${consultHref()}" data-scramble><span>${esc(t('cat.dockBook'))}</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
  };
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-save]');
    if (!b) return;
    const id = b.dataset.save;
    saved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    writeList(saved);
    sync();
  });
  dock.addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    saved = saved.filter((x) => x !== b.dataset.remove);
    writeList(saved);
    sync();
  });
  sync();
  onLang(sync);

  if (!hasWebGL()) {
    grid.querySelectorAll('[data-stage]').forEach((s) => {
      s.insertAdjacentHTML('beforeend', `<svg class="fallback" aria-hidden="true"><use href="#tooth"/></svg>`);
      s.querySelector('.cc-hint').textContent = t('cat.noWebgl');
    });
    return;
  }
  await startModels(grid);
}

async function startModels(grid) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { buildModel, materials } = await import('./geometry.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const still = reduced();

  const cards = [...grid.querySelectorAll('.ccard')].map((li, i) => {
    const id = li.dataset.model;
    const stage = li.querySelector('[data-stage]');
    const canvas = stage.querySelector('canvas');
    const scene = new THREE.Scene();
    scene.environment = env;
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight('#9FDDF6', 1.4);
    rim.position.set(-5, 2, -4);
    scene.add(key, rim, new THREE.AmbientLight('#e6eeff', 0.35));
    // The material sweeps back in from below behind a clipping plane.
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const mats = materials();
    Object.values(mats).forEach((m) => (m.clippingPlanes = [plane]));
    const model = buildModel(id, mats);
    const wireMat = new THREE.MeshBasicMaterial({ color: '#9FDDF6', wireframe: true, transparent: true, opacity: 0, depthWrite: false });
    const wire = buildModel(id, { tooth: wireMat, zirconia: wireMat, porcelain: wireMat, titanium: wireMat, steel: wireMat, acrylic: wireMat }, { q: 0.32 });
    const spin = new THREE.Group();
    spin.add(model, wire);
    scene.add(spin);
    const size = model.userData.size;
    stage.querySelector('[data-dims]').textContent = `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} mm`;
    const radius = new THREE.Box3().setFromObject(spin).getBoundingSphere(new THREE.Sphere()).radius;
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 1000);
    const card = {
      id, li, stage, canvas, ctx: canvas.getContext('2d'), scene, camera, spin, model, wire, wireMat, plane, radius,
      corners: [...stage.querySelectorAll('.corner')],
      rotY: 0.6 + i * 0.7, rotX: TILT[id] ?? -0.25, tilt: TILT[id] ?? -0.22, vel: 0, drag: null, mode: 'solid', sweep: 1, wireMix: 0, intro: 0, visible: false, dirty: true,
    };
    // Dragging: wireframe on a blueprint; letting go: the material comes back.
    stage.addEventListener('pointerdown', (e) => {
      card.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
      card.vel = 0;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!card.drag || e.pointerId !== card.drag.id) return;
      const dx = e.clientX - card.drag.x, dy = e.clientY - card.drag.y;
      if (!card.drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (!card.drag.moved) {
        card.drag.moved = true;
        try { stage.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
        stage.classList.add('wire');
        card.mode = 'wire';
      }
      card.drag.x = e.clientX;
      card.drag.y = e.clientY;
      card.rotY += dx * 0.012;
      card.rotX = clamp(card.rotX + dy * 0.008, -1.1, 1.1);
      card.vel = dx * 0.012;
    });
    const release = (e) => {
      if (!card.drag || (e.pointerId !== undefined && e.pointerId !== card.drag.id)) return;
      const moved = card.drag.moved;
      card.drag = null;
      if (!moved) return;
      stage.classList.remove('wire');
      card.mode = 'settle';
      card.sweep = 0;
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', release);
    new IntersectionObserver(([e]) => (card.visible = e.isIntersecting), { rootMargin: '80px' }).observe(stage);
    return card;
  });

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = cards[0].stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    for (const c of cards) {
      c.canvas.width = Math.round(W * dpr);
      c.canvas.height = Math.round(H * dpr);
      c.camera.aspect = W / Math.max(H, 1);
      c.camera.updateProjectionMatrix();
      c.dirty = true;
    }
  };
  resize();
  new ResizeObserver(resize).observe(cards[0].stage);

  const box = new THREE.Box3();
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  let prev = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (document.hidden) return;
    for (const c of cards) {
      if (!c.visible) continue;
      // Self-framing: arrive from too close and settle on a tight fit.
      c.intro = Math.min(1, c.intro + dt / (still ? 0.01 : 1.4));
      const k = ease(c.intro);
      if (!c.drag) {
        c.vel *= Math.pow(0.04, dt);
        c.rotY += c.vel + (still ? 0 : dt * 0.35);
        c.rotX += (c.tilt - c.rotX) * Math.min(1, dt * 1.5);
      }
      c.spin.rotation.set(c.rotX * (0.4 + 0.6 * k), c.rotY - (1 - k) * 1.2, 0);
      const fov = THREE.MathUtils.degToRad(c.camera.fov);
      const fit = (c.radius / Math.sin(Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * c.camera.aspect)) / 2)) * 1.06;
      c.camera.position.set(0, 0, fit * (0.55 + 0.45 * k));
      c.camera.lookAt(0, 0, 0);
      // Wire and material.
      if (c.mode === 'wire') {
        c.wireMix = Math.min(1, c.wireMix + dt * 6);
        c.sweep = Math.max(0, c.sweep - dt * 5);
      } else if (c.mode === 'settle') {
        c.sweep = Math.min(1, c.sweep + dt / 0.9);
        c.wireMix = 1 - c.sweep;
        if (c.sweep >= 1) c.mode = 'solid';
      } else {
        c.wireMix = Math.max(0, c.wireMix - dt * 3);
      }
      c.wireMat.opacity = c.wireMix * 0.9;
      c.spin.updateMatrixWorld(true);
      box.setFromObject(c.model);
      const y = THREE.MathUtils.lerp(box.min.y - 0.01, box.max.y + 0.01, ease(c.sweep));
      c.plane.constant = c.sweep >= 1 ? 1e6 : y;
      renderer.render(c.scene, c.camera);
      c.ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.ctx.drawImage(renderer.domElement, 0, 0);
      // The corner marks lock onto the projected bounds.
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      box.setFromObject(c.wire);
      let n = 0;
      for (const xx of [box.min.x, box.max.x]) for (const yy of [box.min.y, box.max.y]) for (const zz of [box.min.z, box.max.z]) corners[n++].set(xx, yy, zz);
      for (const p of corners) {
        p.project(c.camera);
        const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      const pad = 8;
      x0 = clamp(x0 - pad, 8, W - 22); x1 = clamp(x1 + pad, 22, W - 8); y0 = clamp(y0 - pad, 30, H - 22); y1 = clamp(y1 + pad, 44, H - 30);
      const pos = [[x0, y0], [x1 - 14, y0], [x0, y1 - 14], [x1 - 14, y1 - 14]];
      c.corners.forEach((el, i) => (el.style.transform = `translate3d(${pos[i][0].toFixed(1)}px, ${pos[i][1].toFixed(1)}px, 0)`));
    }
  };
  requestAnimationFrame(loop);
}
