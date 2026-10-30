import { dateShort, doctorById, relativeDay } from '@smile/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Icon } from '../components/Icon';
import { ToothMark } from '../components/Logo';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Avatar, Bracket, Button, Card, DemoNote, PopIn, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { passportFields, passportMrz, sharePassport } from '../lib/implantCard';
import { PASSPORT, passportDates, stitchesDay } from '../lib/teethData';
import { useApp } from '../state/app';
import { ImplantScene } from '../three/ImplantScene';
import { C, fx, R, shadow } from '../theme';

/** The implant passport: the card a next dentist needs, the implant in 3D, and a way to pass it on. */
export default function Paspoort() {
  const { today } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const fields = passportFields(today);
  const mrz = passportMrz(today);
  const d = passportDates(today);
  const doc = doctorById(PASSPORT.by);

  const share = async () => {
    if (Platform.OS !== 'web') return;
    setBusy(true);
    const how = await sharePassport(today);
    setBusy(false);
    if (how === 'downloaded') toast(tr('Paspoort bewaard als afbeelding'), { text: tr('Stuur het mee als je naar een andere tandarts of kaakchirurg gaat.'), icon: 'implant' });
  };

  const steps = [
    { title: 'Botopbouw', when: d.graft, state: 'done' },
    { title: 'Implantaat geplaatst', when: d.placed, state: 'done' },
    { title: 'Hechtingen eruit', when: stitchesDay(today), state: 'now' },
    { title: 'Vastgroeien in het bot', sub: '3 tot 6 maanden', state: 'next' },
    { title: 'Opbouw en kroon', when: d.crown, state: 'next' },
  ] as { title: string; when?: Date; sub?: string; state: 'done' | 'now' | 'next' }[];

  return (
    <Screen back kicker="Implantaatpaspoort" title={`Implantaat ${PASSPORT.region}`} serif="Alles wat een volgende tandarts moet weten, op één kaart.">
      <View {...fx('dye-navy')} style={[{ height: 380, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.navy }, shadow(2)]}>
        <ImplantScene style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, bottom: 14, right: 16, gap: 3 }}>
          <Bracket color="#7FC9F2">In je kaak, regio 36</Bracket>
          <Txt v="small" size={12} color="#B6C2DF">
            Sleep: je ziet de tekening · laat los: het titanium
          </Txt>
        </View>
      </View>

      {/* ------------------------------------------------------------------------------------------- the card */}
      <PopIn>
        <View {...fx('dye-navy grain')} style={[{ borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.navy }, shadow(2)]}>
          <View style={{ padding: 20, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }} align="flex-start">
              <View style={{ gap: 4, flex: 1 }}>
                <Txt v="label" color="#7FC9F2">
                  Implantaatpaspoort
                </Txt>
                <Txt v="display" color="#FFFFFF">{`Implantaat ${PASSPORT.region}`}</Txt>
                <Txt v="small" color="#B6C2DF">
                  Layla Benali · Elite Smile Dental Clinic
                </Txt>
              </View>
              <View style={{ width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(127,201,242,0.25)' }}>
                <ToothMark size={34} color="#FFFFFF" />
              </View>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 }}>
              {fields.map((f) => (
                <View key={f.k} style={{ width: f.k === 'Regio' || f.k === 'Geplaatst' || f.k === 'Type' ? '100%' : '50%', paddingRight: 10, gap: 3 }}>
                  <Txt v="label" size={9} color="#7FC9F2">
                    {f.k}
                  </Txt>
                  <Txt v="h3" color="#FFFFFF">
                    {f.v}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            {mrz.map((line) => (
              <Txt key={line} v="num" size={10.5} color="#DCE6FF" numberOfLines={1} style={{ letterSpacing: 0.6 }}>
                {line}
              </Txt>
            ))}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', right: 18, top: 86, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, backgroundColor: 'rgba(255,190,60,0.14)' }}>
            <Txt v="label" size={8.5} color="#FFD27A">
              Demo
            </Txt>
          </View>
        </View>
      </PopIn>

      <Button title={busy ? 'Even geduld…' : 'Deel met een andere zorgverlener'} icon="share" kind="blue" size="lg" full onPress={share} disabled={busy || Platform.OS !== 'web'} />
      <Txt v="small" color={C.muted} align="center" style={{ marginTop: -6 }}>
        Je deelt een afbeelding van deze kaart; jij kiest met wie.
      </Txt>

      {/* ---------------------------------------------------------------------------------------- the journey */}
      <Card>
        <Bracket>Traject</Bracket>
        <View style={{ marginTop: 12 }}>
          {steps.map((s, i) => (
            <Row key={s.title} gap={12} align="flex-start">
              <View style={{ alignItems: 'center', width: 16 }}>
                <View
                  {...fx(s.state === 'now' ? 'pulse-blue' : '')}
                  style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: s.state === 'done' ? C.ok : s.state === 'now' ? C.sky : C.paper, borderWidth: s.state === 'next' ? 2 : 0, borderColor: C.line2 }}
                />
                {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: s.state === 'done' ? C.ok : C.line2, marginVertical: 2 }} /> : null}
              </View>
              <Row style={{ flex: 1, paddingBottom: 12, justifyContent: 'space-between' }} align="flex-start" gap={8}>
                <Txt v="h3" color={s.state === 'next' ? C.soft : C.ink} style={{ flex: 1 }}>
                  {s.title}
                </Txt>
                <Txt v="num" size={11.5} color={C.muted}>
                  {s.when ? (s.state === 'now' ? relativeDay(s.when, today) : dateShort(s.when)) : (s.sub ?? '')}
                </Txt>
              </Row>
            </Row>
          ))}
        </View>
        <Row gap={12} style={{ marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderColor: C.line }}>
          <Avatar id={doc.id} size={40} ring="#C9A15B" />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{doc.name}</Txt>
            <Txt v="small" color={C.muted}>
              {doc.title}
            </Txt>
          </View>
        </Row>
      </Card>

      {/* ------------------------------------------------------------------------------------------ why it matters */}
      <Card tone="pearl">
        <Bracket>Waarom een paspoort?</Bracket>
        <Txt v="title" style={{ marginTop: 6 }}>
          Een implantaat gaat tientallen jaren mee. Tandartsen wisselen.
        </Txt>
        {[
          { icon: 'implant' as const, t: 'Onderdelen passen alleen bij hun eigen systeem', d: 'Een nieuwe kroon, opbouw of schroef moet precies passen op merk, type, diameter en verbinding. Zonder die gegevens is het zoeken.' },
          { icon: 'globe' as const, t: 'Onderweg of na een verhuizing', d: 'Breekt er iets op vakantie of ga je naar een andere praktijk, dan heeft die tandarts meteen alles wat nodig is.' },
          { icon: 'shield' as const, t: 'Bij een terugroepactie', d: 'Met het lotnummer is na te gaan of jouw implantaat bij een bepaalde productie hoort.' },
          { icon: 'info' as const, t: 'Bij een scan in het ziekenhuis', d: 'Titanium implantaten zijn meestal geen bezwaar voor een MRI. Vertel het wel altijd aan het ziekenhuis.' },
        ].map((r) => (
          <Row key={r.t} gap={12} align="flex-start" style={{ marginTop: 14 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>
              <Icon name={r.icon} size={17} color={C.blue} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">{r.t}</Txt>
              <Txt v="small" color={C.muted}>
                {r.d}
              </Txt>
            </View>
          </Row>
        ))}
      </Card>

      <Row gap={8} wrap>
        <Button title="Uitleg in 3D" icon="play" size="sm" kind="brand" onPress={() => router.push({ pathname: '/uitleg/[id]', params: { id: 'implantaat' } } as never)} />
        <Button title="Tand 36" icon="cube" size="sm" kind="line" onPress={() => router.push({ pathname: '/tand/[n]', params: { n: '36' } } as never)} />
        <Button title="Röntgen" icon="xray" size="sm" kind="line" onPress={() => router.push({ pathname: '/rontgen', params: { tand: '36' } } as never)} />
      </Row>

      <DemoNote text="Demo: merk, type, lotnummer en maten zijn verzonnen voor deze presentatie. Een echt paspoort krijg je van je tandarts, met de gegevens van het geplaatste implantaat." />
    </Screen>
  );
}
