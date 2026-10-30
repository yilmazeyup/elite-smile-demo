// The one-page site: language first, then the sections; the 3D pieces load when they come near.
import { initI18n, initLangMenus, onLang, t, getLang } from './i18n.js';
import { initScramble, initCurtain, esc, whenNear, reduced } from './fx.js';
import { DOCTORS, TESTIMONIALS, CREDITS, LOCATIONS, WEEK, hhmm } from './data.js';

await initI18n();
initLangMenus();
initScramble();
initCurtain();
initNav();
renderStatic();
onLang(renderStatic);
initReveal();

import('./hero.js').then((m) => m.initHero(document.querySelector('[data-hero]')));
import('./gallery.js').then((m) => m.initGallery(document.querySelector('[data-gallery]')));
import('./treatments.js').then((m) => m.initTreatments());
import('./clinics.js').then((m) => m.initClinics());
import('./booking.js').then((m) => m.initBooking());
import('./cookie.js').then((m) => m.initCookieJar());
whenNear(document.querySelector('#catalogus'), () => import('./catalogue.js').then((m) => m.initCatalogue()), '900px');
whenNear(document.querySelector('#lab'), () => import('./lab.js').then((m) => m.initLab(document.querySelector('[data-lab]'))), '900px');

// ---------------------------------------------------------------------------------------------------------- nav

function initNav() {
  const nav = document.querySelector('[data-nav]');
  const bar = document.querySelector('.progress span');
  const sheet = document.getElementById('sheet');
  const menu = document.querySelector('.menu-btn');
  let last = scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('solid', y > 40);
    nav.classList.toggle('away', y > 600 && y > last + 4 && sheet.hidden);
    if (y < last - 4 || y < 600) nav.classList.remove('away');
    last = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
  };
  addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();

  const setSheet = (open) => {
    sheet.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    menu.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.menu'));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) sheet.querySelector('a').focus();
  };
  menu.addEventListener('click', () => setSheet(sheet.hidden));
  sheet.addEventListener('click', (e) => e.target.closest('a') && setSheet(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && !sheet.hidden && (setSheet(false), menu.focus()));
}

// -------------------------------------------------------------------------------------------------- reveal on scroll

function initReveal() {
  if (reduced()) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  const observe = () => document.querySelectorAll('.reveal:not(.in)').forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 0.08}s`);
    io.observe(el);
  });
  observe();
  new MutationObserver(observe).observe(document.querySelector('main'), { childList: true, subtree: true });
}

// --------------------------------------------------------------------------------- team, questions, words, footer

function renderStatic() {
  const team = document.querySelector('[data-team]');
  team.innerHTML = DOCTORS.map((d) => {
    const name = t(`doc.${d.id}`);
    return `<li class="doc reveal"><a href="tandarts/${d.id}/" data-curtain>
      <div class="portrait"><img src="img/team-${d.id}-sm.webp" width="420" height="420" alt="${esc(t('team.alt', { name }))}" loading="lazy" decoding="async"></div>
      <div class="meta"><div><h3>${esc(name)}</h3><p>${esc(t(`title.${d.title}`))}</p></div>
      <span class="go" aria-hidden="true"><svg class="i i-arrow"><use href="#i-arrow"/></svg></span></div>
      <span class="visually-hidden">${esc(t('team.page'))}</span></a></li>`;
  }).join('');

  const faq = document.querySelector('[data-faq]');
  faq.innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `<details class="qa">
      <summary><span class="n">0${n}</span><span class="q">${esc(t(`faq.q${n}`))}</span><span class="pm" aria-hidden="true"><svg class="i"><use href="#i-plus"/></svg></span></summary>
      <div class="a"><p>${esc(t(`faq.a${n}`))}${n === 5 ? ` <a href="tel:+31638208557" class="mono">06 38208557</a>` : ''}</p></div>
    </details>`).join('');
  initAccordion(faq);

  const words = document.querySelector('[data-testimonials]');
  const english = getLang() === 'en';
  words.innerHTML = TESTIMONIALS.map((w, i) => `<li class="tm reveal" data-i="${i + 1}">
      <h3 lang="en" dir="ltr">“${esc(w.h)}”</h3>
      <blockquote lang="en" dir="ltr"><p>${esc(w.q)}</p></blockquote>
      <footer><cite>— ${esc(w.name)}</cite>${english ? '<span class="tr-note">elitesmile.nl</span>' : `<button type="button" class="flip" aria-pressed="false">${esc(t('tm.translate'))}</button>`}</footer>
    </li>`).join('');
  words.querySelectorAll('.flip').forEach((button) => button.addEventListener('click', () => {
    const li = button.closest('.tm');
    const i = li.dataset.i;
    const on = button.getAttribute('aria-pressed') !== 'true';
    const w = TESTIMONIALS[i - 1];
    const h = li.querySelector('h3');
    const q = li.querySelector('blockquote');
    h.textContent = `“${on ? t(`tm.${i}.h`) : w.h}”`;
    q.innerHTML = `<p>${esc(on ? t(`tm.${i}.q`) : w.q)}</p>${on ? `<p class="tr-note">${esc(t('tm.translated'))}</p>` : ''}`;
    for (const el of [h, q]) {
      el.lang = on ? getLang() : 'en';
      el.dir = on && getLang() === 'ar' ? 'rtl' : 'ltr';
    }
    button.setAttribute('aria-pressed', String(on));
    button.textContent = t(on ? 'tm.original' : 'tm.translate');
  }));

  document.querySelector('[data-credits]').innerHTML = CREDITS.map((c, i) => `<li><b>${esc(c.name)}<small>${esc(c.when)}</small></b>
      <a href="#${c.at}">${esc(t(`cr.d${i + 1}`))}</a></li>`).join('');

  const hours = document.querySelector('[data-footer-hours]');
  hours.querySelector('.hours')?.remove();
  hours.insertAdjacentHTML('beforeend', `<div class="hours">${LOCATIONS.map((l) => `<div>
      <h3>${esc(l.name)}</h3><p>${esc(l.street)}, ${esc(l.postcode)} ${esc(l.city)}</p>
      <p class="days">${WEEK.filter((d) => l.days.includes(d)).map((d) => esc(t(`day.${d}`))).join(' · ')} · ${hhmm(l.opens)}–${hhmm(l.closes)}</p>
    </div>`).join('')}</div>`);
}

/** Questions open and close with a measured height, not a jump. */
function initAccordion(root) {
  for (const details of root.querySelectorAll('details')) {
    const summary = details.querySelector('summary');
    const body = details.querySelector('.a');
    summary.addEventListener('click', (e) => {
      if (reduced()) return;
      e.preventDefault();
      if (details.open) {
        const anim = body.animate([{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)' });
        anim.onfinish = () => (details.open = false);
      } else {
        details.open = true;
        body.animate([{ height: '0px', opacity: 0 }, { height: `${body.offsetHeight}px`, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  }
}
