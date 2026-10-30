import { addDays, dayShort, doctorById, emit, PRESCRIPTION, weekdayShort } from '@smile/shared';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Avatar, Bracket, Card, DemoNote, IconTile, PopIn, Press, Row, Tag, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C } from '../theme';

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * The prescription after the implant as a schedule: tick what you took, see the next one, and a gentle stop when an
 * "as needed" medicine reaches its daily maximum. The medicines and doses are a demo prescription; the leaflet and the
 * dentist's instructions always come first.
 */
export default function Medicijnen() {
  const { saved, update, careDay, implantDay, now } = useApp();
  const toast = useToast();
  const doc = doctorById(PRESCRIPTION.by);
  const minute = now.getHours() * 60 + now.getMinutes();

  const take = (medId: string, day: number, slot: number, max: number) => {
    const key = `${medId}-${day}-${slot}`;
    if (saved.meds[key]) {
      update((s) => {
        const meds = { ...s.meds };
        delete meds[key];
        return { meds };
      });
      return;
    }
    const takenToday = Object.keys(saved.meds).filter((k) => k.startsWith(`${medId}-${day}-`)).length;
    if (takenToday >= max) {
      tap('warning');
      toast(tr('Maximum voor vandaag bereikt'), { text: tr('Neem niet meer dan voorgeschreven. Houdt de pijn aan, bel de kliniek.'), icon: 'alert' });
      return;
    }
    tap('success');
    update((s) => ({ meds: { ...s.meds, [key]: Date.now() } }));
    emit({ kind: 'med', who: 'layla', med: medId, day, slot });
  };

  return (
    <Screen back title="Medicijnwekker" kicker={`Dag ${careDay}`} serif="Volgens het voorschrift van je tandarts.">
      <Card tone="pearl">
        <Row gap={12}>
          <Avatar id={doc.id} size={44} />
          <View style={{ flex: 1 }}>
            <Bracket>Voorschrift</Bracket>
            <Txt v="h3">{`${doc.name} · ${dayShort(implantDay)}`}</Txt>
          </View>
        </Row>
      </Card>

      {PRESCRIPTION.meds.map((m, mi) => {
        const active = careDay >= m.from && careDay < m.from + m.days;
        const takenToday = Object.keys(saved.meds).filter((k) => k.startsWith(`${m.id}-${careDay}-`)).length;
        const nextSlot = m.times.findIndex((t, slot) => t > minute && !saved.meds[`${m.id}-${careDay}-${slot}`]);
        return (
          <PopIn key={m.id} delay={mi * 80}>
            <Card>
              <Row gap={12} align="flex-start">
                <IconTile name={m.id === 'chx' ? 'drop' : 'pill'} color={m.id === 'chx' ? '#2DB4E8' : '#7D6BF0'} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Row gap={8} wrap>
                    <Txt v="h2">{m.name}</Txt>
                    {m.asNeeded ? <Tag label="Zo nodig" color={C.lilac} bg={C.bg2} /> : null}
                  </Row>
                  <Txt v="small" color={C.soft}>
                    {`${m.dose} · ${m.how}`}
                  </Txt>
                  <Txt v="small" color={C.muted}>
                    {`${tr('Van')} ${dayShort(addDays(implantDay, m.from))} ${tr('tot en met')} ${dayShort(addDays(implantDay, m.from + m.days - 1))}`}
                  </Txt>
                </View>
              </Row>
              {active ? (
                <>
                  <Row gap={8} style={{ marginTop: 14 }}>
                    {m.times.map((t, slot) => {
                      const key = `${m.id}-${careDay}-${slot}`;
                      const done = Boolean(saved.meds[key]);
                      const isNext = slot === nextSlot;
                      return (
                        <Press
                          key={slot}
                          onPress={() => take(m.id, careDay, slot, m.times.length)}
                          accessibilityLabel={`${tr(m.name)} ${hhmm(t)}`}
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: done ? C.ok : isNext ? C.blue : C.line, backgroundColor: done ? C.ok : C.paper }}
                        >
                          <Txt v="num" size={14} weight="600" color={done ? '#FFFFFF' : C.ink}>
                            {hhmm(t)}
                          </Txt>
                          {done ? <Icon name="check" size={15} color="#FFFFFF" stroke={2.6} /> : <Txt v="label" size={8.5} color={isNext ? C.blue : C.muted}>{isNext ? 'Hierna' : m.asNeeded ? 'Zo nodig' : ''}</Txt>}
                        </Press>
                      );
                    })}
                  </Row>
                  <Txt v="small" color={C.muted} style={{ marginTop: 10 }}>
                    {m.asNeeded ? `${takenToday} ${tr('van max.')} ${m.times.length} ${tr('vandaag')}` : `${takenToday}/${m.times.length} ${tr('vandaag')}`}
                  </Txt>
                </>
              ) : (
                <Txt v="small" color={C.muted} style={{ marginTop: 12 }}>
                  {careDay < m.from ? `Begint op dag ${m.from}.` : 'Klaar met deze kuur.'}
                </Txt>
              )}
              <Row gap={4} style={{ marginTop: 14 }}>
                {Array.from({ length: m.days }, (_, i) => {
                  const day = m.from + i;
                  const n = Object.keys(saved.meds).filter((k) => k.startsWith(`${m.id}-${day}-`)).length;
                  return (
                    <View key={day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: day < careDay ? (n ? C.ok : C.line2) : day === careDay ? C.sky : C.line }} />
                      <Txt v="label" size={8} color={C.muted}>
                        {weekdayShort(addDays(implantDay, day))}
                      </Txt>
                    </View>
                  );
                })}
              </Row>
            </Card>
          </PopIn>
        );
      })}
      <DemoNote text="Demo-voorschrift. Volg altijd het voorschrift van je tandarts en lees de bijsluiter. Twijfel je of gebruik je andere medicijnen, vraag het de kliniek of je apotheek." />
    </Screen>
  );
}
