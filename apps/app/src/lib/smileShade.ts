import { VITA } from '@smile/shared';

/**
 * The VITA classical shade guide as colour: each tab's CIELAB value (rounded from published spectrophotometer
 * measurements of the guide, close enough to show the steps between tabs; not a clinical reference), the conversions
 * to and from sRGB, and the closest tab to a colour. Used by the Glimlach-studio and its colour timeline.
 */

export type Lab = { L: number; a: number; b: number };

export const SHADE_LAB: Record<string, Lab> = {
  B1: { L: 82.0, a: -0.6, b: 10.2 },
  A1: { L: 80.6, a: 0.2, b: 14.0 },
  B2: { L: 79.6, a: -0.2, b: 18.0 },
  D2: { L: 77.8, a: 0.6, b: 12.8 },
  A2: { L: 77.4, a: 1.0, b: 18.2 },
  C1: { L: 76.6, a: 0.3, b: 14.2 },
  C2: { L: 74.6, a: 0.8, b: 17.6 },
  D4: { L: 74.2, a: 0.9, b: 20.0 },
  A3: { L: 74.0, a: 1.8, b: 22.0 },
  D3: { L: 73.0, a: 1.2, b: 17.0 },
  B3: { L: 72.8, a: 1.4, b: 26.0 },
  'A3.5': { L: 71.0, a: 2.6, b: 25.0 },
  B4: { L: 70.8, a: 1.8, b: 28.0 },
  C3: { L: 69.6, a: 1.3, b: 20.0 },
  A4: { L: 67.0, a: 3.0, b: 26.0 },
  C4: { L: 64.0, a: 2.5, b: 24.0 },
};

/** The guide's groups, the way the tabs are named: A reddish-brown, B reddish-yellow, C grey, D reddish-grey. */
export const SHADE_GROUP: Record<string, string> = { A: 'roodbruin', B: 'roodgeel', C: 'grijs', D: 'roodgrijs' };

export const shadeIndex = (shade: string) => Math.max(0, VITA.indexOf(shade));

// ------------------------------------------------------------------------------------------------- colour maths

const Xn = 0.95047;
const Zn = 1.08883;

const finv = (t: number) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);
const fwd = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** sRGB 0…255 per channel → linear 0…1, as a table (the inner loop of the studio uses it per pixel). */
export const LINEAR = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) t[i] = linear(i / 255);
  return t;
})();

/** CIELAB (D65) from linear RGB. */
export function labFromLinear(r: number, g: number, b: number, out: Lab = { L: 0, a: 0, b: 0 }): Lab {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / Xn;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / Zn;
  const fx = fwd(x);
  const fy = fwd(y);
  const fz = fwd(z);
  out.L = 116 * fy - 16;
  out.a = 500 * (fx - fy);
  out.b = 200 * (fy - fz);
  return out;
}

/** sRGB 0…255 from CIELAB, clamped to the screen's gamut. */
export function rgbFromLab(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const x = Xn * finv(fy + a / 500);
  const y = finv(fy);
  const z = Zn * finv(fy - b / 200);
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const g = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const bl = 0.0557 * x - 0.204 * y + 1.057 * z;
  const to = (c: number) => Math.round(255 * Math.max(0, Math.min(1, gamma(Math.max(0, c)))));
  return [to(r), to(g), to(bl)];
}

const hex = (rgb: [number, number, number]) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/** The tab's porcelain colour for the screen (a touch lighter: a screen shows porcelain darker than it looks). */
export const shadeHex = (shade: string) => {
  const lab = SHADE_LAB[shade] ?? SHADE_LAB.A2;
  return hex(rgbFromLab(lab.L + 3, lab.a, lab.b));
};

/** The same tab a little lighter and bluer (the translucent incisal edge) or deeper (the neck), for the tab's gradient. */
export const shadeEdge = (shade: string, part: 'incisal' | 'cervical') => {
  const lab = SHADE_LAB[shade] ?? SHADE_LAB.A2;
  return part === 'incisal' ? hex(rgbFromLab(lab.L + 7, lab.a - 0.8, lab.b - 7)) : hex(rgbFromLab(lab.L - 3, lab.a + 1.6, lab.b + 6));
};

/** The closest tab to a colour. `lightness` weighs how much brightness counts against hue and chroma. */
export function closestShade(lab: Lab, lightness = 1): string {
  let best = VITA[0];
  let bestD = Infinity;
  for (const s of VITA) {
    const t = SHADE_LAB[s];
    const d = lightness * (t.L - lab.L) ** 2 + (t.a - lab.a) ** 2 + (t.b - lab.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** "2 tinten lichter", "zelfde tint", "1 tint donkerder": how far one tab is from another on the guide. */
export function shadeSteps(from: string, to: string): { n: number; text: string } {
  const n = shadeIndex(from) - shadeIndex(to);
  if (n === 0) return { n, text: 'zelfde tint' };
  const abs = Math.abs(n);
  return { n, text: `${abs} ${abs === 1 ? 'tint' : 'tinten'} ${n > 0 ? 'lichter' : 'donkerder'}` };
}
