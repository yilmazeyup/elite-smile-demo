import { atMinute, clock, CLINIC, dayShort, doctorById, freeSlots, LOCATIONS, occupancy, openDays, roomById, specialtyById, SPECIALTY_COLORS, TREATMENTS } from '@smile/shared';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, Share, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Bar, Bracket, Button, Card, Chip, DemoNote, PopIn, Press, Row, SectionHead, Tag, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { TEAM_PHOTOS } from '../../photos';
import { useApp } from '../../state/app';
import { C, fx } from '../../theme';

/** A dentist as elitesmile.nl introduces them: name, title and portrait, and from the demo: room, free places, how busy. */
export default function Tandarts() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { now } = useApp();
  const d = doctorById(id ?? 'omar');
  const days = openDays(LOCATIONS.eindhoven, now, 6);
  const treatments = TREATMENTS.filter((t) => t.doctors.includes(d.id));
  const first = days
    .map((day) => ({ day, slots: freeSlots(day, d.id, 30, [], day.getDate() === now.getDate() ? now.getHours() * 60 + now.getMinutes() + 45 : 0) }))
    .filter((x) => x.slots.length)
    .slice(0, 3);
  const pageUrl = Platform.OS === 'web' && typeof window !== 'undefined' ? new URL(`../website/tandarts/${d.id}/`, window.location.href.replace(/\/app\/.*$/, '/app/')).toString() : `${CLINIC.site}`;

  return (
    <Screen
      back
      hero={
        <View style={{ height: 300, marginTop: -10 }}>
          <View {...fx('dye-pearl')} style={{ position: 'absolute', left: 20, right: 20, top: 20, bottom: 0, borderRadius: 34 }} />
          <Image source={TEAM_PHOTOS[d.id]} style={{ position: 'absolute', left: 40, right: 40, top: 0, bottom: 0 }} contentFit="contain" />
        </View>
      }
    >
      <PopIn style={{ gap: 6 }}>
        <Bracket color={C.blue}>{roomById(d.room).name}</Bracket>
        <Txt v="hero">{d.name}</Txt>
        <Txt v="serif" color={C.soft}>
          {d.title}
        </Txt>
        <Row gap={8} wrap style={{ marginTop: 8 }}>
          {d.specialties.map((s) => (
            <Tag key={s} label={specialtyById(s).name} color="#FFFFFF" bg={SPECIALTY_COLORS[s]} />
          ))}
        </Row>
      </PopIn>

      <Card>
        <Bracket>Eerst vrij</Bracket>
        <View style={{ gap: 10, marginTop: 10 }}>
          {first.map(({ day, slots }) => (
            <Row key={day.toISOString()} gap={8} wrap>
              <Txt v="h3" style={{ width: 90 }}>
                {dayShort(day)}
              </Txt>
              {slots.slice(0, 3).map((s) => (
                <Chip key={s} small label={clock(atMinute(day, s))} onPress={() => router.push({ pathname: '/afspraak', params: { tandarts: d.id, behandeling: treatments[0]?.id ?? 'controle' } })} />
              ))}
            </Row>
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <Txt v="small" color={C.muted}>
            Bezetting vandaag
          </Txt>
          <Txt v="num" size={12} color={C.muted}>
            {`${Math.round(occupancy(now, d.id) * 100)}%`}
          </Txt>
        </Row>
        <Bar value={occupancy(now, d.id)} style={{ marginTop: 6 }} />
        <Button title={`Boek bij ${d.name}`} kind="blue" icon="calendar" full style={{ marginTop: 16 }} onPress={() => router.push({ pathname: '/afspraak', params: { tandarts: d.id } })} />
      </Card>

      <View>
        <SectionHead kicker="Behandelingen" title={`Waarvoor je bij ${d.name} komt`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {treatments.map((t) => (
            <Press key={t.id} onPress={() => router.push({ pathname: '/afspraak', params: { tandarts: d.id, behandeling: t.id } })} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
              <Txt v="small" weight="600">
                {t.name}
              </Txt>
            </Press>
          ))}
        </View>
      </View>

      <Row gap={10} wrap>
        <Button title="Instagram" icon="instagram" kind="line" size="sm" onPress={() => Linking.openURL(CLINIC.instagramUrl)} />
        <Button
          title="Deel"
          icon="share"
          kind="line"
          size="sm"
          onPress={() => {
            const message = `${d.name} · ${tr(d.title)} · Elite Smile`;
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) navigator.share({ title: message, url: pageUrl }).catch(() => {});
            else Share.share({ message: `${message} ${pageUrl}` }).catch(() => {});
          }}
        />
      </Row>
      <DemoNote text="Naam, titel en foto komen van elitesmile.nl. Kamer, vrije plekken en bezetting zijn demo." />
    </Screen>
  );
}
