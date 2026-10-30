import { useEffect, type CSSProperties } from 'react';

const CSS = `
@keyframes kgDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes kgPop{0%{opacity:0;transform:scale(.6) rotate(var(--r))}60%{opacity:1;transform:scale(1.08) rotate(var(--r))}100%{opacity:1;transform:scale(1) rotate(var(--r))}}
[data-kg] path,[data-kg] circle,[data-kg] polyline{stroke-dasharray:1;stroke-dashoffset:1;animation:kgDraw 1.1s cubic-bezier(.6,.05,.3,1) both}
@media (prefers-reduced-motion:reduce){[data-kg] path,[data-kg] circle,[data-kg] polyline{animation:none;stroke-dashoffset:0}[data-kg]{animation:none!important;opacity:1!important}}
`;

type Doodle = { top: string; left?: string; right?: string; size: number; rot: number; color: string; d: string[]; delay: number };

/** Marker doodles, drawn in a 100 × 100 box. */
const DOODLES: Doodle[] = [
  { top: '0.4%', right: '6%', size: 74, rot: 12, color: '#FFB12E', delay: 0, d: ['M12 70L20 30L38 52L50 22L62 52L80 30L88 70Z', 'M14 82H86'] },
  { top: '9%', left: '-2%', size: 58, rot: -18, color: '#FF7AA8', d: ['M50 20C70 0 100 30 50 80C0 30 30 0 50 20Z'], delay: 0.25 },
  { top: '21%', right: '-3%', size: 66, rot: 8, color: '#2DB4E8', d: ['M50 50m-6 0a6 6 0 1 1 12 0a12 12 0 1 1-24 0a18 18 0 1 1 36 0a24 24 0 1 1-48 0a30 30 0 1 1 60 0'], delay: 0.45 },
  { top: '34%', left: '-3%', size: 54, rot: -8, color: '#17BFA3', d: ['M50 8L60 38L92 40L66 58L76 90L50 70L24 90L34 58L8 40L40 38Z'], delay: 0.6 },
  { top: '47%', right: '-1%', size: 60, rot: -14, color: '#8E7CF8', d: ['M10 60C25 40 35 80 50 60S75 40 90 60', 'M10 78C25 58 35 98 50 78S75 58 90 78'], delay: 0.75 },
  { top: '59%', left: '-1%', size: 52, rot: 20, color: '#FFB12E', d: ['M20 80L80 20', 'M50 20H80V50'], delay: 0.9 },
  { top: '72%', right: '2%', size: 56, rot: 6, color: '#FF7AA8', d: ['M20 30L32 42L44 30', 'M56 30L68 42L80 30', 'M24 64C36 84 64 84 76 64'], delay: 1.05 },
  { top: '85%', left: '1%', size: 50, rot: -10, color: '#2DB4E8', d: ['M50 10V30M50 70V90M10 50H30M70 50H90M22 22L36 36M64 64L78 78M78 22L64 36M36 64L22 78'], delay: 1.2 },
];

/**
 * The hidden layer the golden key opens: marker doodles that draw themselves over the Kinderhoek, the way the
 * Renaissance Edition's key reveals its graffiti.
 */
export function KidsGraffiti({ open }: { open: boolean }) {
  useEffect(() => {
    if (document.getElementById('kids-graffiti-css')) return;
    const s = document.createElement('style');
    s.id = 'kids-graffiti-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }, []);
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, mixBlendMode: 'multiply' }} aria-hidden>
      {DOODLES.map((g, i) => {
        const style = {
          position: 'absolute',
          top: g.top,
          left: g.left,
          right: g.right,
          width: g.size,
          height: g.size,
          '--r': `${g.rot}deg`,
          transform: `rotate(${g.rot}deg)`,
          opacity: 0,
          animation: `kgPop .5s cubic-bezier(.2,.9,.25,1.2) ${g.delay}s both`,
        } as CSSProperties;
        return (
          <svg key={i} data-kg="" viewBox="0 0 100 100" style={style}>
            {g.d.map((d, k) => (
              <path key={k} d={d} pathLength={1} fill="none" stroke={g.color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${g.delay + 0.1 + k * 0.25}s`, opacity: 0.9 }} />
            ))}
          </svg>
        );
      })}
    </div>
  );
}
