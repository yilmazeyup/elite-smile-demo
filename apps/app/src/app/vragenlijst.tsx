import { dateLong, emit, HEALTH_FLAGS, type HealthFlag } from '@smile/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '../components/Screen';
import { Bracket, Button, Card, DemoNote, Field, PopIn, Row, Tag, tap, Toggle, Txt } from '../components/ui';
import { useToast } from '../components/Toast';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C } from '../theme';

const SEVERITY = { hoog: { label: 'Belangrijk', color: '#E2434B' }, 'let-op': { label: 'Let op', color: '#E0901A' }, info: { label: 'Goed om te weten', color: '#0A63B5' } } as const;

/**
 * The medical questions a dentist must know before treating, answered once and confirmed before each visit with one
 * tap ("nothing changed"). Each yes explains why it matters; the dentist sees the flags on the panel.
 */
export default function Vragenlijst() {
  const { saved, update } = useApp();
  const toast = useToast();
  const [flags, setFlags] = useState<HealthFlag[]>(saved.flags);
  const [meds, setMeds] = useState('');
  const [other, setOther] = useState('');
  const toggle = (id: HealthFlag, on: boolean) => setFlags((f) => (on ? [...new Set([...f, id])] : f.filter((x) => x !== id)));

  const save = (changed: boolean) => {
    tap('success');
    update({ flags, healthAt: Date.now() });
    emit({ kind: 'health', who: saved.member, flags, changed });
    toast(tr('Vragenlijst opgeslagen'), { text: tr('Je tandarts ziet het voor je afspraak.'), icon: 'shield' });
  };

  return (
    <Screen
      back
      title="Gezondheidsvragenlijst"
      kicker="Anamnese"
      serif="Zodat je tandarts veilig kan behandelen."
      footer={<Button full size="lg" title="Opslaan en delen met de kliniek" icon="check" onPress={() => save(true)} />}
    >
      {saved.healthAt ? (
        <PopIn>
          <Card tone="navy">
            <Bracket color="#7FC9F2">{`Ingevuld op ${dateLong(new Date(saved.healthAt))}`}</Bracket>
            <Txt v="title" color="#FFFFFF" style={{ marginTop: 6 }}>
              Is er iets veranderd sinds je laatste bezoek?
            </Txt>
            <Row gap={8} style={{ marginTop: 12 }}>
              <Button title="Nee, alles klopt" size="sm" kind="white" icon="check" onPress={() => save(false)} />
            </Row>
          </Card>
        </PopIn>
      ) : null}

      <Card pad={0} style={{ paddingHorizontal: 16 }}>
        {HEALTH_FLAGS.map((f, i) => {
          const on = flags.includes(f.id);
          return (
            <View key={f.id} style={{ paddingVertical: 14, borderBottomWidth: i === HEALTH_FLAGS.length - 1 ? 0 : 1, borderColor: C.line, gap: 8 }}>
              <Row gap={12}>
                <Txt v="h3" size={14.5} style={{ flex: 1 }}>
                  {f.question}
                </Txt>
                <Toggle value={on} onChange={(v) => toggle(f.id, v)} label={f.question} />
              </Row>
              {on ? (
                <PopIn>
                  <Row gap={8} align="flex-start">
                    <Tag label={SEVERITY[f.severity].label} color="#FFFFFF" bg={SEVERITY[f.severity].color} />
                    <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                      {f.why}
                    </Txt>
                  </Row>
                </PopIn>
              ) : null}
            </View>
          );
        })}
      </Card>

      <View style={{ gap: 10 }}>
        <Bracket>Medicijnen</Bracket>
        <Field value={meds} onChangeText={setMeds} placeholder="Welke medicijnen gebruik je? Naam en sterkte" multiline style={{ height: 88, paddingTop: 14 }} />
        <Bracket>Anders</Bracket>
        <Field value={other} onChangeText={setOther} placeholder="Andere allergieën of aandoeningen" multiline style={{ height: 88, paddingTop: 14 }} />
      </View>
      <DemoNote icon="lock" text="In deze demo blijven je antwoorden op dit toestel; alleen de vlaggetjes gaan naar het praktijkscherm. In een echte app gaan ze versleuteld naar het dossier bij de praktijk." />
    </Screen>
  );
}
