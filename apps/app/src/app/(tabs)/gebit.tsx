import { dateShort, doctorById, laylaTeeth, TOOTH_STATUS, toothName, type Tooth } from '@smile/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Avatar, Bracket, Button, Card, DemoNote, Flip, IconTile, ListItem, PopIn, Press, Ring, Row, SectionHead, Segments, Tag, Txt, alpha } from '../../components/ui';
import { tr } from '../../i18n';
import { scoreOf } from '../../lib/scoreModel';
import { ADULT_STATUSES, chartSummary, explainerFor, EXPLAINERS, planTag, PLAN_TONES, sinceLabel, toothStory } from '../../lib/teethData';
import { SitePlan } from '../../lib/teethPlan';
import { useApp } from '../../state/app';
import { MouthScene, type MouthView } from '../../three/MouthScene';
import { C, fx, R, shadow } from '../../theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MORE: { icon: IconName; title: string; sub: string; to: string; color: string }[] = [
  { icon: 'xray', title: 'Röntgen', sub: 'Je overzichtsfoto, met notities', to: '/rontgen', color: '#0B1A3A' },
  { icon: 'implant', title: 'Implantaatpaspoort', sub: 'Merk, maat en lotnummer van 36', to: '/paspoort', color: '#8E7CF8' },
  { icon: 'sparkle', title: 'Glimlach-studio', sub: 'Zie je tanden lichter', to: '/glimlach', color: '#2DB4E8' },
  { icon: 'brush', title: 'Poetscoach', sub: 'Twee minuten, vier kwadranten', to: '/poetsen', color: '#17BFA3' },
];

/** "Mijn gebit": Layla's teeth in 3D or as a site plan, each tooth with its own story. */
export default function Gebit() {
  const { today, saved } = useApp();
  const teeth = useMemo(() => laylaTeeth(), []);
  const [mode, setMode] = useState<'3d' | 'plan'>('3d');
  const [view, setView] = useState<MouthView>('front');
  const [selected, setSelected] = useState<number | null>(null);
  const tooth = teeth.find((t) => t.n === selected) ?? null;
  const sum = chartSummary(teeth);
  const score = scoreOf(saved, today);

  return (
    <Screen tabs kicker="Jouw gebit" title="Mijn gebit" serif={`${sum.own} eigen tanden en één implantaat in wording.`}>
      <Segments
        value={mode}
        onChange={setMode}
        options={[
          { id: '3d', label: '3D', icon: 'cube' },
          { id: 'plan', label: 'Plattegrond', icon: 'map' },
        ]}
      />

      {mode === '3d' ? (
        <View {...fx('dye-pearl')} style={[{ height: 452, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.bg2 }, shadow(1)]}>
          <MouthScene teeth={teeth} selected={selected} onSelect={setSelected} view={view} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 14, gap: 3 }}>
            <Bracket color={C.blue}>Odontogram 3D</Bracket>
            <Txt v="small" size={12} color={C.muted}>
              Draai met je vinger · tik op een tand
            </Txt>
          </View>
          <Row gap={6} style={{ position: 'absolute', left: 12, right: 12, bottom: 12, justifyContent: 'center' }}>
            {(
              [
                { id: 'front', label: 'Open mond' },
                { id: 'upper', label: 'Bovenkaak' },
                { id: 'lower', label: 'Onderkaak' },
              ] as { id: MouthView; label: string }[]
            ).map((v) => {
              const on = v.id === view;
              return (
                <Press
                  key={v.id}
                  onPress={() => setView(v.id)}
                  accessibilityState={{ selected: on }}
                  fxNames={on ? '' : 'glass'}
                  style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? C.navy : C.glass, borderWidth: 1, borderColor: on ? C.navy : C.line }}
                >
                  <Txt v="small" weight="700" size={12.5} color={on ? '#FFFFFF' : C.soft}>
                    {v.label}
                  </Txt>
                </Press>
              );
            })}
          </Row>
        </View>
      ) : (
        <SitePlan teeth={teeth} selected={selected} onSelect={setSelected} today={today} height={470} />
      )}

      {tooth ? <ToothCard key={tooth.n} tooth={tooth} today={today} onClose={() => setSelected(null)} /> : <Summary teeth={teeth} onPick={setSelected} />}

      {/* ------------------------------------------------------------------------------------------- legend */}
      <View style={{ gap: 10 }}>
        <Bracket>Legenda</Bracket>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ADULT_STATUSES.map((s) => (
            <Row key={s} gap={7} style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: R.pill, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
              <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: s === 'ontbreekt' ? 'transparent' : TOOTH_STATUS[s].color, borderWidth: s === 'gezond' || s === 'ontbreekt' ? 1.2 : 0, borderColor: C.line2, borderStyle: s === 'ontbreekt' ? 'dashed' : 'solid' }} />
              <Txt v="small" size={12.5} color={C.soft}>
                {TOOTH_STATUS[s].label}
              </Txt>
            </Row>
          ))}
        </View>
      </View>

      {/* --------------------------------------------------------------------------------------- more tools */}
      <View>
        <SectionHead kicker="Meer over je gebit" title="Bekijken en bijhouden" />
        <Card tone="navy" pad={0} style={{ marginBottom: 10 }}>
          <Press onPress={() => router.push('/score' as never)} accessibilityLabel={tr('Mondgezondheid')} scaleTo={0.99} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Ring value={score.total / 100} size={62} stroke={6} track="rgba(255,255,255,0.12)">
              <Txt v="stat" size={20} color="#FFFFFF">
                {String(score.total)}
              </Txt>
            </Ring>
            <View style={{ flex: 1, gap: 3 }}>
              <Bracket color="#7FC9F2">Mondgezondheid</Bracket>
              <Txt v="h2" color="#FFFFFF">
                {score.headline}
              </Txt>
              <Txt v="small" color="#B6C2DF" numberOfLines={2}>
                Controle, tandvlees, poetsen en open behandelingen
              </Txt>
            </View>
            <Flip>
              <Icon name="chevron" size={18} color="#7FC9F2" />
            </Flip>
          </Press>
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {MORE.map((m, i) => (
            <PopIn key={m.to} delay={i * 40} style={{ width: '48.4%' }}>
              <Card pad={14} onPress={() => router.push(m.to as never)} label={tr(m.title)} style={{ minHeight: 122, justifyContent: 'space-between' }}>
                <IconTile name={m.icon} color={m.color} size={40} />
                <View style={{ gap: 2, marginTop: 10 }}>
                  <Txt v="h3">{m.title}</Txt>
                  <Txt v="small" size={12} color={C.muted} numberOfLines={2}>
                    {m.sub}
                  </Txt>
                </View>
              </Card>
            </PopIn>
          ))}
        </View>
      </View>

      {/* ------------------------------------------------------------------------------------- explainers */}
      <View>
        <SectionHead kicker="Uitleg in 3D" title="Zo gaat een behandeling" serif="Rustig, stap voor stap, in je eigen tempo." />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          {EXPLAINERS.map((e, i) => (
            <ListItem key={e.id} icon={e.icon} color={e.color} title={e.title} sub={e.sub} last={i === EXPLAINERS.length - 1} onPress={() => router.push({ pathname: '/uitleg/[id]', params: { id: e.id } } as never)} />
          ))}
        </Card>
      </View>

      <DemoNote text="Demo: dit gebit hoort bij een verzonnen patiënt. Het 3D-model is getekend, geen scan van een echte mond." />
    </Screen>
  );
}

function Summary({ teeth, onPick }: { teeth: Tooth[]; onPick: (n: number) => void }) {
  const notable = teeth.filter((t) => t.status !== 'gezond');
  return (
    <Card tone="paper">
      <Row style={{ justifyContent: 'space-between' }} align="flex-start">
        <View style={{ flex: 1, gap: 4 }}>
          <Bracket>Tik op een tand</Bracket>
          <Txt v="title">Elke tand heeft een verhaal</Txt>
          <Txt v="small" color={C.muted}>
            Nummers volgens het FDI-schema van je tandarts: het eerste cijfer is het kwadrant, het tweede de plek vanaf het midden.
          </Txt>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {notable.map((t) => (
          <Press key={t.n} onPress={() => onPick(t.n)} accessibilityLabel={tr(`${t.n} ${TOOTH_STATUS[t.status].label}`)} scaleTo={0.95} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingLeft: 6, paddingRight: 12, borderRadius: 14, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: t.status === 'ontbreekt' ? C.paper : alpha(TOOTH_STATUS[t.status].color, 0.18), borderWidth: t.status === 'ontbreekt' ? 1 : 0, borderColor: C.line2, borderStyle: 'dashed' }}>
              <Txt v="num" size={12.5} weight="600">
                {String(t.n)}
              </Txt>
            </View>
            <Txt v="small" size={12.5} weight="600" color={C.soft}>
              {TOOTH_STATUS[t.status].label}
            </Txt>
          </Press>
        ))}
      </View>
    </Card>
  );
}

function ToothCard({ tooth, today, onClose }: { tooth: Tooth; today: Date; onClose: () => void }) {
  const st = TOOTH_STATUS[tooth.status];
  const story = toothStory(tooth, today);
  const tag = planTag(tooth, today);
  const explainer = explainerFor(tooth);
  const doc = tooth.by ? doctorById(tooth.by) : null;
  return (
    <PopIn>
      <Card tone="paper" pad={0}>
        <View style={{ padding: 18, gap: 14 }}>
          <Row gap={14} align="flex-start">
            <View style={{ width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tooth.status === 'gezond' ? C.ice : alpha(st.color, 0.16), borderWidth: 1, borderColor: tooth.status === 'gezond' ? C.line : alpha(st.color, 0.4) }}>
              <Txt v="stat" size={26}>
                {String(tooth.n)}
              </Txt>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Txt v="title">{cap(toothName(tooth.n))}</Txt>
              <Row gap={6} wrap>
                <Tag label={st.label} color={tooth.status === 'gezond' ? C.blue : tooth.status === 'ontbreekt' ? C.muted : st.color} bg={tooth.status === 'gezond' ? C.ice : alpha(st.color, 0.14)} />
                {tag ? <Tag label={tag.label} color={PLAN_TONES[tag.tone].color} bg={alpha(PLAN_TONES[tag.tone].color, 0.12)} /> : null}
                {tooth.surfaces ? <Tag label={`vlak ${tooth.surfaces}`} /> : null}
              </Row>
            </View>
            <Press onPress={onClose} accessibilityLabel={tr('Sluiten')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 }}>
              <Icon name="close" size={18} color={C.soft} />
            </Press>
          </Row>
          {tooth.note ? (
            <Txt v="serif" size={17} color={C.soft}>
              {tooth.note}
            </Txt>
          ) : (
            <Txt v="serif" size={17} color={C.soft}>
              Gezond en sterk. Niets aan doen, behalve goed blijven poetsen.
            </Txt>
          )}
          {doc || tooth.since ? (
            <Row gap={12} style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: C.bg2 }}>
              {doc ? <Avatar id={doc.id} size={40} ring="#2DB4E8" /> : <IconTile name="calendar" size={40} />}
              <View style={{ flex: 1, gap: 1 }}>
                <Txt v="label" size={9.5} color={C.muted}>
                  {doc ? 'Behandeld door' : 'Sinds'}
                </Txt>
                <Txt v="h3">{doc ? doc.name : tooth.since ? sinceLabel(tooth.since, today) : ''}</Txt>
                {doc ? (
                  <Txt v="small" size={12} color={C.muted}>
                    {tooth.since !== undefined ? `${doc.title} · ${tooth.since <= 3 ? `${tooth.since} dagen geleden` : sinceLabel(tooth.since, today)}` : doc.title}
                  </Txt>
                ) : null}
              </View>
            </Row>
          ) : null}
        </View>
        {story.length ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
            <Bracket>Geschiedenis</Bracket>
            <View style={{ marginTop: 10 }}>
              {story.map((s, i) => (
                <Row key={`${s.title}${i}`} gap={12} align="flex-start">
                  <View style={{ alignItems: 'center', width: 14 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? C.sky : C.line2 }} />
                    {i < story.length - 1 ? <View style={{ width: 1.5, flex: 1, minHeight: 26, backgroundColor: C.line2, marginVertical: 3 }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 12, gap: 2 }}>
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
            </View>
          </View>
        ) : null}
        <Row gap={8} wrap style={{ padding: 14, borderTopWidth: 1, borderColor: C.line }}>
          <Button title="Bekijk in 3D" icon="cube" size="sm" kind="brand" onPress={() => router.push({ pathname: '/tand/[n]', params: { n: String(tooth.n) } } as never)} />
          {explainer ? <Button title="Uitleg in 3D" icon="play" size="sm" kind="line" onPress={() => router.push({ pathname: '/uitleg/[id]', params: { id: explainer } } as never)} /> : null}
          <Button title="Röntgen" icon="xray" size="sm" kind="line" onPress={() => router.push({ pathname: '/rontgen', params: { tand: String(tooth.n) } } as never)} />
        </Row>
      </Card>
    </PopIn>
  );
}

