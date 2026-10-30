import { healthFlagById, SPECIALTY_COLORS, specialtyById, type Doctor, type HealthFlag, type Source, type SpecialtyId, type VisitState } from '@smile/shared';
import type { CSSProperties, ReactNode } from 'react';

import { Icon } from './Icon';

/** The portrait from elitesmile.nl, served next to the panel. */
export const photoUrl = (d: Doctor) => `${import.meta.env.BASE_URL}team/${d.photo}.webp`;

/** A round avatar zoomed on the face in the portrait (the face circle from team.ts, with a little room around it). */
export function Avatar({ doctor, size = 36, ring, className }: { doctor: Doctor; size?: number; ring?: string; className?: string }) {
  const { x, y, r } = doctor.face;
  const span = r * 2.5;
  const scale = size / span;
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(${photoUrl(doctor)})`,
    backgroundSize: `${800 * scale}px ${800 * scale}px`,
    backgroundPosition: `${-(x - span / 2) * scale}px ${-(y - span / 2 + r * 0.12) * scale}px`,
    boxShadow: ring ? `0 0 0 2px var(--es-paper), 0 0 0 ${size > 40 ? 4 : 3.5}px ${ring}` : undefined,
  };
  return <span className={`avatar${className ? ` ${className}` : ''}`} style={style} role="img" aria-label={doctor.name} />;
}

/** A ring that fills to `value` (0 … 1), with whatever goes in the middle. */
export function Ring({ value, size = 120, stroke = 10, color = 'var(--es-blue)', track = 'var(--es-line)', children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * Math.max(0.001, Math.min(1, value))} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-arc"
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

/** A small line over days, with its last point marked; `max` fixes the scale (pain 10, swelling 3). */
export function Spark({ values, max, color = 'var(--es-blue)', width = 120, height = 34, alertFrom }: { values: number[]; max: number; color?: string; width?: number; height?: number; alertFrom?: number }) {
  if (values.length === 0) return <svg width={width} height={height} aria-hidden />;
  const step = values.length > 1 ? (width - 8) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [4 + i * step, height - 4 - (v / max) * (height - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${height - 2} L${pts[0][0].toFixed(1)} ${height - 2} Z`;
  const last = pts[pts.length - 1];
  const id = `sp${Math.round(values.reduce((a, b) => a * 31 + b, 7)) % 99991}`;
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {alertFrom !== undefined ? <line x1="0" x2={width} y1={height - 4 - (alertFrom / max) * (height - 8)} y2={height - 4 - (alertFrom / max) * (height - 8)} stroke="var(--es-alert)" strokeDasharray="2 3" strokeOpacity="0.5" /> : null}
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--es-paper)" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export const STATE_LABEL: Record<VisitState, string> = {
  gepland: 'Gepland',
  wachtkamer: 'In de wachtkamer',
  'in-stoel': 'In de stoel',
  klaar: 'Klaar',
  'no-show': 'Niet gekomen',
};

export function StateBadge({ state, compact }: { state: VisitState; compact?: boolean }) {
  return (
    <span className={`state state-${state}`}>
      <i />
      {compact ? null : STATE_LABEL[state]}
    </span>
  );
}

const FLAG_ICON: Record<HealthFlag, string> = {
  bloedverdunner: 'drop',
  botmedicijn: 'bone',
  hartklep: 'heart',
  diabetes: 'drop',
  zwanger: 'baby',
  'allergie-penicilline': 'alert',
  'allergie-latex': 'alert',
  'allergie-verdoving': 'alert',
  'allergie-ibuprofen': 'pill',
  roken: 'smoke',
  bestraling: 'radiation',
  epilepsie: 'zap',
  astma: 'wind',
  angst: 'smile',
};

/** The health notes as small icons; the label and why it matters on hover. */
export function Flags({ flags, size = 13 }: { flags: HealthFlag[]; size?: number }) {
  if (!flags.length) return null;
  return (
    <span className="flags">
      {flags.map((f) => {
        const flag = healthFlagById(f);
        return (
          <span key={f} className={`flag flag-${flag.severity}`} title={`${flag.label} — ${flag.why}`}>
            <Icon name={FLAG_ICON[f]} size={size} />
          </span>
        );
      })}
    </span>
  );
}

export const SOURCE: Record<Source, { label: string; icon: string }> = {
  app: { label: 'App', icon: 'app' },
  website: { label: 'Website', icon: 'globe' },
  telefoon: { label: 'Telefoon', icon: 'phone' },
  whatsapp: { label: 'WhatsApp', icon: 'whatsapp' },
  balie: { label: 'Balie', icon: 'desk' },
};

export function SourceIcon({ source, size = 13 }: { source: Source; size?: number }) {
  return (
    <span className={`source source-${source}`} title={`Geboekt via ${SOURCE[source].label}`}>
      <Icon name={SOURCE[source].icon} size={size} />
    </span>
  );
}

export function SpecialtyChip({ id }: { id: SpecialtyId }) {
  return (
    <span className="chip" style={{ '--c': SPECIALTY_COLORS[id] } as CSSProperties}>
      <i />
      {specialtyById(id).name}
    </span>
  );
}

/** A quiet marker on what is made up for the demo. */
export function Demo({ children = 'Demo' }: { children?: ReactNode }) {
  return <span className="demo-tag">{children}</span>;
}

/** "10:05" from minutes after midnight. */
export const hm = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;
