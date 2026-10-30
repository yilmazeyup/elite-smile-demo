import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { tr } from '../i18n';
import { fileToDataUrl, grabFrame, sampleWound } from '../lib/woundPhoto';
import { FONT, web } from '../theme';
import { Icon, type IconName } from './Icon';
import { Press, tap, Txt } from './ui';

export type WoundSource = 'camera' | 'upload' | 'sample';

export type WoundCameraProps = {
  value: string | null;
  source: WoundSource | null;
  onChange: (photo: string | null, source: WoundSource | null) => void;
  style?: StyleProp<ViewStyle>;
};

type Mode = 'idle' | 'starting' | 'live' | 'error';
type Problem = 'denied' | 'missing' | 'other';

const CSS = `
@keyframes wcCount{0%{opacity:0;transform:scale(1.6)}25%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(.85)}}
@keyframes wcFlash{0%{opacity:.95}100%{opacity:0}}
@keyframes wcRing{0%{transform:scale(.85);opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes wcIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){[data-wc-anim]{animation:none!important}[data-wc-flash]{display:none}}
`;

const glass: CSSProperties = {
  background: 'rgba(8,16,38,.5)',
  WebkitBackdropFilter: 'blur(14px) saturate(150%)',
  backdropFilter: 'blur(14px) saturate(150%)',
  border: '1px solid rgba(255,255,255,.16)',
  color: '#fff',
};

/** A round glass button on the camera. */
function Round({ icon, label, onPress, size = 48, on }: { icon: IconName; label: string; onPress: () => void; size?: number; on?: boolean }) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={tr(label)}
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,214,120,0.92)' : 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
        web({ WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)' }),
      ]}
    >
      <Icon name={icon} size={size * 0.42} color={on ? '#0B1A3A' : '#FFFFFF'} stroke={2} />
    </Press>
  );
}

/**
 * The guide over the camera: the shape of an open mouth, and a ring where the implant sits (lower left: on the left
 * of a mirrored selfie, on the right when someone else holds the phone).
 */
function Guide({ side, still, style }: { side: 'left' | 'right'; still?: boolean; style?: CSSProperties }) {
  const cx = side === 'left' ? 36 : 64;
  return (
    <svg
      viewBox={still ? '8 18 84 46' : '0 0 100 75'}
      preserveAspectRatio={still ? 'xMidYMid meet' : 'xMidYMid slice'}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...style }}
    >
      <defs>
        <radialGradient id="wc-dim" cx={cx / 100} cy={0.62} r="0.6">
          <stop offset="0.16" stopColor="#060D1F" stopOpacity="0" />
          <stop offset="0.6" stopColor="#060D1F" stopOpacity="0.38" />
          <stop offset="1" stopColor="#060D1F" stopOpacity="0.62" />
        </radialGradient>
        <linearGradient id="wc-lips" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FD3F2" stopOpacity="0.10" />
          <stop offset="1" stopColor="#7FD3F2" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {still ? null : <rect x="0" y="0" width="100" height="75" fill="url(#wc-dim)" />}
      {/* the lips, as a dashed outline */}
      <path d="M14 36 C 26 22, 74 22, 86 36 C 74 60, 26 60, 14 36 Z" fill={still ? 'url(#wc-lips)' : 'none'} stroke="rgba(255,255,255,.55)" strokeWidth="0.5" strokeDasharray="1.6 1.4" />
      <path d="M22 37 C 36 31, 64 31, 78 37" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.4" strokeDasharray="1 1.2" />
      {/* the target */}
      <circle data-wc-anim="" cx={cx} cy="46.5" r="7" fill="none" stroke="#7FD3F2" strokeWidth="0.5" style={{ transformOrigin: `${cx}px 46.5px`, animation: 'wcRing 2.2s ease-out infinite' }} />
      <circle cx={cx} cy="46.5" r="7" fill="rgba(45,180,232,.10)" stroke="#2DB4E8" strokeWidth="0.7" />
      <path d={`M${cx - 9.5} 46.5h3 M${cx + 6.5} 46.5h3 M${cx} 37h0 M${cx} 37v3 M${cx} 53v3`} stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
      <text x={cx + 9} y="41" fill="#7FD3F2" fontSize="3.4" fontFamily={FONT.mono} letterSpacing="0.2">
        36
      </text>
    </svg>
  );
}

/**
 * The guided camera for a wound photo: an overlay that shows where to aim, a tip about light (and the phone's lamp
 * when it has one), and a 3-2-1 timer so the hand holding the lip can stay still. Without a camera, or without
 * permission, it says so kindly and offers a photo from the library or the drawn example.
 */
export function WoundCamera({ value, source, onChange, style }: WoundCameraProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [problem, setProblem] = useState<Problem>('other');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [torch, setTorch] = useState<{ can: boolean; on: boolean }>({ can: false, on: false });
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (document.getElementById('wound-camera-css')) return;
    const s = document.createElement('style');
    s.id = 'wound-camera-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }, []);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCount(null);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setTorch({ can: false, on: false });
  };
  useEffect(() => stop, []);

  const start = async (want: 'user' | 'environment' = facing) => {
    stop();
    setFacing(want);
    if (!navigator.mediaDevices?.getUserMedia) {
      setProblem('missing');
      setMode('error');
      return;
    }
    setMode('starting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      const track = s.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorch({ can: !!caps.torch, on: false });
      setMode('live');
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      });
    } catch (e) {
      const name = (e as { name?: string }).name ?? '';
      setProblem(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError' ? 'missing' : 'other');
      setMode('error');
    }
  };

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    tap('success');
    setFlash((f) => f + 1);
    const still = grabFrame(v);
    stop();
    setMode('idle');
    onChange(still, 'camera');
  };

  const countdown = () => {
    if (count !== null) {
      // A second tap stops the timer.
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setCount(null);
      return;
    }
    tap('medium');
    const tick = (n: number) => {
      setCount(n);
      timer.current = setTimeout(() => {
        if (n > 1) tick(n - 1);
        else {
          setCount(null);
          shoot();
        }
      }, 850);
    };
    tick(3);
  };

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch.on } as MediaTrackConstraintSet] });
      setTorch((t) => ({ ...t, on: !t.on }));
    } catch {
      setTorch({ can: false, on: false });
    }
  };

  const pickFile = () => input.current?.click();
  const useSample = () => {
    stop();
    setMode('idle');
    onChange(sampleWound(), 'sample');
  };

  const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  const chip: CSSProperties = { ...glass, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, font: `500 12px/16px ${FONT.sans}`, whiteSpace: 'nowrap' };

  return (
    <View style={[{ borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B1A3A' }, style]}>
      <input
        ref={input}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            stop();
            setMode('idle');
            onChange(await fileToDataUrl(file), 'upload');
          } catch {
            setProblem('other');
            setMode('error');
          }
        }}
      />
      <div style={{ ...fill, background: 'radial-gradient(120% 90% at 30% 0%,#1B3A7A 0%,#0B1A3A 55%,#060D1F 100%)' }} />

      {/* ------------------------------------------------------------------------------------- a photo to send */}
      {value ? (
        <>
          <img src={value} alt={tr('Foto van de wond')} style={{ ...fill, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={chip}>{source === 'sample' ? tr('Voorbeeld, getekend') : source === 'camera' ? tr('Zoals de tandarts het ziet') : tr('Uit je fotobibliotheek')}</div>
            <Round icon="rotate" label="Opnieuw" size={44} onPress={() => onChange(null, null)} />
          </div>
        </>
      ) : null}

      {/* ----------------------------------------------------------------------------------------- the camera */}
      {!value && (mode === 'live' || mode === 'starting') ? (
        <>
          <video ref={video} playsInline muted autoPlay style={{ ...fill, objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none', opacity: mode === 'live' ? 1 : 0, transition: 'opacity .4s ease' }} />
          <Guide side={facing === 'user' ? 'left' : 'right'} />
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={chip}>
              <Icon name="pin" size={14} color="#7FD3F2" />
              {tr('Richt op linksonder · implantaat 36')}
            </div>
            <div style={{ ...chip, background: 'rgba(255,214,120,.18)' }}>
              <Icon name="sun" size={14} color="#FFD678" />
              {tr('Bij een raam of met een lampje')}
            </div>
          </div>
          {count !== null ? (
            <div key={count} data-wc-anim="" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', animation: 'wcCount .85s cubic-bezier(.2,.9,.25,1) both' }}>
              <span style={{ font: `600 120px/1 ${FONT.display}`, color: '#fff', textShadow: '0 10px 40px rgba(6,13,31,.6)' }}>{count}</span>
            </div>
          ) : null}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-evenly' }}>
            <Round icon="close" label="Camera sluiten" onPress={() => (stop(), setMode('idle'))} />
            <Press
              onPress={countdown}
              accessibilityLabel={tr(count === null ? 'Foto maken met timer' : 'Timer stoppen')}
              style={{ width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: count === null ? '#FFFFFF' : '#2DB4E8', alignItems: 'center', justifyContent: 'center' }}>
                {count === null ? <Icon name="timer" size={24} color="#0B1A3A" stroke={2} /> : <Icon name="close" size={22} color="#FFFFFF" stroke={2.2} />}
              </View>
            </Press>
            {torch.can ? <Round icon="sun" label="Lampje" on={torch.on} onPress={toggleTorch} /> : <Round icon="rotate" label="Andere camera" onPress={() => start(facing === 'user' ? 'environment' : 'user')} />}
          </div>
        </>
      ) : null}

      {/* -------------------------------------------------------------------------------- before the camera starts */}
      {!value && (mode === 'idle' || mode === 'error') ? (
        <>
          {mode === 'idle' ? <Guide side="left" still style={{ inset: 'auto', left: 24, right: 24, top: 84, bottom: 100, width: 'auto', height: 'auto' }} /> : null}
          {mode === 'error' ? (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 108, bottom: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ position: 'relative', width: 76, height: 76, borderRadius: 38, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" size={32} color="rgba(255,255,255,0.7)" />
                <div style={{ position: 'absolute', width: 46, height: 2.5, borderRadius: 2, background: '#FFD678', transform: 'rotate(-40deg)' }} />
              </div>
            </div>
          ) : null}
          <div style={{ position: 'absolute', left: 18, right: 18, top: 18, display: 'flex', flexDirection: 'column', gap: 6, animation: 'wcIn .5s ease both' }} data-wc-anim="">
            {mode === 'error' ? (
              <>
                <Txt v="label" color="#FFD678">
                  {problem === 'denied' ? 'Geen toegang tot de camera' : problem === 'missing' ? 'Geen camera gevonden' : 'De camera start niet'}
                </Txt>
                <Txt v="h3" size={16} color="#FFFFFF" style={{ maxWidth: 300 }}>
                  {problem === 'denied' ? 'Geen probleem: kies een foto, of geef toestemming in je browser.' : 'Kies een foto uit je bibliotheek, of probeer het met het voorbeeld.'}
                </Txt>
              </>
            ) : (
              <>
                <Txt v="label" color="#7FD3F2">
                  Zo maak je hem
                </Txt>
                <Txt v="h3" size={16} color="#FFFFFF" style={{ maxWidth: 280 }}>
                  Trek je lip opzij met een schone vinger en richt op de ring, linksonder.
                </Txt>
              </>
            )}
          </div>
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Press
              onPress={() => start('user')}
              accessibilityLabel={tr(mode === 'error' ? 'Opnieuw proberen' : 'Start de camera')}
              style={{ flex: 1, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Icon name="camera" size={18} color="#0B1A3A" stroke={2} />
              <Txt v="h3" color="#0B1A3A" weight="700">
                {mode === 'error' ? 'Opnieuw' : 'Start camera'}
              </Txt>
            </Press>
            <Round icon="image" label="Kies een foto" size={50} onPress={pickFile} />
            <Round icon="sparkle" label="Gebruik het voorbeeld" size={50} onPress={useSample} />
          </div>
        </>
      ) : null}

      {flash ? <div key={flash} data-wc-flash="" style={{ ...fill, background: '#fff', pointerEvents: 'none', animation: 'wcFlash .5s ease-out both' }} /> : null}
    </View>
  );
}
