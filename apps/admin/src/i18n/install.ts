import { ARABIC_FONTS, isRTL, missing, pickLocale, rememberLocale, setLocale, trackMissing, type Locale } from '@smile/shared';

// Imported first by main.tsx: the language is set before any module or screen shows text.

const locale = pickLocale();
setLocale(locale);
document.documentElement.lang = locale;
document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';

if (isRTL(locale)) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = `https://fonts.googleapis.com/css2?display=swap${ARABIC_FONTS}`;
  document.head.appendChild(fonts);
}

// ?i18n-check collects the Dutch that is shown without a translation (window.__smileMissing), to find gaps.
if (new URLSearchParams(window.location.search).has('i18n-check')) {
  trackMissing();
  (window as unknown as { __smileMissing: Set<string> }).__smileMissing = missing;
}

/** Another language: remembered on this device, and the panel opens again in it. */
export function chooseLocale(next: Locale) {
  rememberLocale(next);
  const url = new URL(window.location.href);
  url.searchParams.set('lang', next);
  window.location.replace(url.toString());
}
