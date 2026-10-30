import { CLINIC, clock, emit, isOpenAt, LOCATIONS, nextOpening, relativeDay } from '@smile/shared';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Bracket, Button, Card, IconTile, PopIn, Press, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { callClinic, whatsappClinic } from '../lib/ics';
import { useApp } from '../state/app';
import { C } from '../theme';

type Level = '112' | 'bel' | 'kantoor' | 'thuis';
type Result = { level: Level; title: string; steps: string[] };

type Topic = { id: string; icon: IconName; title: string; follow?: { q: string; yes: Result; no: Result } ; result?: Result };

const TOPICS: Topic[] = [
  {
    id: 'trauma',
    icon: 'tooth',
    title: 'Tand eruit gevallen of geslagen',
    follow: {
      q: 'Is het een blijvende tand (geen melktand)?',
      yes: {
        level: 'bel',
        title: 'Snel handelen: binnen een uur bij de tandarts',
        steps: [
          'Pak de tand bij de kroon, niet bij de wortel.',
          'Vies? Spoel hem kort af met melk of water. Niet schrobben.',
          'Zet hem terug in het gat als dat lukt en bijt zacht op een schone zakdoek.',
          'Lukt dat niet: bewaar hem in een bakje melk. Niet in water, niet droog.',
          'Bel nu. Hoe sneller, hoe groter de kans dat de tand blijft.',
        ],
      },
      no: {
        level: 'kantoor',
        title: 'Een melktand: niet terugzetten',
        steps: ['Zet een melktand niet terug; dat kan de blijvende tand eronder beschadigen.', 'Druk een schoon gaasje op de plek tegen bloeden.', 'Bel de kliniek om je kind te laten nakijken.'],
      },
    },
  },
  {
    id: 'breuk',
    icon: 'alert',
    title: 'Tand afgebroken of vulling eruit',
    follow: {
      q: 'Heb je veel pijn of ligt de zenuw bloot (een rood puntje)?',
      yes: { level: 'bel', title: 'Bel vandaag', steps: ['Bewaar het stukje tand in melk.', 'Spoel voorzichtig met lauw water.', 'Neem zo nodig een pijnstiller volgens de bijsluiter.', 'Bel de kliniek; meestal kun je dezelfde dag terecht.'] },
      no: { level: 'kantoor', title: 'Geen spoed: bel tijdens openingstijden', steps: ['Bewaar het stukje als je het hebt.', 'Een scherp randje? Plak er suikervrije kauwgom of tandartswax op.', 'Kauw aan de andere kant tot je afspraak.'] },
    },
  },
  {
    id: 'pijn',
    icon: 'pulse',
    title: 'Hevige kiespijn',
    follow: {
      q: 'Heb je ook koorts of een dikke wang?',
      yes: { level: 'bel', title: 'Bel nu: dit kan een ontsteking zijn', steps: ['Neem een pijnstiller volgens de bijsluiter.', 'Koel je wang van buiten, niet met warmte.', 'Bel de kliniek; wordt het snel erger, bel buiten openingstijden de tandartsenspoeddienst.'] },
      no: { level: 'kantoor', title: 'Plan snel een afspraak', steps: ['Een pijnstiller volgens de bijsluiter helpt meestal.', 'Vermijd heel koud, heet en zoet.', 'Bel tijdens openingstijden en zeg dat het om pijn gaat.'] },
    },
  },
  {
    id: 'zwelling',
    icon: 'thermo',
    title: 'Zwelling in gezicht of tandvlees',
    follow: {
      q: 'Wordt de zwelling snel groter, of heb je koorts?',
      yes: { level: 'bel', title: 'Bel nu', steps: ['Ga rechtop zitten en koel van buiten.', 'Bel de kliniek, buiten openingstijden de tandartsenspoeddienst.', 'Krijg je moeite met slikken of ademen: bel 112.'] },
      no: { level: 'kantoor', title: 'Laat het vandaag of morgen nakijken', steps: ['Koel van buiten, 10 minuten op en 10 minuten af.', 'Bel tijdens openingstijden.'] },
    },
  },
  {
    id: 'bloeding',
    icon: 'drop',
    title: 'Bloeding na een behandeling',
    follow: {
      q: 'Bloedt het nog na twee keer 30 minuten stevig bijten op een gaasje?',
      yes: { level: 'bel', title: 'Bel nu', steps: ['Blijf rechtop zitten.', 'Bijt opnieuw stevig op een opgerold gaasje of een schone zakdoek.', 'Bel de kliniek. Gutst het bloed of word je duizelig: bel 112.'] },
      no: { level: 'thuis', title: 'Dat lukt thuis', steps: ['Bijt 30 minuten stevig op een opgerold gaasje.', 'Niet spoelen, niet spugen, niet door een rietje.', 'Een beetje bloed in je speeksel de eerste dag is normaal.'] },
    },
  },
  {
    id: 'beugel',
    icon: 'braces',
    title: 'Beugel: slotje los of draad prikt',
    result: { level: 'kantoor', title: 'Geen spoed', steps: ['Druk tandartswax op een prikkend draadje of los slotje.', 'Knip niet zelf aan de draad.', 'Bel tijdens openingstijden voor een afspraak bij Dr. Ayman.'] },
  },
  {
    id: 'implantaat',
    icon: 'implant',
    title: 'Na mijn implantaat of trekken',
    follow: {
      q: 'Wordt de pijn na dag 3 weer erger, of heb je koorts?',
      yes: { level: 'bel', title: 'Bel de kliniek', steps: ['Dit kan een ontsteking of een droge kom zijn; dat is goed te behandelen.', 'Spoel voorzichtig met lauw zout water.', 'Bel vandaag nog.'] },
      no: { level: 'thuis', title: 'Waarschijnlijk normaal herstel', steps: ['Pijn en zwelling zijn op dag 2 en 3 het grootst en nemen daarna af.', 'Volg je nazorg in de app.', 'Twijfel je, stuur een foto van de wond.'] },
    },
  },
];

const LEVELS: Record<Level, { color: string; label: string; icon: IconName }> = {
  '112': { color: '#E2434B', label: 'Bel 112', icon: 'siren' },
  bel: { color: '#E0901A', label: 'Bel nu', icon: 'phone' },
  kantoor: { color: '#0A63B5', label: 'Bel tijdens openingstijden', icon: 'calendar' },
  thuis: { color: '#12A27A', label: 'Thuis op te vangen', icon: 'checkCircle' },
};

/**
 * Pain or an accident: first the questions that can't wait (breathing, swallowing, heavy bleeding → 112), then what
 * happened, one follow-up question, and a clear answer with first aid. General guidance, never a diagnosis.
 */
export default function Spoed() {
  const { now, saved } = useApp();
  const [danger, setDanger] = useState<boolean | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const eindhoven = LOCATIONS.eindhoven;
  const open = isOpenAt(eindhoven, now);
  const opens = nextOpening(eindhoven, now);

  const finish = (r: Result, t: Topic | null) => {
    tap(r.level === '112' || r.level === 'bel' ? 'warning' : 'success');
    setResult(r);
    emit({ kind: 'sos', who: saved.member, level: r.level === 'kantoor' ? 'bel' : r.level, topic: t?.title ?? 'Levensgevaar' });
  };
  const reset = () => {
    setDanger(null);
    setTopic(null);
    setResult(null);
  };

  return (
    <Screen back title="Pijn of spoed" kicker="Wat nu?" serif="Een paar vragen, dan weet je wat je doet.">
      {result ? (
        <PopIn>
          <Card style={{ borderColor: LEVELS[result.level].color, borderWidth: 2 }}>
            <Row gap={12}>
              <IconTile name={LEVELS[result.level].icon} color={LEVELS[result.level].color} size={48} solid />
              <View style={{ flex: 1 }}>
                <Bracket color={LEVELS[result.level].color}>{LEVELS[result.level].label}</Bracket>
                <Txt v="title">{result.title}</Txt>
              </View>
            </Row>
            <View style={{ marginTop: 14, gap: 10 }}>
              {result.steps.map((s, i) => (
                <Row key={s} gap={12} align="flex-start">
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.bg2, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt v="num" size={12} weight="700">
                      {String(i + 1)}
                    </Txt>
                  </View>
                  <Txt v="body" style={{ flex: 1 }}>
                    {s}
                  </Txt>
                </Row>
              ))}
            </View>
          </Card>
        </PopIn>
      ) : danger === null ? (
        <PopIn>
          <Card style={{ borderColor: C.alert, borderWidth: 1.5 }}>
            <Bracket color={C.alert}>Eerst dit</Bracket>
            <Txt v="title" style={{ marginTop: 6 }}>
              Heb je moeite met ademen of slikken, een zwelling die snel groter wordt, of bloed je hevig?
            </Txt>
            <Row gap={10} style={{ marginTop: 16 }}>
              <Button title="Ja" kind="alert" style={{ flex: 1 }} onPress={() => (setDanger(true), finish({ level: '112', title: 'Bel direct 112', steps: ['Bel 112 en zeg dat het om je mond of keel gaat.', 'Blijf rechtop zitten en probeer rustig te ademen.', 'Laat iemand bij je blijven.'] }, null))} />
              <Button title="Nee" kind="line" style={{ flex: 1 }} onPress={() => setDanger(false)} />
            </Row>
          </Card>
        </PopIn>
      ) : !topic ? (
        <View style={{ gap: 10 }}>
          <Bracket>Wat is er aan de hand?</Bracket>
          {TOPICS.map((t, i) => (
            <PopIn key={t.id} delay={i * 40}>
              <Card pad={14} onPress={() => (t.result ? (setTopic(t), finish(t.result, t)) : setTopic(t))} label={tr(t.title)}>
                <Row gap={12}>
                  <IconTile name={t.icon} color="#E2434B" size={40} />
                  <Txt v="h3" style={{ flex: 1 }}>
                    {t.title}
                  </Txt>
                  <Icon name="chevron" size={17} color={C.muted} />
                </Row>
              </Card>
            </PopIn>
          ))}
        </View>
      ) : topic.follow ? (
        <PopIn>
          <Card>
            <Bracket>{topic.title}</Bracket>
            <Txt v="title" style={{ marginTop: 6 }}>
              {topic.follow.q}
            </Txt>
            <Row gap={10} style={{ marginTop: 16 }}>
              <Button title="Ja" kind="brand" style={{ flex: 1 }} onPress={() => finish(topic.follow!.yes, topic)} />
              <Button title="Nee" kind="line" style={{ flex: 1 }} onPress={() => finish(topic.follow!.no, topic)} />
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {/* Who to call, now: the clinic while it is open, otherwise the regional emergency dentist; 112 when life is at risk. */}
      <Card tone="navy">
        <Bracket color="#7FC9F2">{open ? 'Elite Smile is nu open' : `Elite Smile is weer open ${relativeDay(opens, now)} ${clock(opens)}`}</Bracket>
        <Row gap={8} style={{ marginTop: 12 }} wrap>
          <Button title={`Bel ${CLINIC.phone}`} icon="phone" size="sm" kind="white" onPress={callClinic} />
          <Button title="WhatsApp" icon="whatsapp" size="sm" kind="onDark" onPress={() => whatsappClinic()} />
        </Row>
        {!open ? (
          <Txt v="small" color="#B6C2DF" style={{ marginTop: 12 }}>
            Buiten openingstijden: bel de tandartsenspoeddienst in je regio. Bij twijfel over je gezondheid: de huisartsenpost.
          </Txt>
        ) : null}
        <Press onPress={() => Linking.openURL('tel:112')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="siren" size={18} color="#FF6B70" />
          <Txt v="h3" color="#FFFFFF">
            Levensgevaar: bel 112
          </Txt>
        </Press>
      </Card>
      {result || topic ? <Button title="Opnieuw" kind="line" size="sm" icon="rotate" onPress={reset} /> : null}
      <Txt v="small" color={C.muted}>
        Algemene informatie, geen diagnose. Twijfel je, bel dan altijd.
      </Txt>
    </Screen>
  );
}
