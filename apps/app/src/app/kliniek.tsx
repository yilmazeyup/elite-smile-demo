import { CLINIC, clock, isOpenAt, LOCATION_LIST, locatePostcode, nearestLocation, nextOpening, OPENING_DAY_ORDER, relativeDay, weekdayLong, type Nearest } from '@smile/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Bracket, Button, Card, Field, IconTile, LiveDot, PopIn, Row, Tag, Txt } from '../components/ui';
import { tr } from '../i18n';
import { callClinic, routeTo, whatsappClinic } from '../lib/ics';
import { useApp } from '../state/app';
import { C } from '../theme';

/**
 * "Find your nearest clinic": the postcode search from Elite Smile's own site, through PDOK (the Dutch government's
 * address service), with the opening days of both practices and a live open/closed light.
 */
export default function Kliniek() {
  const { now, saved, update } = useApp();
  const [pc, setPc] = useState(saved.postcode);
  const [found, setFound] = useState<(Nearest & { label: string; exact: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    setBusy(true);
    setError('');
    const hit = await locatePostcode(pc);
    setBusy(false);
    if (!hit) return setError(tr('Dat is geen Nederlandse postcode. Probeer bijvoorbeeld 5622 CC.'));
    update({ postcode: pc });
    setFound({ ...nearestLocation(hit.lat, hit.lon), label: hit.label, exact: hit.exact });
  };

  return (
    <Screen back title="Dichtstbijzijnde kliniek" kicker="Praktijken" serif="Vul je postcode in; we zoeken de praktijk die het dichtst bij is.">
      <Row gap={10}>
        <Field value={pc} onChangeText={setPc} placeholder="Postcode" autoCapitalize="characters" onSubmitEditing={search} style={{ flex: 1 }} />
        <Button title={busy ? '…' : 'Zoek'} icon="search" onPress={search} />
      </Row>
      {error ? (
        <Txt v="small" color={C.alert}>
          {error}
        </Txt>
      ) : null}
      {found ? (
        <PopIn>
          <Card tone="navy">
            <Bracket color="#7FC9F2">Dichtstbij</Bracket>
            <Txt v="display" color="#FFFFFF" style={{ marginTop: 8 }}>
              {found.location.short}
            </Txt>
            <Txt v="small" color="#B6C2DF">
              {`${Math.round(found.km)} km · ±${found.minutes} min ${tr('met de auto')} · ${tr('vanaf')} ${found.label}`}
            </Txt>
            {!found.exact ? (
              <Txt v="small" color="#7FC9F2" style={{ marginTop: 6 }}>
                Schatting op regio: de adresdienst was niet bereikbaar.
              </Txt>
            ) : null}
            <Row gap={8} style={{ marginTop: 14 }} wrap>
              <Button title="Plan hier" icon="calendar" size="sm" kind="white" onPress={() => router.push({ pathname: '/afspraak', params: { locatie: found.location.id } })} />
              <Button title="Route" icon="route" size="sm" kind="onDark" onPress={() => routeTo(found.location.id)} />
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {LOCATION_LIST.map((loc, i) => {
        const open = isOpenAt(loc, now);
        const opens = nextOpening(loc, now);
        return (
          <PopIn key={loc.id} delay={i * 80}>
            <Card>
              <Row gap={12} align="flex-start">
                <IconTile name={loc.kind === 'kliniek' ? 'tooth' : 'sparkle'} color={loc.kind === 'kliniek' ? '#0A63B5' : '#17BFA3'} size={46} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt v="h2">{loc.name}</Txt>
                  <Txt v="small" color={C.muted}>
                    {`${loc.street}, ${loc.postcode} ${loc.city}`}
                  </Txt>
                  <Row gap={6} style={{ marginTop: 4 }}>
                    <LiveDot tone={open ? 'ok' : 'off'} size={7} />
                    <Txt v="small" weight="600" color={open ? C.ok : C.muted}>
                      {open ? `${tr('Nu open')} · ${tr('tot')} ${String(Math.floor(loc.closes / 60)).padStart(2, '0')}:${String(loc.closes % 60).padStart(2, '0')}` : `${tr('Gesloten')} · ${tr('open')} ${relativeDay(opens, now)} ${clock(opens)}`}
                    </Txt>
                  </Row>
                </View>
              </Row>
              <View style={{ marginTop: 14, gap: 6 }}>
                {OPENING_DAY_ORDER.map((wd) => {
                  const on = loc.days.includes(wd);
                  const today = now.getDay() === wd;
                  return (
                    <Row key={wd} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                      <Txt v="small" weight={today ? '700' : '500'} color={on ? C.ink : C.muted}>
                        {weekdayLong(new Date(2026, 10, 1 + wd))}
                      </Txt>
                      <Row gap={8}>
                        {today ? <Tag label="Vandaag" color={C.blue} bg={C.ice} /> : null}
                        <Txt v="num" size={12.5} color={on ? C.ink : C.muted}>
                          {on ? `${String(Math.floor(loc.opens / 60)).padStart(2, '0')}:${String(loc.opens % 60).padStart(2, '0')} – ${String(Math.floor(loc.closes / 60)).padStart(2, '0')}:00` : tr('gesloten')}
                        </Txt>
                      </Row>
                    </Row>
                  );
                })}
              </View>
              <Txt v="small" color={C.muted} style={{ marginTop: 10 }}>
                {loc.kind === 'kliniek' ? 'De tandartskliniek: alle zeven specialismen.' : 'De mondhygiënistenpraktijk: controles, reiniging, kinderen en bleken.'}
              </Txt>
              <Row gap={8} style={{ marginTop: 12 }} wrap>
                <Button title="Route" icon="route" size="sm" kind="line" onPress={() => routeTo(loc.id)} />
                <Button title="Bel" icon="phone" size="sm" kind="line" onPress={callClinic} />
                <Button title="WhatsApp" icon="whatsapp" size="sm" kind="line" onPress={() => whatsappClinic()} />
              </Row>
            </Card>
          </PopIn>
        );
      })}
      <Card tone="flat" onPress={() => Linking.openURL(`mailto:${CLINIC.email}`)} label={CLINIC.email}>
        <Row gap={10}>
          <IconTile name="mail" size={36} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{CLINIC.email}</Txt>
            <Txt v="small" color={C.muted}>
              {`${CLINIC.phone} · @${CLINIC.instagram}`}
            </Txt>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}
