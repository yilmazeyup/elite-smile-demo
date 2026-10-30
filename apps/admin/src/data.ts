import {
  appBookings,
  atMinute,
  clock as hhmm,
  dateKey,
  dayShort,
  dayVisits,
  doctorById,
  DOCTORS,
  eventsOf,
  FAMILY,
  freeSlots,
  hash,
  healthFlagById,
  LOCATIONS,
  LUNCH,
  ME,
  memberById,
  minuteOf,
  onBridge,
  readBridge,
  roomById,
  ROOMS,
  STEPS,
  treatmentById,
  type BridgeEvent,
  type BridgeState,
  type Doctor,
  type DoctorId,
  type HealthFlag,
  type LocationId,
  type Room,
  type RoomId,
  type Visit,
  type VisitState,
  type Who,
} from '@smile/shared';
import { useEffect, useMemo, useState } from 'react';

import { clinicMomentAt } from './clock';

/** The live link with the app: the state, and a refresh after the panel itself wrote something. */
export function useBridge(): { state: BridgeState; refresh: () => void } {
  const [state, setState] = useState<BridgeState>(readBridge);
  useEffect(() => onBridge(setState), []);
  return { state, refresh: () => setState(readBridge()) };
}

/** Only what happened in the app in the last hours moves people in the clinic; older demo clicks stay in the rail. */
const FRESH_MS = 4 * 60 * 60 * 1000;

/** A visit as the panel sees it: the seeded agenda with the chair's real rhythm, plus what the app added. */
export type PanelVisit = Visit & {
  /** When the chair really starts and ends (minutes after midnight), after earlier visits that ran over. */
  begin: number;
  end: number;
  /** From the app: the treatment step the dentist reported, and the family member. */
  stepOverride?: { step: number; of: number; label: string };
  who?: Who;
};

export type Moment = { state: VisitState; progress: number; step: number; steps: string[]; stepLabel: string; left: number };

/** Where a visit stands at minute `m`, with the step the dentist is on and the minutes left in the chair. */
export function momentOf(v: PanelVisit, m: number): Moment {
  const steps = STEPS[treatmentById(v.treatment).care];
  const base = { steps, left: 0 };
  if (v.noShow) return { ...base, state: m > v.start + 10 ? 'no-show' : 'gepland', progress: 0, step: 0, stepLabel: steps[0] };
  if (m < v.arrive) return { ...base, state: 'gepland', progress: 0, step: 0, stepLabel: steps[0] };
  if (m < v.begin) return { ...base, state: 'wachtkamer', progress: 0, step: 0, stepLabel: steps[0], left: v.end - v.begin };
  if (m < v.end) {
    const progress = (m - v.begin) / (v.end - v.begin);
    const auto = Math.min(steps.length - 1, Math.floor(progress * steps.length));
    const o = v.stepOverride;
    const step = o ? Math.min(o.step, o.of) - 1 : auto;
    return { state: 'in-stoel', progress, step, steps: o ? Array.from({ length: o.of }, (_, i) => (i === step ? o.label : steps[i] ?? o.label)) : steps, stepLabel: o ? o.label : steps[auto], left: Math.max(1, Math.ceil(v.end - m)) };
  }
  return { ...base, state: 'klaar', progress: 1, step: steps.length - 1, stepLabel: steps[steps.length - 1] };
}

/** "Elif van Dijk" → "Elif D.": the first name and the initial of the surname, as on a waiting-room screen. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toLocaleUpperCase('nl')}.`;
}

/** The family member as a patient of the clinic (fictional), with what she told the app about her health. */
function familyPatient(who: Who, state: BridgeState) {
  const member = memberById(who);
  const health = eventsOf(state, 'health').filter((e) => e.who === who).pop();
  const anxiety = eventsOf(state, 'anxiety').filter((e) => e.who === who).pop();
  const flags: HealthFlag[] = health ? health.flags : who === 'layla' ? ME.flags : [];
  return { id: who, name: member.name, age: member.age, lang: 'nl' as const, flags, anxiety: anxiety ? anxiety.level : who === 'layla' ? ME.anxiety : 0, firstVisit: false };
}

const roomFor = (doctor: DoctorId, loc: LocationId): RoomId => (loc === 'eindhoven' ? doctorById(doctor).room : doctor === 'ahmad' ? 'k1' : 'k2');

export type ClinicDay = {
  day: Date;
  loc: LocationId;
  visits: PanelVisit[];
  /** Pauses asked for in the app that nobody has seen yet, by room. */
  pauses: Map<RoomId, Extract<BridgeEvent, { kind: 'pause' }>>;
  /** Minutes each dentist reported running late today ("Uitloop melden"). */
  delays: Partial<Record<DoctorId, number>>;
};

/**
 * The day in the clinic at minute `m`: the seeded agenda, the app's bookings for this day, and what the app did in
 * the last hours (check-ins, calls, steps, pauses, delays). Each dentist's chair runs in order: a visit that runs
 * over pushes the next one, so two patients never share a chair.
 */
export function buildDay(day: Date, loc: LocationId, state: BridgeState, m: number): ClinicDay {
  const key = dateKey(day);
  const fresh = state.events.filter((e) => Date.now() - e.at < FRESH_MS);
  const minuteAt = (e: BridgeEvent) => Math.min(m, minuteOf(clinicMomentAt(new Date(e.at), loc)));

  // Most people come a few minutes early (seeded per visit), so the waiting room is never empty for long.
  const seeded: PanelVisit[] = dayVisits(day, loc).map((v) => ({ ...v, arrive: Math.min(v.arrive, v.start - 2 - (hash(v.id) % 11)), begin: v.start + v.delay, end: v.start + v.delay + v.minutes }));
  const mine: PanelVisit[] = appBookings(state)
    .filter((b) => b.location === loc && b.day.slice(0, 10) === key)
    .map((b) => ({
      id: b.ref,
      patient: familyPatient(b.who, state),
      treatment: b.treatment,
      doctor: b.doctor,
      room: roomFor(b.doctor, loc),
      start: b.start,
      minutes: b.minutes,
      arrive: b.start - 8,
      noShow: false,
      delay: 0,
      source: 'app' as const,
      mine: true,
      who: b.who,
      begin: b.start,
      end: b.start + b.minutes,
    }));
  const visits = [...seeded, ...mine];
  const byId = new Map(visits.map((v) => [v.id, v]));

  // Checked in with the app: in the waiting room from that moment; without a booking today, in the next free place.
  for (const e of fresh) {
    if (e.kind !== 'checkin') continue;
    const at = minuteAt(e);
    const v = byId.get(e.ref);
    if (v) {
      v.arrive = at;
      continue;
    }
    const booking = eventsOf(state, 'booking').find((b) => b.ref === e.ref);
    const treatment = booking?.treatment ?? 'controle';
    const minutes = booking?.minutes ?? treatmentById(treatment).minutes;
    const slot = freeSlots(day, e.doctor, minutes, mine, Math.ceil((at + 6) / 5) * 5, loc)[0] ?? Math.ceil(at + 10);
    const walkIn: PanelVisit = {
      id: e.ref,
      patient: familyPatient(e.who, state),
      treatment,
      doctor: e.doctor,
      room: loc === 'eindhoven' ? e.room : roomFor(e.doctor, loc),
      start: slot,
      minutes,
      arrive: at,
      noShow: false,
      delay: 0,
      source: 'app',
      mine: true,
      who: e.who,
      begin: slot,
      end: slot + minutes,
    };
    visits.push(walkIn);
    byId.set(walkIn.id, walkIn);
  }

  // Each dentist's reported delays push their visits from that moment on.
  const delays: Partial<Record<DoctorId, number>> = {};
  for (const e of fresh) {
    if (e.kind !== 'delay') continue;
    const at = minuteAt(e);
    delays[e.doctor] = (delays[e.doctor] ?? 0) + e.minutes;
    for (const v of visits) if (v.doctor === e.doctor && v.start + v.minutes > at) v.begin += e.minutes;
  }

  // The chair's rhythm: in order per dentist, a visit starts when the previous one is done.
  visits.sort((a, b) => a.start - b.start || (a.mine ? 1 : 0) - (b.mine ? 1 : 0));
  const free: Partial<Record<DoctorId, number>> = {};
  for (const v of visits) {
    if (v.noShow) continue;
    const begin = Math.max(v.begin, free[v.doctor] ?? 0);
    v.begin = begin;
    v.end = begin + v.minutes;
    v.delay = begin - v.start;
    free[v.doctor] = v.end;
  }

  // Called in, steps and done, as the dentist (or the app's demo) reported them.
  for (const e of fresh) {
    if (e.kind === 'called') {
      const v = byId.get(e.ref);
      if (!v) continue;
      const at = minuteAt(e);
      v.begin = at;
      v.end = at + v.minutes;
      v.arrive = Math.min(v.arrive, at - 1);
    } else if (e.kind === 'step') {
      const v = byId.get(e.ref);
      if (v) v.stepOverride = { step: e.step, of: e.of, label: e.label };
    } else if (e.kind === 'done') {
      const v = byId.get(e.ref);
      if (v) v.end = Math.max(v.begin + 1, minuteAt(e));
    }
  }

  // Pauses wait until someone in the room has seen them.
  const pauses = new Map<RoomId, Extract<BridgeEvent, { kind: 'pause' }>>();
  for (const e of fresh) {
    if (e.kind === 'pause') pauses.set(loc === 'eindhoven' ? e.room : roomFor(e.doctor, loc), e);
    if (e.kind === 'pause-ok') pauses.delete(e.room);
  }
  return { day, loc, visits, pauses, delays };
}

/** The clinic day for the clock's moment; rebuilt when the minute or the bridge changes. */
export function useClinicDay(now: Date, loc: LocationId, state: BridgeState): ClinicDay {
  const minute = Math.floor(minuteOf(now));
  const key = dateKey(now);
  return useMemo(() => buildDay(atMinute(now, 0), loc, state, minute), [key, loc, state, minute]);
}

// ------------------------------------------------------------------------------------------------ rooms and doctors

export type RoomStatus = 'vrij' | 'bezig' | 'uitloop' | 'pauze' | 'lunch' | 'dicht';

export type RoomView = {
  room: Room;
  doctor: Doctor;
  status: RoomStatus;
  current: PanelVisit | null;
  moment: Moment | null;
  next: PanelVisit | null;
  /** Minutes the chair runs behind its agenda. */
  late: number;
  pause: Extract<BridgeEvent, { kind: 'pause' }> | null;
};

export const ROOM_STATUS: Record<RoomStatus, { label: string; color: string }> = {
  vrij: { label: 'Vrij', color: '#12A27A' },
  bezig: { label: 'Bezig', color: '#2DB4E8' },
  uitloop: { label: 'Uitloop', color: '#E0901A' },
  pauze: { label: 'Pauze gevraagd', color: '#E2434B' },
  lunch: { label: 'Lunch', color: '#8E7CF8' },
  dicht: { label: 'Dicht', color: '#7584A3' },
};

/** The rooms of a location: six in Eindhoven, two hygiene rooms in Hoogland (Dr. Ahmad and Dr. Najla in the demo). */
export function roomsOf(loc: LocationId): { room: Room; doctor: Doctor }[] {
  if (loc === 'eindhoven') return ROOMS.map((room) => ({ room, doctor: doctorById(room.doctor) }));
  return [
    { room: { ...roomById('k1'), name: 'Kamer 1', focus: 'Mondhygiëne', doctor: 'ahmad' }, doctor: doctorById('ahmad') },
    { room: { ...roomById('k2'), name: 'Kamer 2', focus: 'Mondhygiëne', doctor: 'najla' }, doctor: doctorById('najla') },
  ];
}

export function roomViews(d: ClinicDay, m: number): RoomView[] {
  const place = LOCATIONS[d.loc];
  const open = place.days.includes(d.day.getDay()) && m >= place.opens && m < place.closes;
  return roomsOf(d.loc).map(({ room, doctor }) => {
    const mine = d.visits.filter((v) => v.room === room.id && !v.noShow);
    const current = mine.find((v) => m >= v.begin && m < v.end) ?? null;
    const next = mine.find((v) => v.begin > m) ?? null;
    const pause = d.pauses.get(room.id) ?? null;
    const late = Math.max(0, Math.round((current ?? next)?.delay ?? 0));
    let status: RoomStatus = 'vrij';
    if (!open) status = 'dicht';
    else if (pause) status = 'pauze';
    else if (current) status = late >= 5 ? 'uitloop' : 'bezig';
    else if (m >= LUNCH.from && m < LUNCH.to) status = 'lunch';
    return { room, doctor, status, current, moment: current ? momentOf(current, m) : null, next, late, pause };
  });
}

export type Busy = 'vrij' | 'bezig' | 'vol';

export type DoctorNow = {
  doctor: Doctor;
  busy: Busy;
  /** The plumbob: green free or free soon, amber busy, red fully booked or running late. */
  color: string;
  current: PanelVisit | null;
  next: PanelVisit | null;
  /** The next free place of 15 minutes today, minutes after midnight. */
  nextFree: number | null;
  late: number;
  visits: PanelVisit[];
};

export const BUSY_COLORS: Record<Busy, string> = { vrij: '#22C38E', bezig: '#F2A531', vol: '#EF4A55' };

export function doctorNow(d: ClinicDay, id: DoctorId, m: number): DoctorNow {
  const doctor = doctorById(id);
  const visits = d.visits.filter((v) => v.doctor === id);
  const live = visits.filter((v) => !v.noShow);
  const current = live.find((v) => m >= v.begin && m < v.end) ?? null;
  const next = live.find((v) => v.begin > m) ?? null;
  const taken = live.map((v) => ({ start: v.begin, minutes: v.end - v.begin, doctor: id }));
  const slots = freeSlots(d.day, id, 15, taken, Math.ceil(m / 5) * 5, d.loc).filter((s) => !live.some((v) => s < v.end && s + 15 > v.begin));
  const nextFree = slots[0] ?? null;
  const late = Math.max(0, Math.round((current ?? next)?.delay ?? 0));
  const works = live.length > 0;
  let busy: Busy = 'vrij';
  if (current) busy = nextFree !== null && nextFree - m <= 20 ? 'vrij' : 'bezig';
  if (works && (late >= 8 || nextFree === null)) busy = 'vol';
  return { doctor, busy, color: BUSY_COLORS[busy], current, next, nextFree, late, visits };
}

// ------------------------------------------------------------------------------------------------- the event rail

export type Tone = 'info' | 'ok' | 'warn' | 'alert' | 'urgent';

export type EventIcon = 'calendar' | 'cancel' | 'door' | 'bell' | 'steps' | 'check' | 'hand' | 'eye' | 'chat' | 'heart' | 'shield' | 'pulse' | 'camera' | 'sign' | 'euro' | 'clock' | 'sos' | 'pill' | 'brush' | 'spark';

export type Described = { icon: EventIcon; tone: Tone; title: string; text?: string };

const who = (w: Who) => memberById(w).first;
const doc = (id: DoctorId) => doctorById(id).name;
const roomName = (id: RoomId) => roomById(id).name;
const atText = (day: string, start: number) => {
  const d = new Date(`${day.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? hhmm(atMinute(new Date(), start)) : `${dayShort(d)} ${hhmm(atMinute(d, start))}`;
};

/** A human Dutch line for everything the app can send (and what the panel sent back). */
export function describe(e: BridgeEvent, state: BridgeState): Described {
  switch (e.kind) {
    case 'booking':
      return { icon: 'calendar', tone: 'info', title: `${who(e.who)} boekte een afspraak`, text: `${treatmentById(e.treatment).name} bij ${doc(e.doctor)} · ${atText(e.day, e.start)} · ${LOCATIONS[e.location].short}` };
    case 'cancel': {
      const b = eventsOf(state, 'booking').find((x) => x.ref === e.ref);
      return { icon: 'cancel', tone: 'warn', title: b ? `${who(b.who)} zegde een afspraak af` : 'Afspraak afgezegd', text: b ? `${treatmentById(b.treatment).name} · ${atText(b.day, b.start)} · de plek is weer vrij` : 'De plek is weer vrij' };
    }
    case 'checkin':
      return { icon: 'door', tone: 'info', title: `${who(e.who)} is binnen`, text: `Ingecheckt met de app · wacht op ${doc(e.doctor)} (${roomName(e.room)})` };
    case 'called':
      return { icon: 'bell', tone: 'info', title: `Naar ${roomName(e.room)} geroepen`, text: 'De patiënt ziet het in de app' };
    case 'step':
      return { icon: 'steps', tone: 'info', title: `Stap ${e.step} van ${e.of}`, text: e.label };
    case 'done':
      return { icon: 'check', tone: 'ok', title: 'Behandeling klaar', text: 'De nazorg staat meteen in de app' };
    case 'pause':
      return { icon: 'hand', tone: 'alert', title: `${who(e.who)} vraagt om een pauze`, text: `${roomName(e.room)} · ${doc(e.doctor)}` };
    case 'pause-ok':
      return { icon: 'eye', tone: 'ok', title: `Pauze gezien door ${doc(e.by)}`, text: roomName(e.room) };
    case 'phrase':
      return { icon: 'chat', tone: 'info', title: `${who(e.who)} zegt: “${e.nl}”`, text: `${roomName(e.room)} · in de eigen taal: ${e.text}` };
    case 'anxiety':
      return { icon: 'heart', tone: e.level >= 2 ? 'warn' : 'info', title: e.level >= 2 ? `${who(e.who)} vindt het spannend` : `${who(e.who)} voelt zich rustig`, text: `Spanning ${e.level} van 3${e.level >= 2 ? ' · neem extra tijd en spreek een stopteken af' : ''}` };
    case 'health':
      return { icon: 'shield', tone: e.changed ? 'warn' : 'ok', title: e.changed ? `${who(e.who)} werkte de gezondheid bij` : `${who(e.who)}: gezondheid ongewijzigd`, text: e.flags.length ? e.flags.map((f) => healthFlagById(f).label).join(' · ') : 'Geen bijzonderheden' };
    case 'pain': {
      const detail = `${who(e.who)} · dag ${e.day} · pijn ${e.pain}/10 · zwelling ${e.swelling}/3${e.fever ? ' · koorts' : ''}${e.bleeding ? ' · bloeding' : ''}`;
      if (!e.alert) return { icon: 'pulse', tone: 'info', title: `${who(e.who)} vulde het pijndagboek in`, text: detail };
      const title = e.fever ? 'Koorts na de ingreep — bellen' : e.bleeding ? 'Bloeding gemeld — bellen' : 'Pijn neemt toe na dag 3 — bellen';
      return { icon: 'pulse', tone: 'alert', title, text: detail };
    }
    case 'photo':
      return { icon: 'camera', tone: 'warn', title: `${who(e.who)} stuurde een wondfoto`, text: `Dag ${e.day}${e.note ? ` · ${e.note}` : ''}` };
    case 'photo-reply':
      return { icon: e.ok ? 'check' : 'bell', tone: e.ok ? 'ok' : 'warn', title: `${doc(e.by)} beoordeelde de foto`, text: e.text };
    case 'message':
      return { icon: 'chat', tone: 'warn', title: `Bericht van ${who(e.who)}`, text: e.text };
    case 'reply':
      return { icon: 'chat', tone: 'ok', title: e.by === 'nadia' ? 'Nadia antwoordde' : `${doc(e.by)} antwoordde`, text: e.text };
    case 'consent':
      return { icon: 'sign', tone: 'ok', title: `${who(e.who)} tekende de toestemming`, text: `${treatmentById(e.treatment).name} · getekend als ${e.name}` };
    case 'estimate-ok':
      return { icon: 'euro', tone: 'ok', title: `${who(e.who)} keurde de begroting goed`, text: e.estimate };
    case 'waitlist': {
      const b = eventsOf(state, 'booking').find((x) => x.ref === e.ref);
      return { icon: 'clock', tone: 'warn', title: `${who(e.who)} wil eerder komen`, text: b ? `Op de wachtlijst · nu ${atText(b.day, b.start)} bij ${doc(b.doctor)}` : 'Op de wachtlijst voor een eerdere plek' };
    }
    case 'offer':
      return { icon: 'spark', tone: 'info', title: 'Eerdere plek aangeboden', text: `${atText(e.day, e.start)} bij ${doc(e.doctor)}` };
    case 'offer-taken':
      return { icon: 'check', tone: 'ok', title: 'De eerdere plek is genomen', text: atText(e.day, e.start) };
    case 'delay':
      return { icon: 'clock', tone: 'warn', title: `${doc(e.doctor)} loopt ${e.minutes} min uit`, text: 'Wie wacht, ziet het meteen in de app' };
    case 'sos':
      return {
        icon: 'sos',
        tone: 'urgent',
        title: e.level === '112' ? `${who(e.who)}: noodgeval — 112` : e.level === 'bel' ? `${who(e.who)} heeft met spoed hulp nodig` : `${who(e.who)} vraagt advies voor thuis`,
        text: e.topic,
      };
    case 'med':
      return { icon: 'pill', tone: 'info', title: `${who(e.who)} nam ${e.med}`, text: `Dag ${e.day} · volgens het voorschrift` };
    case 'brush':
      return { icon: 'brush', tone: 'ok', title: `${who(e.who)} poetste ${Math.round(e.seconds / 6) / 10} minuten`, text: 'Met de poetstimer in de app' };
  }
}

/** Whether the clinic already answered an event that asks for an answer. */
export function answered(e: BridgeEvent, state: BridgeState): boolean {
  const later = state.events.filter((x) => x.at >= e.at && x.id !== e.id);
  switch (e.kind) {
    case 'pause':
      return later.some((x) => x.kind === 'pause-ok' && x.room === e.room);
    case 'photo':
      return later.some((x) => x.kind === 'photo-reply' && x.photo === e.id);
    case 'message':
      return later.some((x) => x.kind === 'reply');
    case 'waitlist':
      return later.some((x) => x.kind === 'offer' && x.ref === e.ref);
    case 'pain':
      return !e.alert || later.some((x) => x.kind === 'reply');
    case 'sos':
      return later.some((x) => x.kind === 'reply');
    default:
      return true;
  }
}

/** When something happened, said shortly: "zojuist", "4 min", "13:05". */
export function since(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'zojuist';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min geleden`;
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The family, for the demo buttons that play a moment from the app. */
export const FAMILY_IDS = FAMILY.map((m) => m.id);

/** All dentists working at a location in the demo. */
export const doctorsAt = (loc: LocationId): Doctor[] => (loc === 'eindhoven' ? DOCTORS : DOCTORS.filter((d) => d.id === 'ahmad' || d.id === 'najla'));
