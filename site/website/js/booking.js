// 7 · Lama Lama: "Plan je gratis controle" asks one question per step (who, which clinic, which part of the day,
// a first name) and ends with "Je hebt onze dag goed gemaakt", handing off to the app. Nothing is sent anywhere.
// 9 · Why Zero: then an origami tooth folds open into a welcome certificate with that first name in script and the
// chosen clinic. No queue numbers, nothing invented.
import { t, onLang, getLang } from './i18n.js';
import { LOCATIONS, WEEK, hhmm } from './data.js';
import { esc, reduced } from './fx.js';

const answers = { who: null, loc: null, part: null, name: '', contact: '' };
let step = 0;
let opened = false;

const QUESTIONS = [
  { key: 'who', q: 'fm.q1', opts: () => ['me', 'child', 'family'].map((v) => ({ v, label: t(`fm.who.${v}`) })) },
  {
    key: 'loc',
    q: 'fm.q2',
    opts: () => LOCATIONS.map((l) => ({ v: l.id, label: l.short, tag: `${l.name}<br>${WEEK.filter((d) => l.days.includes(d)).map((d) => t(`day.${d}`)).join(' · ')} · ${hhmm(l.opens)}–${hhmm(l.closes)}` })),
  },
  { key: 'part', q: 'fm.q3', opts: () => ['morning', 'afternoon', 'any'].map((v) => ({ v, label: t(`fm.part.${v}`) })) },
  { key: 'name', q: 'fm.q4' },
];

const appHref = () =>
  `../app/afspraak?behandeling=controle&locatie=${encodeURIComponent(answers.loc ?? 'eindhoven')}&voor=${encodeURIComponent(answers.who ?? 'me')}&dagdeel=${encodeURIComponent(answers.part ?? 'any')}`;

export function initBooking() {
  const root = document.querySelector('[data-steps]');
  const render = (focus = false) => {
    root.innerHTML = step < QUESTIONS.length ? stepHTML() : doneHTML();
    root.firstElementChild.classList.add('enter');
    if (focus) root.querySelector('h3')?.focus({ preventScroll: true });
    if (step >= QUESTIONS.length) startCertificate(root);
  };
  const go = (n) => {
    step = Math.max(0, Math.min(QUESTIONS.length, n));
    render(true);
  };
  root.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-v]');
    if (opt) {
      const q = QUESTIONS[step];
      answers[q.key] = opt.dataset.v;
      root.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-checked', String(b === opt)));
      root.querySelector('[data-next]').disabled = false;
      setTimeout(() => step < QUESTIONS.length && QUESTIONS[step].key === q.key && go(step + 1), reduced() ? 0 : 380);
      return;
    }
    if (e.target.closest('[data-back]')) go(step - 1);
    if (e.target.closest('[data-next]')) {
      e.preventDefault();
      next();
    }
    if (e.target.closest('[data-again]')) {
      Object.assign(answers, { who: null, loc: null, part: null, name: '', contact: '' });
      opened = false;
      go(0);
    }
    if (e.target.closest('[data-print]')) print();
  });
  root.addEventListener('keydown', (e) => {
    const opts = [...root.querySelectorAll('[data-v]')];
    const i = opts.indexOf(document.activeElement);
    if (i < 0 || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    opts[(i + d + opts.length) % opts.length].focus();
  });
  root.addEventListener('submit', (e) => {
    e.preventDefault();
    next();
  });
  const next = () => {
    const q = QUESTIONS[step];
    if (q.key === 'name') {
      const input = root.querySelector('#fm-name');
      answers.name = input.value.trim().slice(0, 40);
      answers.contact = root.querySelector('#fm-contact').value.trim();
      if (!answers.name) {
        input.setAttribute('aria-invalid', 'true');
        root.querySelector('[data-err]').textContent = t('fm.errName');
        input.focus();
        return;
      }
    } else if (!answers[q.key]) return;
    go(step + 1);
  };
  render();
  onLang(() => render());
}

function stepHTML() {
  const q = QUESTIONS[step];
  const n = step + 1;
  const total = QUESTIONS.length;
  const top = `<div class="step-top"><span class="mono">${esc(t('fm.step', { n, total }))}</span><span class="bar" aria-hidden="true"><span style="--w:${(n / total) * 100}%"></span></span></div>`;
  const nav = `<div class="step-nav">
      ${step > 0 ? `<button type="button" class="btn btn-back" data-back data-scramble><span>${esc(t('fm.back'))}</span></button>` : '<span></span>'}
      <button type="${q.key === 'name' ? 'submit' : 'button'}" class="btn btn-light" data-next ${q.key !== 'name' && !answers[q.key] ? 'disabled' : ''} data-scramble><span>${esc(t(q.key === 'name' ? 'fm.finish' : 'fm.next'))}</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
    </div>`;
  if (q.key === 'name') {
    return `<form class="step" novalidate>${top}
      <h3 tabindex="-1" id="fm-q">${esc(t(q.q))}</h3>
      <div class="fieldset">
        <div class="field"><label for="fm-name">${esc(t('fm.name'))}</label><input id="fm-name" name="given-name" autocomplete="given-name" maxlength="40" value="${esc(answers.name)}" aria-describedby="fm-err fm-local" required></div>
        <div class="field"><label for="fm-contact">${esc(t('fm.contact'))}</label><input id="fm-contact" name="contact" autocomplete="off" maxlength="80" value="${esc(answers.contact)}" aria-describedby="fm-local"></div>
        <p class="err" id="fm-err" data-err aria-live="polite"></p>
        <p class="local" id="fm-local">${esc(t('fm.local'))}</p>
      </div>${nav}</form>`;
  }
  return `<div class="step">${top}
    <h3 tabindex="-1" id="fm-q">${esc(t(q.q))}</h3>
    <div class="opts" role="radiogroup" aria-labelledby="fm-q">${q.opts().map((o) => `<button type="button" class="opt" role="radio" aria-checked="${answers[q.key] === o.v}" data-v="${o.v}" data-scramble>
        <span><span class="br" aria-hidden="true">[ </span><span>${esc(o.label)}</span><span class="br" aria-hidden="true"> ]</span></span>${o.tag ? `<span class="tag">${o.tag}</span>` : ''}</button>`).join('')}</div>
    ${nav}</div>`;
}

function doneHTML() {
  const loc = LOCATIONS.find((l) => l.id === answers.loc) ?? LOCATIONS[0];
  const date = new Intl.DateTimeFormat(getLang(), { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(new Date());
  const extra = answers.who === 'child' ? t('ct.child') : answers.who === 'family' ? t('ct.family') : '';
  const sheet = `<div class="sheet-inner">
      <img class="logo" src="img/logo-light.webp" width="900" height="196" alt="">
      <p class="ct-title">${esc(t('ct.title'))}</p>
      <p class="ct-l">${esc(t('ct.l1'))}</p>
      <p class="ct-name">${esc(answers.name)}</p>
      ${extra ? `<p class="ct-l">${esc(extra)}</p>` : ''}
      <p class="ct-l">${esc(t('ct.l2'))}</p>
      <p class="ct-clinic">${esc(loc.name)} · ${esc(loc.short)}</p>
      <p class="ct-free">${esc(t('ct.free'))}</p>
      <div class="ct-foot"><span>${esc(date)}</span><span class="seal"><svg aria-hidden="true"><use href="#tooth"/></svg></span><span>${esc(t('ct.sign'))}</span></div>
    </div>`;
  // Six panels, each showing its slice of the sheet; folded, their backs make a low-poly tooth.
  const panels = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) panels.push(`<div class="cert-panel p${r}${c}" style="--c:${c};--r:${r}"><div class="cert-face"><div class="cert-sheet">${sheet}</div></div><div class="cert-back"></div></div>`);
  const summary = [t('ct.title'), t('ct.l1'), answers.name, extra, t('ct.l2'), `${loc.name}, ${loc.short}`, t('ct.free'), date, t('ct.sign')].filter(Boolean).join('. ');
  return `<div class="done">
    <h3 tabindex="-1">${esc(t('fm.doneTitle'))}</h3>
    <div class="cert-wrap${opened || reduced() ? ' opened' : ''}">
      <button type="button" class="cert" aria-label="${esc(t('ct.fold'))}" data-cert>${panels.join('')}</button>
      <p class="fold-hint" aria-hidden="true">${esc(t('ct.fold'))}</p>
      <p class="visually-hidden">${esc(summary)}</p>
    </div>
    <p>${esc(t('fm.doneText'))}</p>
    <div class="done-actions">
      <a class="btn btn-light" href="${appHref()}" data-scramble><span>${esc(t('fm.doneCta'))}</span><svg class="i i-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <button type="button" class="btn btn-back" data-print><svg class="i" aria-hidden="true"><use href="#i-print"/></svg><span>${esc(t('ct.print'))}</span></button>
      <button type="button" class="btn btn-back" data-again><span>${esc(t('fm.again'))}</span></button>
    </div>
  </div>`;
}

function startCertificate(root) {
  const wrap = root.querySelector('.cert-wrap');
  const cert = root.querySelector('[data-cert]');
  const open = () => {
    if (opened) return;
    opened = true;
    wrap.classList.add('opened');
    cert.setAttribute('aria-label', t('ct.title'));
  };
  cert.addEventListener('click', open);
  if (!opened && !reduced()) setTimeout(open, 1800);
  if (reduced()) open();
}
