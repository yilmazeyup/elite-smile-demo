import {
  dayLong,
  healthFlagById,
  LOCALE_NAMES,
  LOCATIONS,
  LUNCH,
  SPECIALTIES,
  SPECIALTY_COLORS,
  specialtyById,
  treatmentById,
  type DoctorId,
  type LocationId,
} from '@smile/shared';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { momentOf, shortName, type ClinicDay, type DoctorNow, type PanelVisit } from '../data';
import { Icon } from './Icon';
import { Avatar, Demo, Flags, hm, SOURCE, SourceIcon, StateBadge } from './ui';

const PX = 2.3;

type Props = {
  day: ClinicDay;
  minute: number;
  loc: LocationId;
  doctors: DoctorNow[];
  onDoctor: (id: DoctorId) => void;
  onDelay: (id: DoctorId, minutes: number) => void;
};

/** Today per dentist: every visit as a block in its specialty's colour, the lunch, and a line that moves with the clock. */
export function Agenda({ day, minute, loc, doctors, onDoctor, onDelay }: Props) {
  const place = LOCATIONS[loc];
  const scroller = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<{ visit: PanelVisit; x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<DoctorId | null>(null);
  const height = (place.closes - place.opens) * PX;
  const nowY = (minute - place.opens) * PX;
  const inDay = minute >= place.opens && minute <= place.closes;

  // Start with the present in view.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = Math.max(0, nowY - el.clientHeight * 0.35);
  }, [loc]);

  useEffect(() => {
    if (!open && !menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setMenu(null);
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.visit-pop') && !t.closest('.visit')) setOpen(null);
      if (!t.closest('.col-menu')) setMenu(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, menu]);

  const hours: number[] = [];
  for (let m = Math.ceil(place.opens / 30) * 30; m <= place.closes; m += 30) hours.push(m);
  const live = day.visits.filter((v) => !v.noShow);
  const usedSpecialties = new Set(day.visits.map((v) => treatmentById(v.treatment).specialty));

  return (
    <div className="page agenda-page">
      <header className="page-head">
        <div>
          <div className="kicker">
            Vandaag · {place.short} <Demo>Demo-agenda</Demo>
          </div>
          <h1>{dayLong(day.day)}</h1>
          <p className="sub">
            {live.length} afspraken · {day.visits.filter((v) => v.noShow).length} niet gekomen · {day.visits.filter((v) => v.mine).length} uit de app
          </p>
        </div>
        <ul className="legend wrap">
          {SPECIALTIES.filter((s) => usedSpecialties.has(s.id)).map((s) => (
            <li key={s.id}>
              <i style={{ background: SPECIALTY_COLORS[s.id] }} />
              {s.name}
            </li>
          ))}
        </ul>
      </header>

      <div className="agenda card" style={{ '--cols': doctors.length } as CSSProperties}>
        <div className="ag-body" ref={scroller}>
          <div className="ag-head">
            <div className="ag-corner" />
            {doctors.map((d) => {
              const occ = live.filter((v) => v.doctor === d.doctor.id).reduce((s, v) => s + v.minutes, 0) / (place.closes - place.opens - (LUNCH.to - LUNCH.from));
              return (
                <div key={d.doctor.id} className="ag-col-head">
                  <button className="ag-doc" onClick={() => onDoctor(d.doctor.id)}>
                    <Avatar doctor={d.doctor} size={40} ring={d.color} />
                    <span className="ag-doc-text">
                      <b>{d.doctor.name}</b>
                      <span>{d.current ? 'In behandeling' : d.next ? `Volgende ${hm(d.next.begin)}` : 'Klaar voor vandaag'}</span>
                    </span>
                  </button>
                  <div className="ag-occ">
                    <span className="bar">
                      <i style={{ width: `${Math.min(100, occ * 100)}%` }} />
                    </span>
                    <span className="num">{Math.round(Math.min(1, occ) * 100)}%</span>
                    {d.late >= 5 ? <em className="late num">+{d.late}</em> : null}
                    <div className="col-menu">
                      <button className="icon-btn tiny" onClick={() => setMenu(menu === d.doctor.id ? null : d.doctor.id)} aria-label={`Uitloop melden voor ${d.doctor.name}`} title="Uitloop melden">
                        <Icon name="clock" size={14} />
                      </button>
                      {menu === d.doctor.id ? (
                        <div className="menu glass small" role="menu">
                          <p className="menu-note">Uitloop melden</p>
                          {[5, 10, 15].map((n) => (
                            <button
                              key={n}
                              role="menuitem"
                              onClick={() => {
                                onDelay(d.doctor.id, n);
                                setMenu(null);
                              }}
                            >
                              +{n} min
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ag-grid" style={{ height }}>
            <div className="ag-times">
              {hours.map((m) => (
                <span key={m} className={`num${m % 60 ? ' half' : ''}${inDay && Math.abs(m - minute) < 9 ? ' hide' : ''}`} style={{ top: (m - place.opens) * PX }}>
                  {hm(m)}
                </span>
              ))}
            </div>
            {hours.map((m) => (
              <div key={m} className={`ag-line${m % 60 ? ' half' : ''}`} style={{ top: (m - place.opens) * PX }} />
            ))}
            <div className="ag-lunch" style={{ top: (LUNCH.from - place.opens) * PX, height: (LUNCH.to - LUNCH.from) * PX }}>
              <span>Lunch</span>
            </div>
            {doctors.map((d, col) => (
              <div key={d.doctor.id} className="ag-col" style={{ '--col': col } as CSSProperties}>
                {day.visits
                  .filter((v) => v.doctor === d.doctor.id)
                  .map((v) => {
                    const mo = momentOf(v, minute);
                    const t = treatmentById(v.treatment);
                    const top = (v.begin - place.opens) * PX;
                    const h = Math.max(18, (v.end - v.begin) * PX - 3);
                    const shifted = v.begin - v.start >= 5;
                    return (
                      <div key={v.id} className="visit-wrap" style={{ top, height: h }}>
                        {shifted ? <div className="v-ghost" style={{ top: (v.start - v.begin) * PX, height: h }} aria-hidden /> : null}
                        <button
                          className={`visit st-${mo.state}${v.mine ? ' mine' : ''}${h < 44 ? ' short' : ''}${open?.visit.id === v.id ? ' sel' : ''}`}
                          style={{ '--c': SPECIALTY_COLORS[t.specialty], '--p': `${mo.progress * 100}%` } as CSSProperties}
                          onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setOpen(open?.visit.id === v.id ? null : { visit: v, x: r.left + r.width / 2, y: r.bottom });
                          }}
                        >
                          <span className="v-top">
                            <time className="num">{hm(v.begin)}</time>
                            <b>{shortName(v.patient.name)}</b>
                            {v.mine ? <span className="app-tag">app</span> : null}
                          </span>
                          <span className="v-what">{t.name}</span>
                          <span className="v-meta">
                            <StateBadge state={mo.state} compact />
                            <SourceIcon source={v.source} size={12} />
                            <Flags flags={v.patient.flags} size={12} />
                            <span className="lang-chip" translate="no">
                              {v.patient.lang.toUpperCase()}
                            </span>
                          </span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            ))}
            {inDay ? (
              <div className="ag-now" style={{ top: nowY }}>
                <span className="num">{hm(minute)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {open ? <VisitPop visit={open.visit} minute={minute} x={open.x} y={open.y} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function VisitPop({ visit: v, minute, x, y, onClose }: { visit: PanelVisit; minute: number; x: number; y: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y + 8 });
  const t = treatmentById(v.treatment);
  const mo = momentOf(v, minute);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(window.innerWidth - w - 16, Math.max(16, x - w / 2));
    const top = y + 8 + h > window.innerHeight - 12 ? Math.max(76, y - h - 60) : y + 8;
    setPos({ left, top });
  }, [x, y, v.id]);
  return (
    <div className="visit-pop glass" ref={ref} style={{ left: pos.left, top: pos.top, '--c': SPECIALTY_COLORS[t.specialty] } as CSSProperties} role="dialog" aria-label={shortName(v.patient.name)}>
      <button className="icon-btn close" onClick={onClose} aria-label="Sluiten">
        <Icon name="close" size={14} />
      </button>
      <div className="vp-head">
        <div className="kicker">
          {specialtyById(t.specialty).name} <Demo>Demo-patiënt</Demo>
        </div>
        <h3>{v.patient.name}</h3>
        <p className="muted">
          <span>{`${v.patient.age} jaar`}</span> · <span>{LOCALE_NAMES[v.patient.lang]}</span>
          {v.patient.firstVisit ? (
            <>
              {' · '}
              <span>Nieuwe patiënt</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="vp-row">
        <span className="vp-k">Behandeling</span>
        <span>{t.name}</span>
      </div>
      <div className="vp-row">
        <span className="vp-k">Tijd</span>
        <span className="num">
          {hm(v.begin)}–{hm(v.end)}
          {v.begin - v.start >= 5 ? <em className="late">{` gepland ${hm(v.start)}`}</em> : null}
        </span>
      </div>
      <div className="vp-row">
        <span className="vp-k">Status</span>
        <StateBadge state={mo.state} />
      </div>
      <div className="vp-row">
        <span className="vp-k">Geboekt via</span>
        <span className="with-icon">
          <SourceIcon source={v.source} />
          {SOURCE[v.source].label}
        </span>
      </div>
      <h4>Stappen</h4>
      <ol className="steps">
        {mo.steps.map((s, i) => (
          <li key={`${s}-${i}`} className={mo.state === 'klaar' || (mo.state === 'in-stoel' && i < mo.step) ? 'done' : mo.state === 'in-stoel' && i === mo.step ? 'now' : ''}>
            <i />
            {s}
          </li>
        ))}
      </ol>
      {v.patient.flags.length ? (
        <>
          <h4>Gezondheid</h4>
          <ul className="flag-list">
            {v.patient.flags.map((f) => {
              const flag = healthFlagById(f);
              return (
                <li key={f} className={`sev-${flag.severity}`}>
                  <Flags flags={[f]} />
                  <span>
                    <b>{flag.label}</b>
                    <span>{flag.why}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
