import { LOCATIONS, isOpenAt, lastOpenDay, type LocationId } from './clinic';
import { atMinute, minuteOf } from './format';

export type ClinicClock = {
  now: Date;
  /** False while the clinic is really open and the demo follows the real clock. */
  demo: boolean;
  reason: 'live' | 'closed' | 'set';
};

const ZONE = 'Europe/Amsterdam';

/** Minutes the clinic's time zone is ahead of UTC at `date`. */
function zoneOffset(date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

/**
 * The time on the wall in Eindhoven, as a Date whose local hours and minutes read as the clinic's: the demo can be
 * opened anywhere (Istanbul, Amsterdam) and still shows the clinic's own clock.
 */
export function wallClock(real: Date = new Date()): Date {
  return new Date(real.getTime() + (zoneOffset(real) + real.getTimezoneOffset()) * 60000);
}

/** "2026-10-30T10:20" (seconds optional), in clinic time, as an offset from the wall clock; 0 when absent. */
export function offsetFrom(at: string | null | undefined, real: Date = new Date()): number {
  if (!at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(at)) return 0;
  const moment = new Date(at).getTime();
  return Number.isNaN(moment) ? 0 : moment - wallClock(real).getTime();
}

/**
 * The clinic's clock, the same in the app and the panel. While the Eindhoven clinic is open (Sun, Wed, Fri, Sat
 * 09:30–17:00) it is the real time there. Otherwise the demo replays the last open day from opening to closing at real
 * speed, so the chairs are always busy and both screens show the same moment.
 */
export function clinicNow(real: Date = new Date(), offset = 0, loc: LocationId = 'eindhoven'): ClinicClock {
  const wall = wallClock(real);
  const place = LOCATIONS[loc];
  if (offset) return { now: new Date(wall.getTime() + offset), demo: true, reason: 'set' };
  if (isOpenAt(place, wall)) return { now: wall, demo: false, reason: 'live' };
  const day = lastOpenDay(place, wall);
  const length = place.closes - place.opens;
  const minute = place.opens + (minuteOf(wall) % length);
  return { now: atMinute(day, minute), demo: true, reason: 'closed' };
}

// ---------------------------------------------------------------------------------------------------------- the sun

const rad = Math.PI / 180;

function sunEvent(day: Date, lat: number, lon: number, rise: boolean): number {
  const start = new Date(day.getFullYear(), 0, 0);
  const n = Math.floor((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - start.getTime()) / 86400000);
  const gamma = ((2 * Math.PI) / 365) * (n - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  const ha = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;
  const utc = 720 - 4 * (lon + (rise ? ha : -ha)) - eqTime;
  const offset = zoneOffset(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12)));
  return (utc + offset + 1440) % 1440;
}

/** Sunset and sunrise in Eindhoven, minutes after midnight (NOAA's approximation). */
export const sunsetMinute = (day: Date) => sunEvent(day, LOCATIONS.eindhoven.lat, LOCATIONS.eindhoven.lon, false);
export const sunriseMinute = (day: Date) => sunEvent(day, LOCATIONS.eindhoven.lat, LOCATIONS.eindhoven.lon, true);

/** True between sunset and sunrise in Eindhoven. */
export function isDark(now: Date): boolean {
  const m = minuteOf(now);
  return m >= sunsetMinute(now) || m < sunriseMinute(now);
}
