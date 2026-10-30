// 8 · ERA Residence: every treatment on a card with the same fixed fields (visits, chair time, recovery, specialist);
// the button opens the booking already filtered to that treatment and the chosen clinic.
// 4 · Oryzo AI by Lusion: "Modelkaart" opens a deadpan spec sheet with a live model, a downloadable .obj and a
// sources line to copy.
import { t, onLang, getLang } from './i18n.js';
import { SPECIALTIES, TREATMENTS, treatmentById } from './data.js';
import { esc, reduced, copyText, flash, hasWebGL } from './fx.js';

/** The clinic's own English names on elitesmile.nl. */
const SITE = {
  controle: 'Dental Examination and Diagnosis', reiniging: 'Professional Dental Cleaning (Scaling and Calculus Removal)', polijsten: 'Dental Polishing',
  rontgen: 'Dental Radiography (X-rays)', vulling: 'Dental Caries Treatment (Restorative Fillings)', 'kind-controle': 'Pediatric Dental Examination',
  'kind-vulling': 'Pediatric Dental Fillings', 'pulpa-kind': 'Pediatric Pulp Therapy', fluoride: 'Fluoride Application', ruimtebehouder: 'Space Maintainers',
  facings: 'Veneers', hollywood: 'Hollywood Smile Makeover', gingiva: 'Gingival Aesthetic Treatment (Gum Contouring)', diastema: 'Diastema Closure',
  bleken: 'Teeth Whitening', beugel: 'Fixed Metal Braces', uitneembaar: 'Removable Orthodontic Appliances', retainer: 'Orthodontic Retainers',
  extractie: 'Tooth Extraction', verstandskies: 'Non-Surgical Wisdom Tooth Extraction', bot: 'Bone Grafting', wortelkanaal: 'Root Canal Therapy',
  herbehandeling: 'Root Canal Retreatment', kroon: 'Dental Crowns', brug: 'Dental Bridges', prothese: 'Partial and Complete Dentures', implantaat: 'Dental Implants',
};

const state = { filter: 'all', loc: 'eindhoven' };
export const bookingHref = (id, loc = state.loc) => `../app/afspraak?behandeling=${encodeURIComponent(id)}&locatie=${encodeURIComponent(loc)}`;
const specColor = (id) => SPECIALTIES.find((s) => s.id === id)?.color ?? '#2DB4E8';
const doctors = (tr) => tr.docs.map((d) => t(`doc.${d}`)).join(' · ');

export function initTreatments() {
  const chips = document.querySelector('[data-chips]');
  const rail = document.querySelector('[data-rail]');
  const count = document.querySelector('[data-count]');
  const seg = document.querySelector('[data-loc]');
  const prev = document.querySelector('[data-rail-prev]');
  const next = document.querySelector('[data-rail-next]');

  const renderChips = () => {
    chips.innerHTML = [{ id: 'all' }, ...SPECIALTIES].map((s) => `<button type="button" class="chip" aria-pressed="${state.filter === s.id}" data-spec="${s.id}" style="--c:${s.color ?? 'var(--ink)'}">${s.color ? '<i></i>' : ''}${esc(s.id === 'all' ? t('tr.all') : t(`s.${s.id}.n`))}</button>`).join('');
  };
  const renderCards = () => {
    const list = TREATMENTS.filter((tr) => state.filter === 'all' || tr.spec === state.filter);
    rail.innerHTML = list.map((tr) => {
      const n = TREATMENTS.indexOf(tr) + 1;
      return `<li class="tcard" style="--c:${specColor(tr.spec)}"><article aria-labelledby="tc-${tr.id}">
        <header class="mono"><span>${String(n).padStart(2, '0')}/${TREATMENTS.length}</span><span class="spec">[ ${esc(t(`s.${tr.spec}.n`))} ]</span></header>
        <h3 id="tc-${tr.id}">${esc(t(`t.${tr.id}.n`))}</h3>
        <p class="short">${esc(t(`t.${tr.id}.s`))}</p>
        <div class="badges">${tr.free ? `<span class="badge">${esc(t('tr.free'))}</span>` : ''}${tr.kids ? `<span class="badge kids">${esc(t('tr.kids'))}</span>` : ''}</div>
        <dl class="fields">
          <div><dt>${esc(t('f.visits'))}</dt><dd>${esc(t(`v.${tr.vis}`))}</dd></div>
          <div><dt>${esc(t('f.chair'))}</dt><dd>${esc(t('tr.min', { n: tr.min }))}</dd></div>
          <div><dt>${esc(t('f.recovery'))}</dt><dd>${esc(t(`c.${tr.care}.r`))}</dd></div>
          <div><dt>${esc(t('f.specialist'))}</dt><dd>${esc(doctors(tr))}</dd></div>
        </dl>
        <div class="tcard-actions">
          <button type="button" class="btn-text" data-card="${tr.id}">${esc(t('tr.card'))}</button>
          <a class="btn btn-primary btn-sm" href="${bookingHref(tr.id)}" data-book="${tr.id}" data-scramble><span>${esc(t('tr.book'))}</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </article></li>`;
    }).join('');
    count.textContent = t('tr.shown', { n: list.length });
    rail.scrollTo({ left: 0 });
    railButtons();
  };
  const render = () => {
    renderChips();
    renderCards();
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.locId === state.loc)));
  };

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-spec]');
    if (!b) return;
    state.filter = b.dataset.spec;
    chips.querySelectorAll('[data-spec]').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    renderCards();
  });
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-loc-id]');
    if (!b) return;
    state.loc = b.dataset.locId;
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    rail.querySelectorAll('[data-book]').forEach((a) => (a.href = bookingHref(a.dataset.book)));
  });
  seg.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const other = seg.querySelector(`[data-loc-id]:not([data-loc-id="${state.loc}"])`);
    other.click();
    other.focus();
  });

  // The rail scrolls a card at a time with the arrows and the keyboard.
  const step = () => (rail.querySelector('.tcard')?.getBoundingClientRect().width ?? 340) + 16;
  const dir = () => (document.documentElement.dir === 'rtl' ? -1 : 1);
  const railButtons = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const x = Math.abs(rail.scrollLeft);
    prev.disabled = x < 4;
    next.disabled = x > max - 4;
  };
  prev.addEventListener('click', () => rail.scrollBy({ left: -step() * dir(), behavior: reduced() ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: step() * dir(), behavior: reduced() ? 'auto' : 'smooth' }));
  rail.addEventListener('scroll', railButtons, { passive: true });
  addEventListener('resize', railButtons, { passive: true });

  document.addEventListener('smile:filter', (e) => {
    state.filter = e.detail;
    render();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-card]');
    if (b) openCard(b.dataset.card, b);
  });

  render();
  onLang(render);
}

// ---------------------------------------------------------------------------------------------------- model card

let preview = null;

export async function openCard(id, opener) {
  const tr = treatmentById(id);
  if (!tr) return;
  const dialog = document.getElementById('model-card');
  const file = `elite-smile-${tr.id}.obj`;
  const sources = t('mc.sourcesLine');
  dialog.innerHTML = `
    <div class="mc-visual"><canvas aria-hidden="true"></canvas><p class="mono">${esc(t(`m.${tr.model}.n`))} · mm</p></div>
    <div class="mc-body">
      <div class="mc-top"><span class="mono">${esc(t('mc.kicker')).toUpperCase()} · ${esc(t('mc.version'))}</span>
        <button type="button" class="mc-close" aria-label="${esc(t('mc.close'))}"><svg class="i" aria-hidden="true"><use href="#i-close"/></svg></button></div>
      <div><h3 id="mc-name">${esc(t(`t.${tr.id}.n`))}</h3><p class="site" lang="en">${esc(SITE[tr.id])}</p></div>
      <dl class="mspec">
        <div><dt>${esc(t('mc.what'))}</dt><dd>${esc(t(`t.${tr.id}.w`))}</dd></div>
        <div><dt>${esc(t('f.visits'))}</dt><dd>${esc(t(`v.${tr.vis}`))}</dd></div>
        <div><dt>${esc(t('f.chair'))}</dt><dd>${esc(t('tr.min', { n: tr.min }))}</dd></div>
        <div><dt>${esc(t('f.recovery'))}</dt><dd>${esc(t(`c.${tr.care}.r`))}</dd></div>
        <div><dt>${esc(t('mc.care'))}</dt><dd><ul><li>${esc(t(`c.${tr.care}.h1`))}</li><li>${esc(t(`c.${tr.care}.h2`))}</li></ul></dd></div>
        <div><dt>${esc(t('f.specialist'))}</dt><dd>${esc(doctors(tr))}</dd></div>
        <div><dt>${esc(t('mc.use'))}</dt><dd>${esc(t('mc.useText'))}</dd></div>
        <div><dt>${esc(t('mc.file'))}</dt><dd><div class="file-row"><button type="button" class="btn btn-ghost btn-sm" data-obj><svg class="i" aria-hidden="true"><use href="#i-download"/></svg><span>${esc(t('mc.download', { file }))}</span></button></div><p class="file-note">${esc(t('mc.fileNote'))}</p></dd></div>
        <div><dt>${esc(t('mc.sources'))}</dt><dd><div class="sources"><code>${esc(sources)}</code><button type="button" class="copy-btn" data-copy><svg class="i" aria-hidden="true"><use href="#i-copy"/></svg><span>${esc(t('mc.copy'))}</span></button></div></dd></div>
      </dl>
      <a class="btn btn-primary" href="${bookingHref(tr.id)}" data-scramble><span>${esc(t('tr.book'))}</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </div>`;
  const close = () => dialog.close();
  dialog.querySelector('.mc-close').addEventListener('click', close);
  dialog.addEventListener('click', (e) => e.target === dialog && close(), { once: true });
  dialog.addEventListener('close', () => {
    preview?.dispose();
    preview = null;
    opener?.focus?.();
  }, { once: true });
  dialog.querySelector('[data-copy]').addEventListener('click', async (e) => {
    const span = e.currentTarget.querySelector('span');
    if (await copyText(sources)) flash(span, t('mc.copied'));
  });
  dialog.querySelector('[data-obj]').addEventListener('click', async (e) => {
    const span = e.currentTarget.querySelector('span');
    flash(span, t('mc.making'), 900);
    const THREE = await import('three');
    const { buildModel, materials, toOBJ } = await import('./geometry.js');
    const model = buildModel(tr.model, materials());
    model.updateMatrixWorld(true);
    const text = await toOBJ(model, `${t(`t.${tr.id}.n`)} (${SITE[tr.id]})`);
    const url = URL.createObjectURL(new Blob([text], { type: 'model/obj' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: file });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    void THREE;
  });
  dialog.showModal();
  dialog.querySelector('.mc-close').focus();
  if (hasWebGL()) startPreview(dialog.querySelector('canvas'), tr.model);
}

async function startPreview(canvas, modelId) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { buildModel, materials } = await import('./geometry.js');
  if (!canvas.isConnected) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 5, 4);
  scene.add(key, new THREE.AmbientLight('#dfe9ff', 0.4));
  const model = buildModel(modelId, materials());
  scene.add(model);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  const radius = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere()).radius;
  const fit = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const dist = radius / Math.sin(Math.min(fov, fov * camera.aspect) / 2) * 1.05;
    camera.position.set(0, radius * 0.35, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  fit();
  let raf = 0;
  const still = reduced();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    model.rotation.y = still ? 0.6 : now / 2600;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  preview = {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      pmrem.dispose();
    },
  };
  void getLang;
}
