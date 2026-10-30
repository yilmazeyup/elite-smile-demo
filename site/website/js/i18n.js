// Seven languages. Dutch is the clinic's own and the default; ?lang= and the menu switch, and the choice is kept in
// localStorage "smile-lang", the same key and codes as the patient app and the clinic panel.

export const LOCALES = ['nl', 'en', 'tr', 'ar', 'fr', 'de', 'it'];
export const LOCALE_NAMES = { nl: 'Nederlands', en: 'English', tr: 'Türkçe', ar: 'العربية', fr: 'Français', de: 'Deutsch', it: 'Italiano' };
const KEY = 'smile-lang';

const match = (code) => {
  const base = String(code ?? '').toLowerCase().split(/[-_]/)[0];
  return LOCALES.includes(base) ? base : null;
};

export function pickLocale() {
  try {
    const fromAddress = match(new URLSearchParams(location.search).get('lang'));
    if (fromAddress) {
      localStorage.setItem(KEY, fromAddress);
      return fromAddress;
    }
    return match(localStorage.getItem(KEY)) ?? 'nl';
  } catch {
    return 'nl';
  }
}

let lang = 'nl';
let dict = {};
let base = {};
const listeners = new Set();
const root = new URL('../i18n/', import.meta.url);

async function load(code) {
  const res = await fetch(new URL(`${code}.json`, root));
  if (!res.ok) throw new Error(`i18n ${code}: ${res.status}`);
  return res.json();
}

export const getLang = () => lang;
export const isRTL = () => lang === 'ar';

/** The text for a key in the current language, Dutch when missing, with {placeholders} filled in. */
export function t(key, vars) {
  let text = dict[key] ?? base[key] ?? key;
  if (vars) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return text;
}

export const has = (key) => key in dict || key in base;

/** Fills every [data-i18n] (text) and [data-i18n-attr="attr:key;attr:key"] under `scope`. */
export function apply(scope = document) {
  for (const el of scope.querySelectorAll('[data-i18n]')) {
    const key = el.dataset.i18n;
    const text = t(key);
    if (el.dataset.i18nHtml !== undefined) el.innerHTML = text;
    else if (el.textContent !== text) el.textContent = text;
  }
  for (const el of scope.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
}

export function onLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setDocument() {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (has('meta.title') && document.body?.dataset.page === 'home') document.title = t('meta.title');
  const desc = document.querySelector('meta[name="description"]');
  if (desc && document.body?.dataset.page === 'home') desc.setAttribute('content', t('meta.desc'));
}

/** Loads Dutch (the fallback) and the chosen language, fills the page and tells every module. */
export async function initI18n() {
  lang = pickLocale();
  try {
    base = await load('nl');
    dict = lang === 'nl' ? base : await load(lang).catch(() => base);
  } catch {
    dict = base = {};
  }
  setDocument();
  apply();
  document.documentElement.classList.remove('i18n-wait');
  return lang;
}

export async function setLang(code) {
  const next = match(code) ?? 'nl';
  if (next === lang) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private windows: the choice lasts for this page.
  }
  dict = next === 'nl' ? base : await load(next).catch(() => base);
  lang = next;
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url);
  }
  setDocument();
  apply();
  for (const fn of listeners) fn(lang);
}

/** Builds the language menus: a button with the current code and a list of the seven languages in their own names. */
export function initLangMenus() {
  for (const box of document.querySelectorAll('[data-lang-menu]')) {
    const button = box.querySelector('button');
    const list = box.querySelector('ul');
    list.innerHTML = LOCALES.map(
      (code) => `<li role="none"><button type="button" role="menuitemradio" data-code="${code}" lang="${code}" dir="${code === 'ar' ? 'rtl' : 'ltr'}"><span>${LOCALE_NAMES[code]}</span><span class="code">${code.toUpperCase()}</span></button></li>`,
    ).join('');
    const sync = () => {
      box.querySelector('[data-lang-code]').textContent = lang.toUpperCase();
      for (const item of list.querySelectorAll('button')) item.setAttribute('aria-checked', String(item.dataset.code === lang));
    };
    const close = () => {
      box.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
      if (open) list.querySelector('[aria-checked="true"]')?.focus();
    });
    list.addEventListener('click', async (e) => {
      const item = e.target.closest('button[data-code]');
      if (!item) return;
      close();
      await setLang(item.dataset.code);
      button.focus();
    });
    list.addEventListener('keydown', (e) => {
      const items = [...list.querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
      else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus();
      else if (e.key === 'Escape') {
        close();
        button.focus();
      } else return;
      e.preventDefault();
    });
    document.addEventListener('click', (e) => {
      if (!box.contains(e.target)) close();
    });
    sync();
    onLang(sync);
  }
}
