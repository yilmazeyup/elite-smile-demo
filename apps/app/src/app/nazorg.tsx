import { clock, dayShort, getLocale, relativeDay, type CareKind } from '@smile/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Avatar, Bracket, Button, Card, IconTile, PopIn, Press, Row, SectionHead, Tag, Txt } from '../components/ui';
import { tr } from '../i18n';
import { callClinic } from '../lib/ics';
import { dueSteps, implantCare, surgeryEnd } from '../lib/story';
import { useApp, useTick } from '../state/app';
import { C, fx, isWeb } from '../theme';

const KIND: Record<CareKind, { icon: IconName; color: string }> = {
  do: { icon: 'check', color: '#12A27A' },
  dont: { icon: 'noFood', color: '#E2434B' },
  eat: { icon: 'bowl', color: '#E0901A' },
  med: { icon: 'pill', color: '#7D6BF0' },
  check: { icon: 'eye', color: '#0A63B5' },
  rest: { icon: 'moon', color: '#234282' },
};

type Line = { who: 'omar' | 'sara'; text: string };

/** The aftercare as a talk between Dr. Omar and his assistant (the speakers are part of the demo). */
function dialogue(): Line[] {
  const care = implantCare();
  const lines: Line[] = [{ who: 'omar', text: 'Je implantaat zit goed. Sara loopt met je door wat je de komende dagen doet.' }];
  care.after.forEach((s, i) => lines.push({ who: i % 2 ? 'omar' : 'sara', text: `${s.title}. ${s.text}` }));
  lines.push({ who: 'omar', text: 'Twijfel je, bel ons gerust. Liever een keer te vaak dan te laat.' });
  return lines;
}

/**
 * Listening instead of reading, after GQ & AP's Extraordinary Lab (Awwwards Site of the Month March 2026), told as a
 * conversation: captions follow the voice, and moving through the talk pauses the sound instead of speeding it up; it
 * starts again at normal speed where you let go. Uses the phone's own voices (Web Speech).
 */
function Listen() {
  const lines = useRef(dialogue()).current;
  const [at, setAt] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const can = isWeb && typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = (i: number) => {
    if (!can) return;
    window.speechSynthesis.cancel();
    if (i >= lines.length) {
      setPlaying(false);
      setAt(-1);
      return;
    }
    setAt(i);
    const lang = getLocale();
    const u = new SpeechSynthesisUtterance(tr(lines[i].text));
    const tag = lang === 'nl' ? 'nl-NL' : lang === 'ar' ? 'ar-SA' : lang === 'tr' ? 'tr-TR' : lang;
    u.lang = tag;
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
    u.voice = voices[lines[i].who === 'omar' ? 0 : Math.min(1, voices.length - 1)] ?? null;
    u.pitch = lines[i].who === 'omar' ? 0.92 : 1.12;
    u.rate = 1;
    u.onend = () => speak(i + 1);
    window.speechSynthesis.speak(u);
  };
  useEffect(() => () => (can ? window.speechSynthesis.cancel() : undefined), [can]);

  const toggle = () => {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speak(at < 0 ? 0 : at);
  };
  const jump = (i: number) => {
    // Scrubbing stops the voice; it resumes at the chosen line at normal speed.
    if (can) window.speechSynthesis.cancel();
    setAt(i);
    if (playing) setTimeout(() => speak(i), 250);
  };

  const line = at >= 0 ? lines[at] : null;
  return (
    <Card tone="navy" pad={0}>
      <View style={{ padding: 18, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Bracket color="#7FC9F2">Luister je nazorg</Bracket>
          <Tag label={`${lines.length} ${tr('fragmenten')}`} color="#B6C2DF" bg="rgba(255,255,255,0.08)" />
        </Row>
        <Row gap={12} align="flex-start" style={{ minHeight: 84 }}>
          {line && line.who === 'omar' ? <Avatar id="omar" size={40} /> : null}
          {line && line.who === 'sara' ? (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7FC3E8', alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="h3" color="#0B1A3A">
                S
              </Txt>
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="label" color="#7FC9F2" size={9.5}>
              {line ? (line.who === 'omar' ? 'Dr. Omar' : tr('Sara, assistent')) : tr('Dr. Omar en Sara')}
            </Txt>
            <Txt v="title" color="#FFFFFF" size={18}>
              {line ? line.text : 'Vijf minuten luisteren in plaats van lezen. Tik op play.'}
            </Txt>
          </View>
        </Row>
        <Row gap={12}>
          <Press onPress={toggle} accessibilityLabel={tr(playing ? 'Pauze' : 'Afspelen')} fxNames="dye-blue" style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A63B5' }}>
            <Icon name={playing ? 'pause' : 'play'} size={22} color="#FFFFFF" stroke={2.2} />
          </Press>
          <View style={{ flex: 1, flexDirection: 'row', gap: 3, height: 28, alignItems: 'center' }}>
            {lines.map((l, i) => (
              <Press key={i} onPress={() => jump(i)} accessibilityLabel={`${i + 1}`} haptic={false} style={{ flex: 1, height: 28, justifyContent: 'center' }}>
                <View style={{ height: i === at ? 18 : 8 + ((i * 7) % 9), borderRadius: 2, backgroundColor: i < at ? '#2DB4E8' : i === at ? '#FFFFFF' : 'rgba(255,255,255,0.22)' }} />
              </Press>
            ))}
          </View>
        </Row>
        {!can ? (
          <Txt v="small" color="#B6C2DF">
            Deze telefoon heeft geen voorleesstem; de tekst staat hieronder.
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}

/** Hour by hour after the implant: what is done, what is now, what comes; then what is normal and when to call. */
export default function Nazorg() {
  const { implantDay, careDay } = useApp();
  const now = useTick(30000);
  const care = implantCare();
  const end = surgeryEnd(implantDay);
  const steps = dueSteps(care.after, end, now);
  const nextIndex = steps.findIndex((s) => !s.due);

  return (
    <Screen back title="Nazorg" kicker={`Implantaat 36 · dag ${careDay}`} serif="Wat je wanneer doet, en wat normaal is.">
      <PopIn>
        <Listen />
      </PopIn>

      <View>
        <SectionHead kicker="Tijdlijn" title="Uur voor uur" serif={`Sinds ${dayShort(implantDay)} ${clock(end)}`} />
        <Card>
          {steps.map(({ step, at, due }, i) => {
            const k = KIND[step.kind];
            const isNow = i === nextIndex || (nextIndex === -1 && i === steps.length - 1);
            return (
              <Row key={`${step.at}-${step.title}`} gap={12} align="flex-start">
                <View style={{ alignItems: 'center', width: 34 }}>
                  <View {...fx(isNow ? 'pulse-blue' : '')} style={{ borderRadius: 12, opacity: due || isNow ? 1 : 0.55 }}>
                    <IconTile name={k.icon} color={k.color} size={34} />
                  </View>
                  {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: due ? C.ok : C.line2, marginVertical: 4 }} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 16, gap: 3, opacity: due || isNow ? 1 : 0.62 }}>
                  <Row gap={8} wrap>
                    <Txt v="label" size={9.5} color={isNow ? C.blue : C.muted}>
                      {`${relativeDay(at, now)} ${clock(at)}`}
                    </Txt>
                    {due ? <Tag label="Gedaan" color={C.ok} bg={C.bg2} /> : isNow ? <Tag label="Hierna" color="#FFFFFF" bg="#0A63B5" /> : null}
                  </Row>
                  <Txt v="h3">{step.title}</Txt>
                  <Txt v="small" color={C.soft}>
                    {step.text}
                  </Txt>
                </View>
              </Row>
            );
          })}
        </Card>
      </View>

      <View>
        <SectionHead kicker="Gerust" title="Dit is normaal" />
        <Card tone="pearl">
          {care.normal.map((n) => (
            <Row key={n} gap={10} align="flex-start" style={{ paddingVertical: 5 }}>
              <Icon name="checkCircle" size={16} color={C.ok} />
              <Txt v="body" style={{ flex: 1 }}>
                {n}
              </Txt>
            </Row>
          ))}
        </Card>
      </View>

      <View>
        <SectionHead kicker="Bel de kliniek" title="Als je dit merkt" />
        <Card style={{ borderColor: C.warn, borderWidth: 1.2 }}>
          {care.call.map((n) => (
            <Row key={n} gap={10} align="flex-start" style={{ paddingVertical: 5 }}>
              <Icon name="phone" size={15} color={C.warn} />
              <Txt v="body" style={{ flex: 1 }}>
                {n}
              </Txt>
            </Row>
          ))}
          <Button title="Bel Elite Smile" icon="phone" size="sm" kind="brand" style={{ marginTop: 12 }} onPress={callClinic} />
        </Card>
      </View>

      <Card style={{ borderColor: C.alert, borderWidth: 1.5 }}>
        <Bracket color={C.alert}>Bel direct 112</Bracket>
        {care.urgent.map((n) => (
          <Row key={n} gap={10} align="flex-start" style={{ paddingVertical: 5 }}>
            <Icon name="siren" size={15} color={C.alert} />
            <Txt v="body" style={{ flex: 1 }}>
              {n}
            </Txt>
          </Row>
        ))}
        <Button title="112" icon="phone" size="sm" kind="alert" style={{ marginTop: 12 }} onPress={() => Linking.openURL('tel:112')} />
      </Card>

      <Row gap={10} wrap>
        <Button title="Wat mag ik eten?" icon="bowl" kind="line" size="sm" onPress={() => router.push('/eten')} />
        <Button title="Medicijnen" icon="pill" kind="line" size="sm" onPress={() => router.push('/medicijnen')} />
        <Button title="Dagboek" icon="pulse" kind="line" size="sm" onPress={() => router.push('/dagboek')} />
      </Row>
    </Screen>
  );
}
