import {
  CLINIC,
  dateKey,
  dayShort,
  doctorById,
  duration,
  LOCATIONS,
  LOCALE_NAMES,
  occupancy,
  openDays,
  readDoctorSocials,
  roomById,
  saveDoctorSocials,
  SPECIALTY_COLORS,
  TREATMENTS,
  treatmentById,
  weekdayShort,
  type DoctorId,
  type LocationId,
  type Socials,
} from '@smile/shared';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { momentOf, shortName, type ClinicDay, type DoctorNow } from '../data';
import { Icon } from './Icon';
import { Demo, Flags, hm, photoUrl, Ring, SourceIcon, SpecialtyChip, StateBadge } from './ui';

type Props = {
  id: DoctorId | null;
  order: DoctorId[];
  now: Date;
  minute: number;
  loc: LocationId;
  day: ClinicDay;
  status: DoctorNow | null;
  onClose: () => void;
  onPick: (id: DoctorId) => void;
  onShare: (id: DoctorId) => void;
  onDelay: (id: DoctorId, minutes: number) => void;
  onShow3d: (id: DoctorId) => void;
};

const SOCIAL_FIELDS: { key: keyof Socials; label: string; icon: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: '@gebruikersnaam' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin', placeholder: 'linkedin.com/in/…' },
  { key: 'tiktok', label: 'TikTok', icon: 'tiktok', placeholder: '@gebruikersnaam' },
  { key: 'website', label: 'Website', icon: 'globe', placeholder: 'https://…' },
];

/** A link for what someone typed: a handle becomes the profile address. */
function socialHref(key: keyof Socials, value: string): string {
  const v = value.trim();
  if (/^https?:\/\//.test(v)) return v;
  const handle = v.replace(/^@/, '');
  if (key === 'instagram') return `https://instagram.com/${handle}`;
  if (key === 'tiktok') return `https://www.tiktok.com/@${handle}`;
  if (key === 'linkedin') return v.includes('linkedin.com') ? `https://${v.replace(/^\/\//, '')}` : `https://www.linkedin.com/in/${handle}`;
  return `https://${v}`;
}

/** The dentist's profile: who they are (as on elitesmile.nl), today in the chair, the coming days and their links. */
export function DoctorDrawer({ id: openId, order, now, minute, loc, day, status, onClose, onPick, onShare, onDelay, onShow3d }: Props) {
  const panel = useRef<HTMLElement | null>(null);
  // The last dentist stays on the panel while it slides away.
  const last = useRef<DoctorId | null>(openId);
  if (openId) last.current = openId;
  const id = openId ?? last.current;
  const isOpen = openId !== null;
  const [delayMenu, setDelayMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [socials, setSocials] = useState<Socials>({});
  const doctor = id ? doctorById(id) : null;

  useEffect(() => {
    if (!id || !isOpen) return;
    setSocials(readDoctorSocials()[id] ?? {});
    setEditing(false);
    setDelayMenu(false);
    panel.current?.focus({ preventScroll: true });
    panel.current?.querySelector('.drawer-scroll')?.scrollTo({ top: 0 });
  }, [id, isOpen]);

  // Esc closes; the arrow keys go to the next or previous dentist (mirrored in Arabic).
  useEffect(() => {
    if (!id || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
        if (e.key === 'Escape') target.blur();
        return;
      }
      if (document.querySelector('.share-sheet')) return;
      const rtl = document.documentElement.dir === 'rtl';
      const i = order.indexOf(id);
      if (e.key === 'Escape') onClose();
      else if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) onPick(order[(i + 1) % order.length]);
      else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) onPick(order[(i - 1 + order.length) % order.length]);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, isOpen, order, onClose, onPick]);

  const visits = useMemo(() => (id ? day.visits.filter((v) => v.doctor === id).sort((a, b) => a.begin - b.begin) : []), [day, id]);
  const week = useMemo(() => {
    if (!id) return [];
    const place = LOCATIONS[loc];
    return openDays(place, now, 8)
      .filter((d) => dateKey(d) !== dateKey(now))
      .slice(0, 7)
      .map((d) => ({ day: d, value: occupancy(d, id, loc) }));
  }, [id, loc, dateKey(now)]);

  if (!doctor || !id) return <aside className="drawer" aria-hidden />;

  const live = visits.filter((v) => !v.noShow);
  const chairMinutes = live.reduce((s, v) => s + (v.end - v.begin), 0);
  const occ = occupancy(day.day, id, loc);
  const room = loc === 'eindhoven' ? roomById(doctor.room) : null;
  const treats = TREATMENTS.filter((t) => t.doctors.includes(id));
  const color = status?.color ?? 'var(--es-ok)';
  const current = status?.current ?? null;
  const moment = current ? momentOf(current, minute) : null;
  const pageUrl = new URL(`../website/tandarts/${id}/`, window.location.href).toString();
  const bookUrl = new URL(`../app/afspraak?tandarts=${id}`, window.location.href).toString();
  // Week order from Monday; 25 October 2026 is a Sunday, so 25 + n is weekday n.
  const daysOf = (days: number[]) => [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => weekdayShort(new Date(2026, 9, 25 + d))).join(' · ');
  const works = [`${daysOf(LOCATIONS.eindhoven.days)} · Eindhoven`, ...(id === 'ahmad' || id === 'najla' ? [`${daysOf(LOCATIONS.hoogland.days)} · Hoogland`] : [])];
  const ownSocials = SOCIAL_FIELDS.filter((f) => socials[f.key]);

  return (
    <aside className={`drawer glass${isOpen ? ' open' : ''}`} ref={panel} tabIndex={-1} aria-label={`Profiel van ${doctor.name}`} role="dialog" aria-modal="false" aria-hidden={!isOpen} inert={!isOpen}>
      <div className="drawer-scroll">
        <div className="drawer-tools">
          <button className="icon-btn" onClick={() => onPick(order[(order.indexOf(id) - 1 + order.length) % order.length])} aria-label="Vorige tandarts" title="Vorige (←)">
            <Icon name="left" size={16} className="flip-rtl" />
          </button>
          <span className="pager" translate="no">
            {order.indexOf(id) + 1}/{order.length}
          </span>
          <button className="icon-btn" onClick={() => onPick(order[(order.indexOf(id) + 1) % order.length])} aria-label="Volgende tandarts" title="Volgende (→)">
            <Icon name="right" size={16} className="flip-rtl" />
          </button>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Sluiten" title="Sluiten (Esc)">
            <Icon name="close" size={16} />
          </button>
        </div>

        <header className="hero" key={id} style={{ '--c': doctor.color } as CSSProperties}>
          <div className="portrait" style={{ '--ring': color } as CSSProperties}>
            <img src={photoUrl(doctor)} alt={doctor.name} width={148} height={148} />
            <span className="bob" style={{ background: color }} aria-hidden />
          </div>
          <div className="hero-text">
            <h2>{doctor.name}</h2>
            <p className="title">{doctor.title}</p>
            <p className="title-en" translate="no" lang="en">
              {doctor.titleEn}
            </p>
            <div className="chips">
              {doctor.specialties.map((s) => (
                <SpecialtyChip key={s} id={s} />
              ))}
              {room ? (
                <span className="chip room">
                  <Icon name="door" size={13} />
                  {room.name} · {room.focus}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="now-line" style={{ '--c': color } as CSSProperties}>
          <i />
          {current && moment ? (
            <span>
              <b>In behandeling</b>
              <span>{`${shortName(current.patient.name)} · ${treatmentById(current.treatment).name} · stap ${moment.step + 1}/${moment.steps.length} · nog ${moment.left} min`}</span>
            </span>
          ) : status?.next ? (
            <span>
              <b>Vrij</b>
              <span>{`volgende patiënt om ${hm(status.next.begin)}`}</span>
            </span>
          ) : (
            <span>
              <b>Vrij</b>
              <span>geen patiënten meer vandaag</span>
            </span>
          )}
          {status && status.late >= 5 ? <em className="late">+{status.late} min uitloop</em> : null}
        </div>

        <div className="actions">
          <button className="btn primary" onClick={() => onShare(id)}>
            <Icon name="share" size={15} />
            Delen
          </button>
          <a className="btn" href={bookUrl} target="_blank" rel="noreferrer">
            <Icon name="calendar" size={15} />
            <span>Boek bij {doctor.name}</span>
          </a>
          <div className="menu-wrap">
            <button className="btn" onClick={() => setDelayMenu((v) => !v)} aria-expanded={delayMenu}>
              <Icon name="clock" size={15} />
              Uitloop melden
            </button>
            {delayMenu ? (
              <div className="menu glass small" role="menu">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    role="menuitem"
                    onClick={() => {
                      onDelay(id, n);
                      setDelayMenu(false);
                    }}
                  >
                    +{n} min
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button className="btn ghost" onClick={() => onShow3d(id)}>
            <Icon name="cube" size={15} />
            In 3D
          </button>
        </div>

        <section className="block">
          <h3>
            Bezetting <Demo />
          </h3>
          <div className="occupancy">
            <Ring value={occ} size={128} stroke={11} color={occ > 0.9 ? 'var(--es-alert)' : occ > 0.7 ? 'var(--es-warn)' : 'var(--es-ok)'}>
              <b className="num">{Math.round(occ * 100)}%</b>
              <span>vandaag</span>
            </Ring>
            <dl className="facts">
              <div>
                <dt>Afspraken</dt>
                <dd className="num">{live.length}</dd>
              </div>
              <div>
                <dt>In de stoel</dt>
                <dd className="num">{duration(chairMinutes)}</dd>
              </div>
              <div>
                <dt>Eerste vrije plek</dt>
                <dd className="num">{status?.nextFree !== null && status?.nextFree !== undefined ? hm(status.nextFree) : '—'}</dd>
              </div>
            </dl>
          </div>
          <div className="week" role="list" aria-label="Bezetting de komende open dagen">
            {week.map((w) => (
              <div key={dateKey(w.day)} className="wk" role="listitem" title={`${dayShort(w.day)} · ${Math.round(w.value * 100)}%`}>
                <span className="wk-bar">
                  <i style={{ height: `${Math.max(4, w.value * 100)}%`, background: w.value > 0.9 ? 'var(--es-alert)' : w.value > 0.7 ? 'var(--es-warn)' : 'var(--es-sky)' }} />
                </span>
                <span className="wk-val num">{Math.round(w.value * 100)}</span>
                <span className="wk-day">{weekdayShort(w.day)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="block">
          <h3>
            Vandaag <Demo>Demo-patiënten</Demo>
          </h3>
          {visits.length === 0 ? <p className="empty">Geen afspraken vandaag op deze locatie.</p> : null}
          <ol className="timeline">
            {visits.map((v) => {
              const mo = momentOf(v, minute);
              const t = treatmentById(v.treatment);
              return (
                <li key={v.id} className={`tl tl-${mo.state}${v.mine ? ' mine' : ''}`} style={{ '--c': SPECIALTY_COLORS[t.specialty] } as CSSProperties}>
                  <time className="num">{hm(v.begin)}</time>
                  <span className="tl-dot" />
                  <div className="tl-card">
                    <div className="tl-top">
                      <b>{shortName(v.patient.name)}</b>
                      <span className="age num">{v.patient.age}</span>
                      {v.mine ? <span className="app-tag">app</span> : null}
                      <span className="spacer" />
                      <StateBadge state={mo.state} />
                    </div>
                    <div className="tl-mid">
                      <span>{t.name}</span>
                      <span className="muted num">{v.end - v.begin} min</span>
                    </div>
                    <div className="tl-meta">
                      <SourceIcon source={v.source} />
                      <span className="lang-chip" title={LOCALE_NAMES[v.patient.lang]} translate="no">
                        {v.patient.lang.toUpperCase()}
                      </span>
                      <Flags flags={v.patient.flags} />
                      {v.patient.firstVisit ? <span className="new-tag">Nieuw</span> : null}
                      {mo.state === 'in-stoel' ? (
                        <span className="tl-progress">
                          <i style={{ width: `${mo.progress * 100}%` }} />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="block">
          <h3>Behandelt</h3>
          <div className="chips wrap">
            {treats.map((t) => (
              <span key={t.id} className="chip soft" style={{ '--c': SPECIALTY_COLORS[t.specialty] } as CSSProperties} title={t.short}>
                <i />
                {t.name}
              </span>
            ))}
          </div>
        </section>

        <section className="block">
          <h3>
            Gegevens <Demo />
          </h3>
          <dl className="details">
            <div>
              <dt>BIG-registratie</dt>
              <dd className="todo">nog in te vullen</dd>
            </div>
            <div>
              <dt>Werkdagen in de demo</dt>
              <dd>
                {works.map((w) => (
                  <span key={w} className="line">
                    {w}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Talen</dt>
              <dd className="todo">nog in te vullen</dd>
            </div>
            <div>
              <dt>Kamer</dt>
              <dd>{room ? `${room.name} · ${room.focus}` : loc === 'hoogland' ? 'Mondhygiënistenpraktijk Engweg' : '—'}</dd>
            </div>
          </dl>
          <p className="fine">Naam, titel en foto staan zo op elitesmile.nl. De rest vult de praktijk zelf in; in deze demo staat er niets verzonnen over de tandarts.</p>
        </section>

        <section className="block">
          <h3>Social media</h3>
          <a className="social clinic" href={CLINIC.instagramUrl} target="_blank" rel="noreferrer">
            <span className="social-icon ig">
              <Icon name="instagram" size={17} />
            </span>
            <span className="social-text">
              <b translate="no">@{CLINIC.instagram}</b>
              <span>Elite Smile op Instagram</span>
            </span>
            <Icon name="external" size={15} className="flip-rtl" />
          </a>
          {editing ? (
            <form
              className="social-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveDoctorSocials(id, socials);
                setEditing(false);
              }}
            >
              {SOCIAL_FIELDS.map((f) => (
                <label key={f.key}>
                  <span>
                    <Icon name={f.icon} size={15} />
                    {f.label}
                  </span>
                  <input value={socials[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setSocials({ ...socials, [f.key]: e.target.value })} dir="ltr" />
                </label>
              ))}
              <div className="row">
                <button className="btn primary small" type="submit">
                  <Icon name="check" size={14} />
                  Opslaan
                </button>
                <button
                  className="btn small ghost"
                  type="button"
                  onClick={() => {
                    setSocials(readDoctorSocials()[id] ?? {});
                    setEditing(false);
                  }}
                >
                  Annuleren
                </button>
              </div>
            </form>
          ) : (
            <>
              <ul className="socials">
                {SOCIAL_FIELDS.map((f) => {
                  const value = socials[f.key];
                  return (
                    <li key={f.key}>
                      <span className="social-icon">
                        <Icon name={f.icon} size={15} />
                      </span>
                      <span className="social-label">{f.label}</span>
                      {value ? (
                        <a href={socialHref(f.key, value)} target="_blank" rel="noreferrer" dir="ltr" translate="no">
                          {value}
                        </a>
                      ) : (
                        <span className="todo">nog niet gekoppeld</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button className="btn small ghost" onClick={() => setEditing(true)}>
                <Icon name="edit" size={14} />
                {ownSocials.length ? 'Bewerken' : 'Accounts koppelen'}
              </button>
            </>
          )}
        </section>

        <footer className="drawer-foot">
          <a href={pageUrl} target="_blank" rel="noreferrer">
            <Icon name="link" size={14} />
            <span translate="no">{pageUrl.replace(/^https?:\/\//, '')}</span>
          </a>
        </footer>
      </div>
    </aside>
  );
}
