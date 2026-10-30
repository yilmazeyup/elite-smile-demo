import { CLINIC, doctorById, emit, LOCATIONS, occupancy, resetBridge, type BridgeEvent, type DoctorId, type LocationId, type RoomId } from '@smile/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useClinicClock } from './clock';
import { Aftercare } from './components/Aftercare';
import { Agenda } from './components/Agenda';
import { ClinicView } from './components/ClinicView';
import { DoctorDrawer } from './components/DoctorDrawer';
import { Header, TABS, type TabId } from './components/Header';
import { Icon } from './components/Icon';
import { LiveRail } from './components/LiveRail';
import { ShareSheet } from './components/ShareSheet';
import { Stats } from './components/Stats';
import { Sterilisation } from './components/Sterilisation';
import { TeamView } from './components/TeamView';
import { answered, describe, doctorNow, doctorsAt, roomViews, useBridge, useClinicDay } from './data';
import { useTheme } from './theme';

const fromHash = (): TabId => (TABS.find((t) => `#${t.id}` === window.location.hash)?.id ?? 'kliniek') as TabId;

const LOC_KEY = 'es-admin-location';
const storedLoc = (): LocationId => {
  try {
    const fromAddress = new URLSearchParams(window.location.search).get('locatie');
    if (fromAddress === 'hoogland' || fromAddress === 'eindhoven') return fromAddress;
    return localStorage.getItem(LOC_KEY) === 'hoogland' ? 'hoogland' : 'eindhoven';
  } catch {
    return 'eindhoven';
  }
};

/** What the panel itself sends back; everything else on the bridge comes from the app. */
const FROM_PANEL = new Set<BridgeEvent['kind']>(['pause-ok', 'reply', 'photo-reply', 'offer', 'delay']);

type Toast = { title: string; text?: string; tone?: 'app' | 'alert' | 'ok' };

export function App() {
  const [loc, setLoc] = useState<LocationId>(storedLoc);
  const clock = useClinicClock(loc);
  const now = clock.now;
  const minute = clock.minute;
  const theme = useTheme(now);
  const { state, refresh } = useBridge();
  const day = useClinicDay(now, loc, state);
  const [tab, setTab] = useState<TabId>(fromHash);
  const [seen, setSeen] = useState<Set<TabId>>(() => new Set([fromHash()]));
  const [selected, setSelected] = useState<DoctorId | null>(null);
  const [share, setShare] = useState<DoctorId | null>(null);
  const [focus, setFocus] = useState<{ id: DoctorId; n: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const rooms = useMemo(() => roomViews(day, minute), [day, Math.floor(minute * 6)]);
  // In development the day can be inspected from the console.
  if (import.meta.env.DEV) (window as unknown as { __day: unknown }).__day = day;
  const doctors = useMemo(() => doctorsAt(loc).map((d) => doctorNow(day, d.id, minute)), [day, loc, Math.floor(minute * 2)]);
  const order = useMemo(() => doctors.map((d) => d.doctor.id), [doctors]);
  const occ = useMemo(() => Object.fromEntries(order.map((id) => [id, occupancy(day.day, id, loc)])) as Partial<Record<DoctorId, number>>, [day.day.getTime(), loc, order.join()]);

  useEffect(() => {
    const onHash = () => go(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: TabId) => {
    setTab(id);
    setSeen((s) => (s.has(id) ? s : new Set(s).add(id)));
    if (window.location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  };

  const chooseLoc = (next: LocationId) => {
    setLoc(next);
    try {
      localStorage.setItem(LOC_KEY, next);
    } catch {
      // The choice lasts for this page.
    }
    if (selected && !doctorsAt(next).some((d) => d.id === selected)) setSelected(null);
  };

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Something fresh from the app: say so, so the link between the two screens is seen.
  const last = state.events[state.events.length - 1];
  const lastSeen = useRef<string | null>(last?.id ?? null);
  useEffect(() => {
    if (!last || last.id === lastSeen.current) return;
    lastSeen.current = last.id;
    if (FROM_PANEL.has(last.kind) || Date.now() - last.at > 8000) return;
    const d = describe(last, state);
    setToast({ title: d.title, text: d.text, tone: d.tone === 'alert' || d.tone === 'urgent' ? 'alert' : 'app' });
  }, [last?.id]);

  const changed = useCallback(
    (t?: Toast) => {
      refresh();
      if (t) setToast({ tone: 'ok', ...t });
    },
    [refresh],
  );

  const pauseOk = (room: RoomId, doctor: DoctorId) => {
    emit({ kind: 'pause-ok', room, by: doctor });
    changed({ title: `${doctorById(doctor).name} heeft de pauze gezien`, text: 'Layla ziet het meteen in de app' });
  };
  const delay = (doctor: DoctorId, minutes: number) => {
    emit({ kind: 'delay', doctor, minutes });
    changed({ title: `${doctorById(doctor).name} loopt ${minutes} min uit`, text: 'Wie wacht, ziet het meteen in de app' });
  };
  const reset = () => {
    resetBridge();
    setSelected(null);
    changed({ title: 'De demo begint opnieuw', text: 'Alles uit de app is gewist, ook hier' });
  };
  const pick = useCallback((id: DoctorId) => setSelected(id), []);
  const close = useCallback(() => setSelected(null), []);

  const open = state.events.filter((e) => !answered(e, state)).length;
  const status = selected ? doctors.find((d) => d.doctor.id === selected) ?? null : null;
  const rail = <LiveRail state={state} now={now} loc={loc} day={day} onChange={changed} />;

  return (
    <div className={`app tab-${tab}${selected ? ' drawer-open' : ''}`}>
      <a className="skip" href="#main">
        Naar de inhoud
      </a>
      <Header loc={loc} onLoc={chooseLoc} clock={clock} theme={theme} onReset={reset} tab={tab} onTab={go} badges={{ kliniek: open }} />
      <main id="main">
        <div className="view view-3d" hidden={tab !== 'kliniek'}>
          {seen.has('kliniek') ? (
            <ClinicView
              loc={loc}
              day={day}
              minute={minute}
              speed={clock.speed}
              rooms={rooms}
              doctors={doctors}
              selected={selected}
              theme={theme.mode}
              active={tab === 'kliniek'}
              focus={focus}
              onDoctor={pick}
              onPauseOk={pauseOk}
              rail={rail}
            />
          ) : null}
        </div>
        <div className="view view-3d" hidden={tab !== 'team'}>
          {seen.has('team') ? <TeamView doctors={doctors} occupancy={occ} selected={selected} theme={theme.mode} active={tab === 'team'} onDoctor={pick} /> : null}
        </div>
        {tab === 'agenda' ? <Agenda day={day} minute={minute} loc={loc} doctors={doctors} onDoctor={pick} onDelay={delay} /> : null}
        {tab === 'nazorg' ? <Aftercare now={now} loc={loc} state={state} onToast={(t) => setToast({ tone: 'ok', ...t })} onOpenRail={() => go('kliniek')} /> : null}
        {tab === 'sterilisatie' ? <Sterilisation day={day} minute={minute} loc={loc} /> : null}
        {tab === 'cijfers' ? <Stats day={day} minute={minute} loc={loc} rooms={rooms} /> : null}
        {tab !== 'kliniek' && tab !== 'team' ? (
          <footer className="honesty">
            <span>
              {CLINIC.legal} · {LOCATIONS[loc].street}, {LOCATIONS[loc].city}
            </span>
            <span>Demo: patiënten, agenda, kamers, assistenten en cijfers zijn verzonnen. Namen, titels en foto’s van de tandartsen komen van elitesmile.nl.</span>
          </footer>
        ) : null}
      </main>

      <DoctorDrawer
        id={selected}
        order={order}
        now={now}
        minute={minute}
        loc={loc}
        day={day}
        status={status}
        onClose={close}
        onPick={pick}
        onShare={setShare}
        onDelay={delay}
        onShow3d={(id) => {
          go('kliniek');
          setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
        }}
      />
      <ShareSheet id={share} onClose={() => setShare(null)} />

      {toast ? (
        <div className={`toast glass tone-${toast.tone ?? 'ok'}`} role="status" key={toast.title + (toast.text ?? '')}>
          <span className="toast-icon">
            <Icon name={toast.tone === 'alert' ? 'alert' : toast.tone === 'app' ? 'app' : 'check'} size={16} />
          </span>
          <span className="toast-text">
            {toast.tone === 'app' || toast.tone === 'alert' ? <em>Uit de app</em> : null}
            <b>{toast.title}</b>
            {toast.text ? <span>{toast.text}</span> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
