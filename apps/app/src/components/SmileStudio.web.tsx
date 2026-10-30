import { Asset } from 'expo-asset';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { tr } from '../i18n';
import { findMouth, loadImage, mouthCrop, prepare, render, SAMPLE_MOUTH, shiftTo, type Prepared, type Pt, type Shift } from '../lib/smileEngine';
import { PHOTOS } from '../photos';
import { FONT } from '../theme';
import { prefersReducedMotion } from './ui';

export type StudioStatus = 'loading' | 'scanning' | 'found' | 'measured' | 'none' | 'error';
export type StudioInfo = { status: StudioStatus; estimate: string | null; own: boolean };

export type SmileStudioProps = {
  /** A data URL of the patient's own photo, or null for the sample photo. */
  photo: string | null;
  shade: string;
  /** The shade the "before" side is set to (the sample photo, at the patient's measured shade), or null for as taken. */
  before: string | null;
  facings: boolean;
  onInfo?: (info: StudioInfo) => void;
  style?: StyleProp<ViewStyle>;
};

const CSS = `
@keyframes ssScan{0%{transform:translateX(-110%)}100%{transform:translateX(390%)}}
@keyframes ssDot{0%{opacity:0;transform:scale(.2)}35%{opacity:1;transform:scale(1.35)}60%{transform:scale(1)}85%{opacity:1}100%{opacity:0}}
@keyframes ssLine{0%{stroke-dashoffset:1;opacity:0}20%{opacity:1}70%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
@keyframes ssBreath{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.45),0 10px 30px -8px rgba(6,13,31,.55)}50%{box-shadow:0 0 0 9px rgba(255,255,255,0),0 10px 30px -8px rgba(6,13,31,.55)}}
[data-ss-knob]:focus-visible{outline:2px solid #2DB4E8;outline-offset:4px}
@media (prefers-reduced-motion:reduce){[data-ss-anim]{animation:none!important;opacity:0!important}[data-ss-knob]{animation:none!important}}
`;

function useStudioCss() {
  useEffect(() => {
    if (document.getElementById('smile-studio-css')) return;
    const s = document.createElement('style');
    s.id = 'smile-studio-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }, []);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: Shift, b: Shift, t: number): Shift => ({ dL: a.dL + (b.dL - a.dL) * t, da: a.da + (b.da - a.da) * t, db: a.db + (b.db - a.db) * t, facings: a.facings + (b.facings - a.facings) * t });

/**
 * The photo with a before/after line you drag: on the left the smile as it is (or at the patient's measured shade),
 * on the right the enamel moved toward the chosen VITA tab. While the face model looks for the mouth a soft light runs
 * over it; when it is found, the lip line lights up for a moment.
 */
export function SmileStudio({ photo, shade, before, facings, onInfo, style }: SmileStudioProps) {
  useStudioCss();
  const box = useRef<HTMLDivElement | null>(null);
  const beforeRef = useRef<HTMLCanvasElement | null>(null);
  const afterRef = useRef<HTMLCanvasElement | null>(null);
  const [prep, setPrep] = useState<Prepared | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [status, setStatus] = useState<StudioStatus>('loading');
  const [split, setSplit] = useState(0.5);
  const [flash, setFlash] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const shown = useRef<Shift | null>(null);
  const out = useRef<ImageData | null>(null);
  const info = useRef(onInfo);
  info.current = onInfo;

  // The box's size decides the frame's shape.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 10 && r.height > 10) setSize((s) => (s && Math.abs(s.w - r.width) < 24 && Math.abs(s.h - r.height) < 24 ? s : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load the photo, find the mouth, and prepare the enamel.
  useEffect(() => {
    if (!size) return;
    let live = true;
    const aspect = size.h / size.w;
    const outW = Math.min(980, Math.round(size.w * Math.min(2, window.devicePixelRatio || 1)));
    setPrep(null);
    setPlain(null);
    setStatus('loading');
    shown.current = null;
    (async () => {
      let image: HTMLCanvasElement;
      try {
        image = await loadImage(photo ?? Asset.fromModule(PHOTOS.smile).uri, 1600);
      } catch {
        if (live) setStatus('error');
        return;
      }
      if (!live) return;
      /** Points in the loaded image's pixels. */
      const use = (pts: Pt[]) => prepare(image, pts, mouthCrop(pts, image.width, image.height, aspect), outW);
      // The sample shows at once with its measured lip line; the model then checks it.
      const k = image.width / 1400;
      if (!photo) setPrep(use(SAMPLE_MOUTH.map((p) => ({ x: p.x * k, y: p.y * k }))));
      else setPlain(image.toDataURL('image/jpeg', 0.9));
      setStatus('scanning');
      // The page settles in first; then the model loads.
      await new Promise((r) => setTimeout(r, 700));
      if (!live) return;
      const started = performance.now();
      let mouth: Pt[] | null = null;
      try {
        mouth = await findMouth(image, photo ? 20000 : 9000);
      } catch {
        mouth = null;
      }
      // Let the light run over the mouth for a moment, also when the model is quick.
      const wait = Math.max(0, 900 - (performance.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (!live) return;
      if (mouth) {
        setPrep(use(mouth));
        setPlain(null);
        setStatus('found');
      } else if (!photo) setStatus('measured');
      else setStatus('none');
      setFlash((f) => f + 1);
    })();
    return () => {
      live = false;
    };
  }, [photo, size]);

  useEffect(() => {
    info.current?.({ status, estimate: prep?.estimate ?? null, own: !!photo });
  }, [status, prep, photo]);

  // The before side.
  useEffect(() => {
    const c = beforeRef.current;
    if (!c || !prep) return;
    c.width = prep.w;
    c.height = prep.h;
    const g = c.getContext('2d')!;
    if (!before) g.putImageData(prep.base, 0, 0);
    else {
      const img = new ImageData(prep.w, prep.h);
      render(prep, shiftTo(prep, before), img);
      g.putImageData(img, 0, 0);
    }
  }, [prep, before]);

  // The after side: glides to a new shade in a few frames.
  useEffect(() => {
    const c = afterRef.current;
    if (!c || !prep) return;
    if (c.width !== prep.w || c.height !== prep.h) {
      c.width = prep.w;
      c.height = prep.h;
    }
    const g = c.getContext('2d')!;
    if (!out.current || out.current.width !== prep.w || out.current.height !== prep.h) out.current = new ImageData(prep.w, prep.h);
    const target = shiftTo(prep, shade, prep.estimate, facings ? 1 : 0);
    const from = shown.current ?? (before ? shiftTo(prep, before) : { dL: 0, da: 0, db: 0, facings: 0 });
    const still = prefersReducedMotion() || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const ms = still ? 0 : 520;
    let raf = 0;
    const step = () => {
      const t = ms ? Math.min(1, (performance.now() - t0) / ms) : 1;
      const s = mix(from, target, ease(t));
      shown.current = s;
      render(prep, s, out.current!);
      g.putImageData(out.current!, 0, 0);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [prep, shade, facings, before]);

  // Once ready, the line sweeps in from the right and settles in the middle.
  const swept = useRef(false);
  useEffect(() => {
    if (!prep || swept.current) return;
    swept.current = true;
    if (prefersReducedMotion() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 1300);
      const k = 1 - Math.pow(1 - t, 3);
      setSplit(0.9 - 0.4 * k);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [prep]);

  // Dragging the line.
  const dragging = useRef(false);
  const at = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setSplit(Math.max(0.02, Math.min(0.98, (clientX - r.left) / r.width)));
  };

  const mouth = prep?.mouth;
  const bbox = mouth
    ? (() => {
        const xs = mouth.map((p) => p.x);
        const ys = mouth.map((p) => p.y);
        return { x: Math.min(...xs) / prep!.w, y: Math.min(...ys) / prep!.h, w: (Math.max(...xs) - Math.min(...xs)) / prep!.w, h: (Math.max(...ys) - Math.min(...ys)) / prep!.h };
      })()
    : null;

  const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' };
  const label = (side: 'left' | 'right', visible: boolean): CSSProperties => ({
    position: 'absolute',
    top: 14,
    [side]: 14,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(8,16,38,.46)',
    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
    backdropFilter: 'blur(12px) saturate(150%)',
    border: '1px solid rgba(255,255,255,.16)',
    color: '#fff',
    font: `500 10.5px/14px ${FONT.mono}`,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    opacity: visible ? 1 : 0,
    transition: 'opacity .3s ease',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });

  const ready = !!prep;
  const pct = `${(split * 100).toFixed(2)}%`;

  return (
    <View style={[{ borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B1A3A' }, style]}>
      <div
        ref={box}
        onPointerDown={(e) => {
          if (!ready) return;
          dragging.current = true;
          try {
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          } catch {
            // Not a tracked pointer: dragging still works inside the photo.
          }
          at(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) at(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        style={{ position: 'absolute', inset: 0, touchAction: 'pan-y', cursor: ready ? 'ew-resize' : 'default', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {plain ? <img src={plain} alt="" style={{ ...fill, objectFit: 'contain' }} /> : null}
        <canvas ref={beforeRef} style={{ ...fill, objectFit: 'cover', opacity: ready ? 1 : 0, transition: 'opacity .5s ease' }} />
        <div style={{ ...fill, clipPath: `inset(0 0 0 ${pct})`, WebkitClipPath: `inset(0 0 0 ${pct})`, opacity: ready ? 1 : 0, transition: 'opacity .5s ease' }}>
          <canvas ref={afterRef} style={{ ...fill, objectFit: 'cover' }} />
        </div>

        {/* the light that looks for the mouth */}
        {status === 'scanning' ? (
          <div
            style={{
              position: 'absolute',
              left: bbox ? `${(bbox.x - bbox.w * 0.15) * 100}%` : '18%',
              top: bbox ? `${(bbox.y - bbox.h * 0.6) * 100}%` : '30%',
              width: bbox ? `${bbox.w * 130}%` : '64%',
              height: bbox ? `${bbox.h * 220}%` : '40%',
              overflow: 'hidden',
              pointerEvents: 'none',
              WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%,#000 45%,transparent 100%)',
              maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%,#000 45%,transparent 100%)',
            }}
          >
            <div
              data-ss-anim=""
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '26%',
                background: 'linear-gradient(90deg,rgba(45,180,232,0),rgba(127,211,242,.22) 35%,rgba(255,255,255,.62) 50%,rgba(127,211,242,.22) 65%,rgba(45,180,232,0))',
                mixBlendMode: 'screen',
                animation: 'ssScan 1.7s cubic-bezier(.45,0,.25,1) infinite',
              }}
            />
          </div>
        ) : null}

        {/* the lip line, lit for a moment when found */}
        {mouth && flash && (status === 'found' || status === 'measured') ? (
          <svg key={flash} viewBox={`0 0 ${prep!.w} ${prep!.h}`} preserveAspectRatio="xMidYMid slice" style={{ ...fill, pointerEvents: 'none' }}>
            <polygon
              data-ss-anim=""
              points={mouth.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              pathLength={1}
              fill="none"
              stroke="#7FD3F2"
              strokeWidth={prep!.w / 260}
              strokeLinejoin="round"
              strokeDasharray="1"
              style={{ strokeDashoffset: 1, animation: 'ssLine 2.2s cubic-bezier(.4,0,.2,1) .2s both', filter: 'drop-shadow(0 0 4px rgba(45,180,232,.9))' }}
            />
            {mouth.map((p, i) => (
              <circle
                key={i}
                data-ss-anim=""
                cx={p.x}
                cy={p.y}
                r={prep!.w / 170}
                fill="#FFFFFF"
                style={{ transformOrigin: `${p.x}px ${p.y}px`, opacity: 0, animation: `ssDot 2.1s cubic-bezier(.2,.9,.25,1) ${0.03 * i}s both`, filter: 'drop-shadow(0 0 3px rgba(45,180,232,1))' }}
              />
            ))}
          </svg>
        ) : null}

        {ready ? (
          <>
            <div style={label('left', split > 0.2)}>{before ? `${tr('Voor')} · ${before}` : tr('Voor')}</div>
            <div style={label('right', split < 0.8)}>{`${facings ? tr('Facings') : tr('Na')} · ${shade}`}</div>
            {/* the line and its handle */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct, width: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: -1, width: 2, background: 'linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.95) 18%,rgba(255,255,255,.95) 82%,rgba(255,255,255,0))', boxShadow: '0 0 12px rgba(45,180,232,.6)' }} />
            </div>
            <div
              data-ss-knob=""
              role="slider"
              tabIndex={0}
              aria-label={tr('Voor en na vergelijken')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(split * 100)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setSplit((s) => Math.max(0.02, s - 0.05));
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setSplit((s) => Math.min(0.98, s + 0.05));
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: pct,
                width: 48,
                height: 48,
                marginLeft: -24,
                marginTop: -24,
                borderRadius: 24,
                background: 'rgba(255,255,255,.88)',
                WebkitBackdropFilter: 'blur(10px)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'ssBreath 2.8s ease-in-out 1.6s 2',
                boxShadow: '0 10px 30px -8px rgba(6,13,31,.55)',
              }}
            >
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none" aria-hidden>
                <path d="M7 2 2 7l5 5" stroke="#0B1A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m19 2 5 5-5 5" stroke="#0B1A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        ) : null}

        {status === 'loading' || (status === 'scanning' && !ready) ? (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ ...label('left', true), position: 'static' }}>{status === 'loading' ? tr('Foto laden') : tr('Mond zoeken op je toestel')}</div>
          </div>
        ) : null}
        {status === 'none' || status === 'error' ? (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, padding: '12px 14px', borderRadius: 16, background: 'rgba(8,16,38,.7)', WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)', color: '#fff', font: `500 13px/18px ${FONT.sans}`, pointerEvents: 'none' }}>
            {status === 'error' ? tr('Deze foto kon niet worden geopend. Probeer een andere.') : tr('We vonden geen open glimlach. Probeer een foto recht van voren, met je tanden zichtbaar en goed licht.')}
          </div>
        ) : null}
      </div>
    </View>
  );
}
