import { router } from 'expo-router';
import { View } from 'react-native';

import type { IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Bar, Bracket, Button, Card, IconTile, ListItem, PopIn, Row, SectionHead, Txt } from '../../components/ui';
import { diaryAlert, implantCare, todayTasks } from '../../lib/story';
import { useApp } from '../../state/app';
import { C } from '../../theme';

type Item = { icon: IconName; color: string; title: string; sub: string; to: string };

const BEFORE: Item[] = [
  { icon: 'shield', color: '#0A63B5', title: 'Gezondheidsvragenlijst', sub: 'Medicijnen, allergieën, zwangerschap', to: '/vragenlijst' },
  { icon: 'check', color: '#17BFA3', title: 'Voorbereiding op maat', sub: 'Wat je wanneer doet, per afspraak', to: '/voorbereiding/up-hechting' },
  { icon: 'cube', color: '#8E7CF8', title: 'Je behandeling in 3D', sub: 'Stap voor stap, rustig uitgelegd', to: '/uitleg/implantaat' },
  { icon: 'sign', color: '#234282', title: 'Toestemming tekenen', sub: 'Wat, waarom, alternatieven en risico’s', to: '/toestemming/implantaat' },
  { icon: 'euro', color: '#C9A15B', title: 'Begroting & vergoeding', sub: 'Wat je verzekering betaalt', to: '/begroting' },
  { icon: 'wind', color: '#7D6BF0', title: 'Rustig-modus', sub: 'Adem mee, spreek een stopteken af', to: '/rustig' },
];

const DURING: Item[] = [
  { icon: 'pin', color: '#0A63B5', title: 'Inchecken', sub: 'Schuif bij de deur en zie je kamer', to: '/inchecken' },
  { icon: 'hand', color: '#E2434B', title: 'Pauzeknop', sub: 'Even stoppen? De tandarts ziet het meteen', to: '/stoel' },
  { icon: 'language', color: '#17BFA3', title: 'Tolk in de stoel', sub: 'Zinnen in jouw taal en in het Nederlands', to: '/stoel?tab=tolk' },
];

const AFTER: Item[] = [
  { icon: 'clock', color: '#0A63B5', title: 'Nazorg-tijdlijn', sub: 'Uur voor uur, met wat normaal is', to: '/nazorg' },
  { icon: 'pulse', color: '#E2434B', title: 'Pijndagboek', sub: 'Pijn en zwelling, dag na dag', to: '/dagboek' },
  { icon: 'pill', color: '#8E7CF8', title: 'Medicijnwekker', sub: 'Volgens het voorschrift', to: '/medicijnen' },
  { icon: 'camera', color: '#2DB4E8', title: 'Foto van de wond', sub: 'De tandarts kijkt mee', to: '/foto' },
  { icon: 'bowl', color: '#E0901A', title: 'Wat mag ik eten?', sub: 'Per dag na de ingreep', to: '/eten' },
  { icon: 'timer', color: '#17BFA3', title: 'Verdovingstimer', sub: 'Tot het gevoel terug is', to: '/verdoving' },
];

const ALWAYS: Item[] = [
  { icon: 'sos', color: '#E2434B', title: 'Pijn of spoed', sub: 'Wat nu? Bellen, wachten of 112', to: '/spoed' },
  { icon: 'brush', color: '#17BFA3', title: 'Poetscoach', sub: 'Twee minuten, met prijzen', to: '/poetsen' },
  { icon: 'heart', color: '#0A63B5', title: 'Mondgezondheid', sub: 'Je score en wat helpt', to: '/score' },
  { icon: 'chat', color: '#234282', title: 'Vraag het de kliniek', sub: 'Een bericht aan het team', to: '/chat' },
];

function Group({ kicker, title, items }: { kicker: string; title: string; items: Item[] }) {
  return (
    <View>
      <SectionHead kicker={kicker} title={title} />
      <Card pad={0} style={{ paddingHorizontal: 16 }}>
        {items.map((it, i) => (
          <ListItem key={it.to} icon={it.icon} color={it.color} title={it.title} sub={it.sub} onPress={() => router.push(it.to as never)} last={i === items.length - 1} />
        ))}
      </Card>
    </View>
  );
}

/** Everything around a treatment, in the order you need it: before, in the chair, after, and always. */
export default function Zorg() {
  const { saved, now, careDay } = useApp();
  const tasks = todayTasks(saved, now, careDay);
  const done = tasks.filter((t) => t.done).length;
  const alert = diaryAlert(saved.diary);
  const care = implantCare();
  return (
    <Screen title="Zorg" kicker="Voor, tijdens en na" serif="Alles rond je behandeling, op het juiste moment." tabs>
      <PopIn>
        <Card tone="navy">
          <Row style={{ justifyContent: 'space-between' }} align="flex-start">
            <View style={{ gap: 6, flex: 1 }}>
              <Bracket color="#7FC9F2">Nu actief</Bracket>
              <Txt v="title" color="#FFFFFF">
                Implantaat linksonder (36)
              </Txt>
              <Txt v="small" color="#B6C2DF">
                {`Dag ${careDay} van het herstel · Dr. Omar`}
              </Txt>
            </View>
            <IconTile name="implant" color="#2DB4E8" size={46} />
          </Row>
          <View style={{ marginTop: 16, gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="label" color="#7FC9F2" size={9.5}>
                Vandaag
              </Txt>
              <Txt v="num" color="#FFFFFF" size={12}>
                {`${done}/${tasks.length}`}
              </Txt>
            </Row>
            <Bar value={tasks.length ? done / tasks.length : 0} color="#2DB4E8" />
          </View>
          <Txt v="small" color="#B6C2DF" style={{ marginTop: 12 }}>
            {care.recovery}
          </Txt>
          <Row gap={8} style={{ marginTop: 14 }} wrap>
            <Button title="Nazorg" icon="clock" size="sm" kind="white" onPress={() => router.push('/nazorg')} />
            <Button title="Dagboek" icon="pulse" size="sm" kind="onDark" onPress={() => router.push('/dagboek')} />
          </Row>
        </Card>
      </PopIn>
      {alert ? (
        <Card style={{ borderColor: C.alert, borderWidth: 1.5 }}>
          <Txt v="h3" color={C.alert}>
            {alert}
          </Txt>
        </Card>
      ) : null}
      <Group kicker="Voor" title="Goed voorbereid" items={BEFORE} />
      <Group kicker="Tijdens" title="In de stoel" items={DURING} />
      <Group kicker="Na" title="Herstel thuis" items={AFTER} />
      <Group kicker="Altijd" title="Elke dag" items={ALWAYS} />
    </Screen>
  );
}
