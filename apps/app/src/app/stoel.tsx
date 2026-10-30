import { doctorById, emit, eventsOf, getLocale, LOCALE_NAMES, LOCALES, roomById, tr as trIn, type Locale } from '@smile/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Avatar, Bracket, Button, Card, Chip, PopIn, Press, Row, Segments, tap, Txt } from '../components/ui';
import { rtl, tr } from '../i18n';
import { useApp } from '../state/app';
import { C, fx } from '../theme';

/** Sentences a patient may need in the chair, in Dutch; the app shows them in the patient's language too. */
const PHRASES: { group: string; items: string[] }[] = [
  { group: 'Pijn', items: ['Het doet pijn.', 'Ik voel het nog. Kunt u meer verdoven?', 'Deze tand doet pijn bij koud.', 'Mijn kaak doet pijn van het openhouden.'] },
  { group: 'Even stoppen', items: ['Ik wil even pauze.', 'Ik moet slikken.', 'Ik kan niet goed ademen door mijn neus.', 'Ik voel me niet goed.'] },
  { group: 'Gezondheid', items: ['Ik ben allergisch voor penicilline.', 'Ik ben allergisch voor latex.', 'Ik gebruik bloedverdunners.', 'Ik ben zwanger.', 'Ik heb diabetes.'] },
  { group: 'Vragen', items: ['Wat gaat u nu doen?', 'Hoe lang duurt het nog?', 'Wanneer mag ik weer eten?', 'Kunt u het voor mij opschrijven?'] },
  { group: 'Gevoel', items: ['Ik ben bang.', 'Ik heb het koud.', 'Het licht is te fel.', 'Dank u wel, het ging goed.'] },
];

/**
 * In the chair: a pause button the dentist sees at once on the panel (the room lights up), and an interpreter of
 * ready sentences in the patient's language with the Dutch beside it, turned around for the dentist to read.
 */
export default function Stoel() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { bridge, saved, update } = useApp();
  const [tab, setTab] = useState<'pauze' | 'tolk'>(params.tab === 'tolk' ? 'tolk' : 'pauze');
  const [lang, setLang] = useState<Locale>(getLocale() === 'nl' ? 'ar' : getLocale());
  const [shown, setShown] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState(0);
  const doc = doctorById('omar');
  const room = roomById(doc.room);
  const seen = eventsOf(bridge, 'pause-ok').filter((e) => e.at > pausedAt).pop();

  const pause = () => {
    tap('warning');
    setPausedAt(Date.now());
    emit({ kind: 'pause', who: saved.member, room: room.id, doctor: doc.id });
  };
  const show = (nl: string) => {
    tap('select');
    setShown(nl);
    emit({ kind: 'phrase', who: saved.member, room: room.id, nl, text: trIn(nl, lang) });
  };

  return (
    <Screen back title="In de stoel" kicker={`${room.name} · ${doc.name}`} serif="Jij houdt de regie, ook met je mond open.">
      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { id: 'pauze', label: 'Pauzeknop', icon: 'hand' },
          { id: 'tolk', label: 'Tolk', icon: 'language' },
        ]}
      />

      {tab === 'pauze' ? (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Press
              onPress={pause}
              scaleTo={0.92}
              accessibilityLabel={tr('Pauze vragen')}
              fxNames={pausedAt && !seen ? 'pulse-red' : ''}
              style={{ width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: pausedAt && seen ? C.ok : C.alert, borderWidth: 10, borderColor: 'rgba(226,67,75,0.15)' }}
            >
              <Icon name={pausedAt && seen ? 'check' : 'hand'} size={64} color="#FFFFFF" stroke={2} />
              <Txt v="title" color="#FFFFFF" style={{ marginTop: 6 }}>
                {pausedAt && seen ? 'Gezien' : pausedAt ? 'Gevraagd' : 'Pauze'}
              </Txt>
            </Press>
          </View>
          {pausedAt ? (
            <PopIn>
              <Card tone={seen ? 'pearl' : 'paper'}>
                <Row gap={12}>
                  <Avatar id={doc.id} size={44} />
                  <View style={{ flex: 1 }}>
                    <Txt v="h3">{seen ? `${doc.name} heeft je pauze gezien` : `${doc.name} krijgt je vraag op het scherm in ${room.name}`}</Txt>
                    <Txt v="small" color={C.muted}>
                      {seen ? 'Adem rustig. Jij zegt wanneer het weer gaat.' : 'Even geduld, het team stopt zo veilig mogelijk.'}
                    </Txt>
                  </View>
                </Row>
                <Button title="Het gaat weer" size="sm" kind="line" style={{ marginTop: 12 }} onPress={() => setPausedAt(0)} />
              </Card>
            </PopIn>
          ) : null}
          <Card tone="flat">
            <Bracket>Afgesproken stopteken</Bracket>
            <Row gap={8} style={{ marginTop: 10 }} wrap>
              <Chip label="Linkerhand omhoog" icon="hand" on={saved.signal === 'hand'} onPress={() => update({ signal: 'hand' })} small />
              <Chip label="Deze knop" icon="stop" on={saved.signal === 'app'} onPress={() => update({ signal: 'app' })} small />
            </Row>
            <Txt v="small" color={C.muted} style={{ marginTop: 10 }}>
              Je tandarts weet welk teken je gebruikt. Een hand opsteken werkt altijd, ook zonder telefoon.
            </Txt>
          </Card>
        </>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Bracket>Jouw taal</Bracket>
            <Row gap={8} wrap>
              {LOCALES.filter((l) => l !== 'nl').map((l) => (
                <Chip key={l} label={LOCALE_NAMES[l]} on={lang === l} onPress={() => setLang(l)} small />
              ))}
            </Row>
          </View>
          {PHRASES.map((g) => (
            <View key={g.group} style={{ gap: 8 }}>
              <Txt v="label" color={C.muted}>
                {g.group}
              </Txt>
              {g.items.map((p) => (
                <Card key={p} pad={14} onPress={() => show(p)} label={trIn(p, lang)}>
                  <Txt v="h3" raw style={{ writingDirection: lang === 'ar' && trIn(p, lang) !== p ? 'rtl' : 'ltr' }}>
                    {trIn(p, lang)}
                  </Txt>
                  <Txt v="small" color={C.muted} raw>
                    {p}
                  </Txt>
                </Card>
              ))}
            </View>
          ))}
        </>
      )}

      <Modal visible={!!shown} transparent animationType="fade" onRequestClose={() => setShown(null)}>
        <Pressable onPress={() => setShown(null)} style={{ flex: 1, backgroundColor: '#0B1A3A', padding: 28, justifyContent: 'space-between' }} accessibilityLabel={tr('Sluiten')}>
          {/* The Dutch faces the dentist, who sits across: upside down for the patient. */}
          <View style={{ transform: [{ rotate: '180deg' }], gap: 8 }}>
            <Txt v="label" color="#7FC9F2">
              Voor de tandarts
            </Txt>
            <Txt v="hero" color="#FFFFFF" raw>
              {shown ?? ''}
            </Txt>
          </View>
          <View {...fx('dye-blue')} style={{ height: 2, borderRadius: 1, opacity: 0.6 }} />
          <View style={{ gap: 8 }}>
            <Txt v="label" color="#7FC9F2">
              {LOCALE_NAMES[lang]}
            </Txt>
            <Txt v="hero" color="#FFFFFF" raw style={{ writingDirection: lang === 'ar' ? 'rtl' : 'ltr', textAlign: lang === 'ar' || rtl() ? 'right' : 'left' }}>
              {trIn(shown ?? '', lang)}
            </Txt>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
