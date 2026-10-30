import { monthShort, VITA } from '@smile/shared';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { tr } from '../i18n';
import { shadeHex, shadeIndex } from '../lib/smileShade';
import { C, FONT } from '../theme';

export type ShadePoint = { at: Date; shade: string; by: string };

let seq = 0;

/**
 * The shades measured over time on a small chart: lighter is higher. Each measurement is a dot in its own porcelain
 * colour; a dashed line marks the shade chosen in the studio.
 */
export function SmileTimeline({ points, target, now }: { points: ShadePoint[]; target?: string | null; now: Date }) {
  const [w, setW] = useState(320);
  const id = useRef(`stl-${++seq}`).current;
  const h = 168;
  const left = 30;
  const right = 18;
  const top = 26;
  const bottom = 30;
  const sorted = [...points].sort((a, b) => a.at.getTime() - b.at.getTime());
  const idx = sorted.map((p) => shadeIndex(p.shade));
  if (target) idx.push(shadeIndex(target));
  const lo = Math.max(0, Math.min(...idx) - 1);
  const hi = Math.min(15, Math.max(...idx) + 1);
  const span = Math.max(2, hi - lo);
  const t0 = (sorted.length ? sorted[0].at.getTime() : now.getTime() - 400 * 86400000) - 40 * 86400000;
  const t1 = now.getTime() + 20 * 86400000;
  const x = (t: number) => left + ((t - t0) / Math.max(1, t1 - t0)) * (w - left - right);
  const y = (i: number) => top + ((i - lo) / span) * (h - top - bottom);
  const pts = sorted.map((p) => ({ ...p, px: x(p.at.getTime()), py: y(shadeIndex(p.shade)) }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].px.toFixed(1)},${h - bottom} L${pts[0].px.toFixed(1)},${h - bottom} Z` : '';
  const grid = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).filter((i) => span <= 6 || (i - lo) % 2 === 0);
  const nowX = x(now.getTime());

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2DB4E8" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#2DB4E8" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#0A63B5" />
            <Stop offset="1" stopColor="#2DB4E8" />
          </LinearGradient>
        </Defs>
        {grid.map((i) => (
          <G key={i}>
            <Line x1={left} x2={w - right} y1={y(i)} y2={y(i)} stroke="rgba(117,132,163,0.18)" strokeWidth={1} />
            <SvgText x={left - 8} y={y(i) + 3.5} fontSize={9} fontFamily={FONT.mono} fill="#7584A3" textAnchor="end">
              {VITA[i]}
            </SvgText>
          </G>
        ))}
        {/* today */}
        <Line x1={x(now.getTime())} x2={x(now.getTime())} y1={top - 10} y2={h - bottom} stroke="rgba(45,180,232,0.5)" strokeWidth={1} strokeDasharray="2 3" />
        <SvgText x={x(now.getTime())} y={h - 8} fontSize={9} fontFamily={FONT.mono} fill="#0A63B5" textAnchor="middle">
          {tr('NU')}
        </SvgText>
        {target ? (
          <G>
            <Line x1={left} x2={w - right} y1={y(shadeIndex(target))} y2={y(shadeIndex(target))} stroke="#0A63B5" strokeWidth={1.4} strokeDasharray="5 4" />
            <Rect x={w - right - 66} y={y(shadeIndex(target)) - 19} width={66} height={15} rx={7.5} fill="#0A63B5" />
            <SvgText x={w - right - 33} y={y(shadeIndex(target)) - 8.5} fontSize={8.5} fontFamily={FONT.mono} fill="#FFFFFF" textAnchor="middle">
              {`${tr('KEUZE')} ${target}`}
            </SvgText>
          </G>
        ) : null}
        {area ? <Path d={area} fill={`url(#${id}-a)`} /> : null}
        {pts.length > 1 ? <Path d={line} stroke={`url(#${id}-l)`} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {pts.map((p, i) => (
          <G key={`${p.at.getTime()}-${i}`}>
            <Circle cx={p.px} cy={p.py} r={11} fill="rgba(45,180,232,0.12)" />
            <Circle cx={p.px} cy={p.py} r={7.5} fill={shadeHex(p.shade)} stroke="#FFFFFF" strokeWidth={2.5} />
            <Circle cx={p.px} cy={p.py} r={9} fill="none" stroke="rgba(11,26,58,0.18)" strokeWidth={1} />
            <SvgText x={p.px} y={p.py - 15} fontSize={10} fontWeight="600" fontFamily={FONT.mono} fill={C.ink} textAnchor="middle">
              {p.shade}
            </SvgText>
            {Math.abs(p.px - nowX) > 30 ? (
              <SvgText x={p.px} y={h - 8} fontSize={9} fontFamily={FONT.mono} fill="#7584A3" textAnchor="middle">
                {`${monthShort(p.at)} ’${String(p.at.getFullYear()).slice(2)}`}
              </SvgText>
            ) : null}
          </G>
        ))}
      </Svg>
    </View>
  );
}
