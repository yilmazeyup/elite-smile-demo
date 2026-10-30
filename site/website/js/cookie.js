// 1 · Bruno Simon's joke cookie stand: the cookie notice is a jar of sugar-free cookies. "Weigeren" is exactly as
// prominent as "Accepteren", and both do the same, because the site sets no tracking cookies at all. Only the choice
// itself is remembered in this browser, so the jar does not come back on every page.
import { t } from './i18n.js';

const KEY = 'smile-cookie';

export function initCookieJar() {
  const jar = document.querySelector('[data-jar]');
  if (!jar) return;
  let seen = null;
  try {
    seen = localStorage.getItem(KEY);
  } catch {
    // Storage off: show the jar, it costs nothing.
  }
  if (seen && !new URLSearchParams(location.search).has('cookies')) return;
  jar.hidden = false;
  jar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jar-choice]');
    if (!b) return;
    const choice = b.dataset.jarChoice;
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      // Fine: nothing depends on it.
    }
    jar.classList.add(choice === 'accept' ? 'accepted' : 'declined');
    jar.querySelector('[data-jar-thanks]').textContent = t(choice === 'accept' ? 'ck.thanksA' : 'ck.thanksD');
    jar.querySelectorAll('[data-jar-choice]').forEach((x) => (x.disabled = true));
    setTimeout(() => {
      jar.classList.add('out');
      setTimeout(() => (jar.hidden = true), 700);
    }, 2200);
  });
}
