import type { Locale } from './locales';
import { between, pick, rng, weighted, type Rng } from './random';
import { DOCTORS, doctorById, type DoctorId, type RoomId } from './team';
import { TREATMENTS, treatmentById, type CareId, type HealthFlag, type Treatment } from './treatments';
import { dateKey } from './format';
import { LOCATIONS, type LocationId } from './clinic';

/**
 * The demo day in the clinic: every dentist's agenda from opening to closing, the same in the app and the panel for
 * the same date (seeded by the date). The patients are fictional; their names, languages and health notes are drawn
 * at random. What the patient does in the app (book, check in, ask for a pause) is added on top through the bridge.
 */

export type Source = 'app' | 'website' | 'telefoon' | 'whatsapp' | 'balie';

export type Patient = {
  id: string;
  name: string;
  age: number;
  lang: Locale;
  flags: HealthFlag[];
  /** 0 calm … 3 very anxious. */
  anxiety: number;
  firstVisit: boolean;
};

export type Visit = {
  id: string;
  patient: Patient;
  treatment: string;
  doctor: DoctorId;
  room: RoomId;
  /** Minutes after midnight. */
  start: number;
  minutes: number;
  /** When they walk in (minutes after midnight); early is negative relative to start. */
  arrive: number;
  noShow: boolean;
  /** How late the chair is when they are called in. */
  delay: number;
  source: Source;
  /** Booked from this demo's app (the bridge). */
  mine?: boolean;
};

export type VisitState = 'gepland' | 'wachtkamer' | 'in-stoel' | 'klaar' | 'no-show';

/** What the dentist does, step by step: shown to the family in the waiting room and on the panel. */
export const STEPS: Record<CareId, string[]> = {
  controle: ['Welkom en vragen', 'Mond nakijken', 'Bevindingen bespreken'],
  reiniging: ['Tandsteen verwijderen', 'Polijsten', 'Poetsadvies'],
  rontgen: ['Positie innemen', 'Foto maken', 'Foto bekijken'],
  vulling: ['Verdoving', 'Gaatje schoonmaken', 'Vullen en uitharden', 'Beet controleren'],
  'kind-vulling': ['Kennismaken', 'Verdoving met verdovingsgel', 'Gaatje dichtmaken', 'Sticker'],
  'pulpa-kind': ['Kennismaken', 'Verdoving', 'Zenuw behandelen', 'Tand afsluiten'],
  fluoride: ['Tanden drogen', 'Fluoride aanbrengen', 'Uitleg'],
  ruimtebehouder: ['Passen', 'Vastzetten', 'Uitleg'],
  facings: ['Kleur kiezen', 'Tanden voorbereiden', 'Facings plaatsen', 'Polijsten en beet'],
  gingiva: ['Verdoving', 'Tandvlees vormen', 'Nazorg uitleggen'],
  bonding: ['Kleur kiezen', 'Composiet opbouwen', 'Polijsten'],
  beugel: ['Tanden reinigen', 'Slotjes plakken', 'Draad plaatsen', 'Uitleg'],
  uitneembaar: ['Passen', 'Bijstellen', 'Uitleg'],
  retainer: ['Tanden reinigen', 'Retainer plaatsen', 'Uitleg'],
  extractie: ['Verdoving', 'Tand losmaken', 'Tand verwijderen', 'Gaasje en uitleg'],
  implantaat: ['Verdoving', 'Tandvlees openen', 'Implantaat plaatsen', 'Hechten', 'Nazorg uitleggen'],
  bot: ['Verdoving', 'Plek vrijmaken', 'Bot aanbrengen', 'Hechten'],
  wortelkanaal: ['Verdoving', 'Tand afschermen', 'Kanalen reinigen', 'Kanalen vullen', 'Tijdelijke vulling'],
  kroon: ['Verdoving', 'Tand vormgeven', 'Scan', 'Tijdelijke kroon'],
  prothese: ['Passen', 'Bijslijpen', 'Uitleg'],
  bleken: ['Tandvlees beschermen', 'Bleekgel aanbrengen', 'Belichten', 'Kleur meten'],
};

const KIDS = ['Adam', 'Noah', 'Sem', 'Liam', 'Yusuf', 'Daan', 'Mila', 'Nora', 'Sara', 'Lina', 'Julia', 'Zeynep', 'Ilyas', 'Emma', 'Amira', 'Tess'];
const WOMEN = ['Sanne', 'Fatima', 'Elif', 'Femke', 'Yasmina', 'Lotte', 'Nadia', 'Merve', 'Iris', 'Hiba', 'Anouk', 'Maryam', 'Esra', 'Eva', 'Rania', 'Lieke', 'Salma', 'Noor', 'Inge', 'Dilan'];
const MEN = ['Thomas', 'Mohammed', 'Emre', 'Bram', 'Karim', 'Hamza', 'Jeroen', 'Youssef', 'Mehmet', 'Ruben', 'Bilal', 'Kees', 'Ahmet', 'Joost', 'Tarik', 'Pieter', 'Samir', 'Luuk'];
const LAST = ['de Vries', 'Jansen', 'El Amrani', 'Yılmaz', 'Bakker', 'Haddad', 'van Dijk', 'Kaya', 'Visser', 'Mansouri', 'Smits', 'Demir', 'Hendriks', 'Bouzid', 'van der Linden', 'Aksoy', 'Peeters', 'Saleh', 'Willems', 'Öztürk', 'Verhoeven', 'Nasser'];

const LANGS: (readonly [Locale, number])[] = [
  ['nl', 56],
  ['ar', 18],
  ['tr', 10],
  ['en', 9],
  ['fr', 3],
  ['de', 2],
  ['it', 2],
];

const FLAG_ODDS: (readonly [HealthFlag, number])[] = [
  ['bloedverdunner', 0.06],
  ['botmedicijn', 0.02],
  ['hartklep', 0.02],
  ['diabetes', 0.06],
  ['zwanger', 0.03],
  ['allergie-penicilline', 0.05],
  ['allergie-latex', 0.03],
  ['allergie-ibuprofen', 0.03],
  ['roken', 0.12],
  ['astma', 0.05],
];

function makePatient(r: Rng, id: string, kid: boolean): Patient {
  const woman = r() < 0.55;
  const first = kid ? pick(r, KIDS) : pick(r, woman ? WOMEN : MEN);
  const name = `${first} ${pick(r, LAST)}`;
  const age = kid ? between(r, 4, 14) : between(r, 19, 78);
  const flags: HealthFlag[] = [];
  if (!kid) for (const [flag, odds] of FLAG_ODDS) if (r() < odds && !(flag === 'zwanger' && (!woman || age > 45))) flags.push(flag);
  const anxiety = weighted(r, [
    [0, 52],
    [1, 26],
    [2, 15],
    [3, 7],
  ]);
  if (anxiety >= 2) flags.push('angst');
  return { id, name, age, lang: weighted(r, LANGS), flags, anxiety, firstVisit: r() < 0.16 };
}

/** What each dentist mostly does in a day, by weight. */
const MIX: Record<DoctorId, (readonly [string, number])[]> = {
  omar: [['implantaat', 4], ['extractie', 3], ['bot', 2], ['kroon', 3], ['brug', 1], ['prothese', 2], ['verstandskies', 2], ['controle', 1]],
  buthaina: [['wortelkanaal', 5], ['herbehandeling', 2], ['facings', 3], ['bleken', 3], ['gingiva', 1], ['diastema', 2], ['hollywood', 1]],
  ayman: [['beugel', 5], ['uitneembaar', 3], ['retainer', 3], ['controle', 1], ['ruimtebehouder', 1]],
  najla: [['controle', 6], ['reiniging', 4], ['vulling', 4], ['kind-controle', 3], ['fluoride', 2], ['kind-vulling', 2], ['rontgen', 1], ['extractie', 1]],
  mahmoud: [['kind-controle', 5], ['kind-vulling', 3], ['fluoride', 3], ['pulpa-kind', 2], ['controle', 3], ['vulling', 3], ['verstandskies', 1], ['ruimtebehouder', 1]],
  ahmad: [['controle', 5], ['reiniging', 4], ['vulling', 4], ['bleken', 2], ['diastema', 1], ['kroon', 1], ['prothese', 1], ['extractie', 1]],
};

const slotLength = (t: Treatment, r: Rng) => Math.max(15, Math.round((t.minutes * (0.85 + r() * 0.3)) / 15) * 15);

/** Lunch in the demo: the chairs stand still from 12:45 to 13:15. */
export const LUNCH = { from: 12 * 60 + 45, to: 13 * 60 + 15 };

/** Who works in Hoogland on its open days (demo): Dr. Najla on Saturday, Dr. Ahmad on Sunday. They are not in Eindhoven then. */
export function hooglandDoctor(day: Date): DoctorId | null {
  if (day.getDay() === 6) return 'najla';
  if (day.getDay() === 0) return 'ahmad';
  return null;
}

/** Whether a dentist works at a location on a day, in the demo. */
export function worksAt(day: Date, doctor: DoctorId, loc: LocationId): boolean {
  if (!LOCATIONS[loc].days.includes(day.getDay())) return false;
  const away = hooglandDoctor(day);
  return loc === 'hoogland' ? doctor === away : doctor !== away;
}

const cache = new Map<string, Visit[]>();

/** The fictional agenda of a day at a location, every dentist's visits in order. */
export function dayVisits(day: Date, loc: LocationId = 'eindhoven'): Visit[] {
  const key = `${loc}-${dateKey(day)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const place = LOCATIONS[loc];
  const out: Visit[] = [];
  if (!place.days.includes(day.getDay())) {
    cache.set(key, out);
    return out;
  }
  const doctors = DOCTORS.filter((d) => worksAt(day, d.id, loc));
  for (const doc of doctors) {
    const r = rng(`${key}-${doc.id}`);
    let t = place.opens + (r() < 0.3 ? 15 : 0);
    let n = 0;
    while (t < place.closes - 15) {
      if (t >= LUNCH.from && t < LUNCH.to) {
        t = LUNCH.to;
        continue;
      }
      // A gap now and then: these are the free places the app can book.
      if (r() < 0.16) {
        t += r() < 0.5 ? 15 : 30;
        continue;
      }
      const treatment = treatmentById(weighted(r, MIX[doc.id]));
      let minutes = slotLength(treatment, r);
      if (t < LUNCH.from && t + minutes > LUNCH.from) minutes = Math.max(15, LUNCH.from - t);
      if (t + minutes > place.closes) minutes = place.closes - t;
      if (minutes < 15) break;
      const kid = Boolean(treatment.kids) && treatment.id !== 'uitneembaar' ? true : treatment.id === 'uitneembaar' ? r() < 0.8 : false;
      const patient = makePatient(r, `${key}-${doc.id}-${n}`, kid);
      const noShow = r() < 0.04;
      const arrive = t - between(r, -6, 14);
      out.push({
        id: `${key}-${doc.id}-${n}`,
        patient,
        treatment: treatment.id,
        doctor: doc.id,
        room: loc === 'eindhoven' ? doc.room : 'k1',
        start: t,
        minutes,
        arrive,
        noShow,
        delay: r() < 0.25 ? between(r, 3, 12) : 0,
        source: weighted(r, [
          ['app', 4],
          ['website', 3],
          ['telefoon', 4],
          ['whatsapp', 3],
          ['balie', 1],
        ]),
      });
      t += minutes;
      n++;
    }
  }
  out.sort((a, b) => a.start - b.start);
  cache.set(key, out);
  return out;
}

/** Where a visit stands at minute `m` of its day, with its progress through the treatment steps. */
export function visitState(v: Visit, m: number): { state: VisitState; progress: number; step: number; steps: string[] } {
  const steps = STEPS[treatmentById(v.treatment).care];
  if (v.noShow) return { state: m > v.start + 10 ? 'no-show' : 'gepland', progress: 0, step: 0, steps };
  const begin = v.start + v.delay;
  if (m < v.arrive) return { state: 'gepland', progress: 0, step: 0, steps };
  if (m < begin) return { state: 'wachtkamer', progress: 0, step: 0, steps };
  if (m < begin + v.minutes) {
    const progress = (m - begin) / v.minutes;
    return { state: 'in-stoel', progress, step: Math.min(steps.length - 1, Math.floor(progress * steps.length)), steps };
  }
  return { state: 'klaar', progress: 1, step: steps.length - 1, steps };
}

/** Free places with a dentist on a day: starts where `minutes` fits between the visits (and after `after`). */
export function freeSlots(day: Date, doctor: DoctorId, minutes: number, taken: { start: number; minutes: number; doctor: DoctorId }[] = [], after = 0, loc: LocationId = 'eindhoven'): number[] {
  const place = LOCATIONS[loc];
  if (!worksAt(day, doctor, loc)) return [];
  const busy = [...dayVisits(day, loc).filter((v) => v.doctor === doctor && !v.noShow), ...taken.filter((v) => v.doctor === doctor)]
    .map((v) => [v.start, v.start + v.minutes] as const)
    .concat([[LUNCH.from, LUNCH.to]])
    .sort((a, b) => a[0] - b[0]);
  const out: number[] = [];
  for (let t = place.opens; t + minutes <= place.closes; t += 15) {
    if (t < after) continue;
    if (busy.some(([a, b]) => t < b && t + minutes > a)) continue;
    out.push(t);
  }
  return out;
}

/** How full a dentist's day is: booked chair minutes over open minutes, 0 … 1. */
export function occupancy(day: Date, doctor: DoctorId, loc: LocationId = 'eindhoven', extra = 0): number {
  const place = LOCATIONS[loc];
  if (!place.days.includes(day.getDay())) return 0;
  const open = place.closes - place.opens - (LUNCH.to - LUNCH.from);
  const used = dayVisits(day, loc)
    .filter((v) => v.doctor === doctor && !v.noShow)
    .reduce((s, v) => s + v.minutes, 0);
  return Math.min(1, (used + extra) / open);
}

export const doctorOf = (v: Visit) => doctorById(v.doctor);

export const TREATMENT_COUNT = TREATMENTS.length;
