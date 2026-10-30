import { CLINIC, clock, doctorById, emit, eventsOf, isOpenAt, LOCATIONS } from '@smile/shared';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Avatar, Bracket, Button, Chip, Field, IconButton, PopIn, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { whatsappClinic } from '../lib/ics';
import { toWall, useApp } from '../state/app';
import { C, R } from '../theme';

const QUICK = ['Mag ik al sporten?', 'Wanneer mag ik aan die kant kauwen?', 'Ik wil mijn afspraak verzetten', 'Kan ik een kopie van mijn foto’s krijgen?'];

type Msg = { id: string; at: number; mine: boolean; text: string; by?: string };

/**
 * A message to the team instead of a phone call: questions go to the clinic panel, where Nadia or the dentist answers.
 * Outside opening hours an automatic note says when you'll hear back. WhatsApp is the clinic's own channel too.
 */
export default function Chat() {
  const { bridge, now, saved } = useApp();
  const [text, setText] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const open = isOpenAt(LOCATIONS.eindhoven, now);

  const messages: Msg[] = [
    ...eventsOf(bridge, 'message').map((m) => ({ id: m.id, at: m.at, mine: true, text: m.text })),
    ...eventsOf(bridge, 'reply').map((r) => ({ id: r.id, at: r.at, mine: false, text: r.text, by: r.by })),
  ].sort((a, b) => a.at - b.at);

  const send = (t: string) => {
    const body = t.trim();
    if (!body) return;
    emit({ kind: 'message', who: saved.member, text: body });
    setText('');
    // Outside opening hours the practice answers with a note; inside, the panel answers.
    if (!open)
      setTimeout(() => emit({ kind: 'reply', by: 'nadia', text: tr('Dank je voor je bericht. We zijn nu gesloten en antwoorden op de eerstvolgende werkdag. Spoed? Bel de tandartsenspoeddienst of 112.') }), 1400);
  };
  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  }, [messages.length]);

  return (
    <Screen
      back
      scroll={false}
      title="Vraag het de kliniek"
      kicker={open ? 'Het team is er' : 'Buiten openingstijden'}
      serif="Meestal binnen het uur antwoord, tijdens openingstijden."
      right={<IconButton name="whatsapp" label="WhatsApp" onPress={() => whatsappClinic()} />}
      contentStyle={{ flex: 1 }}
      footer={
        <Row gap={8}>
          <Field value={text} onChangeText={setText} placeholder="Typ je vraag" onSubmitEditing={() => send(text)} style={{ flex: 1 }} />
          <Button title="Stuur" icon="send" kind="blue" onPress={() => send(text)} disabled={!text.trim()} />
        </Row>
      }
    >
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 30 }}>
        <Row gap={8} wrap>
          {QUICK.map((q) => (
            <Chip key={q} label={q} small onPress={() => send(tr(q))} />
          ))}
        </Row>
        {!messages.length ? (
          <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
            <Bracket>Nog geen berichten</Bracket>
            <Txt v="small" color={C.muted} align="center">
              {`Of app ons op ${CLINIC.phone}.`}
            </Txt>
          </View>
        ) : null}
        {messages.map((m) => (
          <PopIn key={m.id}>
            <Row gap={8} align="flex-end" style={{ justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
              {!m.mine ? m.by && m.by !== 'nadia' ? <Avatar id={m.by} size={30} /> : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}><Txt v="small" color="#FFFFFF" weight="700">N</Txt></View> : null}
              <View style={{ maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.md, borderBottomRightRadius: m.mine ? 6 : R.md, borderBottomLeftRadius: m.mine ? R.md : 6, backgroundColor: m.mine ? '#0A63B5' : C.paper, borderWidth: m.mine ? 0 : 1, borderColor: C.line }}>
                {!m.mine ? (
                  <Txt v="label" size={9} color={C.blue}>
                    {m.by === 'nadia' ? tr('Nadia, balie') : doctorById(m.by ?? 'najla').name}
                  </Txt>
                ) : null}
                <Txt v="body" color={m.mine ? '#FFFFFF' : C.ink} raw={m.mine}>
                  {m.text}
                </Txt>
                <Txt v="num" size={10} color={m.mine ? 'rgba(255,255,255,0.7)' : C.muted} align="right">
                  {clock(toWall(m.at))}
                </Txt>
              </View>
            </Row>
          </PopIn>
        ))}
      </ScrollView>
    </Screen>
  );
}
