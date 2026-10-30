import { dateKey, decimal, LOCATIONS, rng, roomById, treatmentById, type CareId, type LocationId } from '@smile/shared';
import { useMemo } from 'react';

import { shortName, type ClinicDay, type PanelVisit } from '../data';
import { Icon } from './Icon';
import { Demo, hm, Ring } from './ui';

type Cycle = { n: number; unit: 'A' | 'B'; start: number; minutes: number; test?: string };
type Tray = { code: string; set: string; visit: PanelVisit; cycle: Cycle | null; back: Cycle | null };

const SET_OF: Partial<Record<CareId, string>> = {
  implantaat: 'Chirurgieset',
  extractie: 'Chirurgieset',
  bot: 'Chirurgieset',
  wortelkanaal: 'Endoset',
  beugel: 'Orthoset',
  uitneembaar: 'Orthoset',
  retainer: 'Orthoset',
  'kind-vulling': 'Kinderset',
  'pulpa-kind': 'Kinderset',
  fluoride: 'Kinderset',
  facings: 'Esthetiekset',
  bleken: 'Esthetiekset',
  bonding: 'Esthetiekset',
};

const PHASES = [
  { to: 0.15, label: 'Voorvacuüm' },
  { to: 0.35, label: 'Opwarmen' },
  { to: 0.55, label: 'Sterilisatie 134 °C' },
  { to: 0.9, label: 'Drogen' },
  { to: 1, label: 'Afkoelen' },
];

/** The chamber temperature over a cycle (0 … 1), in °C, as an autoclave log would draw it. */
function tempAt(t: number): number {
  if (t < 0.15) return 22 + (t / 0.15) * 70;
  if (t < 0.35) return 92 + ((t - 0.15) / 0.2) * 42;
  if (t < 0.55) return 134 + Math.sin(t * 90) * 0.6;
  if (t < 0.9) return 134 - ((t - 0.55) / 0.35) * 30;
  return 104 - ((t - 0.9) / 0.1) * 40;
}

/** The demo day's cycles: a Bowie-Dick test before opening, then both autoclaves in turn through the day. */
function cyclesOf(day: ClinicDay): Cycle[] {
  const place = LOCATIONS[day.loc];
  const r = rng(`steri-${day.loc}-${dateKey(day.day)}`);
  const base = 4100 + (Math.floor(day.day.getTime() / 86400000) % 300) * 9;
  const out: Cycle[] = [{ n: base, unit: 'A', start: place.opens - 38, minutes: 18, test: 'Bowie-Dick-test' }];
  let t = place.opens + 15;
  let unit: 'A' | 'B' = 'B';
  while (t < place.closes + 20) {
    out.push({ n: base + out.length, unit, start: t, minutes: 38 + Math.floor(r() * 9) });
    t += 34 + Math.floor(r() * 22);
    unit = unit === 'A' ? 'B' : 'A';
  }
  return out;
}

/** A tray per visit: which cycle made it sterile, and which cycle takes it back after use. */
function traysOf(day: ClinicDay, cycles: Cycle[]): Tray[] {
  const count = new Map<string, number>();
  const work = cycles.filter((c) => !c.test);
  return day.visits
    .filter((v) => !v.noShow)
    .sort((a, b) => a.begin - b.begin)
    .map((v) => {
      const n = (count.get(v.room) ?? 0) + 1;
      count.set(v.room, n);
      const care = treatmentById(v.treatment).care;
      const before = [...work].reverse().find((c) => c.start + c.minutes <= v.begin - 8) ?? null;
      const back = work.find((c) => c.start >= v.end + 12) ?? null;
      return { code: `${v.room.toUpperCase()}-${String(n).padStart(2, '0')}`, set: SET_OF[care] ?? 'Basisset', visit: v, cycle: before, back };
    });
}

/** Autoclave cycles of the day and every instrument tray traced to its room, its visit and its cycle. */
export function Sterilisation({ day, minute, loc }: { day: ClinicDay; minute: number; loc: LocationId }) {
  const cycles = useMemo(() => cyclesOf(day), [day.day.getTime(), loc]);
  const trays = useMemo(() => traysOf(day, cycles), [day, cycles]);
  const running = cycles.filter((c) => !c.test && minute >= c.start && minute < c.start + c.minutes);
  const done = cycles.filter((c) => minute >= c.start + c.minutes);
  const current = running[0] ?? null;
  const progress = current ? (minute - current.start) / current.minutes : 0;
  const phase = current ? PHASES.find((p) => progress <= p.to)?.label ?? '' : '';
  const temp = current ? tempAt(progress) : 22;
  const curve = Array.from({ length: 60 }, (_, i) => tempAt(i / 59));
  const path = curve.map((v, i) => `${i ? 'L' : 'M'}${(i / 59) * 300} ${110 - ((v - 20) / 120) * 100}`).join(' ');
  const test = cycles.find((c) => c.test);

  const trayState = (t: Tray) => {
    if (minute < t.visit.begin) return { label: 'Steriel · klaar', tone: 'ok' };
    if (minute < t.visit.end) return { label: 'In gebruik', tone: 'info' };
    if (!t.back || minute < t.back.start) return { label: 'Retour · wacht', tone: 'warn' };
    if (minute < t.back.start + t.back.minutes) return { label: `In cyclus #${t.back.n}`, tone: 'info' };
    return { label: `Gereinigd · #${t.back.n}`, tone: 'ok' };
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="kicker">
            Sterilisatie & instrumenten · {LOCATIONS[loc].short} <Demo />
          </div>
          <h1>
            Elk instrument <em>terug te vinden</em>
          </h1>
          <p className="sub">Iedere set is gekoppeld aan de kamer, de behandeling en de autoclaafcyclus die hem steriel maakte.</p>
        </div>
      </header>

      <div className="steri-top">
        <section className="card autoclave">
          <div className="ac-ring">
            <Ring value={current ? progress : 1} size={176} stroke={12} color={current ? 'var(--es-sky)' : 'var(--es-ok)'}>
              <b className="num">{current ? `${Math.round(temp)}°` : '✓'}</b>
              <span>{current ? phase : 'Geen cyclus bezig'}</span>
            </Ring>
          </div>
          <div className="ac-info">
            <div className="kicker">
              <span className={`pulse-dot${current ? '' : ' still'}`} /> {current ? `Autoclaaf ${current.unit} · cyclus #${current.n}` : 'Autoclaven gereed'}
            </div>
            <h2>{current ? `Nog ${Math.max(1, Math.ceil(current.start + current.minutes - minute))} min` : `${done.filter((c) => !c.test).length} cycli vandaag geslaagd`}</h2>
            <dl className="ac-figures">
              <div>
                <dt>Programma</dt>
                <dd className="num">134 °C</dd>
              </div>
              <div>
                <dt>Druk</dt>
                <dd className="num">{decimal(2.1)} bar</dd>
              </div>
              <div>
                <dt>Houdtijd</dt>
                <dd className="num">{decimal(3.5)} min</dd>
              </div>
            </dl>
            <svg className="temp-curve" viewBox="0 0 300 116" preserveAspectRatio="none" aria-hidden>
              <line x1="0" x2="300" y1={110 - ((134 - 20) / 120) * 100} y2={110 - ((134 - 20) / 120) * 100} className="hold-line" />
              <path d={path} className="curve" />
              {current ? <circle cx={progress * 300} cy={110 - ((temp - 20) / 120) * 100} r="4.5" className="marker" /> : null}
            </svg>
          </div>
        </section>
        <section className="card checks">
          <h3>Dagelijkse controles</h3>
          <ul>
            <li>
              <Icon name="check" size={15} />
              <span>
                <b>{test?.test}</b>
                <small className="num">{test ? `${hm(test.start)} · autoclaaf A` : ''}</small>
              </span>
              <em>Geslaagd</em>
            </li>
            <li>
              <Icon name="check" size={15} />
              <span>
                <b>Helix-test</b>
                <small className="num">{test ? `${hm(test.start + 20)} · autoclaaf B` : ''}</small>
              </span>
              <em>Geslaagd</em>
            </li>
            <li>
              <Icon name="check" size={15} />
              <span>
                <b>Waterkwaliteit</b>
                <small>Gedemineraliseerd water</small>
              </span>
              <em>In orde</em>
            </li>
            <li>
              <Icon name="users" size={15} />
              <span>
                <b>Ruben</b>
                <small>Sterilisatie & instrumenten</small>
              </span>
              <em className="muted">Dienst</em>
            </li>
          </ul>
        </section>
      </div>

      <div className="steri-tables">
        <section className="card table-card">
          <h3>
            Cycli vandaag <span className="count num">{cycles.length}</span>
          </h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cyclus</th>
                  <th>Autoclaaf</th>
                  <th>Start</th>
                  <th>Programma</th>
                  <th>Duur</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => {
                  const end = c.start + c.minutes;
                  const st = minute >= end ? 'done' : minute >= c.start ? 'run' : 'plan';
                  return (
                    <tr key={c.n} className={`cy-${st}`}>
                      <td className="num">#{c.n}</td>
                      <td>{c.unit}</td>
                      <td className="num">{hm(c.start)}</td>
                      <td>{c.test ?? '134 °C · 3,5 min'}</td>
                      <td className="num">{c.minutes} min</td>
                      <td>
                        <span className={`pill ${st === 'done' ? 'ok' : st === 'run' ? 'info' : ''}`}>
                          {st === 'done' ? <Icon name="check" size={12} /> : st === 'run' ? <span className="pulse-dot small" /> : null}
                          {st === 'done' ? 'Geslaagd' : st === 'run' ? 'Bezig' : 'Gepland'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card table-card">
          <h3>
            Sets gekoppeld aan behandelingen <Demo />
          </h3>
          <div className="table-scroll tall">
            <table>
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Soort</th>
                  <th>Kamer</th>
                  <th>Behandeling</th>
                  <th>Steriel uit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trays.map((t) => {
                  const s = trayState(t);
                  return (
                    <tr key={t.code + t.visit.id} className={minute >= t.visit.begin && minute < t.visit.end ? 'live' : ''}>
                      <td className="num code">{t.code}</td>
                      <td>{t.set}</td>
                      <td>{loc === 'eindhoven' ? roomById(t.visit.room).name : t.visit.room === 'k1' ? 'Kamer 1' : 'Kamer 2'}</td>
                      <td>
                        <span className="num muted">{hm(t.visit.begin)}</span> {shortName(t.visit.patient.name)} · {treatmentById(t.visit.treatment).name}
                      </td>
                      <td className="num">{t.cycle ? `#${t.cycle.n}` : <span className="muted">Voorraad</span>}</td>
                      <td>
                        <span className={`pill ${s.tone}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
