import { CLINIC } from '@smile/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { fx } from '../theme';
import { fontsReady } from '../web/css';
import { Logo, ToothMark } from './Logo';
import { Press, Txt } from './ui';

const ease = 'cubic-bezier(.2,.9,.25,1)';
const t = (props: string, ms: number, delay = 0, curve = ease) => ({ transitionProperty: props, transitionDuration: `${ms}ms`, transitionDelay: `${delay}ms`, transitionTimingFunction: curve }) as object;

/**
 * The opening: on porcelain, the tooth from the logo rises out of a soft blue light, a smile line draws itself under it,
 * the logo settles and the site's own promise appears. About two and a half seconds; a tap skips it.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'wait' | 'in' | 'out'>('wait');

  useEffect(() => {
    let alive = true;
    fontsReady(1100).then(() => alive && setPhase('in'));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (phase !== 'in') return;
    const out = setTimeout(() => setPhase('out'), 2500);
    return () => clearTimeout(out);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'out') return;
    const done = setTimeout(onDone, 700);
    return () => clearTimeout(done);
  }, [phase, onDone]);

  const on = phase !== 'wait';
  return (
    <Press
      haptic={false}
      scaleTo={1}
      onPress={() => setPhase('out')}
      accessibilityLabel="Overslaan"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, backgroundColor: '#F3F6FB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        { opacity: phase === 'out' ? 0 : 1, transform: [{ scale: phase === 'out' ? 1.04 : 1 }] },
        t('opacity, transform', 700),
      ]}
    >
      <View
        style={[
          { position: 'absolute', width: 640, height: 640, borderRadius: 320 },
          { backgroundImage: 'radial-gradient(closest-side, rgba(45,180,232,.28), rgba(142,124,248,.10) 55%, rgba(243,246,251,0))', opacity: on ? 1 : 0, transform: [{ scale: on ? 1 : 0.6 }] } as object,
          t('opacity, transform', 1400),
        ]}
      />
      <View style={{ alignItems: 'center' }}>
        <View style={[{ opacity: on ? 1 : 0, transform: [{ translateY: on ? 0 : 26 }, { scale: on ? 1 : 0.86 }] }, t('opacity, transform', 1000, 60, 'cubic-bezier(.2,1.25,.3,1)')]}>
          <View {...fx('sheen')} style={{ borderRadius: 30, padding: 6 }}>
            <ToothMark size={112} />
          </View>
        </View>
        <svg width="190" height="40" viewBox="0 0 190 40" style={{ marginTop: 4, overflow: 'visible' }}>
          <path d="M8 6 Q95 62 182 6" fill="none" stroke="url(#introSmile)" strokeWidth="5" strokeLinecap="round" style={{ strokeDasharray: 210, strokeDashoffset: on ? 0 : 210, transition: 'stroke-dashoffset 900ms cubic-bezier(.65,0,.25,1) 520ms' }} />
          <defs>
            <linearGradient id="introSmile" x1="0" x2="1">
              <stop offset="0" stopColor="#0A63B5" />
              <stop offset="1" stopColor="#2DB4E8" />
            </linearGradient>
          </defs>
        </svg>
        <View style={[{ marginTop: 18, opacity: on ? 1 : 0, transform: [{ translateY: on ? 0 : 10 }] }, t('opacity, transform', 800, 900)]}>
          <Logo width={230} onDark={false} />
        </View>
        <Txt v="serif" size={21} color="#34446A" style={[{ marginTop: 22, opacity: on ? 1 : 0 }, t('opacity', 900, 1350)]}>
          {CLINIC.promise}
        </Txt>
      </View>
    </Press>
  );
}
