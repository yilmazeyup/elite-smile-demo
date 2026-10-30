import {
  clock,
  dayLong,
  dayShort,
  doctorById,
  DOCTORS,
  greeting,
  LOCATIONS,
  memberById,
  relativeDay,
  roomById,
  treatmentById,
  weekdayLong,
} from '@smile/shared';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { Backdrop } from '../../components/Screen';
import { Avatar, Bracket, Button, Card, Flip, IconTile, LiveDot, PopIn, Press, Ring, Row, SectionHead, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { clinicStatus, diaryAlert, nextAppointments, startOf, todayTasks } from '../../lib/story';
import { useApp } from '../../state/app';
import { HeroTooth } from '../../three/HeroTooth';
import { C, fx, MAX_WIDTH, PAD } from '../../theme';

const QUICK: { icon: IconName; title: string; sub: string; to: string; color: string }[] = [
  { icon: 'sos', title: 'Pijn of spoed', sub: 'Wat nu? In 4 vragen', to: '/spoed', color: '#E2434B' },
  { icon: 'wind', title: 'Rustig-modus', sub: 'Adem mee voor je afspraak', to: '/rustig', color: '#7D6BF0' },
  { icon: 'brush', title: 'Poetscoach', sub: 'Twee minuten, vier kwadranten', to: '/poetsen', color: '#17BFA3' },
  { icon: 'sparkle', title: 'Glimlach-studio', sub: 'Zie je tanden lichter', to: '/glimlach', color: '#2DB4E8' },
  { icon: 'chat', title: 'Vraag het de kliniek', sub: 'Antwoord van het team', to: '/chat', color: '#0A63B5' },
  { icon: 'child', title: 'Kinderhoek', sub: 'Voor Sofia en Adam', to: '/kinderhoek', color: '#FFB12E' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { now, today, saved, update, careDay, bookings } = useApp();
  const tasks = todayTasks(saved, now, careDay);
  const done = tasks.filter((t) => t.done).length;
  const apps = nextAppointments(today, bookings).filter((a) => startOf(a).getTime() > now.getTime());
  const next = apps[0];
  const nextDoc = next ? doctorById(next.doctor) : null;
  const status = clinicStatus(now);
  const alert = diaryAlert(saved.diary);
  const daysTo = next ? Math.round((startOf(next).getTime() - now.getTime()) / 86400000) : 0;
  const lastPain = saved.diary[saved.diary.length - 1];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          {/* ------------------------------------------------------------------------------------------- header */}
          <Row style={{ paddingTop: insets.top + 12, paddingHorizontal: PAD, justifyContent: 'space-between' }}>
            <Logo width={132} />
            <Row gap={8}>
              <Press onPress={() => router.push('/spoed')} accessibilityLabel={tr('Pijn of spoed')} fxNames="glass" style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.glass, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sos" size={17} color={C.alert} stroke={2} />
                <Txt v="small" weight="700" color={C.alert}>
                  Spoed
                </Txt>
              </Press>
              <Press onPress={() => router.push('/ik')} accessibilityLabel={tr('Mijn profiel')} style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy }} fxNames="dye-navy">
                <Txt v="h3" color="#FFFFFF" weight="700">
                  {memberById(saved.member).first.slice(0, 1)}
                </Txt>
              </Press>
            </Row>
          </Row>

          {/* --------------------------------------------------------------------------------------------- hero */}
          <View style={{ paddingHorizontal: PAD, marginTop: 18 }}>
            <Bracket color={C.blue}>{dayLong(now)}</Bracket>
            <Txt v="hero" style={{ marginTop: 8 }}>
              {tr(greeting(now))},{'\n'}
              <Txt v="hero" ink="pearl">
                {memberById(saved.member).first}
              </Txt>
            </Txt>
          </View>
          <View style={{ height: 230, marginTop: -6 }}>
            <HeroTooth style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View pointerEvents="box-none" style={{ position: 'absolute', left: PAD, bottom: 18, gap: 8 }}>
              <Txt v="serif" size={18} color={C.soft} style={{ maxWidth: 210 }}>
                {careDay === 0 ? 'Vandaag is je implantaat geplaatst.' : `Dag ${careDay} na je implantaat.`}
              </Txt>
              <Row gap={8}>
                <Ring value={tasks.length ? done / tasks.length : 0} size={44} stroke={5}>
                  <Txt v="num" size={12} weight="600">
                    {`${done}/${tasks.length}`}
                  </Txt>
                </Ring>
                <Txt v="small" color={C.muted} style={{ maxWidth: 150 }}>
                  {done === tasks.length ? 'Alles voor vandaag gedaan.' : 'zorgtaken voor vandaag'}
                </Txt>
              </Row>
            </View>
          </View>

          <View style={{ paddingHorizontal: PAD, gap: 22 }}>
            {/* ---------------------------------------------------------------------------- an alert from the diary */}
            {alert ? (
              <PopIn>
                <Card tone="paper" style={{ borderColor: C.alert, borderWidth: 1.5 }}>
                  <Row gap={12} align="flex-start">
                    <IconTile name="alert" color="#E2434B" size={40} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Txt v="h3">{alert}</Txt>
                      <Row gap={8} wrap>
                        <Button title="Bel de kliniek" icon="phone" size="sm" kind="alert" onPress={() => router.push('/spoed')} />
                        <Button title="Dagboek" size="sm" kind="line" onPress={() => router.push('/dagboek')} />
                      </Row>
                    </View>
                  </Row>
                </Card>
              </PopIn>
            ) : null}

            {/* -------------------------------------------------------------------------------- today's care */}
            <PopIn delay={60}>
              <Card tone="paper" pad={0}>
                <Row style={{ paddingHorizontal: 18, paddingTop: 16, justifyContent: 'space-between' }}>
                  <View style={{ gap: 4 }}>
                    <Bracket>Vandaag voor jou</Bracket>
                    <Txt v="title">Nazorg implantaat 36</Txt>
                  </View>
                  <Press onPress={() => router.push('/nazorg')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Txt v="small" weight="700" color={C.blue}>
                      Tijdlijn
                    </Txt>
                    <Flip>
                      <Icon name="arrow" size={15} color={C.blue} />
                    </Flip>
                  </Press>
                </Row>
                <View style={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 }}>
                  {tasks.map((t, i) => {
                    const past = t.at <= now.getHours() * 60 + now.getMinutes();
                    return (
                      <Press
                        key={t.id}
                        onPress={() => {
                          if (t.id.startsWith('dagboek') || t.id.startsWith('foto')) return router.push(t.route as never);
                          if (t.id.startsWith('zout')) return update((s) => ({ checks: { ...s.checks, [t.id]: s.checks[t.id] ? 0 : Date.now() } }));
                          update((s) => {
                            const meds = { ...s.meds };
                            if (meds[t.id]) delete meds[t.id];
                            else meds[t.id] = Date.now();
                            return { meds };
                          });
                        }}
                        scaleTo={0.985}
                        accessibilityLabel={tr(t.title)}
                      >
                        <Row gap={12} style={{ paddingVertical: 11, borderBottomWidth: i === tasks.length - 1 ? 0 : 1, borderColor: C.line }}>
                          <Txt v="num" size={12.5} color={past && !t.done ? C.warn : C.muted} style={{ width: 44 }}>
                            {`${String(Math.floor(t.at / 60)).padStart(2, '0')}:${String(t.at % 60).padStart(2, '0')}`}
                          </Txt>
                          <IconTile name={t.icon} size={34} color={t.done ? '#12A27A' : '#0A63B5'} />
                          <View style={{ flex: 1 }}>
                            <Txt v="h3" color={t.done ? C.muted : C.ink} style={t.done ? { textDecorationLine: 'line-through' } : null}>
                              {t.title}
                            </Txt>
                            <Txt v="small" color={C.muted}>
                              {t.sub}
                            </Txt>
                          </View>
                          <View
                            style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.6, borderColor: t.done ? C.ok : C.line2, backgroundColor: t.done ? C.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {t.done ? <Icon name="check" size={15} color="#FFFFFF" stroke={2.6} /> : null}
                          </View>
                        </Row>
                      </Press>
                    );
                  })}
                </View>
                {lastPain ? (
                  <Row style={{ paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.bg2, gap: 10 }}>
                    <Icon name="pulse" size={16} color={C.blue} />
                    <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                      {`Laatste meting: pijn ${lastPain.pain}/10, zwelling ${lastPain.swelling}/3`}
                    </Txt>
                  </Row>
                ) : null}
              </Card>
            </PopIn>

            {/* ------------------------------------------------------------------------------ next appointment */}
            {next && nextDoc ? (
              <PopIn delay={120}>
                <Card tone="navy" pad={0}>
                  <Press onPress={() => router.push({ pathname: '/voorbereiding/[id]', params: { id: next.ref } })} accessibilityLabel={tr('Volgende afspraak')} scaleTo={0.99} style={{ padding: 18, gap: 14 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Bracket color="#7FC9F2">Volgende afspraak</Bracket>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <Txt v="label" color="#FFFFFF" size={9.5}>
                          {daysTo <= 0 ? tr('vandaag') : daysTo === 1 ? tr('morgen') : `${tr('over')} ${daysTo} ${tr('dagen')}`}
                        </Txt>
                      </View>
                    </Row>
                    <Row gap={14} align="flex-start">
                      <View style={{ alignItems: 'center', width: 62, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <Txt v="label" color="#7FC9F2" size={10}>
                          {weekdayLong(next.day).slice(0, 3)}
                        </Txt>
                        <Txt v="stat" color="#FFFFFF" size={28}>
                          {String(next.day.getDate())}
                        </Txt>
                        <Txt v="num" color="#B6C2DF" size={12}>
                          {clock(startOf(next))}
                        </Txt>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Txt v="title" color="#FFFFFF">
                          {next.title}
                        </Txt>
                        <Txt v="small" color="#B6C2DF">
                          {`${memberById(next.who).first} · ${LOCATIONS[next.location].short} · ${roomById(nextDoc.room).name}`}
                        </Txt>
                        <Row gap={8} style={{ marginTop: 6 }}>
                          <Avatar id={nextDoc.id} size={30} ring="#2DB4E8" />
                          <Txt v="small" color="#FFFFFF" weight="600">
                            {nextDoc.name}
                          </Txt>
                        </Row>
                      </View>
                    </Row>
                  </Press>
                  <Row style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    {[
                      { icon: 'check' as IconName, label: 'Voorbereiden', go: () => router.push({ pathname: '/voorbereiding/[id]', params: { id: next.ref } }) },
                      { icon: 'pin' as IconName, label: 'Inchecken', go: () => router.push('/inchecken') },
                      { icon: 'cube' as IconName, label: 'Uitleg in 3D', go: () => router.push({ pathname: '/uitleg/[id]', params: { id: treatmentById(next.treatment).explainer ?? 'implantaat' } }) },
                    ].map((a, i) => (
                      <Press key={a.label} onPress={a.go} style={{ flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderLeftWidth: i ? 1 : 0, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Icon name={a.icon} size={15} color="#7FC9F2" />
                        <Txt v="small" color="#FFFFFF" weight="600">
                          {a.label}
                        </Txt>
                      </Press>
                    ))}
                  </Row>
                </Card>
              </PopIn>
            ) : null}

            {/* ---------------------------------------------------------------------------------- quick tiles */}
            <View>
              <SectionHead kicker="Snel" title="Wat wil je doen?" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {QUICK.map((q, i) => (
                  <PopIn key={q.to} delay={160 + i * 40} style={{ width: '48.4%' }}>
                    <Card pad={14} onPress={() => router.push(q.to as never)} label={tr(q.title)} style={{ minHeight: 118, justifyContent: 'space-between' }}>
                      <IconTile name={q.icon} color={q.color} size={40} />
                      <View style={{ gap: 2, marginTop: 10 }}>
                        <Txt v="h3">{q.title}</Txt>
                        <Txt v="small" size={12} color={C.muted} numberOfLines={2}>
                          {q.sub}
                        </Txt>
                      </View>
                    </Card>
                  </PopIn>
                ))}
              </View>
            </View>

            {/* ----------------------------------------------------------------------------------- the journey */}
            <View>
              <SectionHead kicker="Jouw traject" title="Implantaat linksonder" serif="Van gebarsten kies naar een nieuwe tand." action="Plan" onAction={() => router.push('/gebit')} />
              <Card tone="pearl">
                {[
                  { title: 'Kies getrokken, bot opgebouwd', when: 'ruim 3 maanden geleden', state: 'done' },
                  { title: 'Implantaat geplaatst', when: careDay === 0 ? 'vandaag' : `${careDay} dagen geleden`, state: 'done' },
                  { title: 'Hechtingen eruit', when: apps.find((a) => a.ref === 'up-hechting') ? relativeDay(apps.find((a) => a.ref === 'up-hechting')!.day, now) : '', state: 'now' },
                  { title: 'Vastgroeien in het bot', when: '3 tot 6 maanden', state: 'next' },
                  { title: 'Kroon op het implantaat', when: apps.find((a) => a.ref === 'up-kroon') ? dayShort(apps.find((a) => a.ref === 'up-kroon')!.day) : '', state: 'next' },
                ].map((s, i, all) => (
                  <Row key={s.title} gap={14} align="flex-start">
                    <View style={{ alignItems: 'center', width: 18 }}>
                      <View
                        {...fx(s.state === 'now' ? 'pulse-blue' : '')}
                        style={{ width: 14, height: 14, borderRadius: 7, marginTop: 3, backgroundColor: s.state === 'done' ? C.ok : s.state === 'now' ? C.sky : C.paper, borderWidth: 2, borderColor: s.state === 'next' ? C.line2 : 'transparent' }}
                      />
                      {i < all.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 30, backgroundColor: s.state === 'done' ? C.ok : C.line2, marginVertical: 2 }} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14 }}>
                      <Txt v="h3" color={s.state === 'next' ? C.soft : C.ink}>
                        {s.title}
                      </Txt>
                      {s.when ? (
                        <Txt v="small" color={C.muted}>
                          {s.when}
                        </Txt>
                      ) : null}
                    </View>
                  </Row>
                ))}
              </Card>
            </View>

            {/* ------------------------------------------------------------------------------ the clinic now */}
            <View>
              <SectionHead kicker="Elite Smile nu" title="Twee praktijken" action="Dichtstbij" onAction={() => router.push('/kliniek')} />
              <View style={{ gap: 10 }}>
                {status.map(({ loc, open, next: opens, closesIn }) => (
                  <Card key={loc.id} pad={14} onPress={() => router.push('/kliniek')} label={loc.name}>
                    <Row gap={12}>
                      <IconTile name={loc.kind === 'kliniek' ? 'tooth' : 'sparkle'} color={loc.kind === 'kliniek' ? '#0A63B5' : '#17BFA3'} size={42} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt v="h3">{loc.name}</Txt>
                        <Txt v="small" color={C.muted}>
                          {`${loc.street}, ${loc.city}`}
                        </Txt>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Row gap={6}>
                          <LiveDot tone={open ? 'ok' : 'off'} size={7} />
                          <Txt v="label" size={9.5} color={open ? C.ok : C.muted}>
                            {open ? 'Open' : 'Gesloten'}
                          </Txt>
                        </Row>
                        <Txt v="num" size={11.5} color={C.muted}>
                          {open ? `${tr('nog')} ${Math.floor(closesIn / 60)}:${String(Math.round(closesIn % 60)).padStart(2, '0')} ${tr('uur')}` : `${relativeDay(opens, now)} ${clock(opens)}`}
                        </Txt>
                      </View>
                    </Row>
                  </Card>
                ))}
              </View>
            </View>

            {/* ------------------------------------------------------------------------------------- the team */}
            <View>
              <SectionHead kicker="Het team" title="Zes tandartsen" serif="Zoals elitesmile.nl ze voorstelt." />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: PAD }} style={{ marginHorizontal: -PAD, paddingHorizontal: PAD }}>
                {DOCTORS.map((d) => (
                  <Card key={d.id} pad={0} onPress={() => router.push({ pathname: '/tandarts/[id]', params: { id: d.id } })} label={d.name} style={{ width: 150 }}>
                    <View {...fx('dye-pearl')} style={{ height: 150, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
                      <Avatar id={d.id} size={128} />
                    </View>
                    <View style={{ padding: 12, gap: 2 }}>
                      <Txt v="h3" raw>
                        {d.name}
                      </Txt>
                      <Txt v="small" size={11.5} color={C.muted} numberOfLines={2}>
                        {d.title}
                      </Txt>
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>

            {/* ------------------------------------------------------------------------------- the free check-up */}
            <Card tone="ice" style={{ borderColor: 'transparent' }}>
              <Row gap={14}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Bracket color={C.blue}>Gratis controle</Bracket>
                  <Txt v="title">Ken je iemand die al lang niet is geweest?</Txt>
                  <Txt v="small" color={C.soft}>
                    Elite Smile biedt een gratis controle. Deel de link; ze kiezen zelf een moment.
                  </Txt>
                </View>
              </Row>
              <Row gap={10} style={{ marginTop: 14 }}>
                <Button title="Deel de gratis controle" icon="share" size="sm" kind="blue" onPress={() => router.push('/delen')} />
              </Row>
            </Card>
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <Txt v="small" color={C.muted} align="center" style={{ maxWidth: 320 }}>
                {`${tr('Demo met een verzonnen patiënt.')} ${tr('De zorgadviezen zijn algemeen; volg altijd het advies van je eigen tandarts.')}`}
              </Txt>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
