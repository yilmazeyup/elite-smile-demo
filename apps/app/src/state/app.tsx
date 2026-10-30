import {
  addDays,
  appBookings,
  clinicNow,
  emit,
  offsetFrom,
  onBridge,
  readBridge,
  startOfDay,
  wallClock,
  IMPLANT_DAYS_AGO,
  ME,
  type BridgeState,
  type ClinicClock,
  type HealthFlag,
  type MemberId,
} from '@smile/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

/**
 * The demo's memory on this device: who Layla is looking after right now (herself, Sofia or Adam), her pain diary, the
 * pills she ticked off, the checklists, her health answers, her brushing, the stickers, and so on. It lives in
 * localStorage, so the demo survives a reload; "Demo opnieuw" in Ik clears it. The clock is Eindhoven's wall clock
 * (with `?at=` to set another moment), and the bridge to the clinic panel is read live.
 */

export type DiaryEntry = { day: number; pain: number; swelling: number; fever: boolean; bleeding: boolean; at: number };

export type Saved = {
  member: MemberId;
  diary: DiaryEntry[];
  /** `${med}-${day}-${slot}` → taken at (ms). */
  meds: Record<string, number>;
  /** Checklist item id → done at (ms). */
  checks: Record<string, number>;
  flags: HealthFlag[];
  healthAt: number;
  anxiety: number;
  /** The stop signal agreed with the dentist. */
  signal: 'hand' | 'app';
  music: string;
  brushing: { at: number; seconds: number }[];
  skin: string;
  consents: Record<string, number>;
  estimateOk: number;
  shades: { at: number; shade: string }[];
  stickers: string[];
  waitlist: boolean;
  /** Sofia's choice for her next braces visit. */
  elastics: string[];
  photos: { at: number; day: number; thumb: string }[];
  /** Notifications on (demo). */
  push: boolean;
  /** Numbness timer: when the anaesthetic was given. */
  numbAt: number;
  numbFor: string;
  textScale: number;
  postcode: string;
};

const DEFAULTS: Saved = {
  member: 'layla',
  diary: [],
  meds: {},
  checks: {},
  flags: ME.flags,
  healthAt: 0,
  anxiety: ME.anxiety,
  signal: 'hand',
  music: '',
  brushing: [],
  skin: 'navy',
  consents: {},
  estimateOk: 0,
  shades: [],
  stickers: ['eerste-bezoek', 'dapper'],
  waitlist: false,
  elastics: [],
  photos: [],
  push: true,
  numbAt: 0,
  numbFor: '',
  textScale: 1,
  postcode: ME.postcode,
};

const KEY = 'smile-app-v1';

function load(): Saved {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function save(s: Saved) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private windows or a full disk: the demo keeps working until the page reloads.
  }
}

export const resetSaved = () => {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
};

const offset = (() => {
  try {
    return offsetFrom(new URLSearchParams(globalThis.location?.search ?? '').get('at'));
  } catch {
    return 0;
  }
})();

/** Eindhoven's wall clock, moved by `?at=` when set. */
export const appNow = () => new Date(wallClock().getTime() + offset);

/** A moment stamped with Date.now() (real time), as Eindhoven's wall clock shows it. */
export const toWall = (ms: number) => new Date(ms + (appNow().getTime() - Date.now()));

/** The clinic's clock (live while open, a replay of the last open day otherwise). */
export const clockNow = (): ClinicClock => clinicNow(new Date(), offset);

type AppState = {
  now: Date;
  today: Date;
  clinic: ClinicClock;
  bridge: BridgeState;
  saved: Saved;
  update: (change: Partial<Saved> | ((s: Saved) => Partial<Saved>)) => void;
  /** Days since the implant went in (0 on the day itself). */
  careDay: number;
  implantDay: Date;
  bookings: ReturnType<typeof appBookings>;
};

const Context = createContext<AppState | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [now, setNow] = useState(appNow);
  const [clinic, setClinic] = useState(clockNow);
  const [bridge, setBridge] = useState<BridgeState>(readBridge);
  const [saved, setSaved] = useState<Saved>(load);
  const latest = useRef(saved);
  latest.current = saved;

  useEffect(() => {
    const t = setInterval(() => {
      setNow(appNow());
      setClinic(clockNow());
    }, 15000);
    const off = onBridge(setBridge);
    return () => {
      clearInterval(t);
      off();
    };
  }, []);

  const update = useCallback((change: Partial<Saved> | ((s: Saved) => Partial<Saved>)) => {
    const next = { ...latest.current, ...(typeof change === 'function' ? change(latest.current) : change) };
    latest.current = next;
    save(next);
    setSaved(next);
  }, []);

  const today = startOfDay(now);
  const implantDay = addDays(today, -IMPLANT_DAYS_AGO);
  const careDay = IMPLANT_DAYS_AGO;
  const bookings = useMemo(() => appBookings(bridge), [bridge]);

  const value = useMemo<AppState>(
    () => ({ now, today, clinic, bridge, saved, update, careDay, implantDay, bookings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, clinic, bridge, saved, update, bookings],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

/** A clock that ticks every `ms` for the component that asks (timers, countdowns), without redrawing the whole app. */
export function useTick(ms = 1000): Date {
  const [t, setT] = useState(appNow);
  useEffect(() => {
    const id = setInterval(() => setT(appNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

export { emit };
