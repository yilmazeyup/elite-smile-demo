import { CARE, type CareId } from '@smile/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Bracket, Card, PopIn, Row, Segments, Tag, Txt } from '../components/ui';
import { surgeryEnd } from '../lib/story';
import { useApp } from '../state/app';
import { C } from '../theme';

const PLANS: { id: CareId; label: string }[] = [
  { id: 'implantaat', label: 'Implantaat' },
  { id: 'vulling', label: 'Vulling' },
  { id: 'bleken', label: 'Bleken' },
  { id: 'beugel', label: 'Beugel' },
];

/** What you may eat now and what to leave, phase by phase after the treatment; for the implant counted from the surgery. */
export default function Eten() {
  const { implantDay, now } = useApp();
  const [plan, setPlan] = useState<CareId>('implantaat');
  const phases = CARE[plan].eat;
  const since = plan === 'implantaat' ? (now.getTime() - surgeryEnd(implantDay).getTime()) / 60000 : 0;
  const current = phases.reduce((acc, p, i) => (since >= p.from ? i : acc), 0);

  return (
    <Screen back title="Wat mag ik eten?" kicker="Eetwijzer" serif="Zacht, lauw en aan de andere kant: per fase.">
      <Segments value={plan} onChange={setPlan} options={PLANS.map((p) => ({ id: p.id, label: p.label }))} />
      {phases.map((p, i) => {
        const now_ = plan === 'implantaat' && i === current;
        return (
          <PopIn key={`${plan}-${p.label}`} delay={i * 70}>
            <Card tone={now_ ? 'pearl' : 'paper'} style={now_ ? { borderColor: C.blue, borderWidth: 1.5 } : null}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Bracket color={now_ ? C.blue : C.muted}>{p.label}</Bracket>
                {now_ ? <Tag label="Nu" color="#FFFFFF" bg="#0A63B5" /> : null}
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {p.foods.map((f) => (
                  <Row key={f} gap={6} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(18,162,122,0.10)' }}>
                    <Icon name="check" size={14} color={C.ok} stroke={2.4} />
                    <Txt v="small" weight="600" color={C.ink}>
                      {f}
                    </Txt>
                  </Row>
                ))}
              </View>
              {p.avoid?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {p.avoid.map((f) => (
                    <Row key={f} gap={6} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(226,67,75,0.08)' }}>
                      <Icon name="close" size={13} color={C.alert} stroke={2.4} />
                      <Txt v="small" weight="600" color={C.soft}>
                        {f}
                      </Txt>
                    </Row>
                  ))}
                </View>
              ) : null}
            </Card>
          </PopIn>
        );
      })}
      <Card tone="ice" style={{ borderColor: 'transparent' }}>
        <Row gap={10} align="flex-start">
          <Icon name="thermo" size={18} color={C.blue} />
          <Txt v="small" color={C.soft} style={{ flex: 1 }}>
            Lauw is beter dan heet: warmte kan een verse wond opnieuw laten bloeden. En zolang je verdoofd bent, voel je niet of iets te heet is.
          </Txt>
        </Row>
      </Card>
    </Screen>
  );
}
