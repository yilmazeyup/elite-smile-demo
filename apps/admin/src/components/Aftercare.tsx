import {
  addDays,
  dateKey,
  dayShort,
  dayVisits,
  DIARY_SEED,
  doctorById,
  eventsOf,
  IMPLANT_DAYS_AGO,
  LOCATIONS,
  PRESCRIPTION,
  rng,
  startOfDay,
  treatmentById,
  type BridgeState,
  type DoctorId,
  type LocationId,
} from '@smile/shared';
import { useMemo, useState } from 'react';

import { answered, shortName } from '../data';
import { Icon } from './Icon';
import { Avatar, Demo, Spark } from './ui';

type Props = { now: Date; loc: LocationId; state: BridgeState; onToast: (t: { title: string; text?: string }) => void; onOpenRail: () => void };

type Patient = {
  id: string;
  name: string;
  age: number;
  treatment: string;
  doctor: DoctorId;
  /** Days since the treatment (0 = the day itself). */
  day: number;
  date: Date;
  pain: number[];
  swelling: number[];
  fever: boolean;
  bleeding: boolean;
  red: string[];
  photos: number;
  messages: number;
  mine: boolean;
};

/** Treatments that come with days of aftercare to watch. */
const AFTER = new Set(['implantaat', 'extractie', 'verstandskies', 'bot', 'wortelkanaal', 'herbehandeling', 'gingiva']);

/** Red flags from a diary: pain that rises again after day 3, fever, bleeding. */
function redFlags(pain: number[], fever: boolean, bleeding: boolean): string[] {
  const out: string[] = [];
  const n = pain.length;
  if (n >= 4 && pain[n - 1] > pain[n - 2] && n - 1 >= 3) out.push('Pijn neemt toe na dag 3');
  if (fever) out.push('Koorts');
  if (bleeding) out.push('Nabloeding');
  return out;
}

/** Layla (from the app, live) and fictional patients from the last open days, with a seeded diary. */
function aftercarePatients(now: Date, loc: LocationId, state: BridgeState): Patient[] {
  const today = startOfDay(now);
  const out: Patient[] = [];

  // Layla: the demo diary, then whatever she logged in the app (the latest entry per day wins).
  const pain = DIARY_SEED.map((d) => d.pain);
  const swelling = DIARY_SEED.map((d) => d.swelling);
  let fever = false;
  let bleeding = false;
  let alert = false;
  for (const e of eventsOf(state, 'pain').filter((x) => x.who === 'layla')) {
    pain[e.day] = e.pain;
    swelling[e.day] = e.swelling;
    fever ||= e.fever;
    bleeding ||= e.bleeding;
    alert ||= e.alert;
  }
  for (let i = 0; i < pain.length; i++) {
    pain[i] ??= pain[i - 1] ?? 3;
    swelling[i] ??= swelling[i - 1] ?? 1;
  }
  const photos = eventsOf(state, 'photo').filter((e) => e.who === 'layla' && !answered(e, state)).length;
  const messages = eventsOf(state, 'message').filter((e) => !answered(e, state)).length;
  const red = redFlags(pain, fever, bleeding);
  if (alert && !red.length) red.push('Pijn neemt toe na dag 3');
  out.push({
    id: 'layla',
    name: 'Layla Benali',
    age: 34,
    treatment: 'implantaat',
    doctor: PRESCRIPTION.by,
    day: Math.max(IMPLANT_DAYS_AGO, pain.length - 1),
    date: addDays(today, -IMPLANT_DAYS_AGO),
    pain,
    swelling,
    fever,
    bleeding,
    red,
    photos,
    messages,
    mine: true,
  });

  // Others: surgery in the last ten days at this location (fictional patients from the demo agenda).
  const place = LOCATIONS[loc];
  const candidates: Patient[] = [];
  for (let back = 1; back <= 10; back++) {
    const d = addDays(today, -back);
    if (!place.days.includes(d.getDay())) continue;
    for (const v of dayVisits(d, loc)) {
      if (v.noShow || !AFTER.has(v.treatment)) continue;
      const r = rng(`${v.id}-diary`);
      const days = back;
      const p: number[] = [];
      const s: number[] = [];
      const peak = 3 + Math.floor(r() * 4);
      const drySocket = (v.treatment === 'extractie' || v.treatment === 'verstandskies') && r() < 0.35;
      for (let k = 0; k <= Math.min(days, 7); k++) {
        let value = k === 0 ? peak - 1 : k === 1 ? peak : Math.max(0, peak - (k - 1) * (1 + r() * 0.6));
        if (drySocket && k >= 3) value = Math.min(9, peak - 1 + (k - 2) * 1.6);
        p.push(Math.round(value));
        s.push(Math.max(0, Math.min(3, Math.round(k <= 2 ? 1 + k * 0.6 : 2.6 - (k - 2) * 0.7))));
      }
      const fev = !drySocket && r() < 0.08;
      candidates.push({
        id: v.id,
        name: v.patient.name,
        age: v.patient.age,
        treatment: v.treatment,
        doctor: v.doctor,
        day: days,
        date: d,
        pain: p,
        swelling: s,
        fever: fev,
        bleeding: false,
        red: redFlags(p, fev, false),
        photos: 0,
        messages: 0,
        mine: false,
      });
    }
  }
  // A calm mix: everyone with a red flag, then the most recent.
  const flagged = candidates.filter((c) => c.red.length).slice(0, 2);
  const rest = candidates.filter((c) => !c.red.length).sort((a, b) => a.day - b.day).slice(0, 7 - flagged.length);
  return [...out, ...flagged, ...rest].sort((a, b) => Number(b.red.length > 0) - Number(a.red.length > 0) || Number(b.mine) - Number(a.mine) || a.day - b.day);
}

/** The first days after surgery, at a glance: a small diary per patient and what needs a call. */
export function Aftercare({ now, loc, state, onToast, onOpenRail }: Props) {
  const patients = useMemo(() => aftercarePatients(now, loc, state), [dateKey(now), loc, state]);
  const [called, setCalled] = useState<Set<string>>(() => new Set());
  const red = patients.filter((p) => p.red.length && !called.has(p.id)).length;
  const photos = patients.reduce((s, p) => s + p.photos, 0);
  const messages = patients.reduce((s, p) => s + p.messages, 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="kicker">
            Nazorg · {LOCATIONS[loc].short} <Demo>Demo-patiënten</Demo>
          </div>
          <h1>
            De eerste dagen <em>na de behandeling</em>
          </h1>
          <p className="sub">Pijn en zwelling uit het dagboek in de app; rode vlaggen springen er vanzelf uit.</p>
        </div>
      </header>
      <div className="kpis">
        <div className="kpi card">
          <span className="kpi-label">In nazorg</span>
          <b className="num">{patients.length}</b>
        </div>
        <div className={`kpi card${red ? ' alert' : ''}`}>
          <span className="kpi-label">Rode vlaggen</span>
          <b className="num">{red}</b>
        </div>
        <button className={`kpi card${photos ? ' warn' : ''}`} onClick={onOpenRail}>
          <span className="kpi-label">Foto’s te beoordelen</span>
          <b className="num">{photos}</b>
        </button>
        <button className={`kpi card${messages ? ' warn' : ''}`} onClick={onOpenRail}>
          <span className="kpi-label">Berichten</span>
          <b className="num">{messages}</b>
        </button>
      </div>
      <div className="after-grid">
        {patients.map((p) => {
          const t = treatmentById(p.treatment);
          const doctor = doctorById(p.doctor);
          const flagged = p.red.length > 0 && !called.has(p.id);
          return (
            <article key={p.id} className={`after card${flagged ? ' flagged' : ''}${p.mine ? ' mine' : ''}`}>
              <header>
                <Avatar doctor={doctor} size={30} />
                <div className="after-who">
                  <b>{p.mine ? p.name : shortName(p.name)}</b>
                  <span>{`dag ${p.day} na ${t.name.toLowerCase()} · ${dayShort(p.date)}`}</span>
                </div>
                {p.mine ? <span className="app-tag">app</span> : null}
              </header>
              <div className="after-charts">
                <div>
                  <span className="chart-label">
                    Pijn <b className="num">{p.pain[p.pain.length - 1]}</b>
                    <small>/10</small>
                  </span>
                  <Spark values={p.pain} max={10} color={flagged ? 'var(--es-alert)' : 'var(--es-blue)'} width={150} height={40} alertFrom={7} />
                </div>
                <div>
                  <span className="chart-label">
                    Zwelling <b className="num">{p.swelling[p.swelling.length - 1]}</b>
                    <small>/3</small>
                  </span>
                  <Spark values={p.swelling} max={3} color="var(--es-lilac)" width={110} height={40} />
                </div>
              </div>
              <div className="after-foot">
                {p.red.length ? (
                  p.red.map((r) => (
                    <span key={r} className={`red-flag${called.has(p.id) ? ' calm' : ''}`}>
                      <Icon name="alert" size={12} />
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="ok-flag">
                    <Icon name="check" size={12} />
                    Verloopt zoals verwacht
                  </span>
                )}
                {p.photos ? (
                  <span className="pill warn">
                    <Icon name="camera" size={12} />
                    {p.photos === 1 ? '1 foto' : `${p.photos} foto’s`}
                  </span>
                ) : null}
                {p.messages ? (
                  <span className="pill warn">
                    <Icon name="chat" size={12} />
                    {p.messages === 1 ? '1 bericht' : `${p.messages} berichten`}
                  </span>
                ) : null}
                <span className="spacer" />
                {flagged ? (
                  <button
                    className="btn small danger"
                    onClick={() => {
                      setCalled((s) => new Set(s).add(p.id));
                      onToast({ title: `${shortName(p.name)} staat op de belijst`, text: `${doctor.name} belt vandaag terug` });
                    }}
                  >
                    <Icon name="phone" size={13} />
                    Bellen
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
