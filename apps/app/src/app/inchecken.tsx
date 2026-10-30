import { doctorById, emit, eventsOf, LOCATIONS, memberById, roomById, STAFF, STEPS as TREATMENT_STEPS, treatmentById } from '@smile/shared';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Slide } from '../components/Slide';
import { Avatar, Bracket, Button, Card, IconTile, LiveDot, PopIn, Row, Txt } from '../components/ui';
import { nextAppointments, startOf } from '../lib/story';
import { useApp, useTick } from '../state/app';
import { C, fx } from '../theme';

/** What happens in a stitches check, step by step: the family in the waiting room follows it. */
const STITCHES = ['Wond bekijken', 'Hechtingen verwijderen', 'Spoelen en controleren', 'Uitleg voor thuis'];

/** Seconds per phase in the demo visit (a real one takes minutes). */
const CALLED_AFTER = 14;
const CHAIR_AFTER = 24;
const STEP_SECONDS = 11;

/**
 * Checking in at the door: slide the handle (Son Daven's "Drag to slide"), the front desk and the panel see you have
 * arrived, and the app shows your room, who comes to fetch you and, once you are in the chair, which step the dentist is
 * at, so whoever waits for you can follow along. The demo plays a visit in about a minute.
 */
export default function Inchecken() {
  const { today, now, bookings, saved, update, bridge } = useApp();
  // Redraw every second while the demo visit plays.
  useTick(1000);
  const coming = nextAppointments(today, bookings).filter((a) => startOf(a).getTime() > now.getTime() - 3600000);
  // The person you are looking after now (Ik → Gezin) checks in first.
  const next = coming.find((a) => a.who === saved.member) ?? coming[0];
  const STEPS = next?.ref === 'up-hechting' || !next ? STITCHES : TREATMENT_STEPS[treatmentById(next.treatment).care];
  const doc = doctorById(next?.doctor ?? 'omar');
  const room = roomById(doc.room);
  const ref = next?.ref ?? 'up-hechting';
  const key = `checkin-${ref}`;
  const at = saved.checks[key] ?? 0;
  // Elapsed real time: the stamp is Date.now(), so compare with Date.now() (the wall clock may be in another zone).
  const secs = at ? (Date.now() - at) / 1000 : 0;
  const panelStep = eventsOf(bridge, 'step').filter((e) => e.ref === ref).pop();
  const step = panelStep ? panelStep.step : Math.min(STEPS.length - 1, Math.max(0, Math.floor((secs - CHAIR_AFTER) / STEP_SECONDS)));
  const done = at && (eventsOf(bridge, 'done').some((e) => e.ref === ref) || secs > CHAIR_AFTER + STEP_SECONDS * STEPS.length);
  const phase = !at ? 'buiten' : done ? 'klaar' : secs < CALLED_AFTER && !panelStep ? 'wachtkamer' : secs < CHAIR_AFTER && !panelStep ? 'geroepen' : 'stoel';
  const emitted = useRef(new Set<string>());

  // Tell the panel what the demo visit does, once per phase.
  useEffect(() => {
    if (!at) return;
    const once = (id: string, fn: () => void) => {
      if (emitted.current.has(id)) return;
      emitted.current.add(id);
      fn();
    };
    if (phase === 'geroepen') once('called', () => emit({ kind: 'called', ref, room: room.id }));
    if (phase === 'stoel' && !panelStep) once(`step-${step}`, () => emit({ kind: 'step', ref, step, of: STEPS.length, label: STEPS[step] }));
    if (phase === 'klaar') once('done', () => emit({ kind: 'done', ref }));
  }, [at, phase, step, ref, room.id, panelStep]);

  const checkIn = () => {
    update((s) => ({ checks: { ...s.checks, [key]: Date.now() } }));
    emit({ kind: 'checkin', who: next?.who ?? 'layla', ref, room: room.id, doctor: doc.id });
  };
  const nadia = STAFF.find((s) => s.id === 'nadia')!;

  return (
    <Screen back title="Inchecken" kicker={LOCATIONS[next?.location ?? 'eindhoven'].short} serif={next ? `${memberById(next.who).first} · ${next.title}` : undefined}>
      {phase === 'buiten' ? (
        <>
          <Card tone="pearl" style={{ alignItems: 'center', paddingVertical: 28, gap: 14 }}>
            <View {...fx('pulse-blue')} style={{ width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>
              <Icon name="door" size={42} color={C.blue} />
            </View>
            <Txt v="title" align="center">
              Ben je bij de deur?
            </Txt>
            <Txt v="small" color={C.soft} align="center" style={{ maxWidth: 280 }}>
              Schuif om in te checken. De balie en je tandarts zien dat je er bent; jij ziet je kamer.
            </Txt>
          </Card>
          <Slide label="Schuif om in te checken" done="Ingecheckt" onDone={checkIn} />
        </>
      ) : null}

      {phase === 'wachtkamer' ? (
        <PopIn>
          <Card tone="navy" style={{ gap: 14 }}>
            <Row gap={8}>
              <LiveDot tone="ok" />
              <Bracket color="#7FC9F2">Ingecheckt</Bracket>
            </Row>
            <Txt v="display" color="#FFFFFF">
              Neem gerust plaats
            </Txt>
            <Txt v="body" color="#B6C2DF">
              {`${nadia.name} van de balie weet dat je er bent. ${doc.name} rondt de vorige afspraak af.`}
            </Txt>
            <Row gap={12}>
              <Txt v="stat" color="#FFFFFF">
                {`±${Math.max(1, Math.ceil((CALLED_AFTER - secs) / 2))} min`}
              </Txt>
              <Txt v="small" color="#7FC9F2">
                wachttijd
              </Txt>
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {phase === 'geroepen' ? (
        <PopIn>
          <Card tone="pearl" style={{ alignItems: 'center', gap: 12, paddingVertical: 26 }}>
            <View {...fx('pulse-blue')} style={{ borderRadius: 50 }}>
              <Avatar id={doc.id} size={96} ring="#2DB4E8" />
            </View>
            <Txt v="title" align="center">{`${doc.name} komt je halen`}</Txt>
            <Row gap={8}>
              <Icon name="door" size={18} color={C.blue} />
              <Txt v="h2" color={C.blue}>
                {room.name}
              </Txt>
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {phase === 'stoel' ? (
        <PopIn>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Bracket color={C.blue}>{`${room.name} · ${doc.name}`}</Bracket>
              <LiveDot tone="blue" />
            </Row>
            <View style={{ marginTop: 14 }}>
              {STEPS.map((s, i) => (
                <Row key={s} gap={14} align="flex-start">
                  <View style={{ alignItems: 'center', width: 20 }}>
                    <View
                      {...fx(i === step ? 'pulse-blue' : '')}
                      style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < step ? C.ok : i === step ? C.sky : C.paper, borderWidth: 2, borderColor: i > step ? C.line2 : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {i < step ? <Icon name="check" size={11} color="#FFFFFF" stroke={3} /> : null}
                    </View>
                    {i < STEPS.length - 1 ? <View style={{ width: 2, height: 28, backgroundColor: i < step ? C.ok : C.line2 }} /> : null}
                  </View>
                  <Txt v="h3" color={i > step ? C.muted : C.ink} style={{ paddingTop: 1 }}>
                    {s}
                  </Txt>
                </Row>
              ))}
            </View>
            <Txt v="small" color={C.muted} style={{ marginTop: 10 }}>
              Wie op je wacht, ziet deze stappen ook.
            </Txt>
          </Card>
          <Row gap={10} style={{ marginTop: 12 }}>
            <Button title="Pauze" icon="hand" kind="alert" style={{ flex: 1 }} onPress={() => router.push('/stoel')} />
            <Button title="Tolk" icon="language" kind="line" style={{ flex: 1 }} onPress={() => router.push('/stoel?tab=tolk')} />
          </Row>
        </PopIn>
      ) : null}

      {phase === 'klaar' ? (
        <PopIn>
          <Card tone="navy" style={{ gap: 12 }}>
            <IconTile name="checkCircle" color="#2DB4E8" size={48} />
            <Txt v="display" color="#FFFFFF">
              Klaar, goed gedaan
            </Txt>
            <Txt v="body" color="#B6C2DF">
              De hechtingen zijn eruit. Je nazorg staat klaar in de app.
            </Txt>
            <Row gap={8} wrap>
              <Button title="Nazorg" icon="clock" size="sm" kind="white" onPress={() => router.push('/nazorg')} />
              <Button title="Opnieuw (demo)" icon="rotate" size="sm" kind="onDark" onPress={() => update((s) => ({ checks: { ...s.checks, [key]: 0 } }))} />
            </Row>
          </Card>
        </PopIn>
      ) : null}

      {phase !== 'buiten' && phase !== 'klaar' ? (
        <Card tone="flat" onPress={() => router.push('/rustig')} label="Rustig-modus">
          <Row gap={12}>
            <IconTile name="wind" color="#7D6BF0" size={38} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">Spannend? Adem even mee</Txt>
              <Txt v="small" color={C.muted}>
                Vier tellen in, zes tellen uit
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}
      <Txt v="small" color={C.muted}>
        Demo: het bezoek speelt zich in ongeveer een minuut af en verschijnt ook op het praktijkscherm.
      </Txt>
    </Screen>
  );
}
