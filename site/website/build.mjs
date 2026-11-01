// Writes the static parts that would be tedious by hand: the logo's tooth mark into index.html, the favicon, and the
// six dentists' pages (tandarts/<id>/index.html) with their Open Graph tags. Run it again after changing the template:
//   node site/website/build.mjs
// The output is plain HTML; nothing here runs on the server.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOCTORS, TREATMENTS, SPECIALTIES } from './js/data.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const nl = JSON.parse(fs.readFileSync(here('./i18n/nl.json'), 'utf8'));
const t = (k, vars) => (nl[k] ?? k).replace(/\{(\w+)\}/g, (m, v) => (vars && v in vars ? vars[v] : m));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Where GitHub Pages publishes the demo; Open Graph needs absolute addresses. */
const SITE_URL = 'https://elitesmile.savastana.com/website/';

// ------------------------------------------------------------------------------------------------- the tooth mark
const brand = fs.readFileSync(here('../../packages/shared/src/brand.ts'), 'utf8');
const path = /TOOTH_PATH = '([^']+)'/.exec(brand)[1];
const [right, left, ...smile] = path.split(/(?=M)/);
const g = `<g transform="translate(0,1024) scale(0.1,-0.1)"><path class="t-r" d="${right.trim()}"/><path class="t-l" d="${left.trim()}"/><path class="t-s" d="${smile.join('').trim()}"/></g>`;
const symbol = `<!--tooth--><symbol id="tooth" viewBox="40 80 902 884">${g}</symbol><!--/tooth-->`;

const index = here('./index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace(/<!--tooth-->[\s\S]*?<!--\/tooth-->/, symbol));
fs.writeFileSync(
  here('./img/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 80 902 884"><style>.t-r{fill:#2DB4E8}.t-l,.t-s{fill:#0A63B5}@media (prefers-color-scheme:dark){.t-l,.t-s{fill:#7CC4FF}}</style>${g}</svg>\n`,
);

// ----------------------------------------------------------------------------------------------- the dentists' pages
const icons = fs.readFileSync(index, 'utf8').match(/<symbol id="i-[\s\S]*?<\/symbol>/g).join('\n  ');

const page = (d) => {
  const name = t(`doc.${d.id}`);
  const title = t(`title.${d.title}`);
  const list = TREATMENTS.filter((tr) => tr.docs.includes(d.id));
  const pageTitle = `${name} · ${title} · Elite Smile`;
  const desc = `${name}, ${title.toLowerCase()} bij Elite Smile in Eindhoven en Hoogland. ${list.length} behandelingen, van ${t(`t.${list[0].id}.n`).toLowerCase()} tot ${t(`t.${list[list.length - 1].id}.n`).toLowerCase()}. Plan je afspraak.`;
  const url = `${SITE_URL}tandarts/${d.id}/`;
  return `<!doctype html>
<html lang="nl" dir="ltr" class="i18n-wait">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#F3F6FB">
<link rel="canonical" href="${url}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Elite Smile">
<meta property="og:locale" content="nl_NL">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(`${name} · ${title}`)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE_URL}img/og-${d.id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t('team.alt', { name }))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(`${name} · ${title}`)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE_URL}img/og-${d.id}.jpg">
<link rel="icon" href="../../img/favicon.svg" type="image/svg+xml">
<script>
  (function () {
    var codes = ['nl', 'en', 'tr', 'ar', 'fr', 'de', 'it'], l = 'nl';
    try {
      var q = (new URLSearchParams(location.search).get('lang') || '').slice(0, 2).toLowerCase();
      var s = localStorage.getItem('smile-lang');
      l = codes.indexOf(q) > -1 ? q : codes.indexOf(s) > -1 ? s : 'nl';
    } catch (e) {}
    var h = document.documentElement;
    h.lang = l; h.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (l === 'nl') h.classList.remove('i18n-wait');
    h.classList.add('js');
    setTimeout(function () { h.classList.remove('i18n-wait'); }, 2500);
  })();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@300..700&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,300..600&family=Figtree:wght@400..700&family=JetBrains+Mono:wght@400;500;600&family=Readex+Pro:wght@300..700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">
<link rel="preload" as="image" href="../../img/team-${d.id}.webp">
<link rel="stylesheet" href="../../css/site.css">
<link rel="stylesheet" href="../../css/doctor.css">
<script type="module" src="../../js/doctor.js"></script>
</head>
<body data-page="doctor" data-doctor="${d.id}">
<a class="skip" href="#main" data-i18n="a11y.skip">Naar de inhoud</a>
<svg class="sprite" aria-hidden="true" focusable="false">
  ${symbol}
  ${icons}
</svg>

<header class="nav solid dp-nav">
  <a class="brand" href="../../" data-curtain data-i18n-attr="aria-label:dp.back" aria-label="Terug naar Elite Smile"><img src="../../img/logo-light.webp" width="900" height="196" alt="Elite Smile"></a>
  <div class="nav-end">
    <a class="dp-back mono" href="../../#team" data-curtain><svg class="i i-arrow flip" aria-hidden="true"><use href="#i-arrow"/></svg><span data-i18n="dp.back">Terug naar Elite Smile</span></a>
    <div class="lang" data-lang-menu>
      <button type="button" class="lang-btn" aria-haspopup="menu" aria-expanded="false" data-i18n-attr="aria-label:nav.lang" aria-label="Taal"><svg class="i" aria-hidden="true"><use href="#i-globe"/></svg><span data-lang-code>NL</span></button>
      <ul role="menu"></ul>
    </div>
  </div>
</header>

<main id="main" class="dp">
  <section class="dp-hero" aria-labelledby="dp-name">
    <div class="dp-portrait">
      <svg class="dp-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49"/></svg>
      <img src="../../img/team-${d.id}.webp" width="800" height="800" alt="${esc(t('team.alt', { name }))}" fetchpriority="high">
      <svg class="dp-mark" aria-hidden="true"><use href="#tooth"/></svg>
    </div>
    <div class="dp-intro">
      <p class="label"><span data-i18n="dp.label">${esc(t('dp.label'))}</span></p>
      <h1 id="dp-name" class="dp-name" data-i18n="doc.${d.id}">${esc(name)}</h1>
      <p class="dp-title" data-i18n="title.${d.title}">${esc(title)}</p>
      <p class="dp-site mono"><span lang="en">${esc(d.site)}</span> · elitesmile.nl</p>
      <div class="dp-actions">
        <a class="btn btn-primary" href="../../../app/afspraak?tandarts=${d.id}" data-scramble><span data-book>${esc(t('dp.book', { name }))}</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
        <button type="button" class="btn btn-ghost" data-share data-scramble><svg class="i" aria-hidden="true"><use href="#i-share"/></svg><span data-i18n="dp.share">${esc(t('dp.share'))}</span></button>
      </div>
      <a class="dp-insta" href="https://instagram.com/mj.elite.smile" rel="noopener"><svg class="i" aria-hidden="true"><use href="#i-insta"/></svg><span data-i18n="dp.instagram">${esc(t('dp.instagram'))}</span><span class="mono">@mj.elite.smile</span></a>
    </div>
  </section>

  <section class="dp-block" aria-labelledby="dp-spec">
    <h2 id="dp-spec" class="label"><span data-i18n="dp.specialties">${esc(t('dp.specialties'))}</span></h2>
    <ul class="dp-specs" data-specs>${d.specialties.map((s) => `<li style="--c:${SPECIALTIES.find((x) => x.id === s).color}"><i></i>${esc(t(`s.${s}.n`))}</li>`).join('')}</ul>
  </section>

  <section class="dp-block" aria-labelledby="dp-tr">
    <h2 id="dp-tr" class="label"><span data-i18n="dp.treatments">${esc(t('dp.treatments'))}</span> <span class="mono">(${list.length})</span></h2>
    <ol class="dp-list" data-list>${list.map((tr) => `<li><a href="../../../app/afspraak?behandeling=${tr.id}&amp;tandarts=${d.id}"><span class="mono">${String(TREATMENTS.indexOf(tr) + 1).padStart(2, '0')}</span><span class="n">${esc(t(`t.${tr.id}.n`))}</span><span class="s">${esc(t(`t.${tr.id}.s`))}</span><span class="m mono">${tr.min} min</span></a></li>`).join('')}</ol>
  </section>

  <section class="dp-block dp-team" aria-labelledby="dp-team">
    <h2 id="dp-team" class="label"><span data-i18n="dp.team">${esc(t('dp.team'))}</span></h2>
    <ul data-team>${DOCTORS.filter((x) => x.id !== d.id).map((x) => `<li><a href="../${x.id}/" data-curtain><img src="../../img/team-${x.id}-sm.webp" width="420" height="420" alt="" loading="lazy"><span>${esc(t(`doc.${x.id}`))}</span></a></li>`).join('')}</ul>
  </section>

  <section class="dp-block dp-contact" aria-labelledby="dp-contact">
    <h2 id="dp-contact" class="label"><span data-i18n="dp.contact">${esc(t('dp.contact'))}</span></h2>
    <p class="dp-clinics" data-i18n="dp.clinics">${esc(t('dp.clinics'))}</p>
    <ul class="dp-contact-list">
      <li><a href="tel:+31638208557"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg><span class="mono">06 38208557</span></a></li>
      <li><a href="https://wa.me/31638208557" rel="noopener"><svg class="i" aria-hidden="true"><use href="#i-chat"/></svg><span>WhatsApp</span></a></li>
      <li><a href="mailto:info@elitesmile.nl"><svg class="i" aria-hidden="true"><use href="#i-mail"/></svg><span class="mono">info@elitesmile.nl</span></a></li>
    </ul>
  </section>
</main>

<footer class="dp-foot">
  <p class="honesty" data-i18n="ft.honesty">${esc(t('ft.honesty'))}</p>
  <p class="mono small"><span data-i18n="ft.demo">${esc(t('ft.demo'))}</span> · © 2026 Elite Smile</p>
</footer>
<p class="dp-toast mono" role="status" aria-live="polite" data-toast></p>
<div class="curtain" aria-hidden="true"><svg class="curtain-mark"><use href="#tooth"/></svg></div>
</body>
</html>
`;
};

for (const d of DOCTORS) {
  const dir = here(`./tandarts/${d.id}/`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}index.html`, page(d));
}
console.log(`Tooth mark injected; ${DOCTORS.length} dentist pages written.`);
