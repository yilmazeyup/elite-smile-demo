import { emit } from '@smile/shared';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Bracket, Card, Chip, IconTile, PopIn, Row, SectionHead, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C, fx, isWeb } from '../theme';

const LEVELS = ['Rustig', 'Een beetje', 'Spannend', 'Heel spannend'];

const IN_MS = 4000;
const OUT_MS = 6000;

/** A soft tone that rises while you breathe in and falls while you breathe out (Web Audio; silent elsewhere). */
function useTone() {
  const ctx = useRef<AudioContext | null>(null);
  const osc = useRef<OscillatorNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  const start = (rise: boolean, ms: number) => {
    if (!isWeb || typeof window === 'undefined') return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx.current ??= new Ctor();
      const ac = ctx.current;
      stop();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      const now = ac.currentTime;
      o.frequency.setValueAtTime(rise ? 196 : 294, now);
      o.frequency.linearRampToValueAtTime(rise ? 294 : 196, now + ms / 1000);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.06, now + 0.4);
      g.gain.setValueAtTime(0.06, now + ms / 1000 - 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(now + ms / 1000 + 0.05);
      osc.current = o;
      gain.current = g;
    } catch {
      // No audio: the ring alone guides the breath.
    }
  };
  const stop = () => {
    try {
      osc.current?.stop();
    } catch {
      // Already stopped.
    }
    osc.current = null;
  };
  useEffect(() => () => stop(), []);
  return { start, stop };
}

/**
 * For anyone who finds the dentist frightening: say how you feel (the dentist sees it before you sit down), breathe
 * with the ring — hold to breathe in, let go to breathe out, the "hold to proceed" ring from Why Zero (Awwwards Site of
 * the Month September 2026) — agree on a stop signal, and know beforehand what you will hear and feel.
 */
export default function Rustig() {
  const { saved, update } = useApp();
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle');
  const [progress, setProgress] = useState(0);
  const [cycles, setCycles] = useState(0);
  const t0 = useRef(0);
  const raf = useRef(0);
  const tone = useTone();

  const run = (next: 'in' | 'out') => {
    cancelAnimationFrame(raf.current);
    t0.current = Date.now();
    const from = progress;
    setPhase(next);
    tone.start(next === 'in', next === 'in' ? IN_MS : OUT_MS);
    const loop = () => {
      const k = (Date.now() - t0.current) / (next === 'in' ? IN_MS : OUT_MS);
      const v = next === 'in' ? Math.min(1, from + k * (1 - from)) : Math.max(0, from * (1 - k));
      setProgress(v);
      if (next === 'in' && v >= 1) tap('select');
      if (next === 'out' && v <= 0) {
        setPhase('idle');
        setCycles((c) => c + 1);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const size = 250;
  const r = 108;
  const circ = 2 * Math.PI * r;
  const label = phase === 'in' ? 'Adem in…' : phase === 'out' ? 'En uit…' : cycles >= 5 ? 'Mooi zo. Nog eens?' : 'Houd vast om in te ademen';

  const tips: { icon: IconName; title: string; text: string }[] = [
    { icon: 'sound', title: 'Wat je hoort', text: 'De boor klinkt hoog, maar je voelt alleen trilling. Het zuigertje slurpt het water weg.' },
    { icon: 'sun', title: 'Het licht', text: 'De lamp is fel. Vraag gerust om een zonnebril.' },
    { icon: 'headphones', title: 'Eigen muziek', text: 'Oordopjes en je eigen muziek of podcast mogen mee in de stoel.' },
    { icon: 'drop', title: 'De prik', text: 'Vraag om verdovingsgel vooraf: dan voel je de prik nauwelijks.' },
    { icon: 'chat', title: 'Vertel-laat zien-doe', text: 'Vraag of de tandarts eerst vertelt en laat zien wat er gebeurt.' },
    { icon: 'clock', title: 'Korte afspraken', text: 'Een korte afspraak in de ochtend is voor veel mensen het prettigst.' },
  ];

  return (
    <Screen back title="Rustig-modus" kicker="Spannend?" serif="Je bent niet de enige. Zo maken we het lichter.">
      <Card>
        <Bracket>Hoe voel je je over je afspraak?</Bracket>
        <Row gap={8} wrap style={{ marginTop: 12 }}>
          {LEVELS.map((l, i) => (
            <Chip
              key={l}
              label={l}
              on={saved.anxiety === i}
              color={['#12A27A', '#2DB4E8', '#7D6BF0', '#E2434B'][i]}
              onPress={() => {
                update({ anxiety: i });
                emit({ kind: 'anxiety', who: saved.member, level: i });
              }}
            />
          ))}
        </Row>
        <Txt v="small" color={C.muted} style={{ marginTop: 10 }}>
          Je tandarts ziet dit voor je afspraak en neemt er de tijd voor.
        </Txt>
      </Card>

      <PopIn>
        <Card tone="pearl" style={{ alignItems: 'center', paddingVertical: 26 }}>
          <Pressable
            onPressIn={() => run('in')}
            onPressOut={() => run('out')}
            accessibilityRole="button"
            accessibilityLabel={tr('Houd vast om in te ademen')}
            {...fx('nosel')}
            style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              {...fx(phase === 'idle' ? 'breathe' : '')}
              style={{ position: 'absolute', width: 150 + progress * 50, height: 150 + progress * 50, borderRadius: 200, backgroundColor: 'rgba(45,180,232,0.14)' }}
            />
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Defs>
                <LinearGradient id="breath" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#7D6BF0" />
                  <Stop offset="1" stopColor="#2DB4E8" />
                </LinearGradient>
              </Defs>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(127,140,170,0.18)" strokeWidth={10} fill="none" />
              <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#breath)" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${circ * progress} ${circ}`} />
            </Svg>
            <Icon name="wind" size={30} color={C.lilac} />
            <Txt v="h3" align="center" style={{ marginTop: 8, maxWidth: 150 }}>
              {label}
            </Txt>
          </Pressable>
          <Txt v="num" color={C.muted} style={{ marginTop: 6 }}>
            {`${cycles} × ${tr('geademd')}`}
          </Txt>
          <Txt v="small" color={C.soft} align="center" style={{ marginTop: 8, maxWidth: 290 }}>
            Vier tellen in terwijl je vasthoudt, zes tellen uit als je loslaat. Een langere uitademing kalmeert je hartslag.
          </Txt>
        </Card>
      </PopIn>

      <View>
        <SectionHead kicker="Vooraf weten" title="Wat je kunt verwachten" />
        <View style={{ gap: 10 }}>
          {tips.map((t, i) => (
            <PopIn key={t.title} delay={i * 50}>
              <Card pad={14}>
                <Row gap={12} align="flex-start">
                  <IconTile name={t.icon} color="#7D6BF0" size={38} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt v="h3">{t.title}</Txt>
                    <Txt v="small" color={C.soft}>
                      {t.text}
                    </Txt>
                  </View>
                </Row>
              </Card>
            </PopIn>
          ))}
        </View>
      </View>
    </Screen>
  );
}
