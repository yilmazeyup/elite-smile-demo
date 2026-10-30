import { doctorById, laylaTeeth, TOOTH_STATUS, toothName, type DoctorId } from '@smile/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Image, PanResponder, Platform, View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { alpha, Avatar, Bracket, Button, Card, DemoNote, IconTile, PopIn, Press, Row, Tag, Toggle, Txt } from '../components/ui';
import { tr } from '../i18n';
import { Slider } from '../lib/teethSlider';
import { C, fx, R, web } from '../theme';
import { opgUv, renderOpg, type Opg } from '../three/xrayRender';

type Note = { id: string; fdi?: number; title: string; text: string; by?: DoctorId; x?: number; y?: number; color: string };

/** The dentist's notes on the panoramic picture (demo). */
const NOTES: Note[] = [
  { id: '36', fdi: 36, title: 'Implantaat 36', text: 'Implantaat Ø 4,1 × 10 mm, helemaal in het bot, met een healing cap erop. Het opgebouwde bot rond de schroef ziet er goed uit; over 3 tot 6 maanden is het vastgegroeid.', by: 'omar', color: '#8E7CF8' },
  { id: '46', fdi: 46, title: 'Kroon op 46', text: 'Zirkonia kroon na een wortelkanaalbehandeling. De kanaalvullingen lopen netjes tot in de wortelpunten; rond de punten is het rustig.', by: 'buthaina', color: '#C9A15B' },
  { id: '17', fdi: 17, title: 'Aandacht 17', text: 'Een verkleurd groefje op het kauwvlak. Op de foto is geen gaatje te zien. Bij de volgende controle kijken we opnieuw.', by: 'najla', color: '#FFB12E' },
  { id: '16', fdi: 16, title: 'Vulling 16', text: 'Witte vulling, mesiaal en occlusaal. Composiet is op een foto wit; de rand sluit goed aan.', by: 'najla', color: '#2DB4E8' },
  { id: '26', fdi: 26, title: 'Vulling 26', text: 'Kleine vulling op het kauwvlak, in orde.', by: 'najla', color: '#2DB4E8' },
  { id: 'sinus', title: 'Kaakholte', text: 'De donkere ruimte boven je bovenkiezen is lucht: de kaakholte. Dat hoort zo.', ...opgUv(-42, 31), color: '#7D8BAE' },
  { id: 'kanaal', title: 'Zenuwkanaal', text: 'De donkere band onder je onderkiezen is het kanaal van de zenuw voor je lip en kin. Een tandarts houdt er afstand van bij een implantaat.', ...opgUv(-50, -24), color: '#7D8BAE' },
];

const MIN_Z = 1;
const MAX_Z = 4.5;

export default function Rontgen() {
  const params = useLocalSearchParams<{ tand?: string }>();
  const teeth = useMemo(() => laylaTeeth(), []);
  const [opg, setOpg] = useState<Opg | null>(null);
  const [failed, setFailed] = useState(false);
  const [box, setBox] = useState({ w: 350, h: 260 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [bright, setBright] = useState(0.5);
  const [contrast, setContrast] = useState(0.45);
  const [invert, setInvert] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [active, setActive] = useState<string | null>(params.tand && NOTES.some((n) => n.id === params.tand) ? params.tand : null);

  // develop the picture once, after the screen has drawn
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(() => {
      try {
        setOpg(renderOpg(teeth));
      } catch {
        setFailed(true);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [teeth]);

  const notes = useMemo(
    () =>
      NOTES.map((n) => {
        if (n.fdi === undefined || !opg) return n;
        const s = opg.spots.find((p) => p.fdi === n.fdi);
        return s ? { ...n, x: s.x, y: s.y } : n;
      }),
    [opg],
  );

  // the picture fills the width; its height follows the 2:1 film
  const imgW = box.w;
  const imgH = box.w / 2;
  const state = useRef({ zoom, off, box, imgW, imgH });
  state.current = { zoom, off, box, imgW, imgH };
  const clampOff = (o: { x: number; y: number }, z: number) => {
    const s = state.current;
    const w = s.imgW * z;
    const h = s.imgH * z;
    const minX = Math.min(0, s.box.w - w);
    const minY = Math.min((s.box.h - h) / 2, s.box.h - h);
    const maxY = Math.max((s.box.h - h) / 2, 0);
    return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(maxY, Math.max(minY, o.y)) };
  };
  const zoomAt = (z: number, cx?: number, cy?: number) => {
    const s = state.current;
    const nz = Math.min(MAX_Z, Math.max(MIN_Z, z));
    const px = cx ?? s.box.w / 2;
    const py = cy ?? s.box.h / 2;
    // keep the point under (px, py) where it is
    const ix = (px - s.off.x) / s.zoom;
    const iy = (py - s.off.y) / s.zoom;
    setZoom(nz);
    setOff(clampOff({ x: px - ix * nz, y: py - iy * nz }, nz));
  };
  const focus = (n: Note) => {
    if (n.x === undefined || n.y === undefined) return;
    const s = state.current;
    const nz = 2.6;
    setZoom(nz);
    setOff(clampOff({ x: s.box.w / 2 - n.x * s.imgW * nz, y: s.box.h / 2 - n.y * s.imgH * nz }, nz));
  };

  // pan with one finger, pinch with two
  const gesture = useRef({ start: { x: 0, y: 0 }, pinch: 0, z0: 1, moved: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          gesture.current = { start: state.current.off, pinch: 0, z0: state.current.zoom, moved: 0 };
        },
        onPanResponderMove: (e, g) => {
          const touches = (e.nativeEvent as unknown as { touches?: { pageX: number; pageY: number }[] }).touches;
          if (touches && touches.length === 2) {
            const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!gesture.current.pinch) gesture.current.pinch = d;
            zoomAt(gesture.current.z0 * (d / gesture.current.pinch));
            return;
          }
          gesture.current.moved = Math.abs(g.dx) + Math.abs(g.dy);
          setOff(clampOff({ x: gesture.current.start.x + g.dx, y: gesture.current.start.y + g.dy }, state.current.zoom));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // mouse wheel and trackpad pinch zoom on the web
  const viewer = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const el = viewer.current as unknown as HTMLElement | null;
    if (!el || Platform.OS !== 'web') return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(state.current.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opg]);

  // start by filling the frame (the film is wider than the screen); a note asked for in the link gets the focus
  useEffect(() => {
    if (!opg) return;
    const n = active ? notes.find((x) => x.id === active) : null;
    if (n) return focus(n);
    const s = state.current;
    const z = Math.min(MAX_Z, Math.max(MIN_Z, s.box.h / s.imgH));
    setZoom(z);
    setOff(clampOff({ x: (s.box.w - s.imgW * z) / 2, y: (s.box.h - s.imgH * z) / 2 }, z));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opg]);

  const b = 0.65 + bright * 0.8;
  const c = 0.7 + contrast * 1.2;
  const sel = notes.find((n) => n.id === active) ?? null;
  const selTooth = sel?.fdi ? teeth.find((t) => t.n === sel.fdi) : null;

  return (
    <Screen back kicker="Röntgen" title="Je overzichtsfoto" serif="Een panoramische foto: je hele gebit en je kaken in één beeld.">
      <View
        ref={viewer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox({ w: width, h: height });
          setOff((o) => clampOff(o, zoom));
        }}
        {...fx('grab nosel')}
        style={[{ height: 250, borderRadius: R.xl, overflow: 'hidden', backgroundColor: '#03060D', borderWidth: 1, borderColor: 'rgba(160,200,255,0.12)' }, web({ touchAction: 'none' })]}
      >
        {opg ? (
          <View {...responder.panHandlers} style={{ position: 'absolute', left: 0, top: 0, width: imgW, height: imgH, transform: [{ translateX: off.x }, { translateY: off.y }, { scale: zoom }], transformOrigin: 'top left' } as never}>
            <View style={[{ width: imgW, height: imgH }, web({ filter: `brightness(${b}) contrast(${c})${invert ? ' invert(1)' : ''}`, transition: 'filter .25s ease' })]}>
              <Image source={{ uri: opg.url }} accessibilityLabel={tr('Panoramische röntgenfoto (demo, getekend uit het 3D-model)')} style={{ width: imgW, height: imgH }} />
            </View>
            {showNotes
              ? notes.map((n) =>
                  n.x === undefined || n.y === undefined ? null : (
                    <Press
                      key={n.id}
                      onPress={() => {
                        setActive(n.id === active ? null : n.id);
                        if (n.id !== active) focus(n);
                      }}
                      accessibilityLabel={tr(n.title)}
                      haptic
                      style={{ position: 'absolute', left: n.x * imgW - 22, top: n.y * imgH - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 1 / zoom }] }}
                    >
                      {zoom < 1.7 && n.id !== active ? (
                        <View {...fx('pulse-blue')} style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: n.color, borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                      ) : (
                        <View
                          {...fx(n.id === active ? '' : 'pulse-blue')}
                          style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: n.id === active ? n.color : alpha(n.color, 0.4), borderWidth: 2, borderColor: n.id === active ? '#FFFFFF' : n.color }}
                        >
                          <Txt v="num" size={8.5} color="#FFFFFF" weight="600">
                            {n.fdi ? String(n.fdi) : 'i'}
                          </Txt>
                        </View>
                      )}
                    </Press>
                  ),
                )
              : null}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View {...fx('spin')} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(160,200,255,0.25)', borderTopColor: '#4CCBF7' }} />
            <Txt v="small" color="#B6C2DF">
              {failed || Platform.OS !== 'web' ? 'De foto wordt in de webversie getekend.' : 'Foto ontwikkelen…'}
            </Txt>
          </View>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(255,190,60,0.16)', borderWidth: 1, borderColor: 'rgba(255,190,60,0.35)' }}>
          <Txt v="label" size={8.5} color="#FFD27A">
            Demo · geen echte foto
          </Txt>
        </View>
        <View style={{ position: 'absolute', right: 10, bottom: 10, gap: 6 }}>
          {[
            { icon: 'plus' as const, label: 'Inzoomen', go: () => zoomAt(zoom * 1.5) },
            { icon: 'minus' as const, label: 'Uitzoomen', go: () => zoomAt(zoom / 1.5) },
            { icon: 'rotate' as const, label: 'Hele foto', go: () => { setZoom(1); setOff(clampOff({ x: 0, y: (box.h - imgH) / 2 }, 1)); } },
          ].map((k) => (
            <Press key={k.label} onPress={k.go} accessibilityLabel={tr(k.label)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,20,48,0.72)', borderWidth: 1, borderColor: 'rgba(160,200,255,0.2)' }}>
              <Icon name={k.icon} size={18} color="#EDF2FF" />
            </Press>
          ))}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: 12, bottom: 12, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(10,20,48,0.6)' }}>
          <Txt v="num" size={10.5} color="#B6C2DF">
            {`${zoom.toFixed(1).replace('.', ',')}×`}
          </Txt>
        </View>
      </View>

      {sel ? (
        <PopIn key={sel.id}>
          <Card>
            <Row gap={12} align="flex-start">
              {sel.by ? <Avatar id={sel.by} size={46} ring={sel.color} /> : <IconTile name="info" color={sel.color} size={46} />}
              <View style={{ flex: 1, gap: 4 }}>
                <Row gap={6} wrap>
                  <Txt v="h2">{sel.title}</Txt>
                  {selTooth ? <Tag label={TOOTH_STATUS[selTooth.status].label} color={sel.color} bg={alpha(sel.color, 0.14)} /> : null}
                </Row>
                {sel.by ? (
                  <Txt v="small" size={12} color={C.blue}>
                    {`${doctorById(sel.by).name} · notitie bij de foto`}
                  </Txt>
                ) : (
                  <Txt v="small" size={12} color={C.muted}>
                    Om te weten
                  </Txt>
                )}
              </View>
              <Press onPress={() => setActive(null)} accessibilityLabel={tr('Sluiten')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 }}>
                <Icon name="close" size={17} color={C.soft} />
              </Press>
            </Row>
            <Txt v="body" color={C.soft} style={{ marginTop: 10 }}>
              {sel.text}
            </Txt>
            {sel.fdi ? (
              <Row gap={8} style={{ marginTop: 12 }}>
                <Button title={`Tand ${sel.fdi} in 3D`} icon="cube" size="sm" kind="line" onPress={() => router.push({ pathname: '/tand/[n]', params: { n: String(sel.fdi) } } as never)} />
              </Row>
            ) : null}
          </Card>
        </PopIn>
      ) : null}

      <Card>
        <Bracket>Beeld</Bracket>
        <View style={{ marginTop: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">Helderheid</Txt>
            <Txt v="num" size={12} color={C.muted}>
              {`${Math.round(b * 100)} %`}
            </Txt>
          </Row>
          <Slider value={bright} onChange={setBright} label="Helderheid" ticks={[0.5]} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">Contrast</Txt>
            <Txt v="num" size={12} color={C.muted}>
              {`${Math.round(c * 100)} %`}
            </Txt>
          </Row>
          <Slider value={contrast} onChange={setContrast} label="Contrast" ticks={[0.45]} />
          <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <Txt v="h3">Notities tonen</Txt>
            <Toggle value={showNotes} onChange={setShowNotes} label="Notities tonen" />
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Txt v="h3">Negatief</Txt>
              <Txt v="small" color={C.muted}>
                Zoals sommige tandartsen kijken
              </Txt>
            </View>
            <Toggle value={invert} onChange={setInvert} label="Negatief" />
          </Row>
        </View>
      </Card>

      <View>
        <Bracket>Notities van je tandarts</Bracket>
        <Card pad={0} style={{ marginTop: 10, paddingHorizontal: 14 }}>
          {notes.map((n, i) => (
            <Press key={n.id} onPress={() => { setActive(n.id); focus(n); }} accessibilityLabel={tr(n.title)} scaleTo={0.985}>
              <Row gap={12} style={{ paddingVertical: 12, borderBottomWidth: i === notes.length - 1 ? 0 : 1, borderColor: C.line }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(n.color, 0.16) }}>
                  {n.fdi ? (
                    <Txt v="num" size={13} weight="600">
                      {String(n.fdi)}
                    </Txt>
                  ) : (
                    <Icon name="info" size={17} color={n.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{n.title}</Txt>
                  <Txt v="small" color={C.muted} numberOfLines={1}>
                    {n.fdi ? toothName(n.fdi) : n.text}
                  </Txt>
                </View>
                <Icon name="eye" size={17} color={n.id === active ? C.blue : C.muted} />
              </Row>
            </Press>
          ))}
        </Card>
      </View>

      <Card tone="pearl">
        <Bracket>Zo lees je een röntgenfoto</Bracket>
        {[
          { c: '#FFFFFF', t: 'Wit', d: 'Wat röntgenstraling tegenhoudt: glazuur, titanium, een kroon, vullingen.' },
          { c: '#9AA6BF', t: 'Grijs', d: 'Tandbeen, wortels en kaakbot.' },
          { c: '#0B1A3A', t: 'Donker', d: 'Wat straling doorlaat: de zenuw in je tand, lucht in je kaakholte, het zenuwkanaal.' },
        ].map((k) => (
          <Row key={k.t} gap={12} align="flex-start" style={{ marginTop: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: k.c, borderWidth: 1, borderColor: C.line2, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{k.t}</Txt>
              <Txt v="small" color={C.muted}>
                {k.d}
              </Txt>
            </View>
          </Row>
        ))}
        <Txt v="small" size={12} color={C.muted} style={{ marginTop: 12 }}>
          Op een panoramische foto staat je rechterkant links, alsof je tegenover jezelf zit.
        </Txt>
      </Card>

      <DemoNote icon="alert" text="Demo: deze foto is getekend uit het 3D-model in de app. Het is geen echte röntgenfoto en zegt niets over je eigen gebit. Je echte foto’s bespreek je met je tandarts." />
    </Screen>
  );
}
