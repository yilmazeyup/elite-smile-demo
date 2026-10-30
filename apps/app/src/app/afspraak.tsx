import {
  clock,
  dateKey,
  dayShort,
  doctorById,
  DOCTORS,
  emit,
  freeSlots,
  FAMILY,
  LOCATIONS,
  LOCATION_LIST,
  minuteOf,
  nearestLocation,
  openDays,
  postcodeGuess,
  roomById,
  sameDay,
  SPECIALTIES,
  SPECIALTY_COLORS,
  TREATMENTS,
  treatmentById,
  weekdayShort,
  atMinute,
  type DoctorId,
  type LocationId,
  type MemberId,
} from '@smile/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { Backdrop, goBack } from '../components/Screen';
import { Scramble } from '../components/Scramble';
import { Avatar, Bracket, Button, Card, Chip, Field, Flip, IconButton, IconTile, PopIn, Press, Row, Tag, tap, Toggle, Txt } from '../components/ui';
import { tr } from '../i18n';
import { addToCalendar } from '../lib/ics';
import { useApp } from '../state/app';
import { C, fx, MAX_WIDTH, PAD, R, shadow } from '../theme';

type Step = 'wie' | 'wat' | 'waar' | 'wie-arts' | 'wanneer' | 'check' | 'klaar';
const ORDER: Step[] = ['wie', 'wat', 'waar', 'wie-arts', 'wanneer', 'check'];

const QUESTION: Record<Step, { kicker: string; title: string }> = {
  wie: { kicker: 'Voor wie', title: 'Voor wie is de afspraak?' },
  wat: { kicker: 'Wat', title: 'Wat brengt je bij ons?' },
  waar: { kicker: 'Waar', title: 'In welke praktijk?' },
  'wie-arts': { kicker: 'Bij wie', title: 'Bij welke tandarts?' },
  wanneer: { kicker: 'Wanneer', title: 'Welk moment past?' },
  check: { kicker: 'Klopt dit', title: 'Even nalopen' },
  klaar: { kicker: 'Geboekt', title: 'Tot dan!' },
};

/** Hoogland is the hygiene practice: check-ups, cleaning, kids and whitening; the rest happens in Eindhoven. */
const HOOGLAND_OK = new Set(['controle', 'reiniging', 'polijsten', 'rontgen', 'kind-controle', 'fluoride', 'bleken']);
const HOOGLAND_DOCTORS: DoctorId[] = ['najla', 'ahmad'];

type Slot = { start: number; doctor: DoctorId };

/**
 * Booking, one question per screen (after Lama Lama's "Start a project" form): who, what, where, with whom, when, and a
 * last look. The free check-up comes first, as on Elite Smile's own site. When it is booked, the button's letters
 * scramble into the time and the room, and the clinic panel shows the new appointment at once.
 */
export default function Afspraak() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ behandeling?: string; tandarts?: string; locatie?: string; voor?: string }>();
  const { now, saved, bookings, update } = useApp();
  const preTreatment = params.behandeling && TREATMENTS.some((t) => t.id === params.behandeling) ? params.behandeling : '';
  const voor = params.voor === 'nieuw' || FAMILY.some((m) => m.id === params.voor) ? (params.voor as MemberId | 'nieuw') : null;
  const [step, setStep] = useState<Step>(voor ? (preTreatment ? 'waar' : 'wat') : 'wie');
  const [who, setWho] = useState<MemberId | 'nieuw'>(voor ?? saved.member);
  const [treatment, setTreatment] = useState(preTreatment || 'controle');
  const [openSpec, setOpenSpec] = useState<string | null>(preTreatment ? treatmentById(preTreatment).specialty : null);
  const near = useMemo(() => {
    const p = postcodeGuess(saved.postcode);
    return p ? nearestLocation(p.lat, p.lon) : null;
  }, [saved.postcode]);
  const [location, setLocation] = useState<LocationId>(params.locatie === 'hoogland' || params.locatie === 'eindhoven' ? params.locatie : near?.location.id || 'eindhoven');
  const [doctor, setDoctor] = useState<DoctorId | 'eerste'>(DOCTORS.some((d) => d.id === params.tandarts) ? (params.tandarts as DoctorId) : 'eerste');
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState('');
  const [newName, setNewName] = useState('');
  const [remind, setRemind] = useState(true);
  const [ref, setRef] = useState('');

  const t = treatmentById(treatment);
  const place = LOCATIONS[location];
  const eligible: DoctorId[] = location === 'hoogland' ? t.doctors.filter((d) => HOOGLAND_DOCTORS.includes(d)) : t.doctors;
  const hooglandOk = HOOGLAND_OK.has(treatment) && t.doctors.some((d) => HOOGLAND_DOCTORS.includes(d));

  const taken = bookings.map((b) => ({ start: b.start, minutes: b.minutes, doctor: b.doctor, day: b.day, location: b.location }));
  const slotsFor = (d: Date): Slot[] => {
    const docs = doctor === 'eerste' ? eligible : [doctor];
    const after = sameDay(d, now) ? minuteOf(now) + 45 : 0;
    const takenHere = taken.filter((b) => b.day === dateKey(d) && b.location === location);
    const byStart = new Map<number, DoctorId>();
    for (const doc of docs) for (const s of freeSlots(d, doc, t.minutes, takenHere, after, location)) if (!byStart.has(s)) byStart.set(s, doc);
    return [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([start, doc]) => ({ start, doctor: doc }));
  };
  const days = openDays(place, now, 10).map((d) => ({ d, slots: slotsFor(d) }));

  const index = ORDER.indexOf(step);
  const go = (next: Step) => {
    tap('select');
    setStep(next);
  };
  const back = () => {
    if (index <= 0 || step === 'klaar') return goBack();
    setStep(ORDER[index - 1]);
  };

  const book = () => {
    if (!slot || !day) return;
    const r = `app-${Date.now().toString(36)}`;
    emit({ kind: 'booking', who: who === 'nieuw' ? 'layla' : who, treatment, doctor: slot.doctor, location, day: dateKey(day), start: slot.start, minutes: t.minutes, ref: r });
    tap('success');
    setRef(r);
    setStep('klaar');
  };

  const whoName = who === 'nieuw' ? newName || tr('Nieuwe patiënt') : (FAMILY.find((m) => m.id === who) ?? FAMILY[0]).first;
  const q = QUESTION[step];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAD, paddingTop: insets.top + 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Flip>
              <IconButton name={index > 0 && step !== 'klaar' ? 'back' : 'close'} label={index > 0 ? 'Terug' : 'Sluiten'} onPress={back} />
            </Flip>
            {step !== 'klaar' ? (
              <Row gap={5}>
                {ORDER.map((s, i) => (
                  <View key={s} style={[{ height: 6, borderRadius: 3, width: i === index ? 22 : 6, backgroundColor: i <= index ? C.blue : C.line2 }, { transitionProperty: 'width, background-color', transitionDuration: '300ms' } as object]} />
                ))}
              </Row>
            ) : (
              <View />
            )}
            <Txt v="label" color={C.muted}>
              {step !== 'klaar' ? `[ ${index + 1} / ${ORDER.length} ]` : ''}
            </Txt>
          </Row>

          <PopIn key={step} style={{ marginTop: 26, gap: 8 }}>
            <Bracket color={C.blue}>{q.kicker}</Bracket>
            <Txt v="hero">{q.title}</Txt>
          </PopIn>

          <PopIn key={`${step}-body`} delay={80} style={{ marginTop: 24, gap: 12 }}>
            {/* ------------------------------------------------------------------------------------------ who */}
            {step === 'wie' ? (
              <>
                {FAMILY.map((m) => (
                  <Card key={m.id} pad={16} onPress={() => (setWho(m.id), go('wat'))} label={m.name} style={who === m.id ? { borderColor: C.blue, borderWidth: 1.5 } : null}>
                    <Row gap={14}>
                      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Txt v="title" color="#FFFFFF">
                          {m.first.slice(0, 1)}
                        </Txt>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt v="h2">{m.first}</Txt>
                        <Txt v="small" color={C.muted}>
                          {m.kid ? `${m.age} ${tr('jaar')} · ${tr('kind')}` : tr('Ik')}
                        </Txt>
                      </View>
                      <Flip>
                        <Icon name="chevron" size={18} color={C.muted} />
                      </Flip>
                    </Row>
                  </Card>
                ))}
                <Card pad={16} tone="flat" onPress={() => (setWho('nieuw'), setTreatment('controle'), go('wat'))} label={tr('Iemand anders')}>
                  <Row gap={14}>
                    <IconTile name="plus" size={46} />
                    <View style={{ flex: 1 }}>
                      <Txt v="h2">Iemand anders</Txt>
                      <Txt v="small" color={C.muted}>
                        Nieuwe patiënten beginnen met een gratis controle
                      </Txt>
                    </View>
                  </Row>
                </Card>
              </>
            ) : null}

            {/* ------------------------------------------------------------------------------------------ what */}
            {step === 'wat' ? (
              <>
                <Card tone="navy" onPress={() => (setTreatment('controle'), go('waar'))} label={tr('Gratis controle')}>
                  <Row gap={14}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Tag label="Gratis" color="#0B1A3A" bg="#2DB4E8" />
                      <Txt v="title" color="#FFFFFF">
                        Gratis controle
                      </Txt>
                      <Txt v="small" color="#B6C2DF">
                        Mondonderzoek en advies: het aanbod op elitesmile.nl
                      </Txt>
                    </View>
                    <Flip>
                      <Icon name="arrow" size={22} color="#FFFFFF" />
                    </Flip>
                  </Row>
                </Card>
                <Card pad={14} onPress={() => router.replace('/spoed')} label={tr('Pijn of spoed')}>
                  <Row gap={12}>
                    <IconTile name="sos" color="#E2434B" size={40} />
                    <View style={{ flex: 1 }}>
                      <Txt v="h3">Pijn of spoed?</Txt>
                      <Txt v="small" color={C.muted}>
                        Eerst vier vragen, dan weet je of je moet bellen
                      </Txt>
                    </View>
                  </Row>
                </Card>
                <Txt v="label" color={C.muted} style={{ marginTop: 10 }}>
                  Of kies een behandeling
                </Txt>
                {SPECIALTIES.map((s) => {
                  const open = openSpec === s.id;
                  const list = TREATMENTS.filter((x) => x.specialty === s.id);
                  return (
                    <Card key={s.id} pad={0}>
                      <Press onPress={() => setOpenSpec(open ? null : s.id)} accessibilityLabel={tr(s.name)} style={{ padding: 14 }}>
                        <Row gap={12}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SPECIALTY_COLORS[s.id] }} />
                          <View style={{ flex: 1 }}>
                            <Txt v="h3">{s.name}</Txt>
                            <Txt v="small" color={C.muted}>
                              {s.lead}
                            </Txt>
                          </View>
                          <View style={[{ transform: [{ rotate: open ? '180deg' : '0deg' }] }, { transitionProperty: 'transform', transitionDuration: '250ms' } as object]}>
                            <Icon name="down" size={18} color={C.muted} />
                          </View>
                        </Row>
                      </Press>
                      {open ? (
                        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                          {list.map((x) => (
                            <Press
                              key={x.id}
                              onPress={() => {
                                setTreatment(x.id);
                                if (location === 'hoogland' && !HOOGLAND_OK.has(x.id)) setLocation('eindhoven');
                                go('waar');
                              }}
                              style={{ padding: 12, borderRadius: R.md, backgroundColor: treatment === x.id ? C.ice : C.bg2, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            >
                              <View style={{ flex: 1 }}>
                                <Txt v="h3" size={14.5}>
                                  {x.name}
                                </Txt>
                                <Txt v="small" size={12} color={C.muted}>
                                  {`${x.short} · ±${x.minutes} min`}
                                </Txt>
                              </View>
                              {x.free ? <Tag label="Gratis" color={C.blue} bg={C.ice} /> : null}
                            </Press>
                          ))}
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </>
            ) : null}

            {/* ------------------------------------------------------------------------------------------ where */}
            {step === 'waar' ? (
              <>
                {LOCATION_LIST.map((loc) => {
                  const ok = loc.id === 'eindhoven' || hooglandOk;
                  const isNear = near?.location.id === loc.id;
                  const dist = near ? (isNear ? near.km : near.other.km) : null;
                  return (
                    <Card
                      key={loc.id}
                      pad={16}
                      onPress={ok ? () => (setLocation(loc.id), setDay(null), setSlot(null), go('wie-arts')) : undefined}
                      label={loc.name}
                      style={[location === loc.id ? { borderColor: C.blue, borderWidth: 1.5 } : null, !ok ? { opacity: 0.5 } : null]}
                    >
                      <Row gap={14} align="flex-start">
                        <IconTile name={loc.kind === 'kliniek' ? 'tooth' : 'sparkle'} color={loc.kind === 'kliniek' ? '#0A63B5' : '#17BFA3'} size={44} />
                        <View style={{ flex: 1, gap: 3 }}>
                          <Row gap={8} wrap>
                            <Txt v="h2">{loc.short}</Txt>
                            {isNear ? <Tag label="Dichtstbij" color="#FFFFFF" bg="#0A63B5" /> : null}
                          </Row>
                          <Txt v="small" color={C.soft}>
                            {loc.name}
                          </Txt>
                          <Txt v="small" color={C.muted}>
                            {`${loc.street}, ${loc.postcode} ${loc.city}`}
                          </Txt>
                          <Row gap={6} style={{ marginTop: 6 }} wrap>
                            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                              <View key={wd} style={{ width: 30, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: loc.days.includes(wd) ? C.ice : 'transparent', borderWidth: 1, borderColor: loc.days.includes(wd) ? 'transparent' : C.line }}>
                                <Txt v="label" size={9} color={loc.days.includes(wd) ? C.blue : C.muted}>
                                  {weekdayShort(new Date(2026, 10, 1 + wd))}
                                </Txt>
                              </View>
                            ))}
                          </Row>
                          {!ok ? (
                            <Txt v="small" color={C.warn} style={{ marginTop: 6 }}>
                              Deze behandeling doen we in Eindhoven.
                            </Txt>
                          ) : null}
                        </View>
                        {dist !== null ? (
                          <Txt v="num" color={C.muted} size={12}>
                            {`${Math.round(dist)} km`}
                          </Txt>
                        ) : null}
                      </Row>
                    </Card>
                  );
                })}
                <Press onPress={() => router.push('/kliniek')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                  <Icon name="search" size={16} color={C.blue} />
                  <Txt v="small" weight="700" color={C.blue}>
                    Zoek op postcode
                  </Txt>
                </Press>
              </>
            ) : null}

            {/* ---------------------------------------------------------------------------------------- doctor */}
            {step === 'wie-arts' ? (
              <>
                <Card pad={16} onPress={() => (setDoctor('eerste'), setDay(null), setSlot(null), go('wanneer'))} label={tr('Eerste vrije plek')} style={doctor === 'eerste' ? { borderColor: C.blue, borderWidth: 1.5 } : null}>
                  <Row gap={14}>
                    <IconTile name="clock" size={44} />
                    <View style={{ flex: 1 }}>
                      <Txt v="h2">Eerste vrije plek</Txt>
                      <Txt v="small" color={C.muted}>
                        Bij wie het eerst kan
                      </Txt>
                    </View>
                  </Row>
                </Card>
                {eligible.map((id) => {
                  const d = doctorById(id);
                  const first = days.find((x) => x.slots.some((s) => s.doctor === id));
                  const firstSlot = first?.slots.find((s) => s.doctor === id);
                  return (
                    <Card key={id} pad={0} style={doctor === id ? { borderColor: C.blue, borderWidth: 1.5 } : null}>
                      <Row gap={0}>
                        <Press onPress={() => (setDoctor(id), setDay(null), setSlot(null), go('wanneer'))} accessibilityLabel={d.name} scaleTo={0.99} style={{ flex: 1, padding: 14 }}>
                          <Row gap={14}>
                            <Avatar id={id} size={52} />
                            <View style={{ flex: 1, gap: 2 }}>
                              <Txt v="h2">{d.name}</Txt>
                              <Txt v="small" color={C.muted}>
                                {d.title}
                              </Txt>
                              {first && firstSlot ? (
                                <Txt v="small" weight="600" color={C.ok}>
                                  {`${tr('Eerst vrij')}: ${dayShort(first.d)} ${clock(atMinute(first.d, firstSlot.start))}`}
                                </Txt>
                              ) : null}
                            </View>
                          </Row>
                        </Press>
                        <Press onPress={() => router.push({ pathname: '/tandarts/[id]', params: { id } })} accessibilityLabel={`${tr('Over')} ${d.name}`} style={{ alignSelf: 'stretch', paddingHorizontal: 16, justifyContent: 'center', borderLeftWidth: 1, borderColor: C.line }}>
                          <Icon name="info" size={18} color={C.muted} />
                        </Press>
                      </Row>
                    </Card>
                  );
                })}
              </>
            ) : null}

            {/* ------------------------------------------------------------------------------------------ when */}
            {step === 'wanneer' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {days.map(({ d, slots }) => {
                    const on = day ? sameDay(day, d) : false;
                    return (
                      <Press
                        key={d.toISOString()}
                        onPress={() => (setDay(d), setSlot(null))}
                        disabled={!slots.length}
                        accessibilityLabel={dayShort(d)}
                        style={[{ width: 66, paddingVertical: 12, borderRadius: R.md, alignItems: 'center', gap: 2, backgroundColor: on ? C.navy : C.paper, borderWidth: 1, borderColor: on ? C.navy : C.line }, on ? null : shadow(1)]}
                        fxNames={on ? 'dye-navy' : ''}
                      >
                        <Txt v="label" size={9.5} color={on ? '#7FC9F2' : C.muted}>
                          {weekdayShort(d)}
                        </Txt>
                        <Txt v="stat" size={22} color={on ? '#FFFFFF' : C.ink}>
                          {String(d.getDate())}
                        </Txt>
                        <Txt v="num" size={10.5} color={on ? '#B6C2DF' : slots.length ? C.ok : C.muted}>
                          {slots.length ? `${slots.length} ${tr('vrij')}` : tr('vol')}
                        </Txt>
                      </Press>
                    );
                  })}
                </ScrollView>
                {day ? (
                  (['ochtend', 'middag'] as const).map((part) => {
                    const list = slotsFor(day).filter((s) => (part === 'ochtend' ? s.start < 13 * 60 : s.start >= 13 * 60));
                    if (!list.length) return null;
                    return (
                      <View key={part} style={{ gap: 8, marginTop: 6 }}>
                        <Txt v="label" color={C.muted}>
                          {part === 'ochtend' ? 'Ochtend' : 'Middag'}
                        </Txt>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {list.map((s) => {
                            const on = slot?.start === s.start && slot.doctor === s.doctor;
                            return (
                              <Press
                                key={`${s.start}-${s.doctor}`}
                                onPress={() => (setSlot(s), tap('select'))}
                                accessibilityLabel={clock(atMinute(day, s.start))}
                                style={{ width: '31.5%', paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', gap: 2, borderWidth: 1.5, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.ice : C.paper }}
                              >
                                <Txt v="num" size={15} weight="600" color={on ? C.blue : C.ink}>
                                  {clock(atMinute(day, s.start))}
                                </Txt>
                                {doctor === 'eerste' ? (
                                  <Txt v="small" size={10.5} color={C.muted} numberOfLines={1}>
                                    {doctorById(s.doctor).name}
                                  </Txt>
                                ) : null}
                              </Press>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Txt v="small" color={C.muted}>
                    {`${place.short} ${tr('is open op')} ${place.days.map((wd) => weekdayShort(new Date(2026, 10, 1 + wd))).join(' · ')}.`}
                  </Txt>
                )}
                <Card tone="flat" pad={14} style={{ marginTop: 8 }}>
                  <Row gap={12}>
                    <Icon name="bell" size={18} color={C.soft} />
                    <View style={{ flex: 1 }}>
                      <Txt v="h3" size={14.5}>
                        Liever eerder?
                      </Txt>
                      <Txt v="small" color={C.muted}>
                        Zet je op de wachtlijst: valt er een plek vrij, dan krijg je een bericht.
                      </Txt>
                    </View>
                    <Chip
                      small
                      label={saved.waitlist ? 'Aan' : 'Zet aan'}
                      on={saved.waitlist}
                      onPress={() => {
                        if (!saved.waitlist) emit({ kind: 'waitlist', who: who === 'nieuw' ? 'layla' : who, ref: `wachtlijst-${treatment}` });
                        update({ waitlist: !saved.waitlist });
                      }}
                    />
                  </Row>
                </Card>
              </>
            ) : null}

            {/* ----------------------------------------------------------------------------------------- check */}
            {step === 'check' && slot && day ? (
              <>
                <Card tone="pearl">
                  {[
                    ['Voor', whoName],
                    ['Behandeling', t.name],
                    ['Praktijk', `${place.name}, ${place.city}`],
                    ['Tandarts', doctorById(slot.doctor).name],
                    ['Wanneer', `${dayShort(day)} · ${clock(atMinute(day, slot.start))}`],
                    ['Duur', `±${t.minutes} min`],
                  ].map(([k, v]) => (
                    <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }}>
                      <Txt v="label" color={C.muted}>
                        {k}
                      </Txt>
                      <Txt v="h3" align="right" style={{ flex: 1, marginStart: 16 }}>
                        {v}
                      </Txt>
                    </Row>
                  ))}
                  {t.free ? <Tag label="Gratis controle" color="#FFFFFF" bg="#0A63B5" style={{ marginTop: 12 }} /> : null}
                </Card>
                {who === 'nieuw' ? <Field placeholder="Naam van de patiënt" value={newName} onChangeText={setNewName} /> : null}
                <Field placeholder="Iets wat de tandarts moet weten? (optioneel)" value={note} onChangeText={setNote} multiline style={{ height: 90, paddingTop: 14 }} />
                <Card pad={14}>
                  <Row gap={12}>
                    <Icon name="bell" size={18} color={C.soft} />
                    <Txt v="h3" size={14.5} style={{ flex: 1 }}>
                      Herinnering de dag ervoor en een uur van tevoren
                    </Txt>
                    <Toggle value={remind} onChange={setRemind} label="Herinnering" />
                  </Row>
                </Card>
                <Card pad={14} onPress={() => router.push('/vragenlijst')} label={tr('Gezondheidsvragenlijst')}>
                  <Row gap={12}>
                    <IconTile name="shield" size={38} color={saved.healthAt ? '#12A27A' : '#E0901A'} />
                    <View style={{ flex: 1 }}>
                      <Txt v="h3" size={14.5}>
                        Gezondheidsvragenlijst
                      </Txt>
                      <Txt v="small" color={C.muted}>
                        {saved.healthAt ? 'Bijgewerkt. Iets veranderd? Pas het aan.' : 'Nog even invullen voor je afspraak'}
                      </Txt>
                    </View>
                  </Row>
                </Card>
              </>
            ) : null}

            {/* ------------------------------------------------------------------------------------------ done */}
            {step === 'klaar' && slot && day ? (
              <>
                <Card tone="navy" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <Bracket color="#7FC9F2">Bevestigd</Bracket>
                  <Scramble text={`${dayShort(day)} · ${clock(atMinute(day, slot.start))}`} v="display" color="#FFFFFF" />
                  <Scramble text={`${roomById(doctorById(slot.doctor).room).name} · ${doctorById(slot.doctor).name}`} v="title" color="#7FC9F2" duration={1300} />
                  <Txt v="small" color="#B6C2DF">
                    {`${t.name} · ${place.short}`}
                  </Txt>
                </Card>
                <Row gap={10} wrap>
                  <Button title="Zet in je agenda" icon="calendar" kind="blue" onPress={() => addToCalendar(tr(t.name), atMinute(day, slot.start), t.minutes, location, note)} />
                  <Button title="Voorbereiding" icon="check" kind="line" onPress={() => router.replace({ pathname: '/voorbereiding/[id]', params: { id: ref } })} />
                </Row>
                <Txt v="small" color={C.muted}>
                  De praktijk ziet je afspraak nu op het praktijkscherm. Verzetten of annuleren kan tot 24 uur van tevoren in Afspraken.
                </Txt>
              </>
            ) : null}
          </PopIn>
        </View>
      </ScrollView>

      {/* ---------------------------------------------------------------------------------------- the footer */}
      {step === 'wanneer' || step === 'check' || step === 'klaar' ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 14, paddingTop: 14, paddingHorizontal: PAD, alignItems: 'center' }}>
          <View {...fx('glass-strong')} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.glass, borderTopWidth: 1, borderColor: C.line }} />
          <View style={{ width: '100%', maxWidth: MAX_WIDTH - PAD * 2 }}>
            {step === 'wanneer' ? <Button full size="lg" title="Verder" after="arrow" disabled={!slot} onPress={() => go('check')} /> : null}
            {step === 'check' ? <Button full size="lg" kind="blue" title={t.free ? 'Boek gratis controle' : 'Bevestig afspraak'} icon="check" onPress={book} /> : null}
            {step === 'klaar' ? <Button full size="lg" title="Klaar" onPress={() => router.replace('/afspraken')} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
