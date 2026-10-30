// A dentist's own page, the one the clinic panel's "Delen" button links to: portrait, name, title as on
// elitesmile.nl, specialties, the treatments they do, booking with them, and a share button. No invented bio.
import { initI18n, initLangMenus, onLang, t } from './i18n.js';
import { initScramble, initCurtain, esc, copyText } from './fx.js';
import { DOCTORS, TREATMENTS, SPECIALTIES } from './data.js';

const id = document.body.dataset.doctor;
const doc = DOCTORS.find((d) => d.id === id) ?? DOCTORS[0];

await initI18n();
initLangMenus();
initScramble();
initCurtain();

const render = () => {
  const name = t(`doc.${doc.id}`);
  const title = t(`title.${doc.title}`);
  document.title = `${name} · ${title} · Elite Smile`;
  document.querySelector('.dp-portrait img').alt = t('team.alt', { name });
  document.querySelector('[data-book]').textContent = t('dp.book', { name });
  document.querySelector('[data-specs]').innerHTML = doc.specialties
    .map((s) => `<li style="--c:${SPECIALTIES.find((x) => x.id === s).color}"><i></i>${esc(t(`s.${s}.n`))}</li>`)
    .join('');
  const list = TREATMENTS.filter((tr) => tr.docs.includes(doc.id));
  document.querySelector('[data-list]').innerHTML = list
    .map((tr) => `<li><a href="../../../app/afspraak?behandeling=${tr.id}&amp;tandarts=${doc.id}"><span class="mono">${String(TREATMENTS.indexOf(tr) + 1).padStart(2, '0')}</span><span class="n">${esc(t(`t.${tr.id}.n`))}</span><span class="s">${esc(t(`t.${tr.id}.s`))}</span><span class="m mono">${esc(t('tr.min', { n: tr.min }))}</span></a></li>`)
    .join('');
  document.querySelectorAll('[data-team] a').forEach((a, i) => {
    const other = DOCTORS.filter((d) => d.id !== doc.id)[i];
    a.querySelector('span').textContent = t(`doc.${other.id}`);
  });
};
render();
onLang(render);

// Share: the phone's own share sheet where there is one, else the link is copied.
const toast = document.querySelector('[data-toast]');
document.querySelector('[data-share]').addEventListener('click', async () => {
  const url = location.href.split('?')[0].split('#')[0];
  const data = { title: document.title, text: `${t(`doc.${doc.id}`)} · ${t(`title.${doc.title}`)}`, url };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  if (await copyText(url)) {
    toast.textContent = t('dp.copied');
    toast.classList.add('on');
    setTimeout(() => toast.classList.remove('on'), 2200);
  }
});
