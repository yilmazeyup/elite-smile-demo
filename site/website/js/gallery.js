// 2 · The Renaissance Edition (Shopify): the seven specialties hang as paintings in seven rooms. Scrolling walks
// through them; between rooms a navy brushstroke sweeps across, covers the wall, shows the next room's number and
// uncovers the next painting. The photos are painted live with an SVG filter; surgery and endodontics, which have no
// photo on Elite Smile's site, are drawn as anatomical studies in ink on parchment.
import { t, onLang } from './i18n.js';
import { SPECIALTIES, TREATMENTS, ROMAN } from './data.js';
import { esc, reduced, clamp, easeIO } from './fx.js';

export function initGallery(track) {
  const section = track.closest('section');
  const stage = track.querySelector('.gal-stage');
  const rooms = track.querySelector('[data-rooms]');
  const canvas = track.querySelector('.gal-brush');
  const card = track.querySelector('.gal-card');
  const index = track.querySelector('.gal-index');
  const still = reduced();
  let current = -1;
  let lastP = -1;
  let update = () => {};

  let near = false;
  const loadImages = () => near && rooms.querySelectorAll('image[data-href]').forEach((im) => im.setAttribute('href', im.dataset.href));
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      near = true;
      loadImages();
    }
  }, { rootMargin: '1200px' }).observe(track);
  const render = () => {
    rooms.innerHTML = SPECIALTIES.map((s, i) => roomHTML(s, i)).join('');
    loadImages();
    index.innerHTML = ROMAN.map((r, i) => `<li data-i="${i}">${r}</li>`).join('');
    current = -1;
    update(true);
  };
  rooms.addEventListener('click', (e) => {
    const a = e.target.closest('[data-filter]');
    if (!a) return;
    document.dispatchEvent(new CustomEvent('smile:filter', { detail: a.dataset.filter }));
  });

  if (still) {
    section.classList.add('static-gallery');
    render();
    onLang(render);
    return;
  }

  // ------------------------------------------------------------------------------------- the brush, painted once
  const ctx = canvas.getContext('2d');
  const strokes = [0, 1, 2].map((seed) => brushTexture(seed));
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    update(true);
  };

  update = (force = false) => {
    const rect = track.getBoundingClientRect();
    const total = rect.height - innerHeight;
    const p = clamp(-rect.top / Math.max(total, 1)) * (SPECIALTIES.length - 1);
    if (!force && Math.abs(p - lastP) < 0.0005) return;
    lastP = p;
    const k = Math.min(Math.floor(p), SPECIALTIES.length - 2);
    const frac = p - k;
    const w = clamp((frac - 0.5) / 0.5);
    const show = p >= SPECIALTIES.length - 1 ? SPECIALTIES.length - 1 : w < 0.5 ? k : k + 1;
    if (show !== current) {
      rooms.querySelectorAll('.room').forEach((el, i) => el.classList.toggle('on', i === show));
      index.querySelectorAll('li').forEach((el, i) => el.classList.toggle('on', i === show));
      current = show;
    }
    // Depth: the photo drifts inside its frame, the frame and the label move at their own pace.
    const room = rooms.children[show];
    if (room) {
      const local = show === k ? frac : frac - 1;
      const d = local - 0.25;
      room.style.setProperty('--fy', `${(-d * 36).toFixed(1)}px`);
      room.style.setProperty('--iy', `${(d * 48).toFixed(1)}px`);
      room.style.setProperty('--py', `${(-d * 80).toFixed(1)}px`);
      room.style.setProperty('--fs', (1 - Math.abs(d) * 0.04).toFixed(4));
    }
    drawBrush(p >= SPECIALTIES.length - 1 ? 0 : w, k + 1);
  };

  const drawBrush = (w, next) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    card.style.opacity = '0';
    if (w <= 0 || w >= 1) return;
    const rtl = document.documentElement.dir === 'rtl';
    ctx.setTransform(rtl ? -dpr : dpr, 0, 0, dpr, rtl ? canvas.width : 0, 0);
    const L = W * 1.7;
    const band = H / 2.3;
    let cover = 1;
    strokes.forEach((tex, i) => {
      const lag = i * 0.06;
      const ww = clamp((w - lag) / (1 - 0.12));
      const head = easeIO(ww) * (L + W * 1.08);
      const y = -band * 0.2 + i * (H - band * 0.6) / 2;
      ctx.save();
      ctx.translate(0, y + band / 2);
      ctx.rotate((i - 1) * -0.035);
      ctx.drawImage(tex, head - L, -band / 2 - band * 0.12, L, band * 1.24);
      ctx.restore();
      const covered = clamp(Math.min(head / W, (L + W - head) / W));
      cover = Math.min(cover, covered);
    });
    // While the wall is navy, the next room's number and name.
    const s = SPECIALTIES[next];
    if (s && cover > 0.6) {
      card.querySelector('.gal-card-n').textContent = ROMAN[next];
      card.querySelector('.gal-card-name').textContent = t(`s.${s.id}.n`);
      card.style.opacity = clamp((cover - 0.6) / 0.25).toFixed(3);
    }
  };

  let visible = false;
  let raf = 0;
  const tick = () => {
    raf = 0;
    if (visible) update();
  };
  addEventListener('scroll', () => {
    if (visible && !raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) update(true);
  }).observe(track);
  addEventListener('resize', size, { passive: true });
  render();
  size();
  onLang(render);
}

// ----------------------------------------------------------------------------------------------------- one room

function roomHTML(s, i) {
  const treatments = TREATMENTS.filter((tr) => tr.spec === s.id);
  const arn = s.drawing ? 0.8 : s.w / s.h;
  const hmax = s.id === 'prothetiek' ? 0.42 : s.drawing ? 0.6 : 0.56;
  const wmax = s.id === 'prothetiek' ? 0.34 : 0.5;
  const art = s.drawing
    ? (s.drawing === 'molar' ? molarStudy() : wisdomStudy())
    : `<svg class="paint" viewBox="0 0 ${s.w} ${s.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(t(`alt.${s.id}`))}"><image data-href="img/${s.photo}" width="${s.w}" height="${s.h}" preserveAspectRatio="xMidYMid slice" filter="url(#paint)"/></svg>`;
  const medium = s.drawing ? t('gal.medium.drawing') : t('gal.medium.photo');
  return `<figure class="room" data-i="${i}" style="--c:${s.color}" aria-label="${esc(t(`s.${s.id}.n`))}">
    <div class="painting">
      <div class="lamp" aria-hidden="true"></div>
      <div class="frame ${s.frame}"><div class="fillet"><div class="mat">
        <div class="art" style="--ar:${arn};aspect-ratio:${arn};--w:min(${wmax * 100}vw, calc(${hmax * 100}svh * ${arn.toFixed(4)}))"${s.drawing ? ` role="img" aria-label="${esc(t(`alt.${s.id}`))}"` : ''}>${art}</div>
      </div></div></div>
    </div>
    <figcaption class="plaque">
      <p class="room-n">${esc(t('gal.room'))} ${ROMAN[i]} · ${String(i + 1).padStart(2, '0')}/07</p>
      <h3>${esc(t(`s.${s.id}.n`))}</h3>
      <p class="site" lang="en">${esc(s.site)}</p>
      <p class="lead-s">${esc(t(`s.${s.id}.l`))}</p>
      <ul>${treatments.map((tr) => `<li>${esc(t(`t.${tr.id}.n`))}</li>`).join('')}</ul>
      <p class="medium">${esc(medium)}</p>
      <a href="#behandelingen" data-filter="${s.id}">${esc(t('gal.see'))} <span class="mono">(${treatments.length})</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </figcaption>
  </figure>`;
}

// ------------------------------------------------------------------------------------------------ the brushstroke

/** A long navy stroke with bristle streaks and ragged ends, painted once into a canvas. */
function brushTexture(seed) {
  const c = document.createElement('canvas');
  c.width = 1400;
  c.height = 320;
  const g = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const cols = ['#1B2F66', '#203a7a', '#162857', '#234282', '#1d3470'];
  // The body: a band whose ends are rounded and torn, never straight.
  g.fillStyle = '#1B2F66';
  g.beginPath();
  g.moveTo(230, 40);
  for (let x = 230; x <= 1150; x += 40) g.lineTo(x, 36 + Math.sin(x / 140 + seed) * 10 + rnd() * 8);
  for (let y = 40; y <= 280; y += 20) g.lineTo(1150 + Math.sin(y / 40 + seed) * 40 + rnd() * 70 + Math.sin((y / 320) * Math.PI) * 120, y);
  for (let x = 1150; x >= 230; x -= 40) g.lineTo(x, 284 + Math.sin(x / 170 + seed * 2) * 10 - rnd() * 8);
  for (let y = 280; y >= 40; y -= 20) g.lineTo(230 - Math.sin(y / 36 + seed) * 40 - rnd() * 70 - Math.sin((y / 320) * Math.PI) * 120, y);
  g.closePath();
  g.fill();
  // Bristles: streaks that start and stop at different places, thinning out towards both ends.
  for (let i = 0; i < 340; i++) {
    const y = 10 + rnd() * 300;
    const edge = Math.min(y - 10, 310 - y) / 150;
    const x0 = rnd() * 220 + (1 - edge) * 120;
    const x1 = 1400 - rnd() * 220 - (1 - edge) * 140;
    g.strokeStyle = rnd() < 0.05 ? 'rgba(45,180,232,0.6)' : cols[(rnd() * cols.length) | 0];
    g.globalAlpha = 0.3 + rnd() * 0.7;
    g.lineWidth = 0.8 + rnd() * 3.6;
    g.beginPath();
    g.moveTo(x0, y);
    g.bezierCurveTo(x0 + 400, y + (rnd() - 0.5) * 10, x1 - 400, y + (rnd() - 0.5) * 10, x1, y + (rnd() - 0.5) * 6);
    g.stroke();
  }
  // Dry flecks at the tail and the head.
  g.globalAlpha = 1;
  g.fillStyle = '#1B2F66';
  for (let i = 0; i < 120; i++) {
    const head = rnd() < 0.5;
    g.beginPath();
    g.arc(head ? 1300 + rnd() * 100 : rnd() * 100, 20 + rnd() * 280, rnd() * 3 + 0.6, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ------------------------------------------------------------------------------------- two anatomical studies

const INK = '#5B3A1E';
const MOLAR_OUT = 'M-66 140C-80 100-84 50-62 18C-52 4-36 0-26 12C-16 24-6 26 0 18C8 8 20-2 36 4C56 10 80 40 76 100C74 120 70 132 64 142C62 200 58 290 46 370C42 392 26 394 24 372C18 300 12 230 0 205C-10 230-18 300-26 372C-28 394-44 392-48 370C-60 290-64 200-66 140Z';
const MOLAR_DENTIN = 'M-60 128C-70 96-72 56-54 30C-44 18-34 16-26 26C-16 38-4 40 2 32C12 20 24 14 34 18C52 26 68 50 64 104C62 118 60 128 56 134L64 142C62 200 58 290 46 370C42 392 26 394 24 372C18 300 12 230 0 205C-10 230-18 300-26 372C-28 394-44 392-48 370C-60 290-64 200-66 140Z';
const MOLAR_PULP = 'M-34 110C-36 80-24 64-14 70C-6 76 6 76 14 70C26 62 38 80 34 110C32 130 24 150 20 160C22 240 36 320 36 368C34 372 32 372 31 366C28 320 14 240 10 180C6 170-6 170-10 180C-16 240-30 320-34 366C-35 372-38 372-38 368C-38 320-24 240-22 160C-26 150-32 130-34 110Z';

function plateDefs(id) {
  return `<defs>
    <pattern id="${id}-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V5" stroke="${INK}" stroke-width=".7" opacity=".55"/></pattern>
    <pattern id="${id}-fine" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><path d="M0 0V2.6" stroke="${INK}" stroke-width=".55" opacity=".7"/></pattern>
    <pattern id="${id}-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".9" fill="${INK}" opacity=".5"/><circle cx="6.5" cy="7" r=".6" fill="${INK}" opacity=".4"/><circle cx="7" cy="1.5" r=".5" fill="${INK}" opacity=".35"/></pattern>
    <pattern id="${id}-cross" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0L6 6M6 0L0 6" stroke="#8A3B22" stroke-width=".6" opacity=".7"/></pattern>
    <radialGradient id="${id}-vig" r=".75"><stop offset=".55" stop-color="#5B3A1E" stop-opacity="0"/><stop offset="1" stop-color="#5B3A1E" stop-opacity=".38"/></radialGradient>
    <g id="${id}-molar">
      <path d="${MOLAR_OUT}" fill="url(#${id}-fine)"/>
      <path d="${MOLAR_OUT}" fill="#F3EAD6" opacity=".25"/>
      <path d="${MOLAR_DENTIN}" fill="#EFE3C9"/>
      <path d="${MOLAR_DENTIN}" fill="url(#${id}-hatch)"/>
      <path d="${MOLAR_PULP}" fill="#C98A6B" opacity=".55"/>
      <path d="${MOLAR_PULP}" fill="url(#${id}-cross)"/>
      <path d="${MOLAR_OUT}" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="${MOLAR_PULP}" fill="none" stroke="${INK}" stroke-width="1.1"/>
      <path d="M-60 128C-70 96-72 56-54 30C-44 18-34 16-26 26C-16 38-4 40 2 32C12 20 24 14 34 18C52 26 68 50 64 104C62 118 60 128 56 134" fill="none" stroke="${INK}" stroke-width=".9" stroke-dasharray="3 2"/>
    </g>
  </defs>`;
}

const plate = (id, body, title, tab) => `<svg class="plate" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  ${plateDefs(id)}
  <rect width="400" height="500" fill="#F1E7D0"/>
  <rect width="400" height="500" filter="url(#parchment)" opacity=".55"/>
  <g filter="url(#sketch)" font-family="Newsreader, Georgia, serif" font-style="italic" fill="${INK}">
    ${body}
    <text x="200" y="40" text-anchor="middle" font-size="19">${title}</text>
    <text x="370" y="482" text-anchor="end" font-size="12" opacity=".7">${tab}</text>
    <text x="28" y="482" font-size="12" opacity=".7">E. S.</text>
  </g>
  <rect width="400" height="500" fill="url(#${id}-vig)"/>
</svg>`;

const label = (x1, y1, x2, y2, text, anchor = 'start') =>
  `<path d="M${x1} ${y1}Q${(x1 + x2) / 2} ${y1 - 8} ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width=".8"/><circle cx="${x1}" cy="${y1}" r="1.8"/>
   <text x="${x2 + (anchor === 'end' ? -4 : 4)}" y="${y2 + 4}" font-size="13" text-anchor="${anchor}">${text}</text>`;

function molarStudy() {
  return plate('mol', `
    <path d="M0 250C60 236 120 246 150 238C170 232 186 236 200 244C214 236 232 232 252 238C282 246 340 236 400 250V500H0Z" fill="url(#mol-dots)"/>
    <path d="M0 250C60 236 120 246 150 238C170 232 186 236 200 244C214 236 232 232 252 238C282 246 340 236 400 250" fill="none" stroke="${INK}" stroke-width="1"/>
    <path d="M40 222C80 214 110 222 138 214C150 210 156 212 160 218L240 218C246 210 256 210 268 214C296 222 330 214 360 222L360 246C330 238 300 246 268 238C256 234 248 236 240 240L160 240C152 236 146 234 138 238C110 246 80 238 40 246Z" fill="url(#mol-hatch)" opacity=".7"/>
    <use href="#mol-molar" transform="translate(200 76) scale(1.02)"/>
    ${label(176, 98, 70, 120, 'enamelum', 'end')}
    ${label(240, 180, 330, 168, 'dentinum')}
    ${label(203, 180, 330, 200, 'pulpa')}
    ${label(160, 360, 70, 380, 'radix', 'end')}
    ${label(240, 248, 330, 280, 'gingiva')}
  `, 'Dens molaris, sectio', 'Tab. VI');
}

function wisdomStudy() {
  return plate('wis', `
    <path d="M0 236C80 226 150 238 200 230C250 222 320 228 400 238V500H0Z" fill="url(#wis-dots)"/>
    <path d="M0 236C80 226 150 238 200 230C250 222 320 228 400 238" fill="none" stroke="${INK}" stroke-width="1"/>
    <path d="M0 214C60 206 90 214 112 206L170 206C190 200 210 206 236 212C290 222 340 212 400 220V236C320 228 250 222 200 230C150 238 80 226 0 236Z" fill="url(#wis-hatch)" opacity=".7"/>
    <use href="#wis-molar" transform="translate(132 104) scale(.78)"/>
    <use href="#wis-molar" transform="translate(286 196) rotate(-42) scale(.72)"/>
    <path d="M10 430C90 452 170 446 250 424C300 410 350 404 392 410" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="5 3"/>
    <path d="M10 446C90 468 170 462 250 440C300 426 350 420 392 426" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="5 3"/>
    ${label(300, 190, 330, 120, 'dens sapientiae')}
    ${label(110, 130, 40, 90, 'molaris II')}
    ${label(200, 438, 150, 480, 'canalis mandibulae', 'end')}
    ${label(70, 222, 40, 180, 'gingiva')}
  `, 'Dens sapientiae', 'Tab. V');
}
