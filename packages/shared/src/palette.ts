/**
 * Elite Smile's look, after the logo (a tooth in deep and sky blue, "ELITE" in navy) and the white of a clinic:
 * "Porselein" (cool porcelain white, navy ink, the logo's blues) and "Nacht" (deep navy, for reading aftercare at night).
 * The app, the panel and the website share these tokens as CSS variables (--es-*), so a look changes in one step.
 */

export type ThemeMode = 'day' | 'night';

export type Palette = {
  bg: string;
  bg2: string;
  paper: string;
  raised: string;
  ink: string;
  soft: string;
  muted: string;
  line: string;
  line2: string;
  /** The site's navy. */
  brand: string;
  /** The logo's deep blue. */
  blue: string;
  /** The logo's sky blue. */
  sky: string;
  ice: string;
  ok: string;
  warn: string;
  alert: string;
  lilac: string;
  gold: string;
  glass: string;
  onBrand: string;
};

export const PALETTES: Record<ThemeMode, Palette> = {
  day: {
    bg: '#F3F6FB',
    bg2: '#E8EEF7',
    paper: '#FFFFFF',
    raised: '#FFFFFF',
    ink: '#0B1A3A',
    soft: '#34446A',
    muted: '#7584A3',
    line: 'rgba(11,26,58,0.08)',
    line2: 'rgba(11,26,58,0.16)',
    brand: '#234282',
    blue: '#0A63B5',
    sky: '#2DB4E8',
    ice: '#E4F4FC',
    ok: '#12A27A',
    warn: '#E0901A',
    alert: '#E2434B',
    lilac: '#7D6BF0',
    gold: '#B8904A',
    glass: 'rgba(255,255,255,0.72)',
    onBrand: '#FFFFFF',
  },
  night: {
    bg: '#060D1F',
    bg2: '#0A1430',
    paper: '#0E1938',
    raised: '#132146',
    ink: '#EDF2FF',
    soft: '#B6C2DF',
    muted: '#7D8BAE',
    line: 'rgba(196,212,255,0.09)',
    line2: 'rgba(196,212,255,0.18)',
    brand: '#6F8BEA',
    blue: '#4A9BFF',
    sky: '#4CCBF7',
    ice: 'rgba(76,203,247,0.12)',
    ok: '#3CD3A0',
    warn: '#FFB64A',
    alert: '#FF6B70',
    lilac: '#A99CFF',
    gold: '#E1BE7C',
    glass: 'rgba(14,25,56,0.72)',
    onBrand: '#FFFFFF',
  },
};

/** One colour per specialty, the same in both looks; used on cards, rooms in 3D and the agenda. */
export const SPECIALTY_COLORS = {
  algemeen: '#2DB4E8',
  kinderen: '#FFB12E',
  cosmetisch: '#8E7CF8',
  orthodontie: '#17BFA3',
  chirurgie: '#FF6F61',
  endodontie: '#4F6BED',
  prothetiek: '#C9A15B',
} as const;

export const cssVar = (name: keyof Palette) => `var(--es-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})`;

/** CSS custom properties for both looks, keyed by `data-theme` on the html element. */
export function paletteCss(): string {
  const vars = (p: Palette) =>
    Object.entries(p)
      .map(([k, v]) => `--es-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v};`)
      .join('');
  const spec = Object.entries(SPECIALTY_COLORS)
    .map(([k, v]) => `--es-s-${k}:${v};`)
    .join('');
  return `:root,[data-theme="day"]{${vars(PALETTES.day)}${spec}color-scheme:light;}[data-theme="night"]{${vars(PALETTES.night)}color-scheme:dark;}`;
}

/**
 * Sora for headings (round and exact, like a smile line), Newsreader italic for the words that carry feeling, Figtree
 * for reading, JetBrains Mono for tooth numbers, times and codes. Arabic: Readex Pro and IBM Plex Sans Arabic.
 */
export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Sora:wght@300..800&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,300..600&family=Figtree:wght@400..700&family=JetBrains+Mono:wght@400;500;600&display=swap';

export const ARABIC_FONTS = '&family=Readex+Pro:wght@300..700&family=IBM+Plex+Sans+Arabic:wght@400;500;600';

export const FONT_STACK = {
  display: '"Sora", "Readex Pro", system-ui, sans-serif',
  serif: '"Newsreader", "IBM Plex Sans Arabic", Georgia, serif',
  sans: '"Figtree", "IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "IBM Plex Sans Arabic", ui-monospace, Menlo, monospace',
};

/** Light by default; the night look on request, or automatically after sunset ("auto"). */
export type ThemeChoice = 'auto' | ThemeMode;

const KEY = 'smile-theme';

export function readThemeChoice(): ThemeChoice {
  try {
    const fromAddress = new URLSearchParams(globalThis.location?.search ?? '').get('theme');
    if (fromAddress === 'day' || fromAddress === 'night' || fromAddress === 'auto') return fromAddress;
    const saved = globalThis.localStorage?.getItem(KEY);
    return saved === 'night' || saved === 'auto' ? saved : 'day';
  } catch {
    return 'day';
  }
}

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'day') globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, choice);
  } catch {
    // Private windows: the choice lasts for this page.
  }
}
