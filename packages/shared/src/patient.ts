import { LOCATIONS, openDays, type LocationId } from './clinic';
import { addDays, startOfDay } from './format';
import type { DoctorId } from './team';
import type { HealthFlag } from './treatments';

/**
 * The demo patient and her family, all fictional: Layla Benali (34) from Eindhoven, whose implant went in two days ago,
 * her daughter Sofia (12) with braces, and her son Adam (7), who just lost a tooth. Every date is counted from today,
 * so the story is always current: the implant was placed the day before yesterday, the stitches come out on the next
 * open day a week from now.
 */

export type MemberId = 'layla' | 'sofia' | 'adam';

export type Member = { id: MemberId; name: string; first: string; age: number; kid: boolean; color: string };

export const FAMILY: Member[] = [
  { id: 'layla', name: 'Layla Benali', first: 'Layla', age: 34, kid: false, color: '#2DB4E8' },
  { id: 'sofia', name: 'Sofia Benali', first: 'Sofia', age: 12, kid: true, color: '#17BFA3' },
  { id: 'adam', name: 'Adam Benali', first: 'Adam', age: 7, kid: true, color: '#FFB12E' },
];

export const memberById = (id: string) => FAMILY.find((m) => m.id === id) ?? FAMILY[0];

export const ME = {
  ...FAMILY[0],
  postcode: '5623 KX',
  location: 'eindhoven' as LocationId,
  flags: ['angst'] as HealthFlag[],
  anxiety: 2,
  lang: 'nl',
};

// ------------------------------------------------------------------------------------------------------------ teeth

export type ToothStatus = 'gezond' | 'vulling' | 'kroon' | 'wortelkanaal' | 'implantaat' | 'ontbreekt' | 'aandacht' | 'melktand' | 'wissel';

export type Tooth = { n: number; status: ToothStatus; note?: string; since?: number; by?: DoctorId; surfaces?: string; healing?: boolean };

/** FDI numbers, upper right to upper left, then lower left to lower right (as a dentist reads the chart). */
export const ADULT_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];

export const TOOTH_STATUS: Record<ToothStatus, { label: string; color: string }> = {
  gezond: { label: 'Gezond', color: '#E9F1FA' },
  vulling: { label: 'Vulling', color: '#2DB4E8' },
  kroon: { label: 'Kroon', color: '#C9A15B' },
  wortelkanaal: { label: 'Wortelkanaal', color: '#4F6BED' },
  implantaat: { label: 'Implantaat', color: '#8E7CF8' },
  ontbreekt: { label: 'Ontbreekt', color: '#9AA6BF' },
  aandacht: { label: 'Aandacht', color: '#FFB12E' },
  melktand: { label: 'Melktand', color: '#FFE3A8' },
  wissel: { label: 'Wisselt', color: '#FF8F7A' },
};

/** The name of a tooth by its FDI number: "linker onderkies (36)". */
export function toothName(n: number): string {
  const q = Math.floor(n / 10);
  const i = n % 10;
  const kid = q >= 5;
  const side = q === 1 || q === 4 || q === 5 || q === 8 ? 'rechter' : 'linker';
  const jaw = q === 1 || q === 2 || q === 5 || q === 6 ? 'boven' : 'onder';
  const kind = kid
    ? i <= 2
      ? 'snijtand'
      : i === 3
        ? 'hoektand'
        : 'melkkies'
    : i <= 2
      ? 'snijtand'
      : i === 3
        ? 'hoektand'
        : i <= 5
          ? 'premolaar'
          : i === 8
            ? 'verstandskies'
            : 'kies';
  return `${side} ${jaw}${kind}`;
}

export function laylaTeeth(): Tooth[] {
  const special: Record<number, Omit<Tooth, 'n'>> = {
    36: { status: 'implantaat', note: 'Implantaat geplaatst, geneest. Kroon over ongeveer drie maanden.', since: 2, by: 'omar', healing: true },
    46: { status: 'kroon', note: 'Wortelkanaalbehandeling en kroon. Rustig op de foto.', since: 520, by: 'buthaina' },
    16: { status: 'vulling', note: 'Witte vulling, mesiaal en occlusaal.', since: 610, by: 'najla', surfaces: 'MO' },
    26: { status: 'vulling', note: 'Kleine witte vulling op het kauwvlak.', since: 230, by: 'najla', surfaces: 'O' },
    17: { status: 'aandacht', note: 'Een verkleurd groefje. Bij de volgende controle opnieuw kijken.', since: 230, by: 'najla' },
    38: { status: 'ontbreekt', note: 'Verstandskies, getrokken in 2019.' },
    48: { status: 'ontbreekt', note: 'Verstandskies, getrokken in 2019.' },
  };
  return ADULT_TEETH.map((n): Tooth => ({ n, ...(special[n] ?? { status: 'gezond' }) }));
}

// ----------------------------------------------------------------------------------------------------- the timeline

export type PastVisit = { daysAgo: number; treatment: string; doctor: DoctorId; who: MemberId; tooth?: number; note: string; shade?: string };

export const HISTORY: PastVisit[] = [
  { daysAgo: 420, treatment: 'controle', doctor: 'najla', who: 'layla', note: 'Gratis controle als nieuwe patiënt, met foto’s.', shade: 'A3' },
  { daysAgo: 400, treatment: 'reiniging', doctor: 'najla', who: 'layla', note: 'Reiniging en polijsten.' },
  { daysAgo: 230, treatment: 'vulling', doctor: 'najla', who: 'layla', tooth: 26, note: 'Kleine vulling; tand 17 in de gaten houden.', shade: 'A3' },
  { daysAgo: 95, treatment: 'extractie', doctor: 'omar', who: 'layla', tooth: 36, note: 'Gebarsten kies verwijderd, met botopbouw.' },
  { daysAgo: 95, treatment: 'bot', doctor: 'omar', who: 'layla', tooth: 36, note: 'Botopbouw voor een implantaat.' },
  { daysAgo: 2, treatment: 'implantaat', doctor: 'omar', who: 'layla', tooth: 36, note: 'Implantaat geplaatst, drie hechtingen.' },
  { daysAgo: 210, treatment: 'beugel', doctor: 'ayman', who: 'sofia', note: 'Vaste beugel geplaatst, boven en onder.' },
  { daysAgo: 14, treatment: 'beugel', doctor: 'ayman', who: 'sofia', note: 'Controle, nieuwe draad boven.' },
  { daysAgo: 180, treatment: 'kind-controle', doctor: 'mahmoud', who: 'adam', note: 'Controle en fluoride. Mooi gepoetst!' },
];

/** When the implant went in: the start of the active aftercare. */
export const IMPLANT_DAYS_AGO = 2;

export type Upcoming = {
  id: string;
  who: MemberId;
  treatment: string;
  doctor: DoctorId;
  location: LocationId;
  day: Date;
  /** Minutes after midnight. */
  start: number;
  minutes: number;
  /** Short, for lists: "Hechtingen verwijderen". */
  title: string;
  note: string;
};

/** The family's next appointments, on real open days counted from today. */
export function upcoming(today: Date): Upcoming[] {
  const eindhoven = LOCATIONS.eindhoven;
  const weekOn = openDays(eindhoven, addDays(startOfDay(today), 7), 1)[0];
  const wednesday = openDays(eindhoven, addDays(startOfDay(today), 1), 6).find((d) => d.getDay() === 3) ?? addDays(today, 5);
  const crown = openDays(eindhoven, addDays(startOfDay(today), 95), 1)[0];
  return [
    { id: 'up-hechting', who: 'layla', treatment: 'implantaat', doctor: 'omar', location: 'eindhoven', day: weekOn, start: 10 * 60 + 30, minutes: 20, title: 'Hechtingen verwijderen', note: 'Hechtingen eruit en kijken hoe het geneest.' },
    { id: 'up-adam', who: 'adam', treatment: 'kind-controle', doctor: 'mahmoud', location: 'eindhoven', day: weekOn, start: 10 * 60 + 50, minutes: 20, title: 'Kindercontrole en fluoride', note: 'Meteen na mama, dezelfde ochtend.' },
    { id: 'up-sofia', who: 'sofia', treatment: 'beugel', doctor: 'ayman', location: 'eindhoven', day: wednesday, start: 15 * 60 + 30, minutes: 20, title: 'Beugelcontrole', note: 'Kies je elastiekjes vooraf in de app.' },
    { id: 'up-kroon', who: 'layla', treatment: 'kroon', doctor: 'omar', location: 'eindhoven', day: crown, start: 11 * 60, minutes: 60, title: 'Scan voor de kroon', note: 'De kroon op het implantaat wordt gemaakt.' },
  ];
}

// ------------------------------------------------------------------------------------------------- the prescription

export type Medicine = { id: string; name: string; dose: string; how: string; times: number[]; days: number; from: number; asNeeded?: boolean };

/** Demo: what Dr. Omar prescribed after the implant. Times are minutes after midnight; days count from the surgery. */
export const PRESCRIPTION: { by: DoctorId; daysAgo: number; meds: Medicine[] } = {
  by: 'omar',
  daysAgo: IMPLANT_DAYS_AGO,
  meds: [
    { id: 'ibuprofen', name: 'Ibuprofen 400 mg', dose: '1 tablet', how: 'Zo nodig, na het eten. Hooguit 3 keer per dag.', times: [8 * 60, 14 * 60, 20 * 60], days: 3, from: 0, asNeeded: true },
    { id: 'chx', name: 'Chloorhexidine 0,12 %', dose: '10 ml', how: 'Eén minuut spoelen, daarna een half uur niet eten of drinken.', times: [9 * 60, 21 * 60], days: 7, from: 1 },
  ],
};

/** Demo diary of the first days after the implant: pain and swelling 0 … 10 and 0 … 3. */
export const DIARY_SEED: { day: number; pain: number; swelling: number; note?: string }[] = [
  { day: 0, pain: 4, swelling: 1, note: 'Verdoving rond 14:00 uitgewerkt.' },
  { day: 1, pain: 5, swelling: 2 },
];

// ------------------------------------------------------------------------------------------------------- the money

/** Demo amounts, not Elite Smile's prices: the estimate for the crown on the implant. */
export const ESTIMATE = {
  id: 'begroting-36',
  title: 'Kroon op implantaat 36',
  by: 'omar' as DoctorId,
  lines: [
    { label: 'Opbouw op het implantaat plaatsen', amount: 145 },
    { label: 'Kroon op het implantaat', amount: 410 },
    { label: 'Tandtechnisch werk (geschat)', amount: 620 },
    { label: 'Kleine röntgenfoto', amount: 21 },
  ],
};

export const INSURANCE = { name: 'Aanvullende tandartsverzekering', share: 0.75, limit: 500, used: 212 };

// -------------------------------------------------------------------------------------------- shade, braces, teeth

/** VITA classical, lightest to darkest by value: what a shade guide reads. */
export const VITA = ['B1', 'A1', 'B2', 'D2', 'A2', 'C1', 'C2', 'D4', 'A3', 'D3', 'B3', 'A3.5', 'B4', 'C3', 'A4', 'C4'];

/** Sofia's braces: the colours of the elastics she picked at each visit (days ago). */
export const ELASTICS: { daysAgo: number; colors: string[] }[] = [
  { daysAgo: 210, colors: ['#234282', '#2DB4E8'] },
  { daysAgo: 161, colors: ['#8E7CF8'] },
  { daysAgo: 112, colors: ['#17BFA3', '#FFFFFF'] },
  { daysAgo: 63, colors: ['#FF7AA8', '#FFFFFF'] },
  { daysAgo: 14, colors: ['#2DB4E8'] },
];

/** Adam's teeth that went to the tooth fairy (FDI, days ago). */
export const LOST_TEETH: { tooth: number; daysAgo: number }[] = [
  { tooth: 71, daysAgo: 230 },
  { tooth: 81, daysAgo: 190 },
  { tooth: 61, daysAgo: 6 },
];
