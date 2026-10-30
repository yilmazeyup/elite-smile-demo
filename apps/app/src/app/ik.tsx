import { FAMILY, LOCALE_NAMES, LOCALES, getLocale, memberById, resetBridge } from '@smile/shared';
import { router } from 'expo-router';
import { Linking, Platform, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Bracket, Card, Chip, DemoNote, ListItem, PopIn, Press, Row, SectionHead, Segments, Toggle, Txt } from '../components/ui';
import { chooseLocale } from '../i18n';
import { resetSaved, useApp } from '../state/app';
import { useTheme } from '../state/theme';
import { C } from '../theme';

const link = (path: string) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const base = window.location.pathname.replace(/\/app(\/.*)?$/, '/');
  window.location.href = `${base}${path}`;
};

/** The family, the settings that matter (language, look, reminders), the dossier, and the demo itself. */
export default function Ik() {
  const { saved, update } = useApp();
  const { choice, choose } = useTheme();
  const me = memberById(saved.member);
  return (
    <Screen back title={me.name} kicker="Mijn profiel" serif={`Postcode ${saved.postcode} · patiënt sinds vorig jaar`}>
      <View>
        <SectionHead kicker="Gezin" title="Voor wie zorg je nu?" />
        <Row gap={10}>
          {FAMILY.map((m) => {
            const on = saved.member === m.id;
            return (
              <Press key={m.id} onPress={() => update({ member: m.id })} accessibilityState={{ selected: on }} style={{ flex: 1 }}>
                <Card pad={14} style={[{ alignItems: 'center', gap: 8 }, on ? { borderColor: m.color, borderWidth: 2 } : null]}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt v="title" color="#FFFFFF">
                      {m.first.slice(0, 1)}
                    </Txt>
                  </View>
                  <Txt v="h3">{m.first}</Txt>
                  <Txt v="small" size={11.5} color={C.muted}>
                    {m.kid ? `${m.age} jaar` : 'Ik'}
                  </Txt>
                </Card>
              </Press>
            );
          })}
        </Row>
      </View>

      <View>
        <SectionHead kicker="Dossier" title="Mijn gegevens" />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          <ListItem icon="shield" title="Gezondheidsvragenlijst" sub={saved.healthAt ? 'Bijgewerkt' : 'Nog invullen'} onPress={() => router.push('/vragenlijst')} />
          <ListItem icon="tooth" color="#2DB4E8" title="Mijn gebit in 3D" sub="Elke tand, met zijn verhaal" onPress={() => router.push('/gebit')} />
          <ListItem icon="xray" color="#234282" title="Röntgenfoto’s" sub="Met uitleg van je tandarts" onPress={() => router.push('/rontgen')} />
          <ListItem icon="implant" color="#8E7CF8" title="Implantaatpaspoort" sub="Voor elke volgende tandarts" onPress={() => router.push('/paspoort')} />
          <ListItem icon="euro" color="#C9A15B" title="Begroting & verzekering" sub="Wat je verzekering betaalt" onPress={() => router.push('/begroting')} last />
        </Card>
      </View>

      <View>
        <SectionHead kicker="Instellingen" title="Zo wil ik het" />
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 8 }}>
            <Bracket>Taal</Bracket>
            <Row gap={8} wrap>
              {LOCALES.map((l) => (
                <Chip key={l} label={LOCALE_NAMES[l]} on={getLocale() === l} onPress={() => chooseLocale(l)} small />
              ))}
            </Row>
          </View>
          <View style={{ gap: 8 }}>
            <Bracket>Weergave</Bracket>
            <Segments
              value={choice}
              onChange={(c) => choose(c)}
              options={[
                { id: 'day', label: 'Dag', icon: 'sun' },
                { id: 'night', label: 'Nacht', icon: 'moon' },
                { id: 'auto', label: 'Automatisch', icon: 'rotate' },
              ]}
            />
          </View>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt v="h3">Herinneringen</Txt>
              <Txt v="small" color={C.muted}>
                Afspraken, medicijnen en nazorg
              </Txt>
            </View>
            <Toggle value={saved.push} onChange={(v) => update({ push: v })} label="Herinneringen" />
          </Row>
        </Card>
      </View>

      <View>
        <SectionHead kicker="Demo" title="Over deze app" />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          <ListItem icon="home" title="Startpagina van de demo" sub="App en praktijkscherm naast elkaar" onPress={() => link('')} />
          <ListItem icon="chart" color="#234282" title="Praktijkscherm" sub="De kliniek in 3D, live" onPress={() => link('admin/')} />
          <ListItem icon="globe" color="#17BFA3" title="De website" sub="Elite Smile, opnieuw ontworpen" onPress={() => link('website/')} />
          <ListItem
            icon="rotate"
            color="#E0901A"
            title="Demo opnieuw beginnen"
            sub="Wist wat je in de app deed"
            last
            onPress={() => {
              resetSaved();
              resetBridge();
              if (Platform.OS === 'web') window.location.reload();
            }}
          />
        </Card>
      </View>
      <PopIn>
        <DemoNote text="Echt (van elitesmile.nl): de praktijken, adressen, openingsdagen, telefoon, e-mail, Instagram, behandelingen, de tandartsen met hun foto en titel, en de gratis controle. Demo: Layla en haar gezin, afspraken, gebit, voorschriften, bedragen en de berichten. De zorgteksten zijn algemene informatie." />
      </PopIn>
      <Press onPress={() => Linking.openURL('https://elitesmile.nl')} style={{ alignSelf: 'center', paddingVertical: 8 }}>
        <Txt v="small" color={C.blue} weight="600">
          elitesmile.nl
        </Txt>
      </Press>
    </Screen>
  );
}
