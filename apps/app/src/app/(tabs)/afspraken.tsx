import {
  addDays,
  atMinute,
  clock,
  dateLong,
  dayShort,
  doctorById,
  emit,
  eventsOf,
  FAMILY,
  HISTORY,
  INSURANCE,
  LOCATIONS,
  memberById,
  monthLong,
  roomById,
  sameDay,
  treatmentById,
  weekdayShort,
  type MemberId,
} from '@smile/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Avatar, Bar, Bracket, Button, Card, Chip, IconTile, PopIn, Press, Row, SectionHead, Tag, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { addToCalendar } from '../../lib/ics';
import { nextAppointments, startOf, type Appointment } from '../../lib/story';
import { useApp } from '../../state/app';
import { C } from '../../theme';

/** Every appointment of the family, the clinic's offers of an earlier place, the check-up rhythm and the history. */
export default function Afspraken() {
  const { now, today, bookings, bridge, saved } = useApp();
  const [who, setWho] = useState<MemberId | 'alle'>('alle');
  const all = nextAppointments(today, bookings).filter((a) => startOf(a).getTime() > now.getTime() - 3600000);
  const list = all.filter((a) => who === 'alle' || a.who === who);
  const taken = new Set(eventsOf(bridge, 'offer-taken').map((e) => e.ref));
  const offer = eventsOf(bridge, 'offer')
    .filter((o) => !taken.has(o.ref))
    .pop();
  const pair = all.find((a, i) => all.some((b, j) => j !== i && sameDay(a.day, b.day) && a.who !== b.who && Math.abs(a.start - b.start) <= 30));
  const pairOther = pair ? all.find((b) => b !== pair && sameDay(pair.day, b.day) && b.who !== pair.who) : null;
  const lastCheck = HISTORY.filter((h) => h.who === 'layla' && (h.treatment === 'controle' || h.treatment === 'reiniging' || h.treatment === 'vulling')).sort((a, b) => a.daysAgo - b.daysAgo)[0];
  const sinceCheck = lastCheck?.daysAgo ?? 0;
  const left = INSURANCE.limit - INSURANCE.used;

  // Group by month, as a paper diary does.
  const months: { key: string; label: string; items: Appointment[] }[] = [];
  for (const a of list) {
    const key = `${a.day.getFullYear()}-${a.day.getMonth()}`;
    let m = months.find((x) => x.key === key);
    if (!m) months.push((m = { key, label: `${monthLong(a.day)} ${a.day.getFullYear()}`, items: [] }));
    m.items.push(a);
  }

  return (
    <Screen title="Afspraken" kicker="Agenda" serif="Voor jou, Sofia en Adam." tabs right={<Button title="Nieuw" icon="plus" size="sm" onPress={() => router.push('/afspraak')} />}>
      {offer ? (
        <PopIn>
          <Card tone="navy">
            <Row gap={12} align="flex-start">
              <IconTile name="bell" color="#2DB4E8" size={42} />
              <View style={{ flex: 1, gap: 4 }}>
                <Bracket color="#7FC9F2">Van de wachtlijst</Bracket>
                <Txt v="title" color="#FFFFFF">
                  Er is een eerdere plek vrij
                </Txt>
                <Txt v="small" color="#B6C2DF">
                  {`${dayShort(new Date(`${offer.day}T12:00:00`))} · ${clock(atMinute(new Date(`${offer.day}T12:00:00`), offer.start))} · ${doctorById(offer.doctor).name}`}
                </Txt>
                <Row gap={8} style={{ marginTop: 10 }}>
                  <Button title="Neem hem" size="sm" kind="white" icon="check" onPress={() => emit({ kind: 'offer-taken', ref: offer.ref, day: offer.day, start: offer.start })} />
                  <Button title="Nee, dank je" size="sm" kind="onDark" onPress={() => emit({ kind: 'offer-taken', ref: offer.ref, day: '', start: -1 })} />
                </Row>
              </View>
            </Row>
          </Card>
        </PopIn>
      ) : null}

      <Row gap={8} wrap>
        <Chip label="Iedereen" on={who === 'alle'} onPress={() => setWho('alle')} small />
        {FAMILY.map((m) => (
          <Chip key={m.id} label={m.first} on={who === m.id} onPress={() => setWho(m.id)} small color={m.color} />
        ))}
      </Row>

      {months.map((m, mi) => (
        <View key={m.key} style={{ gap: 10 }}>
          <Txt v="label" color={C.muted}>
            {m.label}
          </Txt>
          {m.items.map((a, i) => {
            const d = doctorById(a.doctor);
            const t = treatmentById(a.treatment);
            const member = memberById(a.who);
            const start = startOf(a);
            return (
              <PopIn key={a.ref} delay={mi * 60 + i * 50}>
                <Card pad={0}>
                  <Press onPress={() => router.push({ pathname: '/voorbereiding/[id]', params: { id: a.ref } })} accessibilityLabel={tr(t.name)} scaleTo={0.99} style={{ padding: 16 }}>
                    <Row gap={14} align="flex-start">
                      <View style={{ width: 56, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: C.bg2 }}>
                        <Txt v="label" size={9.5} color={C.muted}>
                          {weekdayShort(a.day)}
                        </Txt>
                        <Txt v="stat" size={24}>
                          {String(a.day.getDate())}
                        </Txt>
                        <Txt v="num" size={11.5} color={C.blue}>
                          {clock(start)}
                        </Txt>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Row gap={6} wrap>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: member.color }} />
                          <Txt v="label" size={9.5} color={C.muted}>
                            {member.first}
                          </Txt>
                          {a.mine ? <Tag label="Via de app" color={C.blue} bg={C.ice} /> : null}
                          {t.free ? <Tag label="Gratis" color={C.ok} bg={C.bg2} /> : null}
                        </Row>
                        <Txt v="h2">{a.title}</Txt>
                        {a.note ? (
                          <Txt v="small" color={C.soft}>
                            {a.note}
                          </Txt>
                        ) : null}
                        <Txt v="small" color={C.muted}>
                          {`${LOCATIONS[a.location].short} · ${roomById(d.room).name} · ±${a.minutes} min`}
                        </Txt>
                        <Row gap={8} style={{ marginTop: 6 }}>
                          <Avatar id={d.id} size={26} />
                          <Txt v="small" weight="600">
                            {d.name}
                          </Txt>
                        </Row>
                      </View>
                    </Row>
                  </Press>
                  <Row style={{ borderTopWidth: 1, borderColor: C.line }}>
                    {[
                      { icon: 'check' as const, label: 'Voorbereiden', go: () => router.push({ pathname: '/voorbereiding/[id]', params: { id: a.ref } }) },
                      { icon: 'calendar' as const, label: 'Agenda', go: () => addToCalendar(tr(a.title), start, a.minutes, a.location) },
                      a.mine
                        ? { icon: 'close' as const, label: 'Annuleren', go: () => emit({ kind: 'cancel', ref: a.ref }) }
                        : { icon: 'rotate' as const, label: 'Verzetten', go: () => router.push({ pathname: '/afspraak', params: { behandeling: a.treatment, voor: a.who, tandarts: a.doctor } }) },
                    ].map((b, k) => (
                      <Press key={b.label} onPress={b.go} accessibilityLabel={tr(b.label)} style={{ flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderLeftWidth: k ? 1 : 0, borderColor: C.line }}>
                        <Icon name={b.icon} size={14} color={C.soft} />
                        <Txt v="small" size={12.5} weight="600" color={C.soft}>
                          {b.label}
                        </Txt>
                      </Press>
                    ))}
                  </Row>
                </Card>
              </PopIn>
            );
          })}
        </View>
      ))}

      {pair && pairOther ? (
        <Card tone="pearl">
          <Row gap={12} align="flex-start">
            <IconTile name="users" color="#17BFA3" size={42} />
            <View style={{ flex: 1, gap: 4 }}>
              <Bracket>Gezinsplanner</Bracket>
              <Txt v="h2">{`${memberById(pair.who).first} en ${memberById(pairOther.who).first}, achter elkaar`}</Txt>
              <Txt v="small" color={C.soft}>
                {`${dayShort(pair.day)}: ${clock(startOf(pair))} en ${clock(startOf(pairOther))}. Eén keer reizen, één keer parkeren.`}
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      <View>
        <SectionHead kicker="Ritme" title="Controle elk half jaar" serif="Zo raadt Elite Smile het aan." />
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">Laatste controle</Txt>
            <Txt v="num" color={C.muted}>
              {dateLong(addDays(today, -sinceCheck))}
            </Txt>
          </Row>
          <Bar value={sinceCheck / 182} style={{ marginTop: 12 }} color={sinceCheck > 182 ? '#E0901A' : undefined} />
          <Txt v="small" color={C.muted} style={{ marginTop: 10 }}>
            {sinceCheck > 182 ? 'Tijd voor je volgende controle.' : `Volgende controle over ongeveer ${Math.max(0, Math.round((182 - sinceCheck) / 7))} weken.`}
          </Txt>
          <Button title="Plan je controle" size="sm" kind="line" icon="calendar" style={{ marginTop: 12 }} onPress={() => router.push({ pathname: '/afspraak', params: { behandeling: 'controle', voor: 'layla' } })} />
        </Card>
        <Card tone="ice" style={{ marginTop: 10, borderColor: 'transparent' }}>
          <Row gap={12} align="flex-start">
            <Icon name="euro" size={20} color={C.blue} />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt v="h3">{`Nog € ${left} vergoeding dit jaar`}</Txt>
              <Txt v="small" color={C.soft}>
                {`Je aanvullende verzekering vergoedt per kalenderjaar. Plan je controle vóór 31 december om dit jaar te benutten (demo: ${Math.round(INSURANCE.share * 100)}% tot € ${INSURANCE.limit}).`}
              </Txt>
            </View>
          </Row>
        </Card>
      </View>

      <View>
        <SectionHead kicker="Eerder" title="Geschiedenis" />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          {HISTORY.filter((h) => who === 'alle' || h.who === who)
            .sort((a, b) => a.daysAgo - b.daysAgo)
            .map((h, i, arr) => (
              <Row key={`${h.daysAgo}-${h.treatment}-${h.who}`} gap={12} style={{ paddingVertical: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderColor: C.line }}>
                <Avatar id={h.doctor} size={34} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3" size={14.5}>
                    {`${treatmentById(h.treatment).name}${h.tooth ? ` · ${h.tooth}` : ''}`}
                  </Txt>
                  <Txt v="small" color={C.muted}>
                    {`${memberById(h.who).first} · ${h.note}`}
                  </Txt>
                </View>
                <Txt v="num" size={11.5} color={C.muted}>
                  {dayShort(addDays(today, -h.daysAgo))}
                </Txt>
              </Row>
            ))}
        </Card>
      </View>
      {saved.waitlist ? (
        <Txt v="small" color={C.muted}>
          Je staat op de wachtlijst voor een eerdere plek.
        </Txt>
      ) : null}
    </Screen>
  );
}
