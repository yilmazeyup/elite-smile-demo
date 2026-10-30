import type { ExplainerId } from '@smile/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Bracket, Button, Card, DemoNote, IconTile, PopIn, Press, Row, tap, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { STEPS } from '../../lib/explainSteps';
import { EXPLAINERS, explainerById } from '../../lib/teethData';
import { Slider } from '../../lib/teethSlider';
import { ExplainScene } from '../../three/ExplainScene';
import { C, fx, PAD, R, shadow } from '../../theme';

const IDS = EXPLAINERS.map((e) => e.id);
const SECONDS_PER_STEP = 4.4;

/** A 3D explainer: scrub through the treatment, or let it play; each step has a short, calm text. */
export default function Uitleg() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = (IDS.includes(params.id as ExplainerId) ? params.id : 'implantaat') as ExplainerId;
  const ex = explainerById(id);
  const steps = STEPS[id];
  const last = steps.length - 1;
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const step = Math.min(last, Math.max(0, Math.round(p)));
  const s = steps[step];

  // a new explainer starts at the beginning
  useEffect(() => {
    progress.current = 0;
    setP(0);
    setPlaying(false);
  }, [id]);

  // playing: the progress runs on by itself, one step every few seconds
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev = performance.now();
    const run = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - prev) / 1000));
      prev = now;
      const before = Math.round(progress.current);
      progress.current = Math.min(last, progress.current + dt / SECONDS_PER_STEP);
      if (Math.round(progress.current) !== before) tap('select');
      setP(progress.current);
      if (progress.current >= last) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [playing, last]);

  const goTo = (k: number) => {
    setPlaying(false);
    progress.current = k;
    setP(k);
  };

  return (
    <Screen back kicker="Uitleg in 3D" title={ex.title} serif={ex.sub}>
      <View {...fx('dye-navy')} style={[{ height: 430, borderRadius: R.xl, overflow: 'hidden', backgroundColor: '#060D1F' }, shadow(2)]}>
        <ExplainScene id={id} progress={progress} onDrag={setDragging} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: 14, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Bracket color="#7FC9F2">{`Stap ${step + 1} / ${steps.length}`}</Bracket>
          <Txt v="label" size={9} color={dragging ? '#4CCBF7' : 'rgba(182,194,223,0.7)'}>
            {dragging ? 'Tekening' : 'Sleep om rond te kijken'}
          </Txt>
        </View>
        <Press
          onPress={() => {
            if (progress.current >= last) {
              progress.current = 0;
              setP(0);
            }
            setPlaying((x) => !x);
          }}
          accessibilityLabel={tr(playing ? 'Pauze' : 'Afspelen')}
          fxNames="dye-blue glow"
          style={{ position: 'absolute', right: 14, bottom: 14, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A63B5' }}
        >
          <Icon name={playing ? 'pause' : p >= last ? 'rotate' : 'play'} size={21} color="#FFFFFF" stroke={2.2} />
        </Press>
      </View>

      {/* the scrubber */}
      <View style={{ marginTop: -4 }}>
        <Slider
          value={p / last}
          label="Stappen"
          ticks={steps.map((_, k) => k / last)}
          onStart={() => setPlaying(false)}
          onChange={(v) => {
            progress.current = v * last;
            setP(progress.current);
          }}
          onEnd={(v) => goTo(Math.round(v * last))}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: PAD }} style={{ marginHorizontal: -2 }}>
          {steps.map((st, k) => {
            const on = k === step;
            return (
              <Press
                key={st.chip}
                onPress={() => goTo(k)}
                accessibilityState={{ selected: on }}
                accessibilityLabel={tr(`Stap ${k + 1}: ${st.chip}`)}
                scaleTo={0.95}
                style={{ height: 44, paddingLeft: 6, paddingRight: 14, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? C.navy : C.paper, borderWidth: 1, borderColor: on ? C.navy : C.line2 }}
              >
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#0A63B5' : k < step ? C.ice : C.bg2 }}>
                  {k < step ? <Icon name="check" size={14} color={C.blue} stroke={2.4} /> : <Txt v="num" size={12} weight="600" color={on ? '#FFFFFF' : C.soft}>{String(k + 1)}</Txt>}
                </View>
                <Txt v="small" weight="700" color={on ? '#FFFFFF' : C.soft}>
                  {st.chip}
                </Txt>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      <PopIn key={`${id}-${step}`}>
        <Card tone="paper">
          <Bracket color={C.blue}>{`Stap ${step + 1} · ${s.chip}`}</Bracket>
          <Txt v="title" style={{ marginTop: 6 }}>
            {s.title}
          </Txt>
          <Txt v="body" color={C.soft} style={{ marginTop: 8 }}>
            {s.text}
          </Txt>
          <Row gap={8} style={{ marginTop: 14 }}>
            <Button title="Vorige" icon="back" size="sm" kind="soft" disabled={step === 0} onPress={() => goTo(step - 1)} />
            <Button title={step === last ? 'Opnieuw' : 'Volgende'} after={step === last ? 'rotate' : 'arrow'} size="sm" kind="brand" onPress={() => goTo(step === last ? 0 : step + 1)} />
          </Row>
        </Card>
      </PopIn>

      <Card tone="pearl">
        <Row gap={12} align="flex-start">
          <IconTile name="doc" color="#0A63B5" size={42} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="h3">Waarom, wat zijn de andere mogelijkheden, wat zijn de risico’s?</Txt>
            <Txt v="small" color={C.muted}>
              Lees het rustig na voordat je toestemming geeft. Je mag altijd vragen stellen.
            </Txt>
          </View>
        </Row>
        <Row gap={8} wrap style={{ marginTop: 14 }}>
          <Button title="Lees de toestemming" icon="sign" size="sm" kind="blue" onPress={() => router.push(`/toestemming/${ex.consent}` as never)} />
          <Button title="Vraag het de kliniek" icon="chat" size="sm" kind="line" onPress={() => router.push('/chat' as never)} />
        </Row>
      </Card>

      <View>
        <Bracket>Andere uitleg</Bracket>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: PAD, paddingTop: 10 }}>
          {EXPLAINERS.filter((e) => e.id !== id).map((e) => (
            <Card key={e.id} pad={14} onPress={() => router.replace({ pathname: '/uitleg/[id]', params: { id: e.id } } as never)} label={tr(e.title)} style={{ width: 168, minHeight: 116, justifyContent: 'space-between' }}>
              <IconTile name={e.icon} color={e.color} size={38} />
              <Txt v="h3" style={{ marginTop: 10 }}>
                {e.title}
              </Txt>
            </Card>
          ))}
        </ScrollView>
      </View>

      <DemoNote text="Algemene uitleg over een behandeling, getekend in 3D. Wat voor jou geldt bespreek je met je tandarts; volg altijd zijn of haar advies." />
    </Screen>
  );
}
