import { careOf, dateLong, emit, memberById, treatmentById } from '@smile/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Signature } from '../../components/Signature';
import { Bracket, Button, Card, Check, DemoNote, Field, PopIn, Row, SectionHead, tap, Txt } from '../../components/ui';
import { useApp } from '../../state/app';
import { C } from '../../theme';

const QUESTIONS = ['Wat gebeurt er als ik niets doe?', 'Hoe lang gaat het mee?', 'Wat merk ik de dagen erna?', 'Wat kost het, en wat vergoedt mijn verzekering?', 'Zijn er andere mogelijkheden voor mij?'];

/**
 * Informed consent, the way Dutch law (the WGBO) asks for it: what the treatment is, why, the alternatives, the risks
 * and what recovery looks like, in plain words, before you sign. Signed consent shows up on the clinic panel; it can be
 * withdrawn at any time.
 */
export default function Toestemming() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { saved, update } = useApp();
  const t = treatmentById(id ?? 'implantaat');
  const care = careOf(t);
  const consent = t.consent;
  const [read, setRead] = useState(false);
  const [asked, setAsked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [name, setName] = useState(memberById(saved.member).name);
  const doneAt = saved.consents[t.id];

  const sign = () => {
    tap('success');
    update((s) => ({ consents: { ...s.consents, [t.id]: Date.now() } }));
    emit({ kind: 'consent', who: saved.member, treatment: t.id, name });
  };

  return (
    <Screen
      back
      title="Toestemming"
      kicker={t.name}
      serif="Lees het rustig. Vragen? Stel ze eerst."
      footer={
        doneAt ? (
          <Button full size="lg" kind="line" title="Terug naar je voorbereiding" onPress={() => router.back()} />
        ) : (
          <Button full size="lg" kind="blue" icon="sign" title="Ik geef toestemming" disabled={!read || !asked || !signed || !name.trim()} onPress={sign} />
        )
      }
    >
      {doneAt ? (
        <PopIn>
          <Card tone="navy">
            <Row gap={10}>
              <Icon name="checkCircle" size={22} color="#2DB4E8" />
              <Bracket color="#7FC9F2">{`Getekend op ${dateLong(new Date(doneAt))}`}</Bracket>
            </Row>
            <Txt v="small" color="#B6C2DF" style={{ marginTop: 8 }}>
              Je kunt je toestemming altijd intrekken, ook op de dag zelf.
            </Txt>
            <Button title="Intrekken" size="sm" kind="ghost" style={{ marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }} onPress={() => update((s) => ({ consents: { ...s.consents, [t.id]: 0 } }))} />
          </Card>
        </PopIn>
      ) : null}

      <Card tone="pearl">
        <Bracket>Wat is het</Bracket>
        <Txt v="body" style={{ marginTop: 6 }}>
          {t.what}
        </Txt>
        {consent ? (
          <>
            <Bracket color={C.muted}>Waarom bij jou</Bracket>
            <Txt v="body" style={{ marginTop: 6 }}>
              {consent.why}
            </Txt>
          </>
        ) : null}
      </Card>

      {consent ? (
        <>
          <View>
            <SectionHead kicker="Andere mogelijkheden" title="Alternatieven" />
            <Card>
              {consent.alternatives.map((a) => (
                <Row key={a} gap={10} align="flex-start" style={{ paddingVertical: 6 }}>
                  <Icon name="arrow" size={15} color={C.blue} />
                  <Txt v="body" style={{ flex: 1 }}>
                    {a}
                  </Txt>
                </Row>
              ))}
            </Card>
          </View>
          <View>
            <SectionHead kicker="Eerlijk" title="Risico’s en bijwerkingen" />
            <Card>
              {consent.risks.map((r) => (
                <Row key={r} gap={10} align="flex-start" style={{ paddingVertical: 6 }}>
                  <Icon name="alert" size={15} color={C.warn} />
                  <Txt v="body" style={{ flex: 1 }}>
                    {r}
                  </Txt>
                </Row>
              ))}
            </Card>
          </View>
        </>
      ) : null}

      <Card tone="ice" style={{ borderColor: 'transparent' }}>
        <Bracket color={C.blue}>Herstel</Bracket>
        <Txt v="body" style={{ marginTop: 6 }}>
          {care.recovery}
        </Txt>
        <Txt v="small" color={C.soft} style={{ marginTop: 6 }}>
          {`${t.visits} · ±${t.minutes} min in de stoel`}
        </Txt>
      </Card>

      <View>
        <SectionHead kicker="Vraag het" title="Goede vragen om te stellen" />
        <Card>
          {QUESTIONS.map((q) => (
            <Row key={q} gap={10} style={{ paddingVertical: 6 }}>
              <Icon name="chat" size={15} color={C.lilac} />
              <Txt v="body" style={{ flex: 1 }}>
                {q}
              </Txt>
            </Row>
          ))}
          <Button title="Stel een vraag aan de kliniek" size="sm" kind="line" icon="send" style={{ marginTop: 10 }} onPress={() => router.push('/chat')} />
        </Card>
      </View>

      {!doneAt ? (
        <View style={{ gap: 12 }}>
          <SectionHead kicker="Ondertekenen" title="Jouw toestemming" />
          <Card pad={0} style={{ paddingHorizontal: 16 }}>
            <Check done={read} onPress={() => setRead(!read)} title="Ik heb de uitleg gelezen en begrepen" />
            <Check done={asked} onPress={() => setAsked(!asked)} title="Mijn vragen zijn beantwoord" />
          </Card>
          <Field value={name} onChangeText={setName} placeholder="Naam" />
          <Signature onChange={setSigned} />
        </View>
      ) : null}
      <DemoNote text="De uitleg is algemene informatie. Je tandarts bespreekt jouw situatie met je; pas daarna teken je." />
    </Screen>
  );
}
