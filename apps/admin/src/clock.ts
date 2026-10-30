import { atMinute, clinicNow, LOCATIONS, minuteOf, offsetFrom, startOfDay, type LocationId } from '@smile/shared';
import { useEffect, useState } from 'react';

/** `?at=2026-10-31T11:00` (Eindhoven time) starts the clock at that moment and lets it run on from there. */
const OFFSET = offsetFrom(new URLSearchParams(window.location.search).get('at'));

/** "Speel de dag af": the whole open day (7½ hours) in under four minutes; the 3D figures still walk visibly. */
export const PLAY_SPEED = 120;
const TICK_MS = 250;

/** The clinic moment for a real moment: what the app shows too (same rules, same replayed day). */
export const clinicMomentAt = (real: Date, loc: LocationId) => clinicNow(real, OFFSET, loc).now;

/**
 * The panel's clock, the same as the app's: the real time in Eindhoven while the clinic is open, otherwise a replay of
 * the last open day at real speed. "Speel de dag af" runs the day from opening to closing fast; the 3D clinic gets the
 * speed too, so people walk smoothly between ticks.
 */
export function useClinicClock(loc: LocationId) {
  const [clock, setClock] = useState(() => clinicNow(new Date(), OFFSET, loc));
  const [play, setPlay] = useState<{ from: Date; started: number } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    setClock(clinicNow(new Date(), OFFSET, loc));
    setPlay(null);
  }, [loc]);

  useEffect(() => {
    if (play) return;
    const id = window.setInterval(() => setClock(clinicNow(new Date(), OFFSET, loc)), 1000);
    return () => window.clearInterval(id);
  }, [play, loc]);

  useEffect(() => {
    if (!play) return;
    const place = LOCATIONS[loc];
    const id = window.setInterval(() => {
      const moment = new Date(play.from.getTime() + (performance.now() - play.started) * PLAY_SPEED);
      if (minuteOf(moment) >= place.closes) setPlay(null);
      else setTick((n) => n + 1);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [play, loc]);

  const place = LOCATIONS[loc];
  const now = play ? new Date(play.from.getTime() + (performance.now() - play.started) * PLAY_SPEED) : clock.now;
  const minute = minuteOf(now);
  const progress = Math.max(0, Math.min(1, (minute - place.opens) / (place.closes - place.opens)));
  return {
    now,
    minute,
    /** Clinic minutes per real minute, for smooth motion between ticks. */
    speed: play ? PLAY_SPEED : 1,
    demo: play ? true : clock.demo,
    reason: play ? ('play' as const) : clock.reason,
    playing: !!play,
    progress,
    play: () => setPlay({ from: atMinute(startOfDay(clock.now), place.opens), started: performance.now() }),
    stop: () => setPlay(null),
  };
}

export type ClinicClockState = ReturnType<typeof useClinicClock>;
