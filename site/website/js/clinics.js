// 6 · Son Daven: each practice gets a hand-drawn map with the way from the nearest station (walking and cycling
// minutes computed from the coordinates), its opening days as a week ribbon, and a handle you drag to slide from
// Eindhoven to Hoogland. The postcode finder asks PDOK, as on Elite Smile's own site.
import { t, onLang } from './i18n.js';
import { LOCATIONS, WEEK, fromStation, openState, clinicNow, hhmm, locatePostcode, nearestLocation, isPostcode } from './data.js';
import { esc, reduced, clamp } from './fx.js';

export function initClinics() {
  const tabs = document.querySelector('[data-tabs]');
  const slider = document.querySelector('[data-slider]');
  const handle = document.querySelector('[data-handle]');
  const track = document.querySelector('[data-track]');
  const finder = document.querySelector('[data-finder]');
  const out = finder.querySelector('[data-out]');
  let p = 0;

  const render = () => {
    tabs.innerHTML = LOCATIONS.map((l, i) => `<button type="button" role="tab" id="cl-tab-${l.id}" aria-controls="cl-${l.id}" aria-selected="${Math.round(p) === i}" data-i="${i}">${esc(l.short)}</button>`).join('');
    track.innerHTML = LOCATIONS.map((l, i) => clinicHTML(l, i)).join('');
    set(p, false);
    drawRoutes();
  };
  const set = (value, snap = true) => {
    p = clamp(value);
    track.classList.toggle('snap', snap && !reduced());
    for (const el of [track, slider]) el.style.setProperty('--p', p.toFixed(4));
    handle.setAttribute('aria-valuenow', String(Math.round(p)));
    handle.setAttribute('aria-valuetext', LOCATIONS[Math.round(p)].short);
    tabs.querySelectorAll('[role=tab]').forEach((b, i) => {
      b.setAttribute('aria-selected', String(Math.round(p) === i));
      b.tabIndex = Math.round(p) === i ? 0 : -1;
    });
    track.querySelectorAll('.clinic').forEach((el, i) => {
      el.inert = Math.round(p) !== i;
      el.setAttribute('aria-hidden', String(Math.round(p) !== i));
    });
  };
  const drawRoutes = () => {
    if (reduced()) return;
    track.querySelectorAll('.clinic').forEach((el, i) => {
      if (Math.round(p) !== i) return;
      el.querySelectorAll('.route-draw').forEach((path) => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1600, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
      el.querySelectorAll('.route').forEach((path) => path.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, delay: 500, easing: 'ease-out', fill: 'backwards' }));
    });
  };

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[role=tab]');
    if (!b) return;
    set(Number(b.dataset.i));
    drawRoutes();
  });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    set(1 - Math.round(p));
    tabs.querySelector(`[data-i="${Math.round(p)}"]`).focus();
    drawRoutes();
  });

  // The handle: drag it along the rail, it snaps to the nearest clinic.
  let dragging = false;
  const fromPointer = (e) => {
    const r = slider.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl';
    const x = rtl ? r.right - e.clientX : e.clientX - r.left;
    return (x - 28) / Math.max(r.width - 56, 1);
  };
  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
  });
  slider.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-handle]')) return;
    set(fromPointer(e) > 0.5 ? 1 : 0);
    drawRoutes();
  });
  handle.addEventListener('pointermove', (e) => dragging && set(fromPointer(e), false));
  const drop = () => {
    if (!dragging) return;
    dragging = false;
    set(Math.round(p));
    drawRoutes();
  };
  handle.addEventListener('pointerup', drop);
  handle.addEventListener('pointercancel', drop);
  handle.addEventListener('keydown', (e) => {
    const map = { ArrowRight: 1, ArrowUp: 1, End: 1, ArrowLeft: 0, ArrowDown: 0, Home: 0 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const rtl = document.documentElement.dir === 'rtl';
    let v = map[e.key];
    if (rtl && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) v = 1 - v;
    set(v);
    drawRoutes();
  });

  finder.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = finder.querySelector('input').value;
    if (!isPostcode(value)) {
      out.textContent = t('cl.pcInvalid');
      return;
    }
    out.textContent = '…';
    const spot = await locatePostcode(value);
    if (!spot) {
      out.textContent = t('cl.pcInvalid');
      return;
    }
    const near = nearestLocation(spot.lat, spot.lon);
    out.textContent = `${t('cl.pcResult', { clinic: `${near.location.name} (${near.location.short})`, km: near.km.toFixed(near.km < 10 ? 1 : 0), min: near.minutes })}${spot.exact ? '' : ` ${t('cl.pcRough')}`}`;
    set(LOCATIONS.indexOf(near.location));
    drawRoutes();
  });

  new IntersectionObserver(([e]) => e.isIntersecting && drawRoutes(), { threshold: 0.4 }).observe(track);
  render();
  onLang(render);
  setInterval(() => render(), 60_000);
}

function clinicHTML(l, i) {
  const now = clinicNow();
  const state = openState(l);
  const trip = fromStation(l);
  const ribbon = WEEK.map((d) => {
    const open = l.days.includes(d);
    return `<li class="${open ? 'open' : ''}${d === now.day ? ' today' : ''}" aria-label="${esc(t(`dayLong.${d}`))}: ${open ? `${hhmm(l.opens)}–${hhmm(l.closes)}` : '—'}">${esc(t(`day.${d}`))}${open ? `<small>${hhmm(l.opens).replace(':00', '')}–${hhmm(l.closes).replace(':00', '')}</small>` : '<small>—</small>'}</li>`;
  }).join('');
  const travel = l.walk
    ? `<p><svg class="i" aria-hidden="true"><use href="#i-walk"/></svg>${esc(t('cl.walk', { n: trip.walk }))}</p><p><svg class="i" aria-hidden="true"><use href="#i-bike"/></svg>${esc(t('cl.bike', { n: trip.bike }))}</p>`
    : `<p><svg class="i" aria-hidden="true"><use href="#i-bike"/></svg>${esc(t('cl.bike', { n: trip.bike }))}</p><p><svg class="i" aria-hidden="true"><use href="#i-bus"/></svg>${esc(t('cl.bus'))}</p><p class="from">${esc(t('cl.far'))}</p>`;
  return `<article class="clinic" id="cl-${l.id}" role="tabpanel" aria-labelledby="cl-tab-${l.id}">
    <div class="cl-map">${mapSVG(l, trip)}</div>
    <div class="cl-info">
      <p class="kind">${esc(t(`cl.kind.${l.kind}`))}</p>
      <h3>${esc(l.short)}</h3>
      <p class="name">${esc(l.name)}</p>
      <address>${esc(l.street)}<br>${esc(l.postcode)} ${esc(l.city)}</address>
      <ol class="ribbon" aria-label="${esc(t('cl.open'))}">${ribbon}</ol>
      <p class="now${state.open ? ' open' : ''}">${esc(state.open ? t('cl.openNow') : t('cl.closedNow', { day: t(`dayLong.${state.day}`), time: state.time }))}</p>
      <div class="travel"><p class="from">${esc(t('cl.from', { station: l.station.name }))} · ${esc(t('cl.km', { n: trip.straight.toFixed(1) }))}</p>${travel}</div>
      <a class="btn btn-ghost btn-sm" href="${l.maps}" rel="noopener" target="_blank"><svg class="i" aria-hidden="true"><use href="#i-pin"/></svg><span>${esc(t('cl.route'))}</span></a>
    </div>
  </article>`;
}

// ------------------------------------------------------------------------------------------------ the drawn map

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

/** A line that looks drawn by hand: a smooth curve through jittered points. */
function sketch(points, jitter, rnd) {
  const pts = points.map(([x, y]) => [x + (rnd() - 0.5) * jitter, y + (rnd() - 0.5) * jitter]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} T${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

function mapSVG(l, trip) {
  const W = 600, H = 520;
  const rnd = rng(l.id === 'eindhoven' ? 11 : 23);
  // Local kilometres around the midpoint, north up.
  const lat0 = (l.lat + l.station.lat) / 2, lon0 = (l.lon + l.station.lon) / 2;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180), ky = 110.57;
  const toKm = (lat, lon) => [(lon - lon0) * kx, -(lat - lat0) * ky];
  const a = toKm(l.station.lat, l.station.lon), b = toKm(l.lat, l.lon);
  const span = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const scale = (Math.min(W, H) * 0.56) / span;
  const P = ([x, y]) => [W / 2 + x * scale, H / 2 + y * scale];
  const S = P(a), C = P(b);
  // The way: a gentle S between station and clinic.
  const dx = C[0] - S[0], dy = C[1] - S[1];
  const nx = -dy * 0.14, ny = dx * 0.14;
  const route = [S, [S[0] + dx * 0.3 + nx, S[1] + dy * 0.3 + ny], [S[0] + dx * 0.55 - nx * 0.4, S[1] + dy * 0.55 - ny * 0.4], [S[0] + dx * 0.8 + nx * 0.5, S[1] + dy * 0.8 + ny * 0.5], C];
  const mid = route[2];
  // Paper texture: soft contour lines, drawn freehand.
  const contours = Array.from({ length: 7 }, (_, i) => {
    const y = 40 + i * 70 + rnd() * 20;
    const pts = Array.from({ length: 8 }, (_, k) => [-20 + k * 92, y + Math.sin(k * 0.9 + i) * 18]);
    return `<path d="${sketch(pts, 10, rnd)}" class="contour"/>`;
  }).join('');
  const km1 = scale;
  const barKm = km1 * 1 > 180 ? 0.5 : 1;
  const bar = barKm * km1;
  const route1 = sketch(route, 6, rnd);
  const route2 = sketch(route, 8, rnd);
  const label = (x, y, text, cls, anchor = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="${cls}">${esc(text)}</text>`;
  const below = C[1] > S[1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${l.station.name} → ${l.street}`)}" preserveAspectRatio="xMidYMid slice">
    <style>
      .contour{fill:none;stroke:#C9D3E4;stroke-width:1.2}
      .road{fill:none;stroke:#0B1A3A;stroke-width:1.6;stroke-linecap:round;opacity:.85}
      .route{fill:none;stroke:#0A63B5;stroke-width:3.2;stroke-linecap:round;stroke-dasharray:1 9}
      .route-draw{fill:none;stroke:#0B1A3A;stroke-width:1.3;stroke-linecap:round;opacity:.55}
      .route2{fill:none;stroke:#2DB4E8;stroke-width:1.2;stroke-linecap:round;opacity:.7}
      .hand{font:italic 400 19px Newsreader,Georgia,serif;fill:#0B1A3A}
      .area{font:italic 300 26px Newsreader,Georgia,serif;fill:#7584A3}
      .tiny{font:500 11px "JetBrains Mono",monospace;fill:#34446A;letter-spacing:.04em}
      .pill{fill:#fff;stroke:#0B1A3A;stroke-width:1.2}
    </style>
    <rect class="paper" width="${W}" height="${H}"/>
    <g filter="url(#sketch)">${contours}
      <path d="${route2}" class="route2"/>
      <path d="${route1}" class="route"/>
      <path d="${sketch(route, 4, rnd)}" class="route-draw"/>
    </g>
    <g transform="translate(${S[0].toFixed(1)} ${S[1].toFixed(1)})">
      <rect x="-16" y="-16" width="32" height="32" rx="9" fill="#0B1A3A"/>
      <path d="M-8 4V-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3V4a2 2 0 0 1-2 2H-6a2 2 0 0 1-2-2zM-8 -1H8M-4 6l-3 5M4 6l3 5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    ${label(S[0], S[1] + (below ? -28 : 40), l.station.name, 'hand')}
    <g transform="translate(${C[0].toFixed(1)} ${C[1].toFixed(1)})">
      <circle r="30" fill="#2DB4E8" opacity=".14"><animate attributeName="r" values="22;34;22" dur="3.2s" repeatCount="indefinite"/></circle>
      <circle r="20" fill="#fff" stroke="#0B1A3A" stroke-width="1.6"/>
      <svg x="-13" y="-13" width="26" height="26"><use href="#tooth"/></svg>
    </g>
    ${label(C[0], C[1] + (below ? 46 : -32), l.street, 'hand')}
    ${label(C[0] + (C[0] > W / 2 ? -40 : 40), C[1] + (below ? 76 : -60), l.area, 'area')}
    <g transform="translate(${mid[0].toFixed(1)} ${(mid[1] - 18).toFixed(1)})">
      <rect x="-58" y="-15" width="116" height="30" rx="15" class="pill"/>
      ${label(0, 4, l.walk ? `${trip.walk}′ · ${trip.bike}′` : `${trip.bike}′`, 'tiny')}
    </g>
    <g transform="translate(${W - 56} 58)" class="tiny">
      <circle r="22" fill="none" stroke="#0B1A3A" stroke-width="1"/>
      <path d="M0 -17L5 4L0 0L-5 4Z" fill="#0B1A3A"/><text y="-26" text-anchor="middle" class="tiny">N</text>
    </g>
    <g transform="translate(36 ${H - 36})">
      <path d="M0 0H${bar.toFixed(1)}" stroke="#0B1A3A" stroke-width="2"/><path d="M0 -5V5M${bar.toFixed(1)} -5V5" stroke="#0B1A3A" stroke-width="1.5"/>
      <text x="${(bar / 2).toFixed(1)}" y="-10" text-anchor="middle" class="tiny">${barKm === 1 ? '1 km' : '500 m'}</text>
    </g>
  </svg>`;
}
