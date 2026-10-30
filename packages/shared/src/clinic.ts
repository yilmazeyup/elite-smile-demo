import { addDays, atMinute, minuteOf, startOfDay } from './format';

/**
 * Elite Smile's own facts, from elitesmile.nl and arab.elitesmile.nl (October 2026): two practices, the phone and
 * WhatsApp number, the e-mail address, Instagram, the opening days and the free check-up offer. Nothing here is made up.
 */

export const CLINIC = {
  name: 'Elite Smile',
  legal: 'Elite Smile Dental Clinic',
  phone: '06 38208557',
  phoneIntl: '+31638208557',
  whatsapp: 'https://wa.me/31638208557',
  email: 'info@elitesmile.nl',
  instagram: 'mj.elite.smile',
  instagramUrl: 'https://instagram.com/mj.elite.smile',
  site: 'https://elitesmile.nl',
  siteArabic: 'https://arab.elitesmile.nl',
  /** "Your perfect smile starts here": the site's own headline. */
  promise: 'Je perfecte glimlach begint hier',
  /** The offer on both sites: book a free check-up. */
  freeCheckup: true,
};

export type LocationId = 'eindhoven' | 'hoogland';

export type Location = {
  id: LocationId;
  name: string;
  short: string;
  city: string;
  street: string;
  postcode: string;
  /** The part of town, as OpenStreetMap names it. */
  area: string;
  lat: number;
  lon: number;
  /** Open weekdays, 0 = Sunday. */
  days: number[];
  /** Minutes after midnight. */
  opens: number;
  closes: number;
  maps: string;
  /** A dental clinic, or a dental hygiene practice. */
  kind: 'kliniek' | 'mondhygiene';
};

export const LOCATIONS: Record<LocationId, Location> = {
  eindhoven: {
    id: 'eindhoven',
    name: 'Elite Smile Dental Clinic',
    short: 'Eindhoven',
    city: 'Eindhoven',
    street: 'Alard du Hamelstraat 33',
    postcode: '5622 CC',
    area: 'Woensel-Zuid',
    lat: 51.459526,
    lon: 5.4604593,
    days: [0, 3, 5, 6],
    opens: 9 * 60 + 30,
    closes: 17 * 60,
    maps: 'https://maps.app.goo.gl/bSZ3d555Yu2SnoEA6',
    kind: 'kliniek',
  },
  hoogland: {
    id: 'hoogland',
    name: 'Mondhygiënistenpraktijk Engweg',
    short: 'Hoogland',
    city: 'Hoogland (Amersfoort)',
    street: 'Engweg 17',
    postcode: '3828 CJ',
    area: 'Hoogland',
    lat: 52.1878453,
    lon: 5.3831512,
    days: [6, 0],
    opens: 10 * 60,
    closes: 17 * 60,
    maps: 'https://maps.app.goo.gl/6AQD8W9GLRHewDaa9',
    kind: 'mondhygiene',
  },
};

export const LOCATION_LIST: Location[] = [LOCATIONS.eindhoven, LOCATIONS.hoogland];

export const isOpenDay = (loc: Location, day: Date) => loc.days.includes(day.getDay());

/** True while the practice is open at this wall-clock moment. */
export function isOpenAt(loc: Location, at: Date): boolean {
  const m = minuteOf(at);
  return isOpenDay(loc, at) && m >= loc.opens && m < loc.closes;
}

/** The next moment the practice opens (or `at` itself while it is open). */
export function nextOpening(loc: Location, at: Date): Date {
  if (isOpenAt(loc, at)) return at;
  for (let i = 0; i < 8; i++) {
    const day = addDays(startOfDay(at), i);
    if (!isOpenDay(loc, day)) continue;
    const opens = atMinute(day, loc.opens);
    if (opens.getTime() > at.getTime()) return opens;
  }
  return at;
}

/** The open days from `from` on (today included while there is still time left), `count` of them. */
export function openDays(loc: Location, from: Date, count: number, skipToday = false): Date[] {
  const out: Date[] = [];
  for (let i = skipToday ? 1 : 0; out.length < count && i < 120; i++) {
    const day = addDays(startOfDay(from), i);
    if (!isOpenDay(loc, day)) continue;
    if (i === 0 && minuteOf(from) > loc.closes - 30) continue;
    out.push(day);
  }
  return out;
}

/** The last day the practice was open before or on `at`'s day (for replaying a day while it is closed). */
export function lastOpenDay(loc: Location, at: Date): Date {
  for (let i = 0; i < 8; i++) {
    const day = addDays(startOfDay(at), -i);
    if (!isOpenDay(loc, day)) continue;
    if (i === 0 && minuteOf(at) < loc.opens) continue;
    return day;
  }
  return startOfDay(at);
}

/** Opening days in the site's words: "zo · wo · vr · za". */
export const OPENING_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// --------------------------------------------------------------------------------------------- distance and postcodes

const rad = Math.PI / 180;

/** Kilometres between two points, along the earth. */
export function km(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const normalizePostcode = (text: string) => text.toUpperCase().replace(/\s+/g, '');

export const isPostcode = (text: string) => /^[1-9]\d{3}([A-Z]{2})?$/.test(normalizePostcode(text));

/**
 * Rough centres of the Dutch postcode regions (the first two digits), used when the national address service cannot be
 * reached: good enough to tell Eindhoven from Hoogland.
 */
const PC2: Record<string, [number, number]> = {
  '10': [52.37, 4.9], '11': [52.33, 4.9], '12': [52.23, 5.17], '13': [52.37, 5.22], '14': [52.55, 4.8], '15': [52.47, 4.8],
  '16': [52.65, 5.05], '17': [52.8, 4.85], '18': [52.62, 4.75], '19': [52.48, 4.65], '20': [52.38, 4.63], '21': [52.3, 4.6],
  '22': [52.2, 4.45], '23': [52.16, 4.49], '24': [52.1, 4.65], '25': [52.08, 4.3], '26': [52.0, 4.36], '27': [52.03, 4.5],
  '28': [52.0, 4.7], '29': [51.9, 4.6], '30': [51.92, 4.48], '31': [51.9, 4.35], '32': [51.85, 4.2], '33': [51.8, 4.67],
  '34': [52.05, 4.98], '35': [52.09, 5.12], '36': [52.15, 5.0], '37': [52.15, 5.3], '38': [52.16, 5.39], '39': [52.0, 5.5],
  '40': [51.9, 5.2], '41': [51.95, 5.2], '42': [51.83, 5.0], '43': [51.5, 3.9], '44': [51.5, 3.6], '45': [51.3, 3.8],
  '46': [51.5, 4.3], '47': [51.6, 4.5], '48': [51.59, 4.78], '49': [51.65, 4.6], '50': [51.56, 5.08], '51': [51.65, 5.0],
  '52': [51.69, 5.3], '53': [51.75, 5.5], '54': [51.62, 5.55], '55': [51.4, 5.4], '56': [51.44, 5.47], '57': [51.48, 5.65],
  '58': [51.55, 5.9], '59': [51.37, 6.17], '60': [51.25, 5.7], '61': [51.0, 5.85], '62': [50.85, 5.7], '63': [50.88, 5.95],
  '64': [50.9, 6.0], '65': [51.84, 5.86], '66': [51.85, 5.6], '67': [52.03, 5.67], '68': [51.98, 5.91], '69': [51.95, 6.15],
  '70': [51.97, 6.3], '71': [51.9, 6.6], '72': [52.15, 6.2], '73': [52.21, 5.97], '74': [52.25, 6.4], '75': [52.22, 6.89],
  '76': [52.35, 6.65], '77': [52.6, 6.4], '78': [52.78, 6.9], '79': [52.75, 6.4], '80': [52.51, 6.09], '81': [52.45, 6.2],
  '82': [52.52, 5.47], '83': [52.7, 5.75], '84': [52.95, 6.0], '85': [53.0, 5.6], '86': [53.05, 5.4], '87': [53.0, 5.3],
  '88': [53.15, 5.5], '89': [53.2, 5.8], '90': [53.15, 6.0], '91': [53.3, 6.0], '92': [53.1, 6.1], '93': [53.05, 6.5],
  '94': [52.99, 6.56], '95': [53.0, 6.9], '96': [53.15, 6.75], '97': [53.22, 6.57], '98': [53.3, 6.4], '99': [53.35, 6.75],
};

/** A postcode's rough position, without asking anyone. */
export function postcodeGuess(postcode: string): { lat: number; lon: number } | null {
  const pc = normalizePostcode(postcode).slice(0, 2);
  const hit = PC2[pc];
  return hit ? { lat: hit[0], lon: hit[1] } : null;
}

/**
 * The postcode's position from PDOK, the Dutch government's address service (open to anyone, no key), with the rough
 * guess above as a fallback. The site's own "find your nearest clinic" does the same.
 */
export async function locatePostcode(postcode: string): Promise<{ lat: number; lon: number; label: string; exact: boolean } | null> {
  const pc = normalizePostcode(postcode);
  if (!isPostcode(pc)) return null;
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(pc)}&fq=type:postcode&rows=1&fl=centroide_ll,weergavenaam`;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), 3500);
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    clearTimeout(timer);
    const data = (await res.json()) as { response?: { docs?: { centroide_ll?: string; weergavenaam?: string }[] } };
    const doc = data.response?.docs?.[0];
    const m = doc?.centroide_ll ? /POINT\(([\d.]+) ([\d.]+)\)/.exec(doc.centroide_ll) : null;
    if (m) return { lat: Number(m[2]), lon: Number(m[1]), label: doc?.weergavenaam ?? pc, exact: true };
  } catch {
    // Offline or blocked: the region guess below.
  }
  const guess = postcodeGuess(pc);
  return guess ? { ...guess, label: pc, exact: false } : null;
}

export type Nearest = { location: Location; km: number; minutes: number; other: { location: Location; km: number } };

/** The nearest practice to a point, with the distance and a rough driving time (straight line × 1.3 at 70 km/h). */
export function nearestLocation(lat: number, lon: number): Nearest {
  const [a, b] = LOCATION_LIST.map((location) => ({ location, km: km(lat, lon, location.lat, location.lon) })).sort((x, y) => x.km - y.km);
  return { location: a.location, km: a.km, minutes: Math.max(4, Math.round(((a.km * 1.3) / 70) * 60 + 4)), other: b };
}
