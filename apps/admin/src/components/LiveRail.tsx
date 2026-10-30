import {
  appBookings,
  dateKey,
  doctorById,
  emit,
  ESTIMATE,
  eventsOf,
  freeSlots,
  LOCATIONS,
  minuteOf,
  openDays,
  relativeDay,
  startOfDay,
  tr,
  treatmentById,
  type BridgeEvent,
  type BridgeState,
  type DoctorId,
  type LocationId,
} from '@smile/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { answered, describe, doctorsAt, since, type ClinicDay } from '../data';
import { Icon } from './Icon';
import { hm } from './ui';

type Props = {
  state: BridgeState;
  now: Date;
  loc: LocationId;
  day: ClinicDay;
  onChange: (toast?: { title: string; text?: string }) => void;
};

const TONE_ICON_BG: Record<string, string> = { info: 'var(--es-sky)', ok: 'var(--es-ok)', warn: 'var(--es-warn)', alert: 'var(--es-alert)', urgent: 'var(--es-alert)' };

/** A drawn wound photo for the demo (no real patient photo exists): gum, the healing cap and three stitches. */
function demoWoundPhoto(): string {
  const c = document.createElement('canvas');
  c.width = 220;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(110, 80, 10, 110, 80, 140);
  g.addColorStop(0, '#F3A5A8');
  g.addColorStop(1, '#B9575E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 220, 160);
  ctx.fillStyle = '#F7EFE6';
  for (const x of [30, 190]) {
    ctx.beginPath();
    ctx.ellipse(x, 70, 30, 44, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#D9DEE6';
  ctx.beginPath();
  ctx.arc(110, 78, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2B3550';
  ctx.lineWidth = 2;
  for (const x of [86, 110, 134]) {
    ctx.beginPath();
    ctx.moveTo(x - 6, 104);
    ctx.lineTo(x + 6, 116);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 11px Figtree, sans-serif';
  ctx.fillText(tr('Demo-foto'), 8, 152);
  return c.toDataURL('image/jpeg', 0.82);
}

/** Everything the app sends, newest first, with what the clinic can answer right there. */
export function LiveRail({ state, now, loc, day, onChange }: Props) {
  const [menu, setMenu] = useState(false);
  const events = [...state.events].reverse().slice(0, 40);
  const open = events.filter((e) => !answered(e, state)).length;
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  const doctorFor = (): DoctorId => (loc === 'eindhoven' ? 'omar' : 'ahmad');
  const roomFor = () => doctorById(doctorFor()).room;

  /** Plays one moment from the app, as Layla (or her children) would send it. */
  const play = (kind: string) => {
    setMenu(false);
    const doctor = doctorFor();
    const m = Math.floor(minuteOf(now));
    switch (kind) {
      case 'checkin':
        emit({ kind: 'checkin', who: 'layla', ref: `demo-${Date.now()}`, room: loc === 'eindhoven' ? roomFor() : 'k1', doctor });
        break;
      case 'booking': {
        // Today with whichever children's dentist has room, else the next open day.
        const kids: DoctorId[] = loc === 'eindhoven' ? ['mahmoud', 'najla'] : ['najla', 'ahmad'];
        const taken = appBookings(state).filter((b) => b.day.slice(0, 10) === dateKey(day.day));
        const after = Math.ceil((m + 15) / 5) * 5;
        let pick: { doctor: DoctorId; day: Date; start: number } | null = null;
        for (const minutes of [20, 15])
          for (const doctor of kids) {
            const slot: number | undefined = pick ? undefined : freeSlots(day.day, doctor, minutes, taken, after, loc)[0];
            if (slot !== undefined) pick = { doctor, day: day.day, start: slot };
          }
        if (!pick) {
          const next = openDays(LOCATIONS[loc], now, 2, true)[0];
          pick = { doctor: kids[0], day: next, start: freeSlots(next, kids[0], 20, [], 0, loc)[0] ?? 11 * 60 };
        }
        emit({ kind: 'booking', who: 'adam', treatment: 'kind-controle', doctor: pick.doctor, location: loc, day: dateKey(pick.day), start: pick.start, minutes: 20, ref: `demo-adam-${Date.now()}` });
        break;
      }
      case 'pause':
        emit({ kind: 'pause', who: 'layla', room: loc === 'eindhoven' ? roomFor() : 'k1', doctor });
        break;
      case 'pain':
        emit({ kind: 'pain', who: 'layla', day: 3, pain: 7, swelling: 2, fever: false, bleeding: false, alert: true });
        break;
      case 'photo':
        emit({ kind: 'photo', who: 'layla', day: 2, thumb: demoWoundPhoto(), note: tr('Rond de hechtingen, ziet het er goed uit?') });
        break;
      case 'message':
        emit({ kind: 'message', who: 'layla', text: tr('Mag ik vandaag weer sporten na het implantaat?') });
        break;
      case 'waitlist': {
        const target = openDays(LOCATIONS[loc], now, 6, true).pop() ?? now;
        const ref = `demo-sofia-${Date.now()}`;
        const orth = loc === 'eindhoven' ? 'ayman' : 'najla';
        emit({ kind: 'booking', who: 'sofia', treatment: 'beugel', doctor: orth, location: loc, day: dateKey(target), start: 15 * 60 + 30, minutes: 20, ref });
        emit({ kind: 'waitlist', who: 'sofia', ref });
        break;
      }
      case 'consent':
        emit({ kind: 'consent', who: 'layla', treatment: 'implantaat', name: 'Layla Benali' });
        break;
      case 'estimate':
        emit({ kind: 'estimate-ok', who: 'layla', estimate: tr(ESTIMATE.title) });
        break;
      case 'sos':
        emit({ kind: 'sos', who: 'layla', level: 'bel', topic: tr('Nabloeding die na 30 minuten bijten niet stopt') });
        break;
    }
    onChange();
  };

  return (
    <aside className="rail glass" aria-label="Live uit de app">
      <header className="rail-head">
        <div className="rail-title">
          <div className="kicker">
            <span className="pulse-dot" /> Live uit de app
          </div>
          <h2>
            {open ? (
              <>
                <span className="count">{open}</span> {open === 1 ? 'vraagt om actie' : 'vragen om actie'}
              </>
            ) : (
              'Alles bijgewerkt'
            )}
          </h2>
        </div>
        <div className="rail-menu" ref={menuRef}>
          <button className="btn small" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu">
            <Icon name="spark" size={14} />
            <span>Speel een moment</span>
          </button>
          {menu ? (
            <div className="menu glass" role="menu">
              <p className="menu-note">Demo: wat Layla en haar kinderen in de app doen</p>
              {[
                ['checkin', 'door', 'Layla checkt in'],
                ['booking', 'calendar', 'Adam wordt geboekt'],
                ['pause', 'hand', 'Layla vraagt om een pauze'],
                ['pain', 'pulse', 'Pijn neemt toe op dag 3'],
                ['photo', 'camera', 'Wondfoto na het implantaat'],
                ['message', 'chat', 'Een vraag in de chat'],
                ['waitlist', 'clock', 'Sofia wil eerder komen'],
                ['consent', 'sign', 'Toestemming getekend'],
                ['estimate', 'euro', 'Begroting goedgekeurd'],
                ['sos', 'sos', 'Spoed: nabloeding'],
              ].map(([kind, icon, label]) => (
                <button key={kind} role="menuitem" onClick={() => play(kind)}>
                  <Icon name={icon} size={15} />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <div className="rail-list">
        {events.length === 0 ? (
          <div className="rail-empty">
            <svg viewBox="0 0 120 120" aria-hidden>
              <rect x="38" y="14" width="44" height="86" rx="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M54 22h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="60" cy="56" r="12" fill="var(--es-ice)" />
              <path d="M54 56l4 4 8-8" fill="none" stroke="var(--es-sky)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <b>Nog niets uit de app</b>
            <span>Open de app ernaast, of speel hierboven een moment af. Alles verschijnt hier meteen, en in de kliniek in 3D.</span>
          </div>
        ) : (
          events.map((e) => <EventCard key={e.id} e={e} state={state} now={now} loc={loc} onChange={onChange} />)
        )}
      </div>
    </aside>
  );
}

function EventCard({ e, state, now, loc, onChange }: { e: BridgeEvent; state: BridgeState; now: Date; loc: LocationId; onChange: Props['onChange'] }) {
  const d = describe(e, state);
  const done = answered(e, state);
  const [text, setText] = useState('');
  const [by, setBy] = useState<DoctorId | 'nadia'>('nadia');
  const fresh = Date.now() - e.at < 8000;

  const reply = (who: DoctorId | 'nadia', message: string, toast: string) => {
    emit({ kind: 'reply', by: who, text: message });
    onChange({ title: toast, text: 'De patiënt ziet het meteen in de app' });
  };

  let actions: ReactNode = null;
  if (!done) {
    if (e.kind === 'pause') {
      actions = (
        <button
          className="btn small primary"
          onClick={() => {
            emit({ kind: 'pause-ok', room: e.room, by: e.doctor });
            onChange({ title: `${doctorById(e.doctor).name} heeft de pauze gezien`, text: 'Layla ziet het meteen in de app' });
          }}
        >
          <Icon name="eye" size={14} />
          Gezien
        </button>
      );
    } else if (e.kind === 'photo') {
      const doctor: DoctorId = loc === 'eindhoven' ? 'omar' : 'ahmad';
      actions = (
        <div className="row">
          <button
            className="btn small ok"
            onClick={() => {
              emit({ kind: 'photo-reply', photo: e.id, by: doctor, text: tr('Geneest goed. Ga zo door met spoelen en zacht eten.'), ok: true });
              onChange({ title: 'Antwoord op de foto verstuurd', text: 'Geneest goed' });
            }}
          >
            <Icon name="check" size={14} />
            Geneest goed
          </button>
          <button
            className="btn small"
            onClick={() => {
              emit({ kind: 'photo-reply', photo: e.id, by: doctor, text: tr('We bellen je vandaag even om mee te kijken.'), ok: false });
              onChange({ title: 'De patiënt wordt gebeld', text: 'Staat bij Nadia op de lijst' });
            }}
          >
            <Icon name="phone" size={14} />
            Bel de patiënt
          </button>
        </div>
      );
    } else if (e.kind === 'message') {
      actions = (
        <form
          className="reply"
          onSubmit={(ev) => {
            ev.preventDefault();
            const t = text.trim();
            if (!t) return;
            reply(by, t, 'Antwoord verstuurd');
            setText('');
          }}
        >
          <select value={by} onChange={(ev) => setBy(ev.target.value as DoctorId | 'nadia')} aria-label="Afzender">
            <option value="nadia">{tr('Nadia (balie)')}</option>
            {doctorsAt(loc).map((dd) => (
              <option key={dd.id} value={dd.id}>
                {dd.name}
              </option>
            ))}
          </select>
          <input value={text} onChange={(ev) => setText(ev.target.value)} placeholder="Schrijf een antwoord…" aria-label="Antwoord" />
          <button className="btn small primary icon-only" type="submit" aria-label="Verstuur" disabled={!text.trim()}>
            <Icon name="send" size={14} />
          </button>
        </form>
      );
    } else if (e.kind === 'pain' || e.kind === 'sos') {
      actions = (
        <button className={`btn small ${e.kind === 'sos' ? 'danger' : 'primary'}`} onClick={() => reply(e.kind === 'sos' ? 'nadia' : loc === 'eindhoven' ? 'omar' : 'ahmad', tr(e.kind === 'sos' ? 'We bellen je nu terug.' : 'We bellen je zo even om te horen hoe het gaat.'), 'Terugbellen staat klaar')}>
          <Icon name="phone" size={14} />
          {e.kind === 'sos' ? 'Bel nu terug' : 'Bellen'}
        </button>
      );
    } else if (e.kind === 'waitlist') {
      actions = (
        <button
          className="btn small primary"
          onClick={() => {
            const offer = earlierPlace(e.ref, state, now);
            if (!offer) {
              onChange({ title: 'Geen eerdere plek gevonden', text: 'De komende dagen zitten vol' });
              return;
            }
            emit({ kind: 'offer', ref: e.ref, day: offer.day, start: offer.start, doctor: offer.doctor });
            onChange({ title: `Eerdere plek aangeboden: ${offer.label}`, text: 'De patiënt kan hem in de app aannemen' });
          }}
        >
          <Icon name="spark" size={14} />
          Bied eerdere plek aan
        </button>
      );
    }
  }

  return (
    <article className={`event tone-${d.tone}${done ? ' done' : ''}${fresh ? ' fresh' : ''}`}>
      <span className="event-icon" style={{ color: TONE_ICON_BG[d.tone] }}>
        <Icon name={d.icon} size={16} />
      </span>
      <div className="event-body">
        <div className="event-top">
          <b>{d.title}</b>
          <time>{since(e.at)}</time>
        </div>
        {d.text ? <p>{d.text}</p> : null}
        {e.kind === 'photo' && e.thumb ? <img className="thumb" src={e.thumb} alt="Wondfoto uit de app" /> : null}
        {actions ? <div className="event-actions">{actions}</div> : null}
        {done && (e.kind === 'pause' || e.kind === 'photo' || e.kind === 'message' || e.kind === 'waitlist' || (e.kind === 'pain' && e.alert) || e.kind === 'sos') ? (
          <span className="handled">
            <Icon name="check" size={12} />
            Afgehandeld
          </span>
        ) : null}
      </div>
    </article>
  );
}

/** The earliest free place with the same dentist before the booked one, from now on. */
function earlierPlace(ref: string, state: BridgeState, now: Date): { day: string; start: number; doctor: DoctorId; label: string } | null {
  const booking = eventsOf(state, 'booking').find((b) => b.ref === ref);
  const doctor: DoctorId = booking?.doctor ?? 'omar';
  const minutes = booking?.minutes ?? 20;
  const loc = booking?.location ?? 'eindhoven';
  const until = booking ? new Date(`${booking.day.slice(0, 10)}T00:00:00`).getTime() + (booking.start ?? 0) * 60000 : Infinity;
  const taken = appBookings(state);
  for (const d of openDays(LOCATIONS[loc], now, 10)) {
    const key = dateKey(d);
    const same = key === dateKey(now);
    const slot = freeSlots(d, doctor, minutes, taken.filter((b) => b.day.slice(0, 10) === key), same ? Math.ceil((minuteOf(now) + 30) / 15) * 15 : 0, loc)[0] ?? null;
    if (slot === null) continue;
    if (startOfDay(d).getTime() + slot * 60000 >= until) return null;
    return { day: key, start: slot, doctor, label: `${tr(relativeDay(d, now))} ${hm(slot)} · ${tr(treatmentById(booking?.treatment ?? 'controle').name)}` };
  }
  return null;
}
