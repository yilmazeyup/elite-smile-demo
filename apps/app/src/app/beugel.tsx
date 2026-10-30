import { addDays, CARE, clock, dayShort, doctorById, ELASTICS, eventsOf, monthShort, upcoming, weekdayLong } from '@smile/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Avatar, Bracket, Button, Card, IconTile, PopIn, Press, Ring, Row, SectionHead, Sheet, tap, Tag, Txt } from '../components/ui';
import { tr } from '../i18n';
import { colorList, ELASTIC_COLORS, wearLog, withWear, wornToday } from '../lib/bracesBuddy';
import { emit, useApp, useTick } from '../state/app';
import { BracesSet } from '../three/BracesSet';
import { C, R, shadow, web } from '../theme';

const CLINIC_TEL = 'tel:+31638208557';
const TARGET_HOURS = 12;

type Help = 'slotje' | 'draad';

const HELP: Record<Help, { title: string; lead: string; icon: IconName; steps: string[] }> = {
  slotje: {
    title: 'Een slotje zit los',
    lead: 'Vervelend, maar geen spoed. Het slotje zit meestal nog aan de draad.',
    icon: 'braces',
    steps: [
      'Laat het zitten en druk er een bolletje wax omheen als het schuurt.',
      'Valt het eraf? Bewaar het in een doosje en neem het mee.',
      'Bel de kliniek, dan plannen we een moment om het vast te zetten.',
    ],
  },
  draad: {
    title: 'Een draad prikt',
    lead: 'Dek het puntje af met wax tot je afspraak.',
    icon: 'alert',
    steps: [
      'Droog het plekje met een schone tissue of een gaasje.',
      'Rol een stukje wax zo groot als een erwt warm tussen je vingers.',
      'Druk het stevig over het puntje van de draad.',
      'Blijft het prikken of zit de draad los? Bel de kliniek.',
    ],
  },
};

const BRUSH_STEPS: { title: string; text: string }[] = [
  { title: 'Boven de slotjes', text: 'Borstel schuin naar beneden, kleine rondjes, tand voor tand.' },
  { title: 'Onder de slotjes', text: 'Nu schuin omhoog, ook langs het tandvlees.' },
  { title: 'Tussen draad en tand', text: 'Een ragertje onder de draad door, bij elke tand even heen en weer.' },
  { title: 'Spiegelcheck', text: 'Glanst elk slotje? Dan is het schoon. Zie je nog eten, poets dat stukje opnieuw.' },
];

/** A mini row of brackets on a wire with this visit's elastics, for the hall of fame cards. */
function MiniSet({ colors, on }: { colors: string[]; on?: boolean }) {
  const list = colors.length ? colors : [];
  return (
    <Svg width={104} height={34} viewBox="0 0 104 34">
      <Path d="M2 20C30 14 74 14 102 20" stroke={on ? 'rgba(255,255,255,0.5)' : '#B7C3D9'} strokeWidth={1.6} fill="none" />
      {[12, 32, 52, 72, 92].map((x, i) => {
        const y = 20 - Math.sin((x / 104) * Math.PI) * 4.5;
        const c = list[i % list.length];
        return list.length ? (
          <G key={x}>
            {c.toUpperCase() === '#FFFFFF' ? <Circle cx={x} cy={y} r={6.2} fill="none" stroke={on ? 'rgba(255,255,255,0.35)' : '#C9D3E3'} strokeWidth={5.4} /> : null}
            <Circle cx={x} cy={y} r={6.2} fill="none" stroke={c} strokeWidth={3.6} />
          </G>
        ) : (
          <Circle key={x} cx={x} cy={y} r={6.2} fill="none" stroke={on ? 'rgba(255,255,255,0.35)' : '#C9D3E3'} strokeWidth={1.5} strokeDasharray="2 2" />
        );
      })}
    </Svg>
  );
}

/**
 * Beugelmaatje: Sofia's braces buddy. Her next braces check, an elastics hall of fame (every visit a card; tap one to
 * spin a 3D set of brackets in those colours), the colours for next time (the clinic sees them), what to do when a
 * bracket comes loose or a wire pokes, brushing with braces, what not to eat, and a wear-time ring for a removable
 * appliance or retainer.
 */
export default function Beugel() {
  const { today, saved, update, bridge } = useApp();
  const now = useTick(30000);
  const toast = useToast();
  const visit = upcoming(today).find((u) => u.who === 'sofia');
  const doc = doctorById(visit?.doctor ?? 'ayman');
  const visits = useMemo(() => [...ELASTICS].sort((a, b) => b.daysAgo - a.daysAgo).map((e, i) => ({ ...e, n: i + 1, day: addDays(today, -e.daysAgo) })), [today]);
  const [sel, setSel] = useState<number>(visits.length - 1);
  const [spin, setSpin] = useState(0);
  const [picked, setPicked] = useState<string[]>(saved.elastics.length ? saved.elastics : []);
  const [help, setHelp] = useState<Help | null>(null);
  const isNext = sel === visits.length;
  const shown = isNext ? picked : visits[sel].colors;
  const sentAt = eventsOf(bridge, 'message')
    .filter((m) => m.who === 'sofia' && m.text.startsWith('Elastiekjes voor de volgende keer'))
    .pop()?.at;
  const sentNow = sentAt && saved.elastics.join() === picked.join() && picked.length > 0;
  const care = CARE.beugel;
  const avoid = care.eat.flatMap((e) => e.avoid ?? []);
  const soft = care.eat[0]?.foods ?? [];

  const log = wearLog(saved, today);
  const wearing = log.length > 0 && !log[log.length - 1].off;
  const parts = wornToday(log, now);
  const minutes = parts.reduce((t, p) => t + (p.to - p.from), 0);
  const nowMin = (now.getTime() - today.getTime()) / 60000;

  const choose = (i: number) => {
    if (i === sel) return setSpin((s) => s + 1);
    setSel(i);
    setSpin((s) => s + 1);
  };

  const togglePick = (c: string) => {
    tap('select');
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length >= 3 ? [...p.slice(1), c] : [...p, c]));
    if (!isNext) {
      setSel(visits.length);
      setSpin((s) => s + 1);
    }
  };

  const send = () => {
    if (!picked.length) return;
    update((s) => ({ elastics: picked, stickers: s.stickers.includes('beugelbaas') ? s.stickers : [...s.stickers, 'beugelbaas'] }));
    emit({ kind: 'message', who: 'sofia', text: `Elastiekjes voor de volgende keer: ${colorList(picked)}` });
    tap('success');
    toast(tr('Doorgegeven aan de kliniek'), { text: `${doc.name} ${tr('weet het:')} ${tr(colorList(picked))}.`, icon: 'braces' });
  };

  return (
    <Screen back kicker="Sofia · vaste beugel" title="Beugelmaatje" serif="Alles voor je beugel, op één plek." gap={22}>
      {/* --------------------------------------------------------------------------------------- next check */}
      {visit ? (
        <PopIn>
          <Card tone="navy" pad={18}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Bracket color="#7FC9F2">Volgende beugelcontrole</Bracket>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Txt v="label" size={9.5} color="#FFFFFF">
                  {(() => {
                    const n = Math.round((visit.day.getTime() - today.getTime()) / 86400000);
                    return n <= 0 ? tr('vandaag') : n === 1 ? tr('morgen') : `${tr('over')} ${n} ${tr('dagen')}`;
                  })()}
                </Txt>
              </View>
            </Row>
            <Row gap={14} align="flex-start" style={{ marginTop: 14 }}>
              <View style={{ alignItems: 'center', width: 62, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <Txt v="label" size={10} color="#7FC9F2">
                  {weekdayLong(visit.day).slice(0, 3)}
                </Txt>
                <Txt v="stat" size={28} color="#FFFFFF">
                  {String(visit.day.getDate())}
                </Txt>
                <Txt v="num" size={12} color="#B6C2DF">
                  {clock(new Date(visit.day.getTime() + visit.start * 60000))}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="title" color="#FFFFFF">
                  {dayShort(visit.day)}
                </Txt>
                <Txt v="small" color="#B6C2DF">
                  {visit.note}
                </Txt>
                <Row gap={8} style={{ marginTop: 4 }}>
                  <Avatar id={doc.id} size={30} ring="#17BFA3" />
                  <Txt v="small" weight="600" color="#FFFFFF">
                    {doc.name}
                  </Txt>
                </Row>
              </View>
            </Row>
            <Row gap={10} style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Txt v="label" size={9.5} color="#7FC9F2">
                Elastiekjes
              </Txt>
              {saved.elastics.length ? (
                <Row gap={6} style={{ flex: 1 }}>
                  {saved.elastics.map((c) => (
                    <View key={c} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 4.5, borderColor: c }} />
                  ))}
                  <Txt v="small" color="#FFFFFF" style={{ flex: 1 }} numberOfLines={1}>
                    {colorList(saved.elastics)}
                  </Txt>
                </Row>
              ) : (
                <Txt v="small" color="#B6C2DF" style={{ flex: 1 }}>
                  Nog niet gekozen
                </Txt>
              )}
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {/* ---------------------------------------------------------------------------------- hall of fame */}
      <View>
        <SectionHead kicker="Hall of fame" title="Al je elastiekjes" serif="Elk bezoek een eigen kleur. Tik op een kaart." />
        <View style={[{ height: 250, borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B1A3A' }, web({ backgroundImage: 'radial-gradient(90% 70% at 50% 8%,#2B4D96 0%,#13285A 45%,#081430 100%)' }), shadow(2)]}>
          <BracesSet colors={shown} spin={spin} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 18, top: 16, right: 18, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt v="label" color="#7FC9F2">
              {isNext ? tr('Volgende keer') : `${tr('Bezoek')} ${visits[sel].n}`}
            </Txt>
            <Txt v="label" color="#FFFFFF">
              {isNext ? (visit ? dayShort(visit.day) : '') : `${monthShort(visits[sel].day)} ${visits[sel].day.getFullYear()}`}
            </Txt>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: 18, right: 18, bottom: 16, alignItems: 'center' }}>
            <Txt v="serif" size={17} color="#DCE6FF" align="center">
              {shown.length ? colorList(shown) : 'Kies hieronder je kleuren'}
            </Txt>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingVertical: 4 }}>
          {[...visits.map((v, i) => ({ i, colors: v.colors, top: `${monthShort(v.day)} ’${String(v.day.getFullYear()).slice(2)}`, sub: `${tr('Bezoek')} ${v.n}` })), { i: visits.length, colors: picked, top: tr('Volgende'), sub: tr('Jouw keuze') }].map((c) => {
            const on = c.i === sel;
            const next = c.i === visits.length;
            return (
              <Press
                key={c.i}
                onPress={() => choose(c.i)}
                accessibilityLabel={`${c.sub}, ${tr(colorList(c.colors) || 'nog niet gekozen')}`}
                accessibilityState={{ selected: on }}
                scaleTo={0.95}
                style={[
                  { width: 128, padding: 12, gap: 8, borderRadius: 20, borderWidth: 1, borderColor: on ? 'transparent' : C.line2, borderStyle: next && !on ? 'dashed' : 'solid', backgroundColor: on ? C.navy : C.paper },
                  on ? shadow(2) : null,
                  web({ transition: 'background-color .3s ease' }),
                ]}
                fxNames={on ? 'dye-navy' : ''}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="label" size={9.5} color={on ? '#7FC9F2' : C.muted}>
                    {c.top}
                  </Txt>
                  {next ? <Icon name="sparkle" size={13} color={on ? '#FFD27A' : C.warn} /> : null}
                </Row>
                <MiniSet colors={c.colors} on={on} />
                <Txt v="small" weight="600" size={12.5} color={on ? '#FFFFFF' : C.ink} numberOfLines={1}>
                  {c.sub}
                </Txt>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {/* -------------------------------------------------------------------------------------- pick for next */}
      <Card pad={18} style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Bracket>Volgende keer</Bracket>
          <Txt v="title">Kies je elastiekjes</Txt>
          <Txt v="small" color={C.muted}>
            Tot drie kleuren; ze wisselen elkaar af. De kliniek ziet je keuze.
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
          {ELASTIC_COLORS.map((c) => {
            const k = picked.indexOf(c.color);
            const on = k >= 0;
            return (
              <Press key={c.color} onPress={() => togglePick(c.color)} accessibilityLabel={tr(c.name)} accessibilityState={{ selected: on }} scaleTo={0.88} style={{ width: '16.6%', alignItems: 'center', gap: 4 }}>
                <View
                  style={[
                    { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 9, borderColor: c.color, backgroundColor: on ? C.ice : C.paper },
                    web({ boxShadow: on ? `0 0 0 3px ${C.paper}, 0 0 0 5px ${c.color === '#FFFFFF' ? '#B7C3D9' : c.color}` : c.color === '#FFFFFF' ? 'inset 0 0 0 1px rgba(11,26,58,.12), 0 0 0 1px rgba(11,26,58,.12)' : 'none', transition: 'box-shadow .25s ease' }),
                  ]}
                >
                  {on ? (
                    <Txt v="num" size={11} weight="700" color={C.ink}>
                      {String(k + 1)}
                    </Txt>
                  ) : null}
                </View>
                <Txt v="label" size={8} color={on ? C.ink : C.muted} numberOfLines={1}>
                  {c.name}
                </Txt>
              </Press>
            );
          })}
        </View>
        <Button
          title={sentNow ? 'Doorgegeven' : picked.length ? `Stuur naar ${doc.name}` : 'Kies eerst een kleur'}
          icon={sentNow ? 'check' : 'send'}
          kind={sentNow ? 'soft' : 'blue'}
          full
          disabled={!picked.length || !!sentNow}
          onPress={send}
        />
        {sentNow && sentAt ? (
          <Row gap={8} style={{ justifyContent: 'center' }}>
            <Icon name="checkCircle" size={14} color={C.ok} />
            <Txt v="small" color={C.muted}>{`Om ${clock(new Date(sentAt))} doorgegeven aan de kliniek`}</Txt>
          </Row>
        ) : null}
      </Card>

      {/* ------------------------------------------------------------------------------------------- help */}
      <View>
        <SectionHead kicker="Hulp" title="Er gaat iets mis" serif="Meestal is het geen spoed. Zo los je het op." />
        <Row gap={10} align="stretch">
          {(['slotje', 'draad'] as Help[]).map((h) => (
            <Card key={h} pad={14} onPress={() => setHelp(h)} label={tr(HELP[h].title)} style={{ flex: 1, gap: 10 }}>
              <IconTile name={HELP[h].icon} color={h === 'slotje' ? '#17BFA3' : '#E0901A'} size={40} />
              <Txt v="h3">{HELP[h].title}</Txt>
              <Txt v="small" size={12.5} color={C.muted}>
                {HELP[h].lead}
              </Txt>
            </Card>
          ))}
        </Row>
      </View>

      {/* ------------------------------------------------------------------------------------------- eating */}
      <Card pad={18} style={{ gap: 12 }}>
        <Row gap={10}>
          <IconTile name="noFood" color="#E2434B" size={36} />
          <View style={{ flex: 1 }}>
            <Txt v="h2">Liever niet</Txt>
            <Txt v="small" color={C.muted}>
              Die trekken slotjes los of buigen de draad.
            </Txt>
          </View>
        </Row>
        <Row gap={8} wrap>
          {avoid.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: R.pill, backgroundColor: 'rgba(226,67,75,0.08)' }}>
              <Icon name="close" size={12} color={C.alert} stroke={2.4} />
              <Txt v="small" weight="600" color={C.ink}>
                {f}
              </Txt>
            </View>
          ))}
        </Row>
        <Row gap={10} align="flex-start" style={{ padding: 12, borderRadius: R.md, backgroundColor: C.bg2 }}>
          <Icon name="bowl" size={16} color={C.ok} />
          <Txt v="small" color={C.soft} style={{ flex: 1 }}>
            {`${tr('Wel: bijna alles, in kleine stukjes. De eerste dagen na een controle is zacht eten fijn:')} ${soft.map((f) => tr(f).toLowerCase()).join(', ')}.`}
          </Txt>
        </Row>
      </Card>

      {/* ------------------------------------------------------------------------------------------ brushing */}
      <View>
        <SectionHead kicker="Poetsen" title="Poetsen met een beugel" action="Poetscoach" onAction={() => router.push('/poetsen' as never)} />
        <Card pad={0}>
          {BRUSH_STEPS.map((s, i) => (
            <Row key={s.title} gap={14} align="flex-start" style={{ padding: 16, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <View style={[{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17BFA3' }, web({ backgroundImage: 'linear-gradient(135deg,#2DB4E8,#17BFA3)' })]}>
                <Txt v="num" size={12.5} weight="700" color="#FFFFFF">
                  {String(i + 1)}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3">{s.title}</Txt>
                <Txt v="small" color={C.muted}>
                  {s.text}
                </Txt>
              </View>
            </Row>
          ))}
          <Row gap={10} style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bg2 }}>
            <Icon name="clock" size={15} color={C.blue} />
            <Txt v="small" color={C.soft} style={{ flex: 1 }}>
              Na elke maaltijd, en ’s avonds extra goed. Reken op drie minuten.
            </Txt>
          </Row>
        </Card>
      </View>

      {/* --------------------------------------------------------------------------------------- wear time */}
      <View>
        <SectionHead kicker="Draagtijd" title="Apparaatje of retainer" serif="Na je vaste beugel krijg je een retainer. Zo houd je bij hoe lang hij in zit." />
        <Card pad={18} style={{ gap: 16 }}>
          <Row gap={18}>
            <Ring value={minutes / (TARGET_HOURS * 60)} size={128} stroke={11} color={minutes >= TARGET_HOURS * 60 ? '#12A27A' : undefined}>
              <Txt v="stat" size={26}>{`${Math.floor(minutes / 60)}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`}</Txt>
              <Txt v="label" size={9} color={C.muted}>
                {`${tr('van')} ${TARGET_HOURS} ${tr('uur')}`}
              </Txt>
            </Ring>
            <View style={{ flex: 1, gap: 8 }}>
              <Tag label={wearing ? 'Zit in' : 'Zit uit'} color={wearing ? C.ok : C.muted} bg={wearing ? 'rgba(18,162,122,0.10)' : C.bg2} icon={wearing ? 'check' : 'pause'} />
              <Txt v="small" color={C.soft}>
                {minutes >= TARGET_HOURS * 60
                  ? 'Je draagtijd voor vandaag is gehaald. Top!'
                  : `${tr('Nog')} ${Math.floor((TARGET_HOURS * 60 - minutes) / 60)} ${tr('uur')} ${String(Math.round((TARGET_HOURS * 60 - minutes) % 60)).padStart(2, '0')} ${tr('min te gaan vandaag.')}`}
              </Txt>
              <Button
                title={wearing ? 'Uit, even' : 'In gedaan'}
                icon={wearing ? 'pause' : 'play'}
                kind={wearing ? 'line' : 'brand'}
                size="sm"
                onPress={() => {
                  tap('medium');
                  const t = Date.now();
                  const next = wearing ? log.map((w, i) => (i === log.length - 1 ? { ...w, off: t } : w)) : [...log, { on: t }];
                  update(withWear(next.slice(-40)));
                }}
              />
            </View>
          </Row>
          {/* today on a 24-hour line */}
          <View style={{ gap: 6 }}>
            <View style={{ height: 14, borderRadius: 7, backgroundColor: C.bg2, overflow: 'hidden' }}>
              {parts.map((p, i) => (
                <View
                  key={i}
                  style={[{ position: 'absolute', top: 0, bottom: 0, left: `${(p.from / 1440) * 100}%`, width: `${((p.to - p.from) / 1440) * 100}%`, borderRadius: 7, backgroundColor: '#17BFA3' }, web({ backgroundImage: 'linear-gradient(90deg,#2DB4E8,#17BFA3)' })]}
                />
              ))}
              <View style={{ position: 'absolute', top: -2, bottom: -2, width: 2, left: `${(nowMin / 1440) * 100}%`, backgroundColor: C.ink }} />
            </View>
            <Row style={{ justifyContent: 'space-between' }}>
              {['00', '06', '12', '18', '24'].map((h) => (
                <Txt key={h} v="label" size={8.5} color={C.muted}>
                  {h}
                </Txt>
              ))}
            </Row>
          </View>
          <Txt v="small" size={12} color={C.muted}>
            {`${tr(CARE.uitneembaar.after[0].text)} ${tr('Hier staat 12 uur als voorbeeld.')}`}
          </Txt>
        </Card>
      </View>

      <Txt v="small" color={C.muted} align="center" style={{ paddingHorizontal: 12 }}>
        Demo met een verzonnen patiënt. Algemene tips; volg altijd het advies van je orthodontist.
      </Txt>

      {/* -------------------------------------------------------------------------------------------- help sheet */}
      <Sheet open={help !== null} onClose={() => setHelp(null)} title={help ? HELP[help].title : ''}>
        {help ? (
          <>
            <Txt v="serif" size={17} color={C.soft}>
              {HELP[help].lead}
            </Txt>
            {help === 'draad' ? (
              <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Svg width={240} height={90} viewBox="0 0 240 90">
                  <Path d="M10 50C70 40 150 40 205 50" stroke="#B7C3D9" strokeWidth={3} fill="none" strokeLinecap="round" />
                  <Line x1={205} y1={50} x2={222} y2={56} stroke="#B7C3D9" strokeWidth={3} strokeLinecap="round" />
                  <Circle cx={60} cy={44} r={10} fill="none" stroke="#2DB4E8" strokeWidth={5} />
                  <Circle cx={130} cy={42} r={10} fill="none" stroke="#2DB4E8" strokeWidth={5} />
                  <Circle cx={216} cy={54} r={14} fill="#F4F1EA" stroke="#E2DBCC" strokeWidth={1.5} />
                  <Circle cx={211} cy={49} r={3.5} fill="#FFFFFF" />
                </Svg>
                <Txt v="label" size={9} color={C.muted}>
                  Wax over het puntje
                </Txt>
              </View>
            ) : null}
            <View style={{ gap: 12 }}>
              {HELP[help].steps.map((s, i) => (
                <Row key={s} gap={12} align="flex-start">
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.ice, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt v="num" size={12} weight="700" color={C.blue}>
                      {String(i + 1)}
                    </Txt>
                  </View>
                  <Txt v="body" style={{ flex: 1 }}>
                    {s}
                  </Txt>
                </Row>
              ))}
            </View>
            <Button title="Bel de kliniek" sub="06 3820 8557" icon="phone" kind="brand" full onPress={() => Linking.openURL(CLINIC_TEL).catch(() => {})} />
            <Button title="Stuur een bericht" icon="chat" kind="line" full onPress={() => (setHelp(null), router.push('/chat' as never))} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

