import { FONT_STACK, PALETTES, SPECIALTY_COLORS, type Palette, type SpecialtyId } from '@smile/shared';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Elite Smile's look: porcelain white, navy ink and the logo's two blues ("Porselein"), with a deep navy "Nacht" for
 * reading aftercare in the dark. On the web every colour is a CSS variable, so the whole app changes look in one step
 * (src/web/css.ts, src/state/theme.tsx); natively the porcelain palette stands in.
 */

export const isWeb = Platform.OS === 'web';

const v = (name: keyof Palette): string => (isWeb ? `var(--es-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})` : PALETTES.day[name]);

export const C = {
  bg: v('bg'),
  bg2: v('bg2'),
  paper: v('paper'),
  raised: v('raised'),
  ink: v('ink'),
  soft: v('soft'),
  muted: v('muted'),
  line: v('line'),
  line2: v('line2'),
  brand: v('brand'),
  blue: v('blue'),
  sky: v('sky'),
  ice: v('ice'),
  ok: v('ok'),
  warn: v('warn'),
  alert: v('alert'),
  lilac: v('lilac'),
  gold: v('gold'),
  glass: v('glass'),
  onBrand: v('onBrand'),
  /** Fixed colours that read the same in both looks. */
  white: '#FFFFFF',
  navy: '#0B1A3A',
  enamel: '#F7F4EE',
};

export const spec = (id: SpecialtyId) => SPECIALTY_COLORS[id];

export const FONT = {
  /** Round and exact, like a smile line. */
  display: isWeb ? FONT_STACK.display : Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }),
  /** Soft italic serif for the words that carry feeling. */
  serif: isWeb ? FONT_STACK.serif : Platform.select({ ios: 'Georgia', default: 'serif' }),
  sans: isWeb ? FONT_STACK.sans : undefined,
  mono: isWeb ? FONT_STACK.mono : Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

export const R = { xs: 8, sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };
export const PAD = 20;

/** Web-only CSS that React Native's types do not know (backdrop filters, gradients, blend modes). */
export const web = (style: Record<string, string | number>): ViewStyle & TextStyle => (isWeb ? (style as ViewStyle & TextStyle) : {});

/** Hooks an element up to the global web stylesheet through a data attribute: `{...fx('glass')}`. Ignored natively. */
export const fx = (names: string): Record<string, unknown> => (isWeb ? { dataSet: { fx: names } } : {});

export const shadow = (depth = 1): ViewStyle =>
  isWeb
    ? ({ boxShadow: `0 ${4 * depth}px ${18 * depth}px -${4 * depth}px rgba(11,26,58,${0.07 + depth * 0.05}), 0 1px 2px rgba(11,26,58,0.04)` } as ViewStyle)
    : { shadowColor: '#0B1A3A', shadowOpacity: 0.1, shadowRadius: 12 * depth, shadowOffset: { width: 0, height: 4 * depth }, elevation: 3 * depth };

/** The width the app is laid out for: a phone, also on a wide screen. */
export const MAX_WIDTH = 520;
