import { addDays, IMPLANT_DAYS_AGO, startOfDay } from '@smile/shared';

/**
 * Brushing: the sessions Layla saved, her streak, and twelve achievements (Bruno Simon's portfolio, Awwwards SOTM
 * January 2026, has 38 that unlock car skins; here they unlock toothbrush skins). Some say plainly what they ask,
 * some are a riddle until you earn them.
 */

export type Session = { at: number; seconds: number };

export const FULL = 120;
export const QUADRANTS = [
  { id: 'rb', label: 'Rechtsboven', fdi: 1 },
  { id: 'lb', label: 'Linksboven', fdi: 2 },
  { id: 'lo', label: 'Linksonder', fdi: 3 },
  { id: 'ro', label: 'Rechtsonder', fdi: 4 },
] as const;

export type Skin = { id: string; name: string; handle: string; accent: string; bristles: string; metal?: boolean; glow?: boolean; pearl?: boolean };

export const SKINS: Skin[] = [
  { id: 'navy', name: 'Elite navy', handle: '#14306E', accent: '#2DB4E8', bristles: '#F4F8FF' },
  { id: 'parel', name: 'Parelmoer', handle: '#F3F0FA', accent: '#BFD9F2', bristles: '#FFFFFF', pearl: true },
  { id: 'mint', name: 'Mint', handle: '#7FD9C4', accent: '#17BFA3', bristles: '#E9FFF8' },
  { id: 'koraal', name: 'Koraal', handle: '#FF8F7A', accent: '#FFD2C6', bristles: '#FFF6F2' },
  { id: 'nacht', name: 'Nachtlicht', handle: '#0A1430', accent: '#4CCBF7', bristles: '#BFF0FF', glow: true },
  { id: 'goud', name: 'Wit goud', handle: '#E8D3A6', accent: '#C9A15B', bristles: '#FFFDF6', metal: true },
  { id: 'aurora', name: 'Aurora', handle: '#8E7CF8', accent: '#4CCBF7', bristles: '#F3EEFF', pearl: true },
  { id: 'bamboe', name: 'Bamboe', handle: '#CDAA6E', accent: '#7A5A2E', bristles: '#F6EEDD' },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];

export type Achievement = {
  id: string;
  title: string;
  /** What it asks; for a cryptic one this is the riddle until it is earned. */
  hint: string;
  /** What it was, once earned. */
  done: string;
  cryptic?: boolean;
  skin?: string;
  icon: 'brush' | 'sun' | 'moon' | 'star' | 'trophy' | 'clock' | 'calendar' | 'heart' | 'sparkle' | 'crown' | 'shield' | 'implant';
  /** Progress 0 … 1 and the session that earned it. */
  check: (sessions: Session[]) => { progress: number; at?: number; count?: string };
};

const hour = (s: Session) => new Date(s.at).getHours();
const dayKey = (t: number) => startOfDay(new Date(t)).getTime();
const full = (s: Session) => s.seconds >= 110;

/** The n-th session that matches, as the moment it was earned. */
function nth(sessions: Session[], n: number, ok: (s: Session) => boolean) {
  const hits = sessions.filter(ok);
  return { progress: Math.min(1, hits.length / n), at: hits.length >= n ? hits[n - 1].at : undefined, count: `${Math.min(hits.length, n)}/${n}` };
}

/** The first moment a streak of `days` was reached. */
function streakReached(sessions: Session[], days: number) {
  const keys = [...new Set(sessions.map((s) => dayKey(s.at)))].sort((a, b) => a - b);
  let run = 0;
  let best = 0;
  for (let i = 0; i < keys.length; i++) {
    run = i > 0 && Math.round((keys[i] - keys[i - 1]) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    if (run >= days) return { progress: 1, at: sessions.find((s) => dayKey(s.at) === keys[i])!.at, count: `${days}/${days}` };
  }
  return { progress: best / days, count: `${best}/${days}` };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'eerste', title: 'Eerste twee minuten', hint: 'Poets één keer de volle twee minuten.', done: 'Je eerste volle sessie.', icon: 'brush', skin: 'parel', check: (s) => nth(s, 1, full) },
  { id: 'dubbel', title: 'Twee per dag', hint: 'Poets op één dag ’s ochtends en ’s avonds.', done: 'Ochtend én avond op één dag.', icon: 'sun', check: (s) => {
      const byDay = new Map<number, Session[]>();
      for (const x of s) byDay.set(dayKey(x.at), [...(byDay.get(dayKey(x.at)) ?? []), x]);
      for (const list of byDay.values()) if (list.some((x) => hour(x) < 12) && list.some((x) => hour(x) >= 17)) return { progress: 1, at: list[list.length - 1].at, count: '1/1' };
      return { progress: 0, count: '0/1' };
    } },
  { id: 'week', title: 'Weekritme', hint: 'Zeven dagen achter elkaar gepoetst.', done: 'Een week lang elke dag.', icon: 'calendar', skin: 'mint', check: (s) => streakReached(s, 7) },
  { id: 'nachtuil', title: 'Nachtuil', hint: 'Iets met de klok en de maan…', done: '7 keer na 22:00 gepoetst.', cryptic: true, icon: 'moon', skin: 'nacht', check: (s) => nth(s, 7, (x) => hour(x) >= 22) },
  { id: 'ochtend', title: 'Vroege vogel', hint: 'Sommige vogels zingen voor acht uur.', done: '5 keer voor 08:00 gepoetst.', cryptic: true, icon: 'sun', skin: 'koraal', check: (s) => nth(s, 5, (x) => hour(x) < 8) },
  { id: 'precies', title: 'Op de seconde', hint: 'De ring helemaal rond, geen seconde eerder gestopt.', done: 'Tot het eind van de timer gepoetst.', cryptic: true, icon: 'clock', skin: 'goud', check: (s) => nth(s, 1, (x) => x.seconds >= FULL) },
  { id: 'tien', title: 'Vier kwadranten', hint: 'Tien volle sessies: alle vier de kwadranten, elke keer.', done: 'Tien keer alle kwadranten.', icon: 'star', check: (s) => nth(s, 10, full) },
  { id: 'weekend', title: 'Weekendwacht', hint: 'Ook op zaterdag én zondag.', done: 'Een heel weekend gepoetst.', icon: 'shield', check: (s) => {
      const days = new Set(s.map((x) => dayKey(x.at)));
      const sat = s.find((x) => new Date(x.at).getDay() === 6 && days.has(dayKey(addDays(new Date(x.at), 1).getTime())));
      return sat ? { progress: 1, at: s.find((x) => dayKey(x.at) === dayKey(addDays(new Date(sat.at), 1).getTime()))!.at, count: '2/2' } : { progress: 0, count: '0/2' };
    } },
  { id: 'zacht', title: 'Zachte hand', hint: 'Een tand in wording vraagt om voorzichtigheid.', done: 'Voorzichtig gepoetst in de week na je implantaat.', cryptic: true, icon: 'implant', check: (s) => {
      const placed = startOfDay(addDays(new Date(), -IMPLANT_DAYS_AGO)).getTime();
      return nth(s, 1, (x) => x.at >= placed && x.at < placed + 7 * 86400000);
    } },
  { id: 'spook', title: 'Spookuur', hint: 'Wanneer slaapt iedereen?', done: 'Gepoetst tussen middernacht en vier uur.', cryptic: true, icon: 'sparkle', check: (s) => nth(s, 1, (x) => hour(x) < 4) },
  { id: 'maand', title: 'Maandvast', hint: 'Dertig dagen achter elkaar.', done: 'Een maand lang elke dag.', icon: 'crown', skin: 'aurora', check: (s) => streakReached(s, 30) },
  { id: 'vijftig', title: 'Volhouder', hint: 'Vijftig volle sessies.', done: 'Vijftig keer twee minuten.', icon: 'trophy', skin: 'bamboe', check: (s) => nth(s, 50, full) },
];

export function earned(sessions: Session[]) {
  const sorted = [...sessions].sort((a, b) => a.at - b.at);
  return ACHIEVEMENTS.map((a) => ({ a, ...a.check(sorted) }));
}

/** Skins you may use: the default plus every skin an earned achievement unlocks. */
export function unlockedSkins(sessions: Session[]): Set<string> {
  const set = new Set(['navy']);
  for (const e of earned(sessions)) if (e.at && e.a.skin) set.add(e.a.skin);
  return set;
}

/** Days in a row with at least one session, ending today (or yesterday, if today has none yet). */
export function streak(sessions: Session[], now = new Date()): number {
  const days = new Set(sessions.map((s) => dayKey(s.at)));
  let d = startOfDay(now);
  if (!days.has(d.getTime())) d = addDays(d, -1);
  let n = 0;
  while (days.has(d.getTime())) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function sessionsSince(sessions: Session[], days: number, now = new Date()) {
  const from = addDays(startOfDay(now), -(days - 1)).getTime();
  return sessions.filter((s) => s.at >= from);
}

/** A believable demo week (morning and evening, a few late nights), so the achievements can be shown in a pitch. */
export function demoWeek(now = new Date()): Session[] {
  const out: Session[] = [];
  for (let d = 9; d >= 1; d--) {
    const day = addDays(startOfDay(now), -d);
    const m = new Date(day);
    m.setHours(d % 3 === 0 ? 7 : 8, 10 + d * 3, 0, 0);
    out.push({ at: m.getTime(), seconds: d % 4 === 0 ? 96 : 120 });
    const e = new Date(day);
    e.setHours(d % 2 === 0 ? 22 : 21, 15 + d, 0, 0);
    out.push({ at: e.getTime(), seconds: 120 });
  }
  return out;
}
