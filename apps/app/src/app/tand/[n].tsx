import { ADULT_TEETH, dateShort, decimal, doctorById, laylaTeeth, relativeDay, TOOTH_STATUS, toothName } from '@smile/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { alpha, Avatar, Bracket, Button, Card, DemoNote, Flip, IconButton, PopIn, Press, Row, Tag, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { explainerFor, nextStep, planTag, PLAN_TONES, sinceLabel, toothStory } from '../../lib/teethData';
import { useApp } from '../../state/app';
import { TeethFocus } from '../../three/TeethFocus';
import { toothInfo } from '../../three/teeth';
import { C, fx, PAD, R } from '../../theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What kind of tooth it is, in a sentence. */
function about(n: number): string {
  const info = toothInfo(n);
  const jaw = info.jaw === 'upper' ? 'boven' : 'onder';
  switch (info.family) {
    case 'incisor':
      return `Een snijtand: een scherpe rand om af te bijten en één rechte wortel.`;
    case 'canine':
      return 'De hoektand heeft de langste wortel van je gebit en geleidt je kaak als je zijwaarts kauwt.';
    case 'premolar':
      return info.roots === 2 ? 'Een premolaar met twee knobbels en, bij deze bovenste, meestal twee wortels.' : 'Een premolaar: twee knobbels om te scheuren en te malen, en één wortel.';
    default:
      return info.index === 8
        ? jaw === 'boven'
          ? 'Een verstandskies, de laatste kies achteraan in de bovenkaak. Vaak zijn de wortels samengegroeid.'
          : 'Een verstandskies, de laatste kies achteraan in de onderkaak. Vaak zijn de wortels samengegroeid.'
        : info.jaw === 'upper'
          ? 'Een bovenkies: vier knobbels om te malen en drie wortels, twee aan de wangkant en één aan de kant van het gehemelte.'
          : `Een onderkies: ${info.index === 6 ? 'vijf' : 'vier'} knobbels om te malen en twee wortels, een voor en een achter.`;
  }
}

export default function ToothScreen() {
  const params = useLocalSearchParams<{ n?: string }>();
  const n = ADULT_TEETH.includes(Number(params.n)) ? Number(params.n) : 36;
  const { today } = useApp();
  const tooth = laylaTeeth().find((t) => t.n === n)!;
  const [cut, setCut] = useState(false);
  const st = TOOTH_STATUS[tooth.status];
  const info = toothInfo(n);
  const story = toothStory(tooth, today);
  const step = nextStep(tooth, today);
  const tag = planTag(tooth, today);
  const explainer = explainerFor(tooth);
  const doc = tooth.by ? doctorById(tooth.by) : null;
  const i = ADULT_TEETH.indexOf(n);
  const prev = ADULT_TEETH[(i + ADULT_TEETH.length - 1) % ADULT_TEETH.length];
  const next = ADULT_TEETH[(i + 1) % ADULT_TEETH.length];
  const go = (to: number) => router.replace({ pathname: '/tand/[n]', params: { n: String(to) } } as never);
  const canCut = tooth.status !== 'ontbreekt' && tooth.status !== 'implantaat';

  return (
    <Screen
      back
      right={
        <Row gap={8}>
          <Flip>
            <IconButton name="back" label={`Vorige tand ${prev}`} onPress={() => go(prev)} />
          </Flip>
          <Flip>
            <IconButton name="chevron" label={`Volgende tand ${next}`} onPress={() => go(next)} />
          </Flip>
        </Row>
      }
      hero={
        <View style={{ height: 470, marginTop: 4 }}>
          <TeethFocus key={n} tooth={tooth} cut={cut} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: PAD, top: 6, gap: 2 }}>
            <Bracket color={C.blue}>{cap(toothName(n))}</Bracket>
            <Txt v="mega" size={64} ink="pearl" style={{ marginTop: -2 }}>
              {String(n)}
            </Txt>
          </View>
          <Row gap={8} style={{ position: 'absolute', left: PAD, right: PAD, bottom: 10, justifyContent: 'space-between' }}>
            <View {...fx('glass')} style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line }}>
              <Txt v="small" size={11.5} color={C.muted}>
                {tooth.status === 'implantaat' ? 'Sleep om te draaien · in doorsnede' : 'Sleep om te draaien · knijp om te zoomen'}
              </Txt>
            </View>
            {canCut ? (
              <Press
                onPress={() => setCut((c) => !c)}
                accessibilityRole="switch"
                accessibilityState={{ checked: cut }}
                accessibilityLabel={tr('Doorsnede')}
                fxNames={cut ? 'dye-navy' : 'glass'}
                style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: cut ? C.navy : C.glass, borderWidth: 1, borderColor: cut ? C.navy : C.line2 }}
              >
                <Icon name="layers" size={17} color={cut ? '#FFFFFF' : C.ink} />
                <Txt v="small" weight="700" color={cut ? '#FFFFFF' : C.ink}>
                  Doorsnede
                </Txt>
              </Press>
            ) : null}
          </Row>
        </View>
      }
    >
      <PopIn>
        <Card>
          <Row gap={8} wrap>
            <Tag label={st.label} color={tooth.status === 'gezond' ? C.blue : tooth.status === 'ontbreekt' ? C.muted : st.color} bg={tooth.status === 'gezond' ? C.ice : alpha(st.color, 0.14)} />
            {tag ? <Tag label={tag.sub ? `${tag.label} · ${tag.sub}` : tag.label} color={PLAN_TONES[tag.tone].color} bg={alpha(PLAN_TONES[tag.tone].color, 0.12)} /> : null}
            <Tag label={`${info.roots} ${info.roots === 1 ? 'wortel' : 'wortels'}`} />
          </Row>
          <Txt v="serif" size={18} color={C.ink} style={{ marginTop: 12 }}>
            {tooth.note ?? 'Gezond en sterk. Niets aan doen, behalve goed blijven poetsen.'}
          </Txt>
          {doc ? (
            <Row gap={12} style={{ marginTop: 14 }}>
              <Avatar id={doc.id} size={42} ring="#2DB4E8" />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{doc.name}</Txt>
                <Txt v="small" color={C.muted}>
                  {tooth.since !== undefined ? `${doc.title} · ${tooth.since <= 3 ? `${tooth.since} dagen geleden` : sinceLabel(tooth.since, today)}` : doc.title}
                </Txt>
              </View>
            </Row>
          ) : null}
        </Card>
      </PopIn>

      <PopIn delay={60}>
        <Card tone="navy">
          <Bracket color="#7FC9F2">Volgende stap</Bracket>
          <Row gap={12} align="flex-start" style={{ marginTop: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt v="title" color="#FFFFFF">
                {step.title}
              </Txt>
              <Txt v="small" color="#B6C2DF">
                {step.text}
              </Txt>
            </View>
            {step.when ? (
              <View style={{ alignItems: 'center', minWidth: 64, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <Txt v="label" color="#7FC9F2" size={9.5}>
                  {relativeDay(step.when, today)}
                </Txt>
                <Txt v="h3" color="#FFFFFF">
                  {dateShort(step.when)}
                </Txt>
              </View>
            ) : null}
          </Row>
          {step.route ? (
            <Button title={step.route === '/poetsen' ? 'Naar de poetscoach' : 'Naar je nazorg'} kind="white" size="sm" after="arrow" style={{ marginTop: 14 }} onPress={() => router.push(step.route as never)} />
          ) : null}
        </Card>
      </PopIn>

      {story.length ? (
        <View>
          <Bracket>Het verhaal van deze tand</Bracket>
          <Card style={{ marginTop: 10 }}>
            {story.map((s, k) => (
              <Row key={`${s.title}${k}`} gap={12} align="flex-start">
                <View style={{ alignItems: 'center', width: 14 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: k === 0 ? C.sky : C.line2 }} />
                  {k < story.length - 1 ? <View style={{ width: 1.5, flex: 1, minHeight: 26, backgroundColor: C.line2, marginVertical: 3 }} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: k < story.length - 1 ? 14 : 0, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }} gap={8}>
                    <Txt v="h3" style={{ flex: 1 }}>
                      {s.title}
                    </Txt>
                    <Txt v="num" size={11.5} color={C.muted}>
                      {s.when.getFullYear() < today.getFullYear() - 3 ? String(s.when.getFullYear()) : dateShort(s.when)}
                    </Txt>
                  </Row>
                  {s.text ? (
                    <Txt v="small" color={C.muted}>
                      {s.text}
                    </Txt>
                  ) : null}
                  {s.by ? (
                    <Txt v="small" size={12} color={C.blue}>
                      {doctorById(s.by).name}
                    </Txt>
                  ) : null}
                </View>
              </Row>
            ))}
          </Card>
        </View>
      ) : null}

      <View>
        <Bracket>Over deze tand</Bracket>
        <Card tone="pearl" style={{ marginTop: 10 }}>
          <Txt v="body" color={C.soft}>
            {about(n)}
          </Txt>
          <Row gap={10} style={{ marginTop: 14 }}>
            {[
              { k: 'Kroon', v: `${decimal(info.dims.crownH)} mm` },
              { k: 'Wortel', v: `${decimal(info.dims.rootH)} mm` },
              { k: 'Breedte', v: `${decimal(info.dims.md)} mm` },
            ].map((m) => (
              <View key={m.k} style={{ flex: 1, padding: 12, borderRadius: R.md, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, gap: 2 }}>
                <Txt v="label" size={9} color={C.muted}>
                  {m.k}
                </Txt>
                <Txt v="stat" size={20}>
                  {m.v}
                </Txt>
              </View>
            ))}
          </Row>
          <Txt v="small" size={12} color={C.muted} style={{ marginTop: 10 }}>
            Gemiddelde maten uit de tandheelkunde, niet bij jou gemeten.
          </Txt>
        </Card>
      </View>

      <Row gap={8} wrap>
        {explainer ? <Button title="Uitleg in 3D" icon="play" size="sm" kind="brand" onPress={() => router.push({ pathname: '/uitleg/[id]', params: { id: explainer } } as never)} /> : null}
        <Button title="Röntgen" icon="xray" size="sm" kind="line" onPress={() => router.push({ pathname: '/rontgen', params: { tand: String(n) } } as never)} />
        {tooth.status === 'implantaat' ? <Button title="Implantaatpaspoort" icon="implant" size="sm" kind="line" onPress={() => router.push('/paspoort' as never)} /> : null}
      </Row>

      <DemoNote text="Demo: een getekend model van een gemiddelde tand, geen scan. Volg altijd het advies van je eigen tandarts." />
    </Screen>
  );
}
