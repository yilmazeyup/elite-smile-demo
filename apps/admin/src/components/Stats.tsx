import { LOCALE_NAMES, LOCALES, LOCATIONS, LUNCH, SPECIALTIES, SPECIALTY_COLORS, treatmentById, type LocationId, type Source } from '@smile/shared';
import { useMemo, type CSSProperties } from 'react';

import { momentOf, ROOM_STATUS, roomsOf, shortName, type ClinicDay, type RoomView } from '../data';
import { Icon } from './Icon';
import { Avatar, Demo, SOURCE } from './ui';

const SOURCE_COLORS: Record<Source, string> = { app: '#2DB4E8', website: '#0A63B5', telefoon: '#8E7CF8', whatsapp: '#17BFA3', balie: '#C9A15B' };

/** A ring chart in slices; each slice its colour, a hairline gap between them. */
function Donut({ parts, size = 148 }: { parts: { value: number; color: string; label: string }[]; size?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--es-line)" strokeWidth="16" />
      {parts.map((p) => {
        const len = (p.value / total) * c;
        const el = (
          <circle
            key={p.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="16"
            strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

/** The day in numbers: chairs, new patients, no-shows, where bookings come from, languages and punctuality. */
export function Stats({ day, minute, loc, rooms }: { day: ClinicDay; minute: number; loc: LocationId; rooms: RoomView[] }) {
  const place = LOCATIONS[loc];
  const open = place.closes - place.opens - (LUNCH.to - LUNCH.from);
  const s = useMemo(() => {
    const all = day.visits;
    const live = all.filter((v) => !v.noShow);
    const started = live.filter((v) => minute >= v.begin);
    const newcomers = live.filter((v) => v.patient.firstVisit);
    const noShows = all.filter((v) => v.noShow);
    const sources = (Object.keys(SOURCE) as Source[]).map((k) => ({ key: k, value: all.filter((v) => v.source === k).length }));
    const langs = LOCALES.map((l) => ({ key: l, value: live.filter((v) => v.patient.lang === l).length })).sort((a, b) => b.value - a.value);
    const delays = started.map((v) => Math.max(0, v.begin - v.start));
    const onTime = delays.filter((d) => d < 5).length;
    const bins = [
      { label: 'op tijd', value: delays.filter((d) => d < 1).length },
      { label: '1–5', value: delays.filter((d) => d >= 1 && d < 5).length },
      { label: '5–10', value: delays.filter((d) => d >= 5 && d < 10).length },
      { label: '10–15', value: delays.filter((d) => d >= 10 && d < 15).length },
      { label: '15+', value: delays.filter((d) => d >= 15).length },
    ];
    const bySpecialty = SPECIALTIES.map((sp) => ({ sp, value: live.filter((v) => treatmentById(v.treatment).specialty === sp.id).length })).filter((x) => x.value);
    return { all, live, started, newcomers, noShows, sources, langs, delays, onTime, bins, bySpecialty };
  }, [day, Math.floor(minute)]);

  const chairs = roomsOf(loc).map(({ room, doctor }) => {
    const mine = s.live.filter((v) => v.room === room.id);
    const booked = mine.reduce((a, v) => a + v.minutes, 0) / open;
    const used = mine.filter((v) => minute >= v.begin).reduce((a, v) => a + Math.min(v.end, minute) - v.begin, 0) / open;
    return { room, doctor, booked: Math.min(1, booked), used: Math.min(1, used), view: rooms.find((r) => r.room.id === room.id) };
  });
  const maxLang = Math.max(1, ...s.langs.map((l) => l.value));
  const maxBin = Math.max(1, ...s.bins.map((b) => b.value));
  const avg = s.delays.length ? s.delays.reduce((a, b) => a + b, 0) / s.delays.length : 0;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="kicker">
            Cijfers van vandaag · {place.short} <Demo>Demo-cijfers</Demo>
          </div>
          <h1>
            De dag <em>in getallen</em>
          </h1>
          <p className="sub">Alles uit de demo-agenda en de app, tot dit moment.</p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi card">
          <span className="kpi-label">Afspraken</span>
          <b className="num">{s.live.length}</b>
          <small>{`${s.started.length} al begonnen`}</small>
        </div>
        <div className="kpi card">
          <span className="kpi-label">Nieuwe patiënten</span>
          <b className="num">{s.newcomers.length}</b>
          <small>gratis eerste controle</small>
        </div>
        <div className={`kpi card${s.noShows.length ? ' warn' : ''}`}>
          <span className="kpi-label">Niet gekomen</span>
          <b className="num">{s.noShows.length}</b>
          <small>{`${pct(s.noShows.length, s.all.length)}% van de afspraken`}</small>
        </div>
        <div className="kpi card">
          <span className="kpi-label">Op tijd begonnen</span>
          <b className="num">{pct(s.onTime, s.started.length)}%</b>
          <small>{`gemiddeld ${Math.round(avg)} min later`}</small>
        </div>
      </div>

      <div className="stats-grid">
        <section className="card stat wide">
          <h3>Stoelbezetting per kamer</h3>
          <ul className="chairs">
            {chairs.map((c) => (
              <li key={c.room.id}>
                <Avatar doctor={c.doctor} size={30} />
                <span className="ch-name">
                  <b>{c.room.name}</b>
                  <span>{c.doctor.name}</span>
                </span>
                <span className="ch-bar" title={`${Math.round(c.booked * 100)}% geboekt · ${Math.round(c.used * 100)}% gebruikt`}>
                  <i className="booked" style={{ width: `${c.booked * 100}%` }} />
                  <i className="used" style={{ width: `${c.used * 100}%` }} />
                </span>
                <span className="num ch-pct">{Math.round(c.booked * 100)}%</span>
                {c.view ? (
                  <span className="ch-now" style={{ '--c': ROOM_STATUS[c.view.status].color } as CSSProperties}>
                    <i />
                    {ROOM_STATUS[c.view.status].label}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="fine">
            <i className="key booked" /> geboekt <i className="key used" /> al gebruikt tot nu
          </p>
        </section>

        <section className="card stat">
          <h3>Waar de boekingen vandaan komen</h3>
          <div className="donut-wrap">
            <Donut parts={s.sources.map((x) => ({ value: x.value, color: SOURCE_COLORS[x.key], label: x.key }))} />
            <div className="donut-center">
              <b className="num">{pct(s.sources.find((x) => x.key === 'app')?.value ?? 0, s.all.length)}%</b>
              <span>via de app</span>
            </div>
          </div>
          <ul className="legend list">
            {s.sources.map((x) => (
              <li key={x.key}>
                <i style={{ background: SOURCE_COLORS[x.key] }} />
                <Icon name={SOURCE[x.key].icon} size={13} />
                <span>{SOURCE[x.key].label}</span>
                <b className="num">{x.value}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="card stat">
          <h3>Talen in de stoel vandaag</h3>
          <ul className="bars">
            {s.langs.map((l) => (
              <li key={l.key}>
                <span className="b-label" translate="no">
                  {LOCALE_NAMES[l.key]}
                </span>
                <span className="b-bar">
                  <i style={{ width: `${(l.value / maxLang) * 100}%` }} />
                </span>
                <b className="num">{l.value}</b>
              </li>
            ))}
          </ul>
          <p className="fine">Daarom spreekt de app zeven talen: uitleg, nazorg en toestemming in de eigen taal.</p>
        </section>

        <section className="card stat">
          <h3>Stiptheid</h3>
          <svg className="hist" viewBox="0 0 260 120" aria-hidden>
            {s.bins.map((b, i) => {
              const h = (b.value / maxBin) * 72;
              return (
                <g key={b.label}>
                  <rect x={12 + i * 50} y={96 - h} width="34" height={Math.max(2, h)} rx="6" className={i < 2 ? 'ok' : i < 3 ? 'warn' : 'alert'} />
                  <text x={29 + i * 50} y={90 - h} textAnchor="middle" className="v">
                    {b.value}
                  </text>
                  <text x={29 + i * 50} y={113} textAnchor="middle" className="l">
                    {b.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="fine">Minuten na de geplande begintijd. Uitloop meld je per tandarts; wie wacht ziet het in de app.</p>
        </section>

        <section className="card stat">
          <h3>Nieuwe patiënten</h3>
          {s.newcomers.length === 0 ? <p className="empty">Vandaag geen nieuwe patiënten.</p> : null}
          <ul className="people">
            {s.newcomers.slice(0, 6).map((v) => (
              <li key={v.id}>
                <span className="dot" style={{ background: SPECIALTY_COLORS[treatmentById(v.treatment).specialty] }} />
                <b>{shortName(v.patient.name)}</b>
                <span className="muted">{treatmentById(v.treatment).name}</span>
                <span className="num muted">{`${String(Math.floor(v.begin / 60)).padStart(2, '0')}:${String(v.begin % 60).padStart(2, '0')}`}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card stat">
          <h3>Niet gekomen</h3>
          {s.noShows.length === 0 ? <p className="empty">Iedereen is gekomen.</p> : null}
          <ul className="people">
            {s.noShows.map((v) => (
              <li key={v.id}>
                <span className="dot" style={{ background: 'var(--es-alert)' }} />
                <b>{shortName(v.patient.name)}</b>
                <span className="muted">{treatmentById(v.treatment).name}</span>
                <span className="num muted">{`${String(Math.floor(v.start / 60)).padStart(2, '0')}:${String(v.start % 60).padStart(2, '0')}`}</span>
              </li>
            ))}
          </ul>
          <p className="fine">De app herinnert een dag van tevoren en laat met één tik afzeggen, zodat de plek naar de wachtlijst gaat.</p>
        </section>

        <section className="card stat wide">
          <h3>Behandelingen per specialisme</h3>
          <div className="stack" role="img" aria-label="Behandelingen per specialisme">
            {s.bySpecialty.map((x) => (
              <span key={x.sp.id} style={{ flex: x.value, background: SPECIALTY_COLORS[x.sp.id] }} title={`${x.sp.name}: ${x.value}`} />
            ))}
          </div>
          <ul className="legend wrap">
            {s.bySpecialty.map((x) => (
              <li key={x.sp.id}>
                <i style={{ background: SPECIALTY_COLORS[x.sp.id] }} />
                {x.sp.name} <b className="num">{x.value}</b>
              </li>
            ))}
          </ul>
          <p className="fine">{`In de stoel nu: ${s.live.filter((v) => momentOf(v, minute).state === 'in-stoel').length} · wachtend: ${s.live.filter((v) => momentOf(v, minute).state === 'wachtkamer').length}`}</p>
        </section>
      </div>
    </div>
  );
}
