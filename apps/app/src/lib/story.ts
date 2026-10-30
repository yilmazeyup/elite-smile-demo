import {
  addDays,
  atMinute,
  careOf,
  doctorById,
  isOpenAt,
  LOCATIONS,
  minuteOf,
  nextOpening,
  PRESCRIPTION,
  startOfDay,
  treatmentById,
  upcoming,
  type AfterStep,
  type DoctorId,
  type LocationId,
  type MemberId,
  type Upcoming,
} from '@smile/shared';

import type { Saved } from '../state/app';

/**
 * The demo story worked out for a moment: Layla's next appointments (the family's and the ones she booked in this
 * app), what she has to do today after her implant, and how the clinic is doing right now.
 */

export type Appointment = Upcoming & { mine?: boolean; ref: string };

/** The family's next appointments plus the ones booked in the app, soonest first. */
export function nextAppointments(today: Date, booked: { ref: string; who: MemberId; treatment: string; doctor: DoctorId; location: LocationId; day: string; start: number; minutes: number }[]): Appointment[] {
  const story: Appointment[] = upcoming(today).map((u) => ({ ...u, ref: u.id }));
  const mine: Appointment[] = booked.map((b) => ({
    id: b.ref,
    ref: b.ref,
    who: b.who,
    treatment: b.treatment,
    doctor: b.doctor,
    location: b.location,
    day: startOfDay(new Date(`${b.day}T12:00:00`)),
    start: b.start,
    minutes: b.minutes,
    title: treatmentById(b.treatment).name,
    note: '',
    mine: true,
  }));
  return [...story, ...mine].sort((a, b) => atMinute(a.day, a.start).getTime() - atMinute(b.day, b.start).getTime());
}

export const startOf = (a: Appointment) => atMinute(a.day, a.start);

export type Task = { id: string; at: number; title: string; sub: string; icon: 'pill' | 'drop' | 'pulse' | 'snow' | 'bowl' | 'brush' | 'camera'; route?: string; done: boolean };

/** Today's care for Layla: the medicines on her prescription, her diary, the salt rinse and the photo check. */
export function todayTasks(saved: Saved, now: Date, careDay: number): Task[] {
  const tasks: Task[] = [];
  for (const med of PRESCRIPTION.meds) {
    if (careDay < med.from || careDay >= med.from + med.days) continue;
    med.times.forEach((t, slot) => {
      const key = `${med.id}-${careDay}-${slot}`;
      tasks.push({ id: key, at: t, title: med.name, sub: med.asNeeded ? 'Zo nodig' : med.dose, icon: med.id === 'chx' ? 'drop' : 'pill', route: '/medicijnen', done: Boolean(saved.meds[key]) });
    });
  }
  tasks.push({ id: `dagboek-${careDay}`, at: 19 * 60, title: 'Pijndagboek', sub: `Dag ${careDay}`, icon: 'pulse', route: '/dagboek', done: saved.diary.some((d) => d.day === careDay) });
  if (careDay >= 1) tasks.push({ id: `zout-${careDay}`, at: 13 * 60, title: 'Zout water spoelen', sub: 'Na het eten, voorzichtig', icon: 'drop', route: '/nazorg', done: Boolean(saved.checks[`zout-${careDay}`]) });
  if (careDay === 2 || careDay === 3) tasks.push({ id: `foto-${careDay}`, at: 18 * 60, title: 'Foto van de wond', sub: 'Dr. Omar kijkt mee', icon: 'camera', route: '/foto', done: saved.photos.some((p) => p.day === careDay) });
  return tasks.sort((a, b) => a.at - b.at);
}

/** The aftercare steps that are due by now, for a treatment that ended at `ended`. */
export function dueSteps(steps: AfterStep[], ended: Date, now: Date): { step: AfterStep; at: Date; due: boolean }[] {
  return steps.map((step) => {
    const at = new Date(ended.getTime() + step.at * 60000);
    return { step, at, due: at.getTime() <= now.getTime() };
  });
}

/** When the implant surgery ended (demo: 10:45 on the implant day). */
export const surgeryEnd = (implantDay: Date) => atMinute(implantDay, 10 * 60 + 45);

export const implantCare = () => careOf(treatmentById('implantaat'));

/** The clinic right now: open or when it opens, for each location. */
export function clinicStatus(now: Date) {
  return (['eindhoven', 'hoogland'] as LocationId[]).map((id) => {
    const loc = LOCATIONS[id];
    const open = isOpenAt(loc, now);
    const next = nextOpening(loc, now);
    return { loc, open, next, closesIn: open ? loc.closes - minuteOf(now) : 0 };
  });
}

export const doctorName = (id: DoctorId) => doctorById(id).name;

/** Pain that rises again after day 3, a fever, or bleeding that won't stop: reasons to call. */
export function diaryAlert(entries: { day: number; pain: number; fever: boolean; bleeding: boolean }[]): string | null {
  const last = entries[entries.length - 1];
  if (!last) return null;
  if (last.bleeding) return 'Het blijft bloeden: bel de kliniek.';
  if (last.fever) return 'Koorts na een ingreep: bel de kliniek.';
  const prev = entries.filter((e) => e.day < last.day).pop();
  if (last.day >= 3 && prev && last.pain > prev.pain) return 'De pijn neemt na dag 3 weer toe. Dat kan een droge kom of een ontsteking zijn: bel de kliniek.';
  if (last.pain >= 8) return 'Veel pijn: bel de kliniek, dan kijken we samen wat nodig is.';
  return null;
}

export const dayAfter = (implantDay: Date, n: number) => addDays(implantDay, n);
