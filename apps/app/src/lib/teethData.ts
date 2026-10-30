import {
  addDays,
  dateShort,
  doctorById,
  HISTORY,
  IMPLANT_DAYS_AGO,
  laylaTeeth,
  monthLong,
  TOOTH_STATUS,
  upcoming,
  type DoctorId,
  type ExplainerId,
  type PastVisit,
  type Tooth,
  type ToothStatus,
} from '@smile/shared';

/**
 * Layla's teeth worked out for the screens: a status tag per tooth for the site plan ("klaar", "in behandeling", a
 * date), the story of each tooth from the history, its next step, which 3D explainer fits it, and the demo implant
 * passport. All demo: a fictional patient.
 */

export type PlanTone = 'klaar' | 'bezig' | 'gepland' | 'weg' | 'gezond';

export type PlanTag = { label: string; sub?: string; tone: PlanTone };

export const PLAN_TONES: Record<PlanTone, { label: string; color: string }> = {
  klaar: { label: 'Klaar', color: '#12A27A' },
  bezig: { label: 'In behandeling', color: '#8E7CF8' },
  gepland: { label: 'Gepland', color: '#E0901A' },
  weg: { label: 'Ontbreekt', color: '#9AA6BF' },
  gezond: { label: 'Gezond', color: '#2DB4E8' },
};

/** Statuses an adult chart uses, in the order of the legend. */
export const ADULT_STATUSES: ToothStatus[] = ['gezond', 'vulling', 'kroon', 'wortelkanaal', 'implantaat', 'aandacht', 'ontbreekt'];

export const statusOf = (s: ToothStatus) => TOOTH_STATUS[s];

/** "mei 2025": the month and year a tooth was treated, from days ago. */
export function sinceLabel(daysAgo: number, today: Date): string {
  const d = addDays(today, -daysAgo);
  return `${monthLong(d)} ${d.getFullYear()}`;
}

export function crownDay(today: Date): Date {
  return upcoming(today).find((u) => u.id === 'up-kroon')?.day ?? addDays(today, 95);
}

export function stitchesDay(today: Date): Date {
  return upcoming(today).find((u) => u.id === 'up-hechting')?.day ?? addDays(today, 7);
}

/** The site-plan tag of a tooth. */
export function planTag(t: Tooth, today: Date): PlanTag | null {
  switch (t.status) {
    case 'implantaat':
      return { label: 'In behandeling', sub: `kroon ${dateShort(crownDay(today))}`, tone: 'bezig' };
    case 'kroon':
      return { label: 'Klaar', sub: t.since ? `kroon ${addDays(today, -t.since).getFullYear()}` : 'kroon', tone: 'klaar' };
    case 'vulling':
      return { label: 'Klaar', sub: `vulling ${t.surfaces ?? ''}`.trim(), tone: 'klaar' };
    case 'wortelkanaal':
      return { label: 'Klaar', sub: 'wortelkanaal', tone: 'klaar' };
    case 'aandacht':
      return { label: 'Gepland', sub: 'bij controle', tone: 'gepland' };
    case 'ontbreekt':
      return { label: 'Ontbreekt', sub: '2019', tone: 'weg' };
    default:
      return null;
  }
}

/** Visits that touched this tooth, newest first. */
export function toothHistory(n: number): PastVisit[] {
  return HISTORY.filter((h) => h.who === 'layla' && h.tooth === n).sort((a, b) => a.daysAgo - b.daysAgo);
}

const VISIT_TITLE: Record<string, string> = {
  controle: 'Controle',
  reiniging: 'Reiniging',
  vulling: 'Vulling',
  extractie: 'Kies getrokken',
  bot: 'Botopbouw',
  implantaat: 'Implantaat geplaatst',
  kroon: 'Kroon geplaatst',
  wortelkanaal: 'Wortelkanaalbehandeling',
};

export const visitTitle = (treatment: string) => VISIT_TITLE[treatment] ?? treatment;

/**
 * The story of one tooth as moments: from the history, plus what the chart itself says (the crown of 46 and its root
 * canal predate this app's history).
 */
export function toothStory(t: Tooth, today: Date): { title: string; text: string; when: Date; by?: DoctorId }[] {
  const items: { title: string; text: string; when: Date; by?: DoctorId }[] = toothHistory(t.n).map((h) => ({ title: visitTitle(h.treatment), text: h.note, when: addDays(today, -h.daysAgo), by: h.doctor }));
  if (t.status === 'kroon' && t.since) {
    items.push({ title: 'Kroon geplaatst', text: 'Een zirkonia kroon beschermt de tand na de wortelkanaalbehandeling.', when: addDays(today, -t.since), by: t.by });
    items.push({ title: 'Wortelkanaalbehandeling', text: 'De ontstoken zenuw is verwijderd en de kanalen zijn gereinigd en gevuld.', when: addDays(today, -t.since - 21), by: t.by });
  }
  if (t.status === 'vulling' && t.since && !items.some((i) => i.title === 'Vulling')) items.push({ title: 'Vulling', text: t.note ?? '', when: addDays(today, -t.since), by: t.by });
  if (t.status === 'aandacht' && t.since) items.push({ title: 'Gezien bij controle', text: t.note ?? '', when: addDays(today, -t.since), by: t.by });
  if (t.status === 'ontbreekt') items.push({ title: 'Verstandskies getrokken', text: 'Getrokken in 2019, vóór je bij Elite Smile kwam.', when: new Date(2019, 5, 1) });
  return items.sort((a, b) => b.when.getTime() - a.when.getTime());
}

/** What comes next for a tooth. */
export function nextStep(t: Tooth, today: Date): { title: string; text: string; when?: Date; route?: string } {
  switch (t.status) {
    case 'implantaat':
      return { title: 'Hechtingen eruit', text: 'Dr. Omar haalt de hechtingen weg en kijkt hoe het tandvlees geneest. Daarna groeit het implantaat 3 tot 6 maanden vast in het bot.', when: stitchesDay(today), route: '/nazorg' };
    case 'kroon':
      return { title: 'Gewoon controleren', text: 'Bij je controle kijkt de tandarts naar de rand van de kroon en af en toe met een foto naar de wortelpunten.' };
    case 'vulling':
      return { title: 'Schoonhouden', text: 'Poets goed langs de rand van de vulling en gebruik ragers of floss tussen je tanden.' };
    case 'aandacht':
      return { title: 'Opnieuw kijken bij je controle', text: 'Een verkleurd groefje is vaak alleen aanslag. Bij de volgende controle kijkt de tandarts of het zo blijft. Nu hoef je niets te doen.' };
    case 'ontbreekt':
      return { title: 'Niets te doen', text: 'Verstandskiezen hoeven niet vervangen te worden. De plek is mooi genezen.' };
    default:
      return { title: 'Zo houden', text: 'Twee keer per dag twee minuten poetsen met fluoridetandpasta, één keer per dag tussen je tanden.' , route: '/poetsen' };
  }
}

/** The 3D explainer that fits a tooth. */
export function explainerFor(t: Tooth): ExplainerId | null {
  switch (t.status) {
    case 'implantaat':
      return 'implantaat';
    case 'kroon':
      return 'kroon';
    case 'wortelkanaal':
      return 'wortelkanaal';
    case 'vulling':
    case 'aandacht':
      return 'vulling';
    default:
      return null;
  }
}

export const EXPLAINERS: { id: ExplainerId; title: string; sub: string; consent: string; icon: 'implant' | 'tooth' | 'crown' | 'sparkle' | 'drop' | 'braces'; color: string }[] = [
  { id: 'implantaat', title: 'Implantaat', sub: 'Van schroef tot kroon, onderdeel voor onderdeel', consent: 'implantaat', icon: 'implant', color: '#8E7CF8' },
  { id: 'wortelkanaal', title: 'Wortelkanaal', sub: 'Hoe je eigen tand gered wordt', consent: 'wortelkanaal', icon: 'tooth', color: '#4F6BED' },
  { id: 'kroon', title: 'Kroon', sub: 'Een nieuwe buitenkant voor een zwakke tand', consent: 'kroon', icon: 'crown', color: '#C9A15B' },
  { id: 'facing', title: 'Facing', sub: 'Een dun schilfertje op de voorkant', consent: 'facings', icon: 'sparkle', color: '#2DB4E8' },
  { id: 'vulling', title: 'Vulling', sub: 'Een gaatje weg, een witte vulling erin', consent: 'vulling', icon: 'drop', color: '#17BFA3' },
  { id: 'beugel', title: 'Beugel', sub: 'Van scheef naar recht, stap voor stap', consent: 'beugel', icon: 'braces', color: '#FF6F61' },
];

export const explainerById = (id: string) => EXPLAINERS.find((e) => e.id === id) ?? EXPLAINERS[0];

/** Counts for the summary: own teeth, implants, and so on. */
export function chartSummary(teeth: Tooth[] = laylaTeeth()) {
  const by = (s: ToothStatus) => teeth.filter((t) => t.status === s).length;
  const own = teeth.filter((t) => t.status !== 'ontbreekt' && t.status !== 'implantaat').length;
  return { own, implant: by('implantaat'), missing: by('ontbreekt'), fillings: by('vulling'), crowns: by('kroon'), watch: by('aandacht'), healthy: by('gezond') };
}

// ----------------------------------------------------------------------------------------------- implant passport

export const PASSPORT = {
  region: 36,
  diameter: '4,1',
  length: '10',
  material: 'Titanium graad 4',
  surface: 'Gezandstraald en geëtst (demo)',
  connection: 'Inwendige zeskant',
  brand: 'Demo-implantaat',
  lot: 'DEMO-36',
  ref: 'DM-4110',
  torque: '35 Ncm',
  graftDaysBefore: 95,
  by: 'omar' as DoctorId,
};

export function passportDates(today: Date) {
  const placed = addDays(today, -IMPLANT_DAYS_AGO);
  // the graft as the history has it (the same visit as the extraction)
  const graftVisit = HISTORY.find((h) => h.who === 'layla' && h.treatment === 'bot');
  return { placed, graft: graftVisit ? addDays(today, -graftVisit.daysAgo) : addDays(placed, -PASSPORT.graftDaysBefore), crown: crownDay(today) };
}

export const doctorName = (id?: DoctorId) => (id ? doctorById(id).name : '');
