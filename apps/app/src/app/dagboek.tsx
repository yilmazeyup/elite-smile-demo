import { DIARY_SEED, emit } from '@smile/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Bracket, Button, Card, Chip, PopIn, Press, Row, SectionHead, tap, Toggle, Txt } from '../components/ui';
import { tr } from '../i18n';
import { callClinic } from '../lib/ics';
import { diaryAlert } from '../lib/story';
import { useApp, type DiaryEntry } from '../state/app';
import { C } from '../theme';

const FACES = ['Geen pijn', 'Een beetje', 'Gaat wel', 'Veel', 'Heel veel'];
const SWELL = ['Geen', 'Licht', 'Duidelijk', 'Fors'];

/**
 * Pain and swelling, once a day after the implant, drawn as a line. The app watches for the signs that matter (pain
 * that rises again after day 3, a fever, bleeding that won't stop) and then says to call; the clinic panel sees every
 * entry and the same alert.
 */
export default function Dagboek() {
  const { saved, update, careDay } = useApp();
  const toast = useToast();
  const today = saved.diary.find((d) => d.day === careDay);
  const [pain, setPain] = useState(today?.pain ?? 3);
  const [swelling, setSwelling] = useState(today?.swelling ?? 1);
  const [fever, setFever] = useState(today?.fever ?? false);
  const [bleeding, setBleeding] = useState(today?.bleeding ?? false);

  // The seed days the demo starts with, then what was logged in the app.
  const entries: DiaryEntry[] = [
    ...DIARY_SEED.filter((s) => !saved.diary.some((d) => d.day === s.day)).map((s) => ({ ...s, fever: false, bleeding: false, at: 0 })),
    ...saved.diary,
  ].sort((a, b) => a.day - b.day);
  const alert = diaryAlert(entries);

  const save = () => {
    const entry: DiaryEntry = { day: careDay, pain, swelling, fever, bleeding, at: Date.now() };
    const next = [...entries.filter((e) => e.day !== careDay), entry].sort((a, b) => a.day - b.day);
    const warn = diaryAlert(next);
    update({ diary: [...saved.diary.filter((d) => d.day !== careDay), entry] });
    emit({ kind: 'pain', who: 'layla', day: careDay, pain, swelling, fever, bleeding, alert: Boolean(warn) });
    tap(warn ? 'warning' : 'success');
    toast(warn ? tr('Bel de kliniek even') : tr('Opgeslagen'), { text: warn ? tr(warn) : tr('Dr. Omar ziet je dagboek op het praktijkscherm.'), icon: warn ? 'alert' : 'pulse' });
  };

  // The chart: pain 0–10 as a line over the days, swelling as soft bars.
  const W = 320;
  const H = 150;
  const days = Math.max(7, careDay + 1);
  const x = (d: number) => 24 + (d / (days - 1)) * (W - 40);
  const y = (p: number) => 14 + (1 - p / 10) * (H - 40);
  const line = entries.map((e, i) => `${i ? 'L' : 'M'}${x(e.day).toFixed(1)} ${y(e.pain).toFixed(1)}`).join(' ');

  return (
    <Screen back title="Pijndagboek" kicker={`Dag ${careDay} na je implantaat`} serif="Eén keer per dag, ’s avonds. Het duurt tien seconden.">
      {alert ? (
        <PopIn>
          <Card style={{ borderColor: C.alert, borderWidth: 1.5 }}>
            <Txt v="h3" color={C.alert}>
              {alert}
            </Txt>
            <Button title="Bel Elite Smile" icon="phone" size="sm" kind="alert" style={{ marginTop: 10 }} onPress={callClinic} />
          </Card>
        </PopIn>
      ) : null}

      <Card>
        <Bracket>Verloop</Bracket>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 10 }}>
          <Defs>
            <LinearGradient id="painLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#0A63B5" />
              <Stop offset="1" stopColor="#2DB4E8" />
            </LinearGradient>
          </Defs>
          {[0, 5, 10].map((p) => (
            <Line key={p} x1={20} x2={W - 10} y1={y(p)} y2={y(p)} stroke="rgba(127,140,170,0.2)" strokeDasharray="3 4" />
          ))}
          {entries.map((e) => (
            <Path key={`s${e.day}`} d={`M${x(e.day) - 7} ${H - 18} h14 v-${e.swelling * 8} h-14 z`} fill="rgba(142,124,248,0.25)" />
          ))}
          <Path d={line} stroke="url(#painLine)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {entries.map((e) => (
            <Circle key={e.day} cx={x(e.day)} cy={y(e.pain)} r={e.day === careDay ? 6 : 4.5} fill={e.fever || e.bleeding ? '#E2434B' : '#0A63B5'} stroke="#FFFFFF" strokeWidth={2} />
          ))}
          {Array.from({ length: days }, (_, d) => (
            <SvgText key={d} x={x(d)} y={H - 2} fontSize={10} fill="#7584A3" textAnchor="middle">
              {String(d)}
            </SvgText>
          ))}
        </Svg>
        <Row gap={14} style={{ marginTop: 6 }}>
          <Row gap={6}>
            <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: '#0A63B5' }} />
            <Txt v="small" size={11.5} color={C.muted}>
              Pijn
            </Txt>
          </Row>
          <Row gap={6}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(142,124,248,0.35)' }} />
            <Txt v="small" size={11.5} color={C.muted}>
              Zwelling
            </Txt>
          </Row>
          <Txt v="small" size={11.5} color={C.muted}>
            Dag na de ingreep
          </Txt>
        </Row>
      </Card>

      <View>
        <SectionHead kicker="Vandaag" title="Hoeveel pijn heb je?" />
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Txt v="mega" size={56} color={pain >= 7 ? C.alert : pain >= 4 ? C.warn : C.ok}>
              {String(pain)}
            </Txt>
            <Txt v="h3" color={C.soft} style={{ marginBottom: 10 }}>
              {FACES[Math.min(4, Math.round(pain / 2.5))]}
            </Txt>
          </Row>
          <Row gap={4} style={{ marginTop: 8 }}>
            {Array.from({ length: 11 }, (_, i) => (
              <Press
                key={i}
                onPress={() => (setPain(i), tap('select'))}
                accessibilityLabel={`${tr('Pijn')} ${i}`}
                haptic={false}
                style={{ flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= pain ? (i >= 7 ? '#E2434B' : i >= 4 ? '#E0901A' : '#12A27A') : C.bg2, opacity: i <= pain ? 0.35 + (i / 10) * 0.65 : 1 }}
              >
                <Txt v="num" size={11.5} color={i <= pain ? '#FFFFFF' : C.muted}>
                  {String(i)}
                </Txt>
              </Press>
            ))}
          </Row>
          <Bracket color={C.muted}>Zwelling</Bracket>
          <Row gap={8} wrap style={{ marginTop: 8 }}>
            {SWELL.map((s, i) => (
              <Chip key={s} label={s} on={swelling === i} onPress={() => setSwelling(i)} small />
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 16 }}>
            <Txt v="h3">Koorts boven 38,5 °C</Txt>
            <Toggle value={fever} onChange={setFever} label="Koorts" />
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <Txt v="h3" style={{ flex: 1 }}>
              Het blijft bloeden
            </Txt>
            <Toggle value={bleeding} onChange={setBleeding} label="Bloeden" />
          </Row>
          <Button full title={today ? 'Bijwerken' : 'Opslaan'} icon="check" style={{ marginTop: 18 }} onPress={save} />
        </Card>
      </View>
      <Card tone="flat" onPress={() => router.push('/nazorg')} label="Nazorg">
        <Txt v="small" color={C.soft}>
          Pijn die elke dag wat minder wordt is normaal. Neemt hij na dag 3 weer toe, dan kan er een ontsteking of een droge kom zijn: bel dan.
        </Txt>
      </Card>
    </Screen>
  );
}
