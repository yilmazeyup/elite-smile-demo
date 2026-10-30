import { TOOTH_STATUS, type Tooth } from '@smile/shared';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { Icon } from '../components/Icon';
import { nativeDriver, Press, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { C, FONT, fx, R, web } from '../theme';
import { archCurve, archLayout, ARCH_Z, type Jaw, type Slot } from '../three/teeth';
import { PLAN_TONES, planTag } from './teethData';

/**
 * The mouth as a site plan (ERA Residence, Awwwards Site of the Month August 2026): a drawing of both arches from
 * above, each tooth a plot with its number, coloured by status, and callouts in the margins with a status tag
 * ("klaar", "in behandeling", "gepland", a date), like plots on a residential site plan. Drag to move around.
 */

const K = 3.1; // px per mm
const MARGIN_X = 94;
const TOP = 74;
const GAP_MM = 18;

type Plot = { slot: Slot; t: Tooth; cx: number; cy: number; d: string; nx: number; ny: number };

const superPath = (cx: number, cy: number, a: number, b: number, rot: number, n = 2.6) => {
  const pts: string[] = [];
  for (let i = 0; i < 40; i++) {
    const th = (i / 40) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    pts.push(`${i ? 'L' : 'M'}${(cx + rx).toFixed(1)},${(cy + ry).toFixed(1)}`);
  }
  return `${pts.join('')}Z`;
};

function layout(teeth: Tooth[]) {
  const by = new Map(teeth.map((t) => [t.n, t]));
  const archH = 66; // mm from the incisal edge to behind the last molar
  const height = TOP * 2 + (archH * 2 + GAP_MM) * K;
  const width = MARGIN_X * 2 + 64 * K;
  const cx = width / 2;
  const plots: Plot[] = [];
  const project = (jaw: Jaw, x: number, z: number) => {
    const depth = ARCH_Z - z; // 0 at the front
    return jaw === 'upper' ? { x: cx + x * K, y: TOP + depth * K } : { x: cx + x * K, y: height - TOP - depth * K };
  };
  for (const jaw of ['upper', 'lower'] as Jaw[]) {
    for (const slot of archLayout(jaw)) {
      const t = by.get(slot.fdi) ?? { n: slot.fdi, status: 'gezond' };
      const p = project(jaw, slot.position.x, slot.position.z);
      // plan rotation: the tooth's mesiodistal axis follows the arch tangent
      const tx = slot.tangent.x;
      const ty = jaw === 'upper' ? -slot.tangent.z : slot.tangent.z;
      const rot = Math.atan2(ty, tx);
      const { md, bl } = slot.info.dims;
      const n = slot.info.family === 'molar' ? 2.9 : slot.info.family === 'incisor' ? 2.2 : 2.4;
      const nx = slot.normal.x;
      const ny = jaw === 'upper' ? -slot.normal.z : slot.normal.z;
      plots.push({ slot, t, cx: p.x, cy: p.y, d: superPath(p.x, p.y, (md / 2) * K * 0.94, (bl / 2) * K * (slot.info.family === 'incisor' ? 0.62 : 0.9), rot, n), nx, ny });
    }
  }
  // the gum boundary of each arch: the arch line offset to the cheek side and the tongue side
  const outlines: string[] = [];
  for (const jaw of ['upper', 'lower'] as Jaw[]) {
    const curve = archCurve(jaw);
    const outer: string[] = [];
    const inner: string[] = [];
    const steps = 60;
    const pts: { x: number; y: number; nx: number; ny: number }[] = [];
    for (let i = steps; i >= -steps; i--) {
      const u = Math.min(0.98, Math.abs(i) / steps);
      const p = curve.getPointAt(u);
      const tg = curve.getTangentAt(u);
      let nx = tg.z;
      let nz = -tg.x;
      let x = p.x;
      if (i < 0) {
        x = -x;
        nx = -nx;
      }
      const pp = project(jaw, x, p.z);
      pts.push({ x: pp.x, y: pp.y, nx, ny: jaw === 'upper' ? -nz : nz });
      void nz;
    }
    for (const p of pts) {
      outer.push(`${outer.length ? 'L' : 'M'}${(p.x + p.nx * 7.4 * K).toFixed(1)},${(p.y + p.ny * 7.4 * K).toFixed(1)}`);
      inner.push(`L${(p.x - p.nx * 6.2 * K).toFixed(1)},${(p.y - p.ny * 6.2 * K).toFixed(1)}`);
    }
    outlines.push(`${outer.join('')}${inner.reverse().join('')}Z`);
  }
  return { plots, outlines, width, height, cx };
}

type Callout = { plot: Plot; x: number; y: number; side: -1 | 1 };

function callouts(plots: Plot[], today: Date, width: number): Callout[] {
  const list: Callout[] = [];
  for (const p of plots) {
    if (!planTag(p.t, today)) continue;
    const side = p.cx < width / 2 ? -1 : 1;
    list.push({ plot: p, side, x: side < 0 ? 4 : width - 4, y: p.cy });
  }
  // keep callouts in each margin at least 46 px apart
  for (const side of [-1, 1]) {
    const col = list.filter((c) => c.side === side).sort((a, b) => a.y - b.y);
    for (let i = 1; i < col.length; i++) if (col[i].y - col[i - 1].y < 42) col[i].y = col[i - 1].y + 42;
  }
  return list;
}

export function SitePlan({ teeth, selected, onSelect, today, height = 440 }: { teeth: Tooth[]; selected: number | null; onSelect: (n: number | null) => void; today: Date; height?: number }) {
  const { plots, outlines, width, height: H, cx } = useMemo(() => layout(teeth), [teeth]);
  const notes = useMemo(() => callouts(plots, today, width), [plots, today, width]);
  const [box, setBox] = useState({ w: 340, h: height });
  const [zoom, setZoom] = useState(1);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const placed = useRef(false);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const boxRef = useRef(box);
  boxRef.current = box;

  const limits = (z: number) => {
    const b = boxRef.current;
    const w = width * z;
    const h = H * z;
    return { minX: Math.min(0, b.w - w) - 30, maxX: Math.max(0, b.w - w) + 30, minY: Math.min(0, b.h - h) - 30, maxY: Math.max(0, b.h - h) + 30 };
  };
  const settle = (x: number, y: number, z = zoomRef.current) => {
    const l = limits(z);
    const to = { x: Math.min(l.maxX - 30, Math.max(l.minX + 30, x)), y: Math.min(l.maxY - 30, Math.max(l.minY + 30, y)) };
    offset.current = to;
    Animated.spring(pan, { toValue: to, useNativeDriver: nativeDriver, stiffness: 180, damping: 22 }).start();
  };
  const centreOn = (px: number, py: number, z = zoomRef.current) => settle(boxRef.current.w / 2 - px * z, boxRef.current.h / 2 - py * z, z);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          pan.stopAnimation();
          pan.setValue(offset.current);
        },
        onPanResponderMove: (_, g) => {
          const l = limits(zoomRef.current);
          const x = offset.current.x + g.dx;
          const y = offset.current.y + g.dy;
          // rubber band past the edges
          const rb = (v: number, lo: number, hi: number) => (v < lo ? lo - (lo - v) * 0.35 : v > hi ? hi + (v - hi) * 0.35 : v);
          pan.setValue({ x: rb(x, l.minX, l.maxX), y: rb(y, l.minY, l.maxY) });
        },
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) + Math.abs(g.dy) < 6) {
            // a tap: the plot under the finger
            const ne = e.nativeEvent as unknown as { locationX: number; locationY: number; offsetX?: number; offsetY?: number };
            const lx = ne.offsetX ?? ne.locationX;
            const ly = ne.offsetY ?? ne.locationY;
            const z = zoomRef.current;
            const px = (lx - offset.current.x) / z;
            const py = (ly - offset.current.y) / z;
            let best: Plot | null = null;
            let bd = 9 * K;
            for (const p of plots) {
              const d = Math.hypot(p.cx - px, p.cy - py);
              if (d < bd) {
                bd = d;
                best = p;
              }
            }
            onSelect(best ? (best.t.n === selected ? null : best.t.n) : null);
            return;
          }
          settle(offset.current.x + g.dx + g.vx * 120, offset.current.y + g.dy + g.vy * 120);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plots, selected, width, H],
  );

  const setZoomTo = (z: number) => {
    const b = boxRef.current;
    // keep the middle of the view where it is
    const mx = (b.w / 2 - offset.current.x) / zoomRef.current;
    const my = (b.h / 2 - offset.current.y) / zoomRef.current;
    setZoom(z);
    zoomRef.current = z;
    centreOn(mx, my, z);
  };

  const sel = plots.find((p) => p.t.n === selected);
  const statusFill = (t: Tooth) => (t.status === 'gezond' ? C.paper : t.status === 'ontbreekt' ? 'transparent' : TOOTH_STATUS[t.status].color);

  return (
    <View
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setBox({ w, h });
        boxRef.current = { w, h };
        if (!placed.current) {
          placed.current = true;
          // the whole width fits at first; drag up and down to see both jaws
          const z = Math.min(1, w / width);
          setZoom(z);
          zoomRef.current = z;
          const start = { x: (w - width * z) / 2, y: 0 };
          offset.current = start;
          pan.setValue(start);
        }
      }}
      {...fx('grab nosel')}
      style={[{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }, web({ touchAction: 'none' })]}
    >
      <Animated.View {...responder.panHandlers} style={{ position: 'absolute', left: 0, top: 0, width, height: H, transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: zoom }], transformOrigin: 'top left' } as never}>
        <Svg width={width} height={H}>
          <Defs>
            <Pattern id="mm5" width={5 * K} height={5 * K} patternUnits="userSpaceOnUse">
              <Path d={`M ${5 * K} 0 L 0 0 0 ${5 * K}`} fill="none" stroke="rgba(10,99,181,0.07)" strokeWidth={1} />
            </Pattern>
            <Pattern id="mm10" width={10 * K} height={10 * K} patternUnits="userSpaceOnUse">
              <Rect width={10 * K} height={10 * K} fill="url(#mm5)" />
              <Path d={`M ${10 * K} 0 L 0 0 0 ${10 * K}`} fill="none" stroke="rgba(10,99,181,0.12)" strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={H} fill="url(#mm10)" />
          {/* midline and the occlusal line between the arches */}
          <Line x1={cx} y1={8} x2={cx} y2={H - 8} stroke="rgba(10,99,181,0.28)" strokeDasharray="2 5" strokeWidth={1} />
          <Line x1={MARGIN_X - 30} y1={H / 2} x2={width - MARGIN_X + 30} y2={H / 2} stroke="rgba(10,99,181,0.18)" strokeDasharray="6 6" strokeWidth={1} />
          {outlines.map((d, i) => (
            <Path key={i} d={d} fill="rgba(240,138,152,0.10)" stroke="rgba(214,92,112,0.55)" strokeWidth={1.2} strokeDasharray="5 4" />
          ))}
          {/* callout leaders */}
          {notes.map((n) => {
            const p = n.plot;
            const ex = n.side < 0 ? MARGIN_X - 12 : width - MARGIN_X + 12;
            return <Path key={`l${p.t.n}`} d={`M${p.cx},${p.cy} L${ex},${n.y} L${n.side < 0 ? 90 : width - 90},${n.y}`} fill="none" stroke={p.t.n === selected ? '#0A63B5' : 'rgba(11,26,58,0.35)'} strokeWidth={p.t.n === selected ? 1.6 : 1} />;
          })}
          {plots.map((p) => {
            const on = p.t.n === selected;
            const missing = p.t.status === 'ontbreekt';
            return (
              <G key={p.t.n}>
                <Path d={p.d} fill={statusFill(p.t)} fillOpacity={p.t.status === 'gezond' ? 1 : 0.88} stroke={on ? '#0A63B5' : missing ? 'rgba(117,132,163,0.8)' : 'rgba(11,26,58,0.45)'} strokeWidth={on ? 2.4 : 1} strokeDasharray={missing ? '3 3' : undefined} />
                {p.t.status === 'implantaat' ? <Circle cx={p.cx} cy={p.cy} r={2.05 * K} fill="#D5D9DF" stroke="#7D8BAE" strokeWidth={1} /> : null}
                <SvgText x={p.cx} y={p.cy + 3.2} fontSize={8.5} fontFamily={FONT.mono} fontWeight="600" textAnchor="middle" fill={p.t.status === 'gezond' || p.t.status === 'ontbreekt' ? '#34446A' : '#0B1A3A'}>
                  {String(p.t.n)}
                </SvgText>
                {/* the plot's anchor dot on the callout */}
                {notes.some((n) => n.plot === p) ? <Circle cx={p.cx + p.nx * 6} cy={p.cy + p.ny * 6} r={0} /> : null}
              </G>
            );
          })}
          {sel ? <Circle cx={sel.cx} cy={sel.cy} r={9 * K} fill="none" stroke="#2DB4E8" strokeWidth={1.4} strokeDasharray="3 4" /> : null}
          {/* orientation: lips on the outside, the patient's right on your left */}
          <SvgText x={cx} y={20} fontSize={9} fontFamily={FONT.mono} textAnchor="middle" fill="#7584A3" letterSpacing={1.5}>
            {tr('LIPPEN').toUpperCase()}
          </SvgText>
          <SvgText x={cx} y={H - 12} fontSize={9} fontFamily={FONT.mono} textAnchor="middle" fill="#7584A3" letterSpacing={1.5}>
            {tr('LIPPEN').toUpperCase()}
          </SvgText>
          <SvgText x={cx} y={TOP + 34 * K} fontSize={9.5} fontFamily={FONT.mono} textAnchor="middle" fill="#0A63B5" letterSpacing={1.5}>
            {tr('BOVENKAAK').toUpperCase()}
          </SvgText>
          <SvgText x={cx} y={H - TOP - 32 * K} fontSize={9.5} fontFamily={FONT.mono} textAnchor="middle" fill="#0A63B5" letterSpacing={1.5}>
            {tr('ONDERKAAK').toUpperCase()}
          </SvgText>
          <SvgText x={MARGIN_X - 4} y={H / 2 - 6} fontSize={11} fontFamily={FONT.mono} fontWeight="600" textAnchor="middle" fill="#34446A">
            R
          </SvgText>
          <SvgText x={width - MARGIN_X + 4} y={H / 2 - 6} fontSize={11} fontFamily={FONT.mono} fontWeight="600" textAnchor="middle" fill="#34446A">
            L
          </SvgText>
          {/* a 10 mm scale bar */}
          <G>
            <Line x1={width - MARGIN_X - 10 * K} y1={H - 30} x2={width - MARGIN_X} y2={H - 30} stroke="#0B1A3A" strokeWidth={1.4} />
            <Line x1={width - MARGIN_X - 10 * K} y1={H - 34} x2={width - MARGIN_X - 10 * K} y2={H - 26} stroke="#0B1A3A" strokeWidth={1.4} />
            <Line x1={width - MARGIN_X} y1={H - 34} x2={width - MARGIN_X} y2={H - 26} stroke="#0B1A3A" strokeWidth={1.4} />
            <SvgText x={width - MARGIN_X - 5 * K} y={H - 38} fontSize={8.5} fontFamily={FONT.mono} textAnchor="middle" fill="#34446A">
              10 mm
            </SvgText>
          </G>
        </Svg>
        {/* the callout tags */}
        {notes.map((n) => {
          const tag = planTag(n.plot.t, today)!;
          const tone = PLAN_TONES[tag.tone];
          const on = n.plot.t.n === selected;
          return (
            <View
              key={`t${n.plot.t.n}`}
              pointerEvents="none"
              style={[
                { position: 'absolute', top: n.y - 18, width: 88, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 9, backgroundColor: C.paper, borderWidth: on ? 1.5 : 1, borderColor: on ? '#0A63B5' : C.line2, gap: 1 },
                n.side < 0 ? { left: 2 } : { left: width - 90 },
              ]}
            >
              <Txt v="label" size={7.5} color={tone.color} style={{ letterSpacing: 0.3 }} numberOfLines={1}>
                {tag.label}
              </Txt>
              <Row gap={5}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.color }} />
                <Txt v="num" size={10.5} weight="600">
                  {String(n.plot.t.n)}
                </Txt>
                {tag.sub ? (
                  <Txt v="small" size={9.5} color={C.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {tag.sub}
                  </Txt>
                ) : null}
              </Row>
            </View>
          );
        })}
      </Animated.View>

      {/* the title block, as on an architect's drawing */}
      <View pointerEvents="none" {...fx('glass')} style={{ position: 'absolute', left: 10, top: 10, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 10, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line, gap: 1 }}>
        <Txt v="label" size={8.5} color={C.blue}>
          Plattegrond
        </Txt>
        <Txt v="num" size={10} color={C.soft}>
          {tr('Sleep om te kijken')}
        </Txt>
      </View>
      <View style={{ position: 'absolute', right: 10, top: 10, gap: 6, flexDirection: 'row' }}>
        {[
          { icon: 'plus' as const, label: 'Inzoomen', go: () => setZoomTo(Math.min(1.8, zoom + 0.25)) },
          { icon: 'minus' as const, label: 'Uitzoomen', go: () => setZoomTo(Math.max(0.6, zoom - 0.25)) },
          { icon: 'rotate' as const, label: 'Midden', go: () => centreOn(width / 2, H / 2 + 20) },
        ].map((b) => (
          <Press key={b.label} onPress={b.go} accessibilityLabel={tr(b.label)} fxNames="glass" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.glass, borderWidth: 1, borderColor: C.line }}>
            <Icon name={b.icon} size={18} color={C.ink} />
          </Press>
        ))}
      </View>
      <View pointerEvents="none" {...fx('glass')} style={{ position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line }}>
        {(['klaar', 'bezig', 'gepland', 'weg'] as const).map((k) => (
          <Row key={k} gap={5}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PLAN_TONES[k].color }} />
            <Txt v="small" size={11} color={C.soft}>
              {PLAN_TONES[k].label}
            </Txt>
          </Row>
        ))}
      </View>
    </View>
  );
}
