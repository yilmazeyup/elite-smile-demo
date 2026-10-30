import type { LocationId } from './clinic';
import type { DoctorId, RoomId } from './team';
import type { HealthFlag } from './treatments';

/**
 * The live link between the patient app and the clinic panel. Both are served from the same site, so they share the
 * browser's storage: what the patient does in the app (book, check in, ask for a pause, log pain, send a photo of the
 * wound, sign a consent) shows up on the panel at once, and what the clinic does (reply, offer an earlier place, run
 * late, move through the treatment steps) shows up in the app. Also when the two are open side by side on the start
 * page. Nothing leaves the browser.
 */

export type Who = 'layla' | 'sofia' | 'adam';

export type BridgeEvent = { id: string; /** Wall clock, ms. */ at: number } & (
  | { kind: 'booking'; who: Who; treatment: string; doctor: DoctorId; location: LocationId; day: string; start: number; minutes: number; ref: string }
  | { kind: 'cancel'; ref: string }
  | { kind: 'checkin'; who: Who; ref: string; room: RoomId; doctor: DoctorId }
  | { kind: 'called'; ref: string; room: RoomId }
  | { kind: 'step'; ref: string; step: number; of: number; label: string }
  | { kind: 'done'; ref: string }
  | { kind: 'pause'; who: Who; room: RoomId; doctor: DoctorId }
  | { kind: 'pause-ok'; room: RoomId; by: DoctorId }
  | { kind: 'phrase'; who: Who; room: RoomId; nl: string; text: string }
  | { kind: 'anxiety'; who: Who; level: number }
  | { kind: 'health'; who: Who; flags: HealthFlag[]; changed: boolean }
  | { kind: 'pain'; who: Who; day: number; pain: number; swelling: number; fever: boolean; bleeding: boolean; alert: boolean }
  | { kind: 'photo'; who: Who; day: number; thumb: string; note: string }
  | { kind: 'photo-reply'; photo: string; by: DoctorId; text: string; ok: boolean }
  | { kind: 'message'; who: Who; text: string }
  | { kind: 'reply'; by: DoctorId | 'nadia'; text: string }
  | { kind: 'consent'; who: Who; treatment: string; name: string }
  | { kind: 'estimate-ok'; who: Who; estimate: string }
  | { kind: 'waitlist'; who: Who; ref: string }
  | { kind: 'offer'; ref: string; day: string; start: number; doctor: DoctorId }
  | { kind: 'offer-taken'; ref: string; day: string; start: number }
  | { kind: 'delay'; doctor: DoctorId; minutes: number }
  | { kind: 'sos'; who: Who; level: 'bel' | '112' | 'thuis'; topic: string }
  | { kind: 'med'; who: Who; med: string; day: number; slot: number }
  | { kind: 'brush'; who: Who; seconds: number }
);

export type BridgeState = { events: BridgeEvent[] };

const KEY = 'elite-smile-demo-v1';
const CHANNEL = 'elite-smile-demo';
const EMPTY: BridgeState = { events: [] };

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

let channel: BroadcastChannel | null = null;
const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL);
  return channel;
};

export function readBridge(): BridgeState {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BridgeState>;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return EMPTY;
  }
}

function write(state: BridgeState) {
  // Photos are the heavy part: keep the newest few with their thumbnails, the rest without.
  let photos = 0;
  const events = state.events
    .slice(-220)
    .reverse()
    .map((e) => (e.kind === 'photo' && ++photos > 4 ? { ...e, thumb: '' } : e))
    .reverse();
  try {
    storage()?.setItem(KEY, JSON.stringify({ events }));
  } catch {
    // Private mode or storage full: the demo still works on this screen.
  }
  getChannel()?.postMessage('changed');
}

export function updateBridge(update: (state: BridgeState) => BridgeState) {
  write(update(readBridge()));
}

let seq = 0;

type NewEvent = BridgeEvent extends infer E ? (E extends BridgeEvent ? Omit<E, 'id' | 'at'> & { at?: number } : never) : never;

/** Adds what just happened; returns the event with its id. */
export function emit(event: NewEvent): BridgeEvent {
  const full = { at: Date.now(), ...event, id: `${event.kind}-${Date.now()}-${++seq}` } as BridgeEvent;
  updateBridge((s) => ({ ...s, events: [...s.events, full] }));
  return full;
}

/** Starts the demo over. */
export const resetBridge = () => write(EMPTY);

/** Calls back whenever the other screen changes something. */
export function onBridge(callback: (state: BridgeState) => void): () => void {
  const ch = getChannel();
  const onMessage = () => callback(readBridge());
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback(readBridge());
  };
  ch?.addEventListener('message', onMessage);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('storage', onStorage);
  return () => {
    ch?.removeEventListener('message', onMessage);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('storage', onStorage);
  };
}

/** The events of one kind, newest last. */
export function eventsOf<K extends BridgeEvent['kind']>(state: BridgeState, kind: K): Extract<BridgeEvent, { kind: K }>[] {
  return state.events.filter((e): e is Extract<BridgeEvent, { kind: K }> => e.kind === kind);
}

/** The app's own bookings that were not cancelled. */
export function appBookings(state: BridgeState) {
  const cancelled = new Set(eventsOf(state, 'cancel').map((e) => e.ref));
  const moved = new Map(eventsOf(state, 'offer-taken').map((e) => [e.ref, e]));
  return eventsOf(state, 'booking')
    .filter((b) => !cancelled.has(b.ref))
    .map((b) => {
      const m = moved.get(b.ref);
      return m ? { ...b, day: m.day, start: m.start } : b;
    });
}
