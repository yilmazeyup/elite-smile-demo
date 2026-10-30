import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '../components/Screen';
import { Bar, Bracket, Button, Card, DemoNote, IconTile, PopIn, Ring, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { scoreOf } from '../lib/scoreModel';
import { Slider } from '../lib/teethSlider';
import { useApp } from '../state/app';
import { ScoreZoom } from '../three/ScoreZoom';
import { C, fx, R, shadow } from '../theme';

const COLORS = { controle: '#0A63B5', tandvlees: '#FF6F61', poetsen: '#17BFA3', open: '#8E7CF8' } as Record<string, string>;

/** "Mondgezondheid": a demo score from four factors, with advice, and a zoom into the enamel. */
export default function Score() {
  const { saved, today } = useApp();
  const score = scoreOf(saved, today);
  const zoomRef = useRef(0);
  const [zoom, setZoom] = useState(0);
  const [scale, setScale] = useState('1 cm');
  const [bugs, setBugs] = useState({ alive: 0, brushed: 0 });
  const setZ = (z: number) => {
    zoomRef.current = z;
    setZoom(z);
  };
  const deep = zoom > 0.95;

  return (
    <Screen back kicker="Mondgezondheid" title="Hoe gaat het met je mond?" serif="Vier dingen die je tandarts ook bekijkt, met één advies per onderdeel.">
      <PopIn>
        <Card tone="navy">
          <Row gap={18}>
            <Ring value={score.total / 100} size={132} stroke={10} track="rgba(255,255,255,0.12)">
              <Txt v="stat" size={40} color="#FFFFFF" align="center">
                {String(score.total)}
              </Txt>
              <Txt v="label" size={9} color="#7FC9F2" align="center">
                van 100
              </Txt>
            </Ring>
            <View style={{ flex: 1, gap: 6 }}>
              <Bracket color="#7FC9F2">Je score</Bracket>
              <Txt v="title" color="#FFFFFF">
                {score.headline}
              </Txt>
              <Txt v="small" color="#B6C2DF">
                {score.summary}
              </Txt>
            </View>
          </Row>
        </Card>
      </PopIn>

      <View style={{ gap: 10 }}>
        {score.factors.map((f, i) => (
          <PopIn key={f.id} delay={60 + i * 50}>
            <Card>
              <Row gap={12} align="flex-start">
                <IconTile name={f.icon} color={COLORS[f.id]} size={42} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt v="h2">{f.title}</Txt>
                    <Txt v="num" size={13} color={C.muted}>
                      {f.id === 'poetsen' && !saved.brushing.length ? '–' : `${Math.round(f.value * 100)}`}
                    </Txt>
                  </Row>
                  <Bar value={f.value} color={COLORS[f.id]} />
                  <Txt v="small" color={C.soft}>
                    {f.status}
                  </Txt>
                  <View style={{ marginTop: 4, padding: 10, borderRadius: R.sm, backgroundColor: C.bg2 }}>
                    <Txt v="small" color={C.ink}>
                      {f.advice}
                    </Txt>
                  </View>
                  {f.route ? (
                    <Button
                      title={f.id === 'controle' ? 'Plan een controle' : f.id === 'poetsen' ? 'Naar de poetscoach' : 'Naar je nazorg'}
                      after="arrow"
                      size="sm"
                      kind="ghost"
                      style={{ paddingHorizontal: 0, marginTop: 2 }}
                      onPress={() => router.push(f.route as never)}
                    />
                  ) : null}
                </View>
              </Row>
            </Card>
          </PopIn>
        ))}
      </View>

      {/* ------------------------------------------------------------------------------ zoom into the enamel */}
      <View>
        <Bracket>Zoom in op je glazuur</Bracket>
        <Txt v="title" style={{ marginTop: 6 }}>
          Van een tand naar tien micrometer
        </Txt>
        <Txt v="small" color={C.muted} style={{ marginTop: 4 }}>
          Knijp, scroll of schuif tot je de prisma’s van het glazuur ziet. Blijf daar even…
        </Txt>
      </View>
      <View {...fx('dye-pearl')} style={[{ height: 380, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }, shadow(1)]}>
        <ScoreZoom zoom={zoomRef} onZoom={setZ} onScale={setScale} onBugs={(alive, brushed) => setBugs({ alive, brushed })} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 14, bottom: 14, gap: 4 }}>
          <View style={{ width: 64, height: 3, borderRadius: 2, backgroundColor: deep ? '#FFFFFF' : C.ink }} />
          <Txt v="num" size={11.5} color={deep ? '#FFFFFF' : C.ink}>
            {scale}
          </Txt>
        </View>
        {deep ? (
          <View pointerEvents="none" {...fx('glass')} style={{ position: 'absolute', left: 14, right: 14, top: 14, padding: 10, borderRadius: 14, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line }}>
            <Txt v="small" weight="700">
              {bugs.alive === 0 && bugs.brushed === 0
                ? 'Glazuurprisma’s. Wacht even…'
                : bugs.alive > 0
                  ? bugs.alive === 1
                    ? '1 bacterie in de tandplak · veeg hem weg'
                    : `${bugs.alive} bacteriën in de tandplak · veeg ze weg`
                  : `Schoon! ${bugs.brushed} weggepoetst`}
            </Txt>
            <Txt v="small" size={11.5} color={C.muted}>
              {bugs.alive === 0 && bugs.brushed > 0 ? 'Zo werkt poetsen: je breekt de plaklaag op voordat hij hard wordt.' : 'Tandplak begint binnen een paar uur na het poetsen opnieuw.'}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: -8 }}>
        <Slider value={zoom} onChange={setZ} label="Zoom" ticks={[0.3, 0.6, 0.84]} />
        <Row style={{ justifyContent: 'space-between', marginTop: -6 }}>
          {['tand', 'glazuur', 'prisma'].map((k) => (
            <Txt key={k} v="label" size={8.5} color={C.muted}>
              {k}
            </Txt>
          ))}
        </Row>
      </View>

      <DemoNote text="Demo: de score is een voorbeeldberekening met verzonnen gegevens, geen diagnose. De bacteriën zijn getekend. Je tandarts kijkt naar je echte mond." />
    </Screen>
  );
}
