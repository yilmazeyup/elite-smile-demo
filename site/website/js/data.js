// Elite Smile's own facts (elitesmile.nl, October 2026), copied from packages/shared so the site needs no build step.
// Words live in i18n/<lang>.json; this file holds only what is the same in every language.

export const CLINIC = {
  name: 'Elite Smile',
  legal: 'Elite Smile Dental Clinic',
  phone: '06 38208557',
  phoneIntl: '+31638208557',
  whatsapp: 'https://wa.me/31638208557',
  email: 'info@elitesmile.nl',
  instagram: 'mj.elite.smile',
  instagramUrl: 'https://instagram.com/mj.elite.smile',
};

export const LOCATIONS = [
  {
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
    station: { name: 'Eindhoven Centraal', lat: 51.4433, lon: 5.4797 },
    walk: true,
  },
  {
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
    station: { name: 'Amersfoort Centraal', lat: 52.1532, lon: 5.3733 },
    walk: false,
  },
];

export const locationById = (id) => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];

/** Monday first, the way a Dutch week reads. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];

export const SPECIALTIES = [
  { id: 'algemeen', site: 'General Dentistry', color: '#2DB4E8', photo: 'p-algemeen.webp', w: 1800, h: 1200, frame: 'gilt', pos: '38% 40%' },
  { id: 'kinderen', site: 'Pediatric Dentistry', color: '#FFB12E', photo: 'p-kinderen.webp', w: 1024, h: 683, frame: 'navy', pos: '60% 40%' },
  { id: 'cosmetisch', site: 'Cosmetic Dentistry', color: '#8E7CF8', photo: 'p-cosmetisch.webp', w: 860, h: 814, frame: 'gilt', pos: '50% 50%' },
  { id: 'orthodontie', site: 'Orthodontics', color: '#17BFA3', photo: 'p-orthodontie.webp', w: 1400, h: 900, frame: 'navy', pos: '62% 40%' },
  { id: 'chirurgie', site: 'Oral Surgery', color: '#FF6F61', drawing: 'wisdom', frame: 'gilt' },
  { id: 'endodontie', site: 'Endodontics', color: '#4F6BED', drawing: 'molar', frame: 'navy' },
  { id: 'prothetiek', site: 'Prosthodontics and Dental Implants', color: '#C9A15B', photo: 'p-prothetiek.webp', w: 385, h: 257, frame: 'gilt', pos: '50% 60%' },
];

export const DOCTORS = [
  { id: 'omar', title: 'implant', site: 'Dental Implant Specialist', specialties: ['prothetiek', 'chirurgie'] },
  { id: 'buthaina', title: 'endo', site: 'Endodontist & Cosmetic Dentistry', specialties: ['endodontie', 'cosmetisch'] },
  { id: 'ayman', title: 'ortho', site: 'Orthodontics', specialties: ['orthodontie'] },
  { id: 'najla', title: 'general', site: 'General Dentist', specialties: ['algemeen', 'kinderen'] },
  { id: 'mahmoud', title: 'general', site: 'General Dentist', specialties: ['algemeen', 'kinderen'] },
  { id: 'ahmad', title: 'general', site: 'General Dentist', specialties: ['algemeen', 'cosmetisch'] },
];

const G = ['najla', 'mahmoud', 'ahmad'];

// id, specialty, aftercare id, chair minutes, visits (i18n v.N), dentists, 3D model, flags. Exactly treatments.ts.
export const TREATMENTS = [
  { id: 'controle', spec: 'algemeen', care: 'controle', min: 30, vis: 1, docs: G, model: 'tooth', free: true },
  { id: 'reiniging', spec: 'algemeen', care: 'reiniging', min: 40, vis: 2, docs: G, model: 'tooth' },
  { id: 'polijsten', spec: 'algemeen', care: 'reiniging', min: 15, vis: 3, docs: G, model: 'tooth' },
  { id: 'rontgen', spec: 'algemeen', care: 'rontgen', min: 10, vis: 4, docs: G, model: 'tooth' },
  { id: 'vulling', spec: 'algemeen', care: 'vulling', min: 40, vis: 5, docs: G, model: 'tooth' },
  { id: 'kind-controle', spec: 'kinderen', care: 'controle', min: 20, vis: 2, docs: ['najla', 'mahmoud'], model: 'tooth', kids: true },
  { id: 'kind-vulling', spec: 'kinderen', care: 'kind-vulling', min: 30, vis: 5, docs: ['najla', 'mahmoud'], model: 'tooth', kids: true },
  { id: 'pulpa-kind', spec: 'kinderen', care: 'pulpa-kind', min: 45, vis: 6, docs: ['mahmoud', 'buthaina'], model: 'tooth', kids: true },
  { id: 'fluoride', spec: 'kinderen', care: 'fluoride', min: 10, vis: 7, docs: ['najla', 'mahmoud'], model: 'tooth', kids: true },
  { id: 'ruimtebehouder', spec: 'kinderen', care: 'ruimtebehouder', min: 30, vis: 8, docs: ['mahmoud', 'ayman'], model: 'retainer', kids: true },
  { id: 'facings', spec: 'cosmetisch', care: 'facings', min: 90, vis: 9, docs: ['buthaina', 'ahmad'], model: 'veneer' },
  { id: 'hollywood', spec: 'cosmetisch', care: 'facings', min: 120, vis: 10, docs: ['buthaina'], model: 'veneer' },
  { id: 'gingiva', spec: 'cosmetisch', care: 'gingiva', min: 60, vis: 5, docs: ['buthaina'], model: 'tooth' },
  { id: 'diastema', spec: 'cosmetisch', care: 'bonding', min: 60, vis: 5, docs: ['buthaina', 'ahmad'], model: 'veneer' },
  { id: 'bleken', spec: 'cosmetisch', care: 'bleken', min: 60, vis: 11, docs: ['buthaina', 'ahmad'], model: 'tooth' },
  { id: 'beugel', spec: 'orthodontie', care: 'beugel', min: 90, vis: 12, docs: ['ayman'], model: 'bracket' },
  { id: 'uitneembaar', spec: 'orthodontie', care: 'uitneembaar', min: 30, vis: 12, docs: ['ayman'], model: 'retainer', kids: true },
  { id: 'retainer', spec: 'orthodontie', care: 'retainer', min: 20, vis: 13, docs: ['ayman'], model: 'retainer' },
  { id: 'extractie', spec: 'chirurgie', care: 'extractie', min: 30, vis: 5, docs: ['omar', 'najla', 'mahmoud', 'ahmad'], model: 'tooth' },
  { id: 'verstandskies', spec: 'chirurgie', care: 'extractie', min: 40, vis: 5, docs: ['omar', 'mahmoud'], model: 'tooth' },
  { id: 'bot', spec: 'chirurgie', care: 'bot', min: 60, vis: 14, docs: ['omar'], model: 'implant' },
  { id: 'wortelkanaal', spec: 'endodontie', care: 'wortelkanaal', min: 75, vis: 6, docs: ['buthaina'], model: 'tooth' },
  { id: 'herbehandeling', spec: 'endodontie', care: 'wortelkanaal', min: 90, vis: 8, docs: ['buthaina'], model: 'tooth' },
  { id: 'kroon', spec: 'prothetiek', care: 'kroon', min: 60, vis: 8, docs: ['omar', 'ahmad'], model: 'crown' },
  { id: 'brug', spec: 'prothetiek', care: 'kroon', min: 75, vis: 8, docs: ['omar'], model: 'crown' },
  { id: 'prothese', spec: 'prothetiek', care: 'prothese', min: 45, vis: 15, docs: ['omar', 'ahmad'], model: 'tooth' },
  { id: 'implantaat', spec: 'prothetiek', care: 'implantaat', min: 75, vis: 16, docs: ['omar'], model: 'implant' },
];

export const treatmentById = (id) => TREATMENTS.find((t) => t.id === id);

/** The catalogue: five models, each tied to the treatment it is booked under. */
export const MODELS = [
  { id: 'implant', treatment: 'implantaat' },
  { id: 'crown', treatment: 'kroon' },
  { id: 'veneer', treatment: 'facings' },
  { id: 'bracket', treatment: 'beugel' },
  { id: 'retainer', treatment: 'retainer' },
];

/** Published on elitesmile.nl, in English; shown verbatim. */
export const TESTIMONIALS = [
  {
    name: 'Femke',
    h: 'Loved everything so far',
    q: 'From the first consultation to the final result, the entire experience was outstanding. The team made me feel comfortable, informed, and confident throughout the process. My smile has completely transformed, and I finally feel proud to show it off!',
  },
  {
    name: 'Joop',
    h: 'My life changed forever',
    q: 'I was nervous about visiting the dentist after years of avoiding treatment, but the professionals at Elite Smile were incredibly patient and caring. The clinic is modern, clean, and welcoming, and the results exceeded my expectations.',
  },
  {
    name: 'Yani',
    h: 'Highly recommend this',
    q: 'Excellent service, friendly staff, and amazing attention to detail. The dentists truly care about their patients and take the time to explain every step. I’ve received so many compliments on my new smile — highly recommended!',
  },
];

/** Awwwards Sites of the Month, January to September 2026, and Site of the Year 2025. */
export const CREDITS = [
  { name: 'Bruno Simon', when: 'SOTM · 01.2026', at: 'cookies' },
  { name: 'The Renaissance Edition, Shopify', when: 'SOTM · 02.2026', at: 'specialismen' },
  { name: 'GQ & AP The Extraordinary Lab', when: 'SOTM · 03.2026', at: 'lab' },
  { name: 'Oryzo AI by Lusion', when: 'SOTM · 04.2026', at: 'behandelingen' },
  { name: 'Floema', when: 'SOTM · 05.2026', at: 'catalogus' },
  { name: 'Son Daven', when: 'SOTM · 06.2026', at: 'klinieken' },
  { name: 'Lama Lama', when: 'SOTM · 07.2026', at: 'afspraak' },
  { name: 'ERA Residence', when: 'SOTM · 08.2026', at: 'behandelingen' },
  { name: 'Why Zero', when: 'SOTM · 09.2026', at: 'afspraak' },
  { name: 'Lando Norris', when: 'SOTY · 2025', at: 'top' },
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// ------------------------------------------------------------------------------------------- distance and postcodes

const rad = Math.PI / 180;

export function km(aLat, aLon, bLat, bLon) {
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Minutes from the station: the straight line × 1.3 for streets, 5 km/h on foot, 15 km/h by bike. */
export function fromStation(loc) {
  const straight = km(loc.station.lat, loc.station.lon, loc.lat, loc.lon);
  const route = straight * 1.3;
  return { straight, walk: Math.round((route / 5) * 60), bike: Math.round((route / 15) * 60) };
}

export const normalizePostcode = (text) => text.toUpperCase().replace(/\s+/g, '');
export const isPostcode = (text) => /^[1-9]\d{3}([A-Z]{2})?$/.test(normalizePostcode(text));

const PC2 = {
  10: [52.37, 4.9], 11: [52.33, 4.9], 12: [52.23, 5.17], 13: [52.37, 5.22], 14: [52.55, 4.8], 15: [52.47, 4.8], 16: [52.65, 5.05],
  17: [52.8, 4.85], 18: [52.62, 4.75], 19: [52.48, 4.65], 20: [52.38, 4.63], 21: [52.3, 4.6], 22: [52.2, 4.45], 23: [52.16, 4.49],
  24: [52.1, 4.65], 25: [52.08, 4.3], 26: [52.0, 4.36], 27: [52.03, 4.5], 28: [52.0, 4.7], 29: [51.9, 4.6], 30: [51.92, 4.48],
  31: [51.9, 4.35], 32: [51.85, 4.2], 33: [51.8, 4.67], 34: [52.05, 4.98], 35: [52.09, 5.12], 36: [52.15, 5.0], 37: [52.15, 5.3],
  38: [52.16, 5.39], 39: [52.0, 5.5], 40: [51.9, 5.2], 41: [51.95, 5.2], 42: [51.83, 5.0], 43: [51.5, 3.9], 44: [51.5, 3.6],
  45: [51.3, 3.8], 46: [51.5, 4.3], 47: [51.6, 4.5], 48: [51.59, 4.78], 49: [51.65, 4.6], 50: [51.56, 5.08], 51: [51.65, 5.0],
  52: [51.69, 5.3], 53: [51.75, 5.5], 54: [51.62, 5.55], 55: [51.4, 5.4], 56: [51.44, 5.47], 57: [51.48, 5.65], 58: [51.55, 5.9],
  59: [51.37, 6.17], 60: [51.25, 5.7], 61: [51.0, 5.85], 62: [50.85, 5.7], 63: [50.88, 5.95], 64: [50.9, 6.0], 65: [51.84, 5.86],
  66: [51.85, 5.6], 67: [52.03, 5.67], 68: [51.98, 5.91], 69: [51.95, 6.15], 70: [51.97, 6.3], 71: [51.9, 6.6], 72: [52.15, 6.2],
  73: [52.21, 5.97], 74: [52.25, 6.4], 75: [52.22, 6.89], 76: [52.35, 6.65], 77: [52.6, 6.4], 78: [52.78, 6.9], 79: [52.75, 6.4],
  80: [52.51, 6.09], 81: [52.45, 6.2], 82: [52.52, 5.47], 83: [52.7, 5.75], 84: [52.95, 6.0], 85: [53.0, 5.6], 86: [53.05, 5.4],
  87: [53.0, 5.3], 88: [53.15, 5.5], 89: [53.2, 5.8], 90: [53.15, 6.0], 91: [53.3, 6.0], 92: [53.1, 6.1], 93: [53.05, 6.5],
  94: [52.99, 6.56], 95: [53.0, 6.9], 96: [53.15, 6.75], 97: [53.22, 6.57], 98: [53.3, 6.4], 99: [53.35, 6.75],
};

/** The postcode's position from PDOK (the Dutch government's address service, no key), else a guess by region. */
export async function locatePostcode(postcode) {
  const pc = normalizePostcode(postcode);
  if (!isPostcode(pc)) return null;
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(pc)}&fq=type:postcode&rows=1&fl=centroide_ll,weergavenaam`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    const m = doc?.centroide_ll ? /POINT\(([\d.]+) ([\d.]+)\)/.exec(doc.centroide_ll) : null;
    if (m) return { lat: Number(m[2]), lon: Number(m[1]), label: doc.weergavenaam ?? pc, exact: true };
  } catch {
    // Offline or blocked: the region guess below.
  }
  const hit = PC2[pc.slice(0, 2)];
  return hit ? { lat: hit[0], lon: hit[1], label: pc, exact: false } : null;
}

/** The nearest practice, with a rough driving time (straight line × 1.3 at 70 km/h, plus parking). */
export function nearestLocation(lat, lon) {
  const [a, b] = LOCATIONS.map((location) => ({ location, km: km(lat, lon, location.lat, location.lon) })).sort((x, y) => x.km - y.km);
  return { location: a.location, km: a.km, minutes: Math.max(4, Math.round(((a.km * 1.3) / 70) * 60 + 4)), other: b };
}

// ------------------------------------------------------------------------------------------------ time in Eindhoven

/** Day (0 = Sunday) and minute of the day, on the clinic's clock. */
export function clinicNow(at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

export const hhmm = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export function openState(loc, at = new Date()) {
  const { day, minute } = clinicNow(at);
  if (loc.days.includes(day) && minute >= loc.opens && minute < loc.closes) return { open: true };
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    if (!loc.days.includes(d)) continue;
    if (i === 0 && minute >= loc.opens) continue;
    return { open: false, day: d, time: hhmm(loc.opens) };
  }
  return { open: false, day: loc.days[0], time: hhmm(loc.opens) };
}

// -------------------------------------------------------------------------------------------------------- the mark

export const TOOTH_VIEWBOX = '40 80 902 884';
export const TOOTH_TRANSFORM = 'translate(0,1024) scale(0.1,-0.1)';
