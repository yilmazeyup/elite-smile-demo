import { LOCATIONS, tr, type DoctorId, type LocationId, type RoomId, type ThemeMode } from '@smile/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ROOM_STATUS, type ClinicDay, type DoctorNow, type RoomView } from '../data';
import { ClinicScene, overviewView } from '../three/clinic';
import { Stage } from '../three/stage';
import { Icon } from './Icon';
import { Avatar } from './ui';

type Props = {
  loc: LocationId;
  day: ClinicDay;
  minute: number;
  speed: number;
  rooms: RoomView[];
  doctors: DoctorNow[];
  selected: DoctorId | null;
  theme: ThemeMode;
  active: boolean;
  /** A request to fly to a dentist's room (from the drawer); `n` makes the same request count again. */
  focus: { id: DoctorId; n: number } | null;
  onDoctor: (id: DoctorId) => void;
  onPauseOk: (room: RoomId, doctor: DoctorId) => void;
  rail: ReactNode;
};

/** The clinic in 3D, live: one WebGL view per location, fed with the day every tick, with glass panels over it. */
export function ClinicView({ loc, day, minute, speed, rooms, doctors, selected, theme, active, focus, onDoctor, onPauseOk, rail }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const stage = useRef<Stage | null>(null);
  const scene = useRef<ClinicScene | null>(null);
  const handlers = useRef({ doctor: onDoctor, pauseOk: onPauseOk });
  handlers.current = { doctor: onDoctor, pauseOk: onPauseOk };
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<'overzicht' | RoomId>('overzicht');

  useEffect(() => {
    if (!host.current) return;
    let s: Stage;
    try {
      const v = overviewView(loc);
      s = new Stage(host.current, {
        camera: v.camera,
        target: v.target,
        intro: [v.camera[0] - 14, v.camera[1] + 12, v.camera[2] + 16],
        fov: 30,
        minDistance: 4.5,
        maxDistance: loc === 'hoogland' ? 34 : 46,
        minPolarAngle: 0.2,
        maxPolarAngle: 1.32,
        bounds: loc === 'hoogland' ? { minX: -6, maxX: 6, minZ: -7, maxZ: 6, minY: 0, maxY: 2 } : { minX: -12, maxX: 12, minZ: -7.5, maxZ: 6.5, minY: 0, maxY: 2 },
        fitAspect: 1.2,
        // The rail covers the right side: the model centres in what is left.
        shift: (width) => (width < 760 ? 0 : width < 1200 ? 166 : 176),
        safeTop: 128,
      });
    } catch {
      setFailed(true);
      return;
    }
    stage.current = s;
    if (import.meta.env.DEV) Object.assign(window, { __stage: s });
    scene.current = new ClinicScene(s, { doctor: (id) => handlers.current.doctor(id), room: (id) => setView(id), pauseOk: (r, d) => handlers.current.pauseOk(r, d) }, loc);
    if (import.meta.env.DEV) Object.assign(window, { __clinic: scene.current });
    setView('overzicht');
    return () => {
      scene.current?.dispose();
      scene.current = null;
      stage.current = null;
      s.dispose();
    };
  }, [loc]);

  useEffect(() => {
    scene.current?.update({ day, minute, speed, rooms, doctors, selected });
  }, [day, minute, speed, rooms, doctors, selected, loc]);

  useEffect(() => {
    scene.current?.setTheme(theme);
  }, [theme, loc]);

  useEffect(() => {
    if (stage.current) stage.current.active = active;
  }, [active, loc]);

  useEffect(() => {
    if (!focus || !scene.current) return;
    scene.current.focusDoctor(focus.id);
    const room = rooms.find((r) => r.doctor.id === focus.id);
    if (room) setView(room.room.id);
  }, [focus?.n]);

  const go = (id: 'overzicht' | RoomId) => {
    setView(id);
    if (id === 'overzicht') scene.current?.overview();
    else scene.current?.focusRoom(id);
  };

  const open = LOCATIONS[loc];
  const busy = rooms.filter((r) => r.current).length;
  const waiting = day.visits.filter((v) => !v.noShow && minute >= v.arrive && minute < v.begin).length;
  const late = rooms.filter((r) => r.status === 'uitloop').length;
  const pauses = rooms.filter((r) => r.pause).length;

  return (
    <div className="clinic-view">
      <div className="scene-host" ref={host} />
      {failed ? <div className="no-gl">3D is op dit apparaat niet beschikbaar. De agenda en de cijfers werken gewoon.</div> : null}

      <section className="now-card glass" aria-live="polite">
        <div className="kicker">
          <span className="pulse-dot" /> Nu in de kliniek · {open.short}
        </div>
        <div className="now-row">
          <div className="now-main">
            <span className="big num">{busy}</span>
            <span className="of">van {rooms.length} stoelen bezet</span>
          </div>
          <span className="now-stat">
            <b className="num">{waiting}</b>
            <span>wachtend</span>
          </span>
          <span className={`now-stat${late ? ' warn' : ''}`}>
            <b className="num">{late}</b>
            <span>uitloop</span>
          </span>
          <span className={`now-stat${pauses ? ' alert' : ''}`}>
            <b className="num">{pauses}</b>
            <span>pauze</span>
          </span>
        </div>
      </section>

      <div className="room-dock glass" role="toolbar" aria-label="Camera">
        <button className={view === 'overzicht' ? 'on' : ''} onClick={() => go('overzicht')}>
          <Icon name="home" size={15} />
          <span>Overzicht</span>
        </button>
        <span className="sep" />
        {rooms.map((r) => (
          <button key={r.room.id} className={view === r.room.id ? 'on' : ''} onClick={() => go(r.room.id)} title={`${tr(r.room.name)} · ${r.doctor.name} · ${tr(ROOM_STATUS[r.status].label)}`}>
            <i className="dot" style={{ background: ROOM_STATUS[r.status].color }} data-pulse={r.status === 'pauze' ? '1' : undefined} />
            <span translate="no">K{r.room.id.slice(1)}</span>
          </button>
        ))}
      </div>

      <div className="team-dock glass" role="list" aria-label="Tandartsen">
        {doctors.map((d) => (
          <button key={d.doctor.id} role="listitem" className={`doc${selected === d.doctor.id ? ' on' : ''}`} onClick={() => onDoctor(d.doctor.id)} title={`${d.doctor.name} · ${d.doctor.title}`}>
            <Avatar doctor={d.doctor} size={38} ring={d.color} />
            <span className="doc-name">{d.doctor.name.replace('Dr. ', '')}</span>
          </button>
        ))}
      </div>

      <div className="scene-foot">
        <ul className="legend wrap">
          {(['vrij', 'bezig', 'uitloop', 'pauze'] as const).map((s) => (
            <li key={s}>
              <i style={{ background: ROOM_STATUS[s].color }} />
              {ROOM_STATUS[s].label}
            </li>
          ))}
        </ul>
        <p className="scene-hint">Sleep om te draaien · scroll om te zoomen · dubbelklik op een kamer · klik op een tandarts</p>
      </div>

      {rail}
    </div>
  );
}
