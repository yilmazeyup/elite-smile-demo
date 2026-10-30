// Small shared pieces: motion preference, visibility, the scrambling letters (Lama Lama) and the curtain (Lando Norris).

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = () => matchMedia('(hover: none)').matches;

export const esc = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Calls `fn(true|false)` when the element comes within `margin` of the viewport and when it leaves. */
export function watch(el, fn, margin = '200px') {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => fn(e.isIntersecting, e)), { rootMargin: margin });
  io.observe(el);
  return () => io.disconnect();
}

/** Runs `fn` once, when the element first comes near the viewport. */
export function whenNear(el, fn, margin = '600px') {
  const stop = watch(el, (near) => {
    if (!near) return;
    stop();
    fn();
  }, margin);
}

// --------------------------------------------------------------------------------- letters that scramble into words

const SYMBOLS = '+×÷=<>/\\#%*[]{}~^';
const ARABIC = /[؀-ۿ]/;

function scramble(el) {
  const target = el.querySelector('[data-i18n]') ?? el.querySelector('span') ?? el;
  if (target.dataset.busy) return;
  const text = target.textContent;
  // Arabic letters join; scrambling them breaks the word shapes, so Arabic only shimmers.
  if (ARABIC.test(text) || reduced()) return;
  target.dataset.busy = '1';
  // Hold the width, so the symbols never make the button jump.
  const width = el.getBoundingClientRect().width;
  el.style.minWidth = `${width}px`;
  const chars = [...text];
  const start = performance.now();
  const per = Math.max(18, Math.min(38, 520 / chars.length));
  const frame = (now) => {
    const t = now - start;
    let out = '';
    let done = true;
    chars.forEach((ch, i) => {
      if (ch === ' ' || t > i * per + 120) out += ch;
      else {
        done = false;
        out += SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      }
    });
    target.textContent = out;
    if (done) {
      target.textContent = text;
      el.style.minWidth = '';
      delete target.dataset.busy;
    } else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Every [data-scramble] button or link scrambles on hover and keyboard focus; the accessible name stays the word. */
export function initScramble(root = document) {
  root.addEventListener('pointerenter', (e) => {
    const el = e.target.closest?.('[data-scramble]');
    if (el && e.pointerType === 'mouse') scramble(el);
  }, true);
  root.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-scramble]');
    if (el && el.matches(':focus-visible')) scramble(el);
  });
}

// ------------------------------------------------------------------------------------------------------ the curtain

/** Links marked [data-curtain] close a navy curtain before they navigate; the next page lifts it. */
export function initCurtain() {
  const curtain = document.querySelector('.curtain');
  if (!curtain) return;
  try {
    if (sessionStorage.getItem('smile-curtain') === '1') {
      sessionStorage.removeItem('smile-curtain');
      curtain.classList.add('start');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        curtain.classList.remove('start');
        curtain.classList.add('lift');
        setTimeout(() => curtain.classList.remove('lift'), 1200);
      }));
    }
  } catch {
    // Storage off: no curtain on arrival.
  }
  // Coming back with the browser's back button from a cached page: never leave the curtain closed.
  addEventListener('pageshow', (e) => {
    if (e.persisted) curtain.className = 'curtain';
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-curtain]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced()) return;
    e.preventDefault();
    try {
      sessionStorage.setItem('smile-curtain', '1');
    } catch {
      // The next page simply appears.
    }
    curtain.classList.remove('lift', 'start');
    curtain.classList.add('cover');
    setTimeout(() => (location.href = a.href), 760);
  });
}

/** A small toast-like line next to a button: "Gekopieerd". */
export function flash(el, text, ms = 1600) {
  const old = el.dataset.label ?? el.textContent;
  el.dataset.label = old;
  el.textContent = text;
  clearTimeout(el._flash);
  el._flash = setTimeout(() => {
    el.textContent = el.dataset.label;
    delete el.dataset.label;
  }, ms);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Can this browser draw WebGL at all? */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
