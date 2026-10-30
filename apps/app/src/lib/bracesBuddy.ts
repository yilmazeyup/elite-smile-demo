import { addDays, atMinute, startOfDay } from '@smile/shared';

import type { Saved } from '../state/app';

/**
 * Sofia's braces buddy: the elastic colours to choose from (named the way she would say them) and the wear log of a
 * removable appliance or retainer. The log lives in the app's saved state (an extra field), so "Demo opnieuw" clears it.
 */

export const ELASTIC_COLORS: { color: string; name: string }[] = [
  { color: '#234282', name: 'marine' },
  { color: '#2DB4E8', name: 'blauw' },
  { color: '#17BFA3', name: 'turkoois' },
  { color: '#7DE3C8', name: 'mint' },
  { color: '#8E7CF8', name: 'lila' },
  { color: '#FF7AA8', name: 'roze' },
  { color: '#E2434B', name: 'rood' },
  { color: '#FF8A3D', name: 'oranje' },
  { color: '#FFC83D', name: 'geel' },
  { color: '#FFFFFF', name: 'wit' },
  { color: '#B7C3D9', name: 'zilver' },
  { color: '#22252B', name: 'zwart' },
];

export const colorName = (hex: string) => ELASTIC_COLORS.find((c) => c.color.toLowerCase() === hex.toLowerCase())?.name ?? hex;

/** "roze en wit", "lila, mint en geel" */
export const colorList = (list: string[]) => {
  const names = list.map(colorName);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
};

export type Wear = { on: number; off?: number };
type BracesExtra = { bracesWear?: Wear[] };

/** Demo: last night it went in at 21:45 and came out at 7:10 this morning. */
export function wearLog(saved: Saved, today: Date): Wear[] {
  const own = (saved as Saved & BracesExtra).bracesWear;
  if (own) return own;
  return [{ on: atMinute(addDays(today, -1), 21 * 60 + 45).getTime(), off: atMinute(today, 7 * 60 + 10).getTime() }];
}

export const withWear = (log: Wear[]): Partial<Saved> => ({ bracesWear: log }) as Partial<Saved>;

/** Today's worn stretches, clipped to today, in minutes after midnight; and the total. */
export function wornToday(log: Wear[], now: Date): { from: number; to: number }[] {
  const t0 = startOfDay(now).getTime();
  const t1 = now.getTime();
  return log
    .map((w) => ({ from: Math.max(w.on, t0), to: Math.min(w.off ?? t1, t1) }))
    .filter((w) => w.to > w.from)
    .map((w) => ({ from: (w.from - t0) / 60000, to: (w.to - t0) / 60000 }));
}
