import { addDays, CARE, clock, dateShort, doctorById, eventsOf, relativeDay } from '@smile/shared';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Avatar, Bracket, Button, Card, Chip, DemoNote, Field, IconTile, LiveDot, PopIn, Row, SectionHead, Tag, Txt } from '../components/ui';
import { WoundCamera, type WoundSource } from '../components/WoundCamera';
import { tr } from '../i18n';
import { compress } from '../lib/woundPhoto';
import { emit, useApp } from '../state/app';
import { C, fx, isWeb, R } from '../theme';

const CLINIC_TEL = 'tel:+31638208557';

const NOTES = ['Voelt goed', 'Wat gezwollen', 'Bloedt een beetje', 'Draadje voelbaar', 'Meer pijn dan gisteren'];

/** How a wound after an implant usually heals, day by day: general information, not a diagnosis. */
const PHASES: { from: number; to: number; title: string; text: string }[] = [
  { from: 0, to: 1, title: 'De eerste dag', text: 'Wat bloed in je speeksel en een doof gevoel tot de verdoving is uitgewerkt. Koelen en rust helpen.' },
  { from: 2, to: 3, title: 'Zwelling op z’n grootst', text: 'Zwelling en soms een blauwe plek zijn nu het grootst. Een dun wit-geel laagje op de wond hoort bij genezend tandvlees.' },
  { from: 4, to: 7, title: 'Elke dag wat minder', text: 'Pijn en zwelling nemen af. Je voelt de hechtdraadjes nog met je tong; laat ze met rust.' },
  { from: 8, to: 14, title: 'Hechtingen eruit', text: 'De tandarts haalt de hechtingen weg en kijkt mee. Het tandvlees sluit zich en wordt weer roze.' },
];

/**
 * Wondfoto: after Layla's implant she sends a photo of the wound once a day; Dr. Omar sees it on the clinic panel and
 * answers. Around it: what normal healing looks like, day by day, and when to call. The app does not diagnose.
 */
export default function Foto() {
  const { saved, update, careDay, bridge, implantDay, now } = useApp();
  const toast = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const [source, setSource] = useState<WoundSource | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const care = CARE.implantaat;

  const sent = useMemo(() => {
    const events = eventsOf(bridge, 'photo').filter((e) => e.who === 'layla');
    const replies = eventsOf(bridge, 'photo-reply');
    return saved.photos
      .map((p) => {
        const ev = events.find((e) => e.at === p.at);
        const reply = ev ? replies.filter((r) => r.photo === ev.id).pop() : undefined;
        return { ...p, note: ev?.note ?? '', reply };
      })
      .sort((a, b) => b.at - a.at);
  }, [saved.photos, bridge]);
  const days = [...new Set(sent.map((p) => p.day))].sort((a, b) => b - a);
  const today = sent.find((p) => p.day === careDay);
  const phase = PHASES.find((p) => careDay >= p.from && careDay <= p.to) ?? PHASES[PHASES.length - 1];
  const worse = picked.includes('Meer pijn dan gisteren') && careDay >= 3;

  const send = async () => {
    if (!photo || sending) return;
    setSending(true);
    try {
      const thumb = isWeb ? await compress(photo, 320) : photo;
      const at = Date.now();
      const note = [...picked, text.trim()].filter(Boolean).join(' · ');
      update((s) => ({ photos: [...s.photos, { at, day: careDay, thumb }] }));
      emit({ kind: 'photo', who: 'layla', day: careDay, thumb, note, at });
      setPhoto(null);
      setSource(null);
      setPicked([]);
      setText('');
      toast(tr('Foto verstuurd'), { text: tr('Dr. Omar kijkt ernaar. Je krijgt hier antwoord.'), icon: 'camera' });
    } catch {
      toast(tr('Versturen lukte niet'), { text: tr('Probeer het nog eens.'), icon: 'alert' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen back kicker={`Dag ${careDay} na je implantaat`} title="Foto van de wond" serif="Dr. Omar kijkt mee. Rustig, op je eigen moment.">
      {/* -------------------------------------------------------------------------------------------- today */}
      <PopIn>
        <Card tone="navy" pad={18}>
          {today?.reply ? (
            <View style={{ gap: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Bracket color="#7FC9F2">Antwoord op je foto</Bracket>
                <Tag label={today.reply.ok ? 'Geneest goed' : 'We nemen contact op'} color={today.reply.ok ? '#3CD3A0' : '#FFB64A'} bg="rgba(255,255,255,0.08)" icon={today.reply.ok ? 'check' : 'phone'} />
              </Row>
              <Row gap={12} align="flex-start">
                <Avatar id={today.reply.by} size={44} ring="#2DB4E8" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt v="h3" color="#FFFFFF">
                    {doctorById(today.reply.by).name}
                  </Txt>
                  <Txt v="body" color="#DCE6FF">
                    {today.reply.text}
                  </Txt>
                  <Txt v="label" size={9} color="#7FC9F2">
                    {clock(new Date(today.reply.at))}
                  </Txt>
                </View>
              </Row>
            </View>
          ) : today ? (
            <Row gap={14}>
              <Image source={{ uri: today.thumb }} style={{ width: 64, height: 64, borderRadius: 16 }} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Bracket color="#7FC9F2">Verstuurd</Bracket>
                <Txt v="h3" color="#FFFFFF">{`Vandaag om ${clock(new Date(today.at))}`}</Txt>
                <Row gap={8}>
                  <LiveDot tone="blue" size={7} />
                  <Txt v="small" color="#B6C2DF" style={{ flex: 1 }}>
                    Dr. Omar kijkt ernaar; je krijgt hier antwoord.
                  </Txt>
                </Row>
              </View>
            </Row>
          ) : (
            <Row gap={14} align="flex-start">
              <IconTile name="camera" color="#2DB4E8" size={46} />
              <View style={{ flex: 1, gap: 4 }}>
                <Bracket color="#7FC9F2">Vandaag</Bracket>
                <Txt v="title" color="#FFFFFF">
                  Eén foto per dag
                </Txt>
                <Txt v="small" color="#B6C2DF">
                  Tot de hechtingen eruit zijn, laat een dagelijkse foto Dr. Omar zien hoe het geneest. Spoel eerst voorzichtig met lauw water.
                </Txt>
              </View>
            </Row>
          )}
        </Card>
      </PopIn>

      {/* ----------------------------------------------------------------------------------------- the camera */}
      <PopIn delay={60}>
        <WoundCamera
          value={photo}
          source={source}
          onChange={(p, s) => {
            setPhoto(p);
            setSource(s);
          }}
          style={{ height: 300 }}
        />
      </PopIn>

      {photo ? (
        <PopIn>
          <Card pad={18} style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <Bracket>Erbij zeggen</Bracket>
              <Txt v="title">Hoe voelt het?</Txt>
            </View>
            <Row gap={8} wrap>
              {NOTES.map((n) => (
                <Chip key={n} label={n} small on={picked.includes(n)} onPress={() => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))} />
              ))}
            </Row>
            <Field value={text} onChangeText={setText} placeholder="Of schrijf het zelf (mag leeg blijven)" maxLength={160} />
            {worse ? (
              <Row gap={10} align="flex-start" style={{ padding: 12, borderRadius: R.md, backgroundColor: 'rgba(224,144,26,0.12)' }}>
                <Icon name="phone" size={16} color={C.warn} />
                <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                  Wordt de pijn na dag 3 juist erger? Wacht dan niet op een antwoord, maar bel de kliniek even.
                </Txt>
              </Row>
            ) : null}
            <Button title={sending ? 'Versturen…' : 'Verstuur naar Dr. Omar'} icon="send" kind="blue" size="lg" full disabled={sending} onPress={send} />
            <Row gap={8}>
              <Icon name="lock" size={13} color={C.muted} />
              <Txt v="small" size={12} color={C.muted} style={{ flex: 1 }}>
                Klein gemaakt op je toestel en alleen voor je behandelaar bij Elite Smile.
              </Txt>
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {/* -------------------------------------------------------------------------------------- the photos so far */}
      {sent.length ? (
        <View>
          <SectionHead kicker="Jouw foto’s" title="Dag na dag" />
          <View style={{ gap: 12 }}>
            {days.map((day) => (
              <Card key={day} pad={0}>
                <Row style={{ paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.line }}>
                  <Txt v="h3">{`Dag ${day}`}</Txt>
                  <Txt v="label" size={9.5} color={C.muted}>
                    {relativeDay(addDays(implantDay, day), now) === 'vandaag' ? tr('vandaag') : dateShort(addDays(implantDay, day))}
                  </Txt>
                </Row>
                {sent
                  .filter((p) => p.day === day)
                  .map((p, i, list) => (
                    <View key={p.at} style={{ padding: 16, gap: 12, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderColor: C.line }}>
                      <Row gap={12} align="flex-start">
                        {p.thumb ? (
                          <Image source={{ uri: p.thumb }} style={{ width: 72, height: 72, borderRadius: 14 }} contentFit="cover" />
                        ) : (
                          <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: C.bg2, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="image" size={22} color={C.muted} />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 3 }}>
                          <Txt v="num" size={12.5} color={C.muted}>
                            {clock(new Date(p.at))}
                          </Txt>
                          <Txt v="body" color={p.note ? C.ink : C.muted}>
                            {p.note || 'Zonder opmerking'}
                          </Txt>
                        </View>
                      </Row>
                      {p.reply ? (
                        <Row gap={10} align="flex-start" style={{ padding: 12, borderRadius: R.md, backgroundColor: p.reply.ok ? 'rgba(18,162,122,0.08)' : 'rgba(224,144,26,0.10)' }}>
                          <Avatar id={p.reply.by} size={32} />
                          <View style={{ flex: 1, gap: 3 }}>
                            <Row style={{ justifyContent: 'space-between' }} gap={8}>
                              <Txt v="h3" size={14}>
                                {doctorById(p.reply.by).name}
                              </Txt>
                              <Tag label={p.reply.ok ? 'Geneest goed' : 'Contact'} color={p.reply.ok ? C.ok : C.warn} bg="transparent" icon={p.reply.ok ? 'check' : 'phone'} />
                            </Row>
                            <Txt v="small" color={C.soft}>
                              {p.reply.text}
                            </Txt>
                          </View>
                        </Row>
                      ) : (
                        <Row gap={10} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.md, backgroundColor: C.bg2 }}>
                          <View {...fx('typing')} style={{ flexDirection: 'row', gap: 3 }}>
                            {[0, 1, 2].map((k) => (
                              <Txt key={k} v="h3" color={C.sky}>
                                •
                              </Txt>
                            ))}
                          </View>
                          <Txt v="small" color={C.muted} style={{ flex: 1 }}>
                            Wacht op antwoord van de kliniek
                          </Txt>
                        </Row>
                      )}
                    </View>
                  ))}
              </Card>
            ))}
          </View>
          <View style={{ marginTop: 10 }}>
            <DemoNote text="In deze demo antwoordt de kliniek vanuit het kliniekpaneel in dezelfde browser." />
          </View>
        </View>
      ) : null}

      {/* -------------------------------------------------------------------------------------- what is normal */}
      <View>
        <SectionHead kicker="Wat is normaal?" title="Zo geneest het meestal" serif="Iedereen geneest op zijn eigen tempo." />
        <Card pad={0}>
          {PHASES.map((p, i) => {
            const on = p === phase;
            const past = careDay > p.to;
            return (
              <Row key={p.title} gap={14} align="flex-start" style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: i === PHASES.length - 1 ? 16 : 0, backgroundColor: on ? C.ice : 'transparent' }}>
                <View style={{ alignItems: 'center', width: 18, alignSelf: 'stretch' }}>
                  <View
                    {...fx(on ? 'pulse-blue' : '')}
                    style={{ width: 14, height: 14, borderRadius: 7, marginTop: 3, backgroundColor: past ? C.ok : on ? C.sky : C.paper, borderWidth: 2, borderColor: past || on ? 'transparent' : C.line2 }}
                  />
                  {i < PHASES.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 20, marginTop: 3, backgroundColor: past ? C.ok : C.line2 }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 3, paddingBottom: 14 }}>
                  <Row gap={8} style={{ justifyContent: 'space-between' }}>
                    <Txt v="label" size={9.5} color={on ? C.blue : C.muted}>
                      {p.from === p.to ? `Dag ${p.from}` : `Dag ${p.from} tot ${p.to}`}
                    </Txt>
                    {on ? <Tag label={`Jij · dag ${careDay}`} color="#FFFFFF" bg={C.blue} /> : null}
                  </Row>
                  <Txt v="h3" color={on || past ? C.ink : C.soft}>
                    {p.title}
                  </Txt>
                  <Txt v="small" color={on ? C.soft : C.muted}>
                    {p.text}
                  </Txt>
                </View>
              </Row>
            );
          })}
        </Card>
      </View>

      <Card pad={18} style={{ gap: 10 }}>
        <Row gap={10}>
          <IconTile name="checkCircle" color="#12A27A" size={34} />
          <Txt v="h2">Hoort erbij</Txt>
        </Row>
        {care.normal.map((n) => (
          <Row key={n} gap={10} align="flex-start">
            <View style={{ marginTop: 3 }}>
              <Icon name="check" size={15} color={C.ok} stroke={2.4} />
            </View>
            <Txt v="body" style={{ flex: 1 }}>
              {n}
            </Txt>
          </Row>
        ))}
      </Card>

      <Card pad={18} style={{ gap: 10, borderColor: 'rgba(224,144,26,0.35)' }}>
        <Row gap={10}>
          <IconTile name="phone" color="#E0901A" size={34} />
          <Txt v="h2">Bel de kliniek als…</Txt>
        </Row>
        {care.call.map((n) => (
          <Row key={n} gap={10} align="flex-start">
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.warn, marginTop: 8 }} />
            <Txt v="body" style={{ flex: 1 }}>
              {n}
            </Txt>
          </Row>
        ))}
        <Button title="Bel Elite Smile" sub="06 3820 8557" icon="phone" kind="brand" full onPress={() => Linking.openURL(CLINIC_TEL).catch(() => {})} style={{ marginTop: 6 }} />
      </Card>

      <Card pad={18} style={{ gap: 10, borderColor: 'rgba(226,67,75,0.4)' }}>
        <Row gap={10}>
          <IconTile name="siren" color="#E2434B" size={34} />
          <Txt v="h2">Bel meteen 112 bij</Txt>
        </Row>
        {care.urgent.map((n) => (
          <Row key={n} gap={10} align="flex-start">
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.alert, marginTop: 8 }} />
            <Txt v="body" style={{ flex: 1 }}>
              {n}
            </Txt>
          </Row>
        ))}
        <Button title="Bel 112" icon="siren" kind="alert" size="sm" onPress={() => Linking.openURL('tel:112').catch(() => {})} style={{ marginTop: 4 }} />
      </Card>

      <Txt v="small" color={C.muted} align="center" style={{ paddingHorizontal: 16 }}>
        De app stelt geen diagnose. Twijfel je? Bel gewoon; liever een keer te vaak.
      </Txt>
    </Screen>
  );
}
