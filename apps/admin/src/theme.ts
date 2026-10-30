import { FONTS_URL, isDark, paletteCss, PALETTES, readThemeChoice, saveThemeChoice, type ThemeChoice, type ThemeMode } from '@smile/shared';
import { useEffect, useState } from 'react';

// Both looks as CSS custom properties and the four families, once, before the first paint.
const style = document.createElement('style');
style.id = 'es-palette';
style.textContent = paletteCss();
document.head.appendChild(style);

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = FONTS_URL;
document.head.appendChild(fonts);

/** The first look is set straight away; only later switches sweep in. */
let painted = false;

/**
 * "Porselein" by day and "Nacht" on request or after sunset in Eindhoven ("auto"). The header switch remembers the
 * choice on this device with the same key as the app; `?theme=day|night` forces one for a moment.
 */
export function useTheme(now: Date) {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);
  const mode: ThemeMode = choice === 'auto' ? (isDark(now) ? 'night' : 'day') : choice;

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = mode;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[mode].bg);
    };
    if (root.dataset.theme === mode) {
      apply();
      painted = true;
      return;
    }
    // The switch sweeps in like light changing; browsers without view transitions just change.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (painted && doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply);
    else apply();
    painted = true;
  }, [mode]);

  return {
    choice,
    mode,
    choose: (next: ThemeChoice) => {
      saveThemeChoice(next);
      setChoice(next);
    },
  };
}
