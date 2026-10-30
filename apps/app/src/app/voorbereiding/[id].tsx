import { careOf, clock, dayLong, doctorById, LOCATIONS, memberById, roomById, treatmentById, type BeforeStep } from '@smile/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Avatar, Bracket, Button, Card, Check, IconTile, ListItem, PopIn, Ring, Row, SectionHead, Tag, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { addToCalendar, routeTo } from '../../lib/ics';
import { nextAppointments, startOf } from '../../lib/story';
import { useApp, useTick } from '../../state/app';
import { C } from '../../theme';

const H = 60;
const D = 24 * 60;

/** The story's own appointments get a checklist of their own; the rest follow the treatment's care plan. */
const OWN: Record<string, BeforeStep[]> = {
  'up-hechting': [
    { at: 3 * D, title: 'Pijndagboek bijhouden', text: 'Dr. Omar kijkt mee hoe de pijn en de zwelling verlopen.' },
    { at: 2 * D, title: 'Foto van de wond', text: 'Een foto op dag 3 helpt de tandarts om vooruit te kijken.' },
    { at: D, title: 'Schrijf je vragen op', text: 'Bijvoorbeeld wanneer je weer aan die kant mag kauwen.' },
    { at: 2 * H, title: 'Voorzichtig poetsen', text: 'Poets thuis, voorzichtig rond de hechtingen.' },
    { at: 45, title: 'Meenemen', text: 'Je identiteitsbewijs en je zorgpas. Kom tien minuten eerder.' },
  ],
  'up-adam': [
    { at: 2 * D, title: 'Lees het verhaal', text: 'Lees samen het verhaal van het eerste bezoek in de Kinderhoek.' },
    { at: D, title: 'Vertel het goed', text: 'De tandarts gaat “tandjes tellen”. Vermijd woorden als prik en pijn.' },
    { at: 2 * H, title: 'Samen poetsen', text: 'Twee minuten met de Poetscoach.' },
    { at: 45, title: 'Lievelingsknuffel mee', text: 'Een knuffel mag mee in de stoel.' },
  ],
};

function when(minutesBefore: number, start: Date, now: Date): { label: string; tone: 'now' | 'late' | 'later' } {
  const due = start.getTime() - minutesBefore * 60000;
  const diff = (due - now.getTime()) / 60000;
  if (diff > 24 * 60) return { label: `over ${Math.round(diff / (24 * 60))} d`, tone: 'later' };
  if (diff > 60) return { label: `over ${Math.round(diff / 60)} u`, tone: 'later' };
  if (diff > 0) return { label: `over ${Math.round(diff)} min`, tone: 'now' };
  return { label: 'nu', tone: 'late' };
}

/** Getting ready for one appointment: a countdown, the checklist in the order it is due, and everything around it. */
export default function Voorbereiding() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { today, bookings, saved, update } = useApp();
  const now = useTick(30000);
  const all = nextAppointments(today, bookings);
  const a = all.find((x) => x.ref === id) ?? all[0];
  if (!a) return <Screen back title="Voorbereiding" />;
  const t = treatmentById(a.treatment);
  const care = careOf(t);
  const steps = (OWN[a.ref] ?? care.before).slice().sort((x, y) => y.at - x.at);
  const start = startOf(a);
  const doc = doctorById(a.doctor);
  const done = steps.filter((_, i) => saved.checks[`prep-${a.ref}-${i}`]).length;
  const hours = Math.max(0, (start.getTime() - now.getTime()) / 3600000);

  return (
    <Screen back title="Voorbereiding" kicker={memberById(a.who).first} serif={a.title}>
      <PopIn>
        <Card tone="navy">
          <Row gap={16}>
            <Ring value={done / Math.max(1, steps.length)} size={86} stroke={7} track="rgba(255,255,255,0.12)">
              <Txt v="stat" size={22} color="#FFFFFF">
                {`${done}/${steps.length}`}
              </Txt>
            </Ring>
            <View style={{ flex: 1, gap: 4 }}>
              <Bracket color="#7FC9F2">{hours > 48 ? `Nog ${Math.round(hours / 24)} dagen` : `Nog ${Math.round(hours)} uur`}</Bracket>
              <Txt v="title" color="#FFFFFF">
                {dayLong(a.day)}
              </Txt>
              <Txt v="small" color="#B6C2DF">
                {`${clock(start)} · ${LOCATIONS[a.location].short} · ${roomById(doc.room).name}`}
              </Txt>
              <Row gap={8} style={{ marginTop: 4 }}>
                <Avatar id={doc.id} size={26} ring="#2DB4E8" />
                <Txt v="small" color="#FFFFFF" weight="600">
                  {doc.name}
                </Txt>
              </Row>
            </View>
          </Row>
          <Row gap={8} style={{ marginTop: 16 }} wrap>
            <Button title="Agenda" icon="calendar" size="sm" kind="white" onPress={() => addToCalendar(tr(a.title), start, a.minutes, a.location)} />
            <Button title="Route" icon="route" size="sm" kind="onDark" onPress={() => routeTo(a.location)} />
          </Row>
        </Card>
      </PopIn>

      <View>
        <SectionHead kicker="Checklist" title="Wat je wanneer doet" />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          {steps.map((s, i) => {
            const k = `prep-${a.ref}-${i}`;
            const w = when(s.at, start, now);
            return (
              <View key={k}>
                <Check done={Boolean(saved.checks[k])} title={s.title} sub={s.text} when={tr(w.label)} onPress={() => update((x) => ({ checks: { ...x.checks, [k]: x.checks[k] ? 0 : Date.now() } }))} />
              </View>
            );
          })}
        </Card>
      </View>

      <View>
        <SectionHead kicker="Ook handig" title="Rond je afspraak" />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          <ListItem icon="shield" color="#0A63B5" title="Gezondheidsvragenlijst" sub={saved.healthAt ? 'Bijgewerkt' : 'Nog invullen'} onPress={() => router.push('/vragenlijst')} />
          {t.explainer ? <ListItem icon="cube" color="#8E7CF8" title="Je behandeling in 3D" sub={t.name} onPress={() => router.push({ pathname: '/uitleg/[id]', params: { id: t.explainer! } })} /> : null}
          {t.consent ? (
            <ListItem
              icon="sign"
              color="#234282"
              title="Toestemming"
              sub={saved.consents[t.id] ? 'Getekend' : 'Lees en teken vooraf'}
              right={saved.consents[t.id] ? <Tag label="Klaar" color="#FFFFFF" bg="#12A27A" /> : undefined}
              onPress={() => router.push({ pathname: '/toestemming/[id]', params: { id: t.id } })}
            />
          ) : null}
          {a.ref === 'up-kroon' ? <ListItem icon="euro" color="#C9A15B" title="Begroting" sub="Kroon op implantaat 36" onPress={() => router.push('/begroting')} /> : null}
          <ListItem icon="wind" color="#7D6BF0" title="Rustig-modus" sub="Ademen en een stopteken" onPress={() => router.push('/rustig')} />
          <ListItem icon="pin" color="#17BFA3" title="Inchecken bij aankomst" sub="Schuif bij de deur" onPress={() => router.push('/inchecken')} last />
        </Card>
      </View>

      {care.numbing ? (
        <Card tone="ice" style={{ borderColor: 'transparent' }}>
          <Row gap={12} align="flex-start">
            <IconTile name="timer" color="#17BFA3" size={38} />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt v="h3">Je wordt waarschijnlijk verdoofd</Txt>
              <Txt v="small" color={C.soft}>
                {`Reken op ongeveer ${Math.round(care.numbing / 60)} uur zonder gevoel. Eet daarom vooraf iets; de verdovingstimer houdt het bij.`}
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
