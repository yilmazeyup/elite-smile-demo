import type { DoctorId, ThemeMode } from '@smile/shared';
import { useEffect, useRef, useState } from 'react';

import { BUSY_COLORS, type DoctorNow } from '../data';
import { LINEUP_VIEW, LineupScene } from '../three/lineup';
import { Stage } from '../three/stage';

type Props = {
  doctors: DoctorNow[];
  occupancy: Partial<Record<DoctorId, number>>;
  selected: DoctorId | null;
  theme: ThemeMode;
  active: boolean;
  onDoctor: (id: DoctorId) => void;
};

/** The team in a studio, like choosing a character: podiums as high as each day is full. */
export function TeamView({ doctors, occupancy, selected, theme, active, onDoctor }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const stage = useRef<Stage | null>(null);
  const scene = useRef<LineupScene | null>(null);
  const pick = useRef(onDoctor);
  pick.current = onDoctor;
  const [failed, setFailed] = useState(false);
  const ids = doctors.map((d) => d.doctor.id).join(',');

  useEffect(() => {
    if (!host.current) return;
    let s: Stage;
    try {
      s = new Stage(host.current, {
        camera: LINEUP_VIEW.camera,
        target: LINEUP_VIEW.target,
        intro: [LINEUP_VIEW.camera[0] + 3, LINEUP_VIEW.camera[1] + 2.5, LINEUP_VIEW.camera[2] + 7],
        fov: 32,
        minDistance: 4,
        maxDistance: 15,
        minPolarAngle: 1.05,
        maxPolarAngle: 1.56,
        minAzimuthAngle: -0.6,
        maxAzimuthAngle: 0.6,
        pan: false,
        fitAspect: 1.45,
      });
    } catch {
      setFailed(true);
      return;
    }
    stage.current = s;
    scene.current = new LineupScene(s, (id) => pick.current(id), ids.split(',') as DoctorId[]);
    return () => {
      scene.current?.dispose();
      scene.current = null;
      stage.current = null;
      s.dispose();
    };
  }, [ids]);

  useEffect(() => {
    scene.current?.update({ doctors, occupancy, selected });
  }, [doctors, occupancy, selected, ids]);

  useEffect(() => {
    scene.current?.setTheme(theme);
  }, [theme, ids]);

  useEffect(() => {
    if (stage.current) stage.current.active = active;
  }, [active, ids]);

  useEffect(() => {
    if (active) scene.current?.focus(selected);
  }, [selected, active]);

  return (
    <div className="team-view">
      <div className="scene-host" ref={host} />
      {failed ? <div className="no-gl">3D is op dit apparaat niet beschikbaar.</div> : null}
      <section className="team-title">
        <div className="kicker">Het team · vandaag</div>
        <h1>
          Kies een <em>tandarts</em>
        </h1>
        <p>Klik op een tandarts voor de agenda, de bezetting, de gegevens en de eigen pagina om te delen.</p>
      </section>
      <section className="team-legend glass">
        <div>
          <span className="podium-icon" aria-hidden>
            <i style={{ height: 6 }} />
            <i style={{ height: 12 }} />
            <i style={{ height: 18 }} />
          </span>
          <span>Hoe hoger het podium, hoe voller de dag</span>
        </div>
        <div className="bobs">
          <span>
            <i className="bob" style={{ background: BUSY_COLORS.vrij }} />
            vrij of bijna vrij
          </span>
          <span>
            <i className="bob" style={{ background: BUSY_COLORS.bezig }} />
            bezig
          </span>
          <span>
            <i className="bob" style={{ background: BUSY_COLORS.vol }} />
            vol of uitloop
          </span>
        </div>
      </section>
    </div>
  );
}
