import { useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { tr } from '../i18n';
import { MILK_LOWER, MILK_UPPER, milkName } from '../lib/kidsCorner';
import { C } from '../theme';
import { Press, Txt } from './ui';

const SIZE: Record<number, { w: number; h: number }> = { 1: { w: 21, h: 25 }, 2: { w: 18, h: 23 }, 3: { w: 19, h: 24 }, 4: { w: 25, h: 23 }, 5: { w: 29, h: 25 } };

type Placed = { n: number; x: number; y: number; rot: number };

function arch(list: number[], upper: boolean): Placed[] {
  return list.map((n, i) => {
    const t = i / (list.length - 1);
    const a = upper ? Math.PI * (1.1 + t * 0.8) : Math.PI * (0.9 - t * 0.8);
    const cy = upper ? 126 : 134;
    return { n, x: 160 + Math.cos(a) * 128, y: cy + Math.sin(a) * 98, rot: (a * 180) / Math.PI + (upper ? 90 : -90) };
  });
}

/** The gum under an arch: the same ellipse as the teeth, a little past the last tooth. */
function gum(upper: boolean): string {
  const cy = upper ? 126 : 134;
  const a0 = upper ? Math.PI * 1.07 : Math.PI * 0.93;
  const a1 = upper ? Math.PI * 1.93 : Math.PI * 0.07;
  const p = (a: number) => `${(160 + Math.cos(a) * 128).toFixed(1)} ${(cy + Math.sin(a) * 98).toFixed(1)}`;
  return `M${p(a0)} A128 98 0 0 ${upper ? 1 : 0} ${p(a1)}`;
}

const UPPER = arch(MILK_UPPER, true);
const LOWER = arch(MILK_LOWER, false);

let seq = 0;

/**
 * The twenty milk teeth in two arches, as the dentist sees them (your right on the left). Lost teeth are a dashed
 * outline with a golden star; a tooth can be picked when `onSelect` is given.
 */
export function KidsTeeth({ lost, recent = [], selected, onSelect }: { lost: number[]; recent?: number[]; selected?: number | null; onSelect?: (n: number) => void }) {
  const id = useRef(`kt-${++seq}`).current;
  const [w, setW] = useState(320);
  const h = (w * 262) / 320;
  const left = 20 - lost.length;

  const tooth = (p: Placed) => {
    const { w: tw, h: th } = SIZE[p.n % 10];
    const gone = lost.includes(p.n);
    const fresh = recent.includes(p.n);
    const on = selected === p.n;
    const molar = p.n % 10 >= 4;
    return (
      <G key={p.n} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
        {fresh ? <Circle cx={0} cy={0} r={20} fill="#FFB12E" opacity={0.16} /> : null}
        {on ? <Circle cx={0} cy={0} r={19} fill="none" stroke="#FFB12E" strokeWidth={2.5} /> : null}
        <Rect
          x={-tw / 2}
          y={-th / 2}
          width={tw}
          height={th}
          rx={molar ? 8 : 9}
          fill={gone ? 'transparent' : on ? '#FFE3A8' : `url(#${id}-t)`}
          stroke={gone ? '#E0A23A' : 'rgba(11,26,58,0.16)'}
          strokeWidth={gone ? 1.4 : 1}
          strokeDasharray={gone ? '3 2.5' : undefined}
        />
        {!gone && molar ? <Path d={`M${-tw / 2 + 6} 0h${tw - 12}`} stroke="rgba(11,26,58,0.10)" strokeWidth={1.2} strokeLinecap="round" /> : null}
        {!gone ? <Rect x={-tw / 2 + 3} y={-th / 2 + 3} width={3.5} height={th * 0.45} rx={1.75} fill="#FFFFFF" opacity={0.9} /> : null}
        {gone ? <Path d="M0 -7l2.1 4.3 4.7.7-3.4 3.3.8 4.7L0 3.8-4.2 6l.8-4.7L-6.8-2l4.7-.7z" fill="#FFB12E" transform={`rotate(${-p.rot})`} /> : null}
      </G>
    );
  };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
      <Svg width={w} height={h} viewBox="0 0 320 262">
        <Defs>
          <LinearGradient id={`${id}-t`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#F1EDE4" />
          </LinearGradient>
          <LinearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFC7D2" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFC7D2" stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        {/* the gums under each arch */}
        <Path d={gum(true)} stroke={`url(#${id}-g)`} strokeWidth={30} strokeLinecap="round" fill="none" />
        <Path d={gum(false)} stroke={`url(#${id}-g)`} strokeWidth={30} strokeLinecap="round" fill="none" />
        {UPPER.map(tooth)}
        {LOWER.map(tooth)}
      </Svg>
      {onSelect
        ? [...UPPER, ...LOWER]
            .filter((p) => !lost.includes(p.n))
            .map((p) => (
              <Press
                key={p.n}
                onPress={() => onSelect(p.n)}
                accessibilityLabel={`${tr(milkName(p.n))} (${p.n})`}
                accessibilityState={{ selected: selected === p.n }}
                haptic
                scaleTo={0.9}
                style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, left: (p.x * w) / 320 - 22, top: (p.y * h) / 262 - 22 }}
              />
            ))
        : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: h * 0.36, alignItems: 'center' }}>
        <Txt v="stat" size={34} color={C.ink}>
          {String(left)}
        </Txt>
        <Txt v="label" size={9} color={C.muted}>
          {tr('melktanden over')}
        </Txt>
      </View>
    </View>
  );
}
