import { addDays, ago, clock, dayShort, doctorById, LOST_TEETH, memberById, relativeDay, upcoming, weekdayLong } from '@smile/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, View } from 'react-native';

import { Icon } from '../components/Icon';
import { KidsGraffiti } from '../components/KidsGraffiti';
import { KeyArt, KidsKey } from '../components/KidsKey';
import { KidsStickers } from '../components/KidsStickers';
import { KidsStory } from '../components/KidsStory';
import { KidsTeeth } from '../components/KidsTeeth';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Avatar, Bracket, Button, Card, IconTile, ListItem, nativeDriver, PopIn, prefersReducedMotion, Press, Row, SectionHead, Sheet, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { FIRST_VISIT, lostTeethOf, milkName, PAINTS, STICKERS, withLostTooth } from '../lib/kidsCorner';
import { useApp } from '../state/app';
import { KidsDoodleTooth, type DoodleApi } from '../three/KidsDoodleTooth';
import { C, isWeb, R, shadow, web } from '../theme';

type Kid = 'adam' | 'sofia';

const SUN = '#FFB12E';
/** Fixed ink for the warm cards, which stay light in both looks. */
const INK = '#0B1A3A';
const SOFT = '#34446A';
const MUTED = '#7584A3';
const UNLOCK_KEY = 'smile-kids-unlocked';

const WASH = `
html[data-corner="kids"] [data-fx~="pearl"]::before{
  background:radial-gradient(closest-side,rgba(255,177,46,.26),rgba(255,177,46,0) 70%) 5% 8%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(255,122,168,.13),rgba(255,122,168,0) 72%) 96% 22%/55% 62% no-repeat;}
html[data-corner="kids"] [data-fx~="pearl"]::after{
  background:radial-gradient(closest-side,rgba(23,191,163,.10),rgba(23,191,163,0) 72%) 12% 85%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(255,177,46,.16),rgba(255,177,46,0) 70%) 92% 70%/52% 62% no-repeat,
             radial-gradient(closest-side,rgba(142,124,248,.10),rgba(142,124,248,0) 70%) 55% 100%/50% 50% no-repeat;}
html[data-corner="kids"]:not([data-theme="night"]) [data-fx~="pearl"]{background-color:#FFF9F1!important;}
`;

/** Turns the pearl light behind the page warm and sunny while the Kinderhoek is open (web). */
function useWarmLight() {
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    if (!document.getElementById('kids-wash-css')) {
      const s = document.createElement('style');
      s.id = 'kids-wash-css';
      s.textContent = WASH;
      document.head.appendChild(s);
    }
    document.documentElement.dataset.corner = 'kids';
    return () => {
      delete document.documentElement.dataset.corner;
    };
  }, []);
}

const readUnlocked = () => {
  try {
    return globalThis.localStorage?.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
};

/** Gold confetti and a big tooth: a lost milk tooth is a party. */
function Celebrate({ open, tooth, onClose, name }: { open: boolean; tooth: number | null; onClose: () => void; name: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: (i * 37) % 100,
        delay: (i % 7) * 90,
        dur: 2300 + ((i * 53) % 1200),
        color: ['#FFB12E', '#FFD27A', '#FF7AA8', '#2DB4E8', '#17BFA3', '#8E7CF8'][i % 6],
        w: 6 + (i % 3) * 3,
        spin: (i % 2 ? 1 : -1) * (240 + (i % 5) * 80),
      })),
    [],
  );
  const fall = useRef(pieces.map(() => new Animated.Value(0))).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!open) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, stiffness: 180, damping: 12, useNativeDriver: nativeDriver }).start();
    if (prefersReducedMotion()) return;
    const runs = fall.map((v, i) => {
      v.setValue(0);
      return Animated.timing(v, { toValue: 1, duration: pieces[i].dur, delay: pieces[i].delay, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver });
    });
    Animated.parallel(runs).start();
  }, [open, fall, pieces, pop]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,18,4,0.42)', padding: 24 }}>
        {pieces.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.x}%`,
              width: p.w,
              height: p.w * 1.6,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity: fall[i].interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: fall[i].interpolate({ inputRange: [0, 1], outputRange: [-30, 760] }) }, { rotate: fall[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) }],
            }}
          />
        ))}
        <Animated.View
          style={[
            { width: '100%', maxWidth: 360, borderRadius: 32, padding: 26, alignItems: 'center', gap: 10, backgroundColor: '#FFFDF8', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] },
            shadow(3),
          ]}
        >
          <View style={[{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1D2' }, web({ boxShadow: '0 0 0 10px rgba(255,177,46,.12), 0 0 0 22px rgba(255,177,46,.06)' })]}>
            <Icon name="tooth" size={50} color={SUN} stroke={2} />
          </View>
          <Txt v="label" color="#B97A0E">
            Tand kwijt
          </Txt>
          <Txt v="display" align="center" color={INK}>{`Wat knap, ${name}!`}</Txt>
          <Txt v="serif" size={18} color={SOFT} align="center">
            {tooth ? `Je ${milkName(tooth)} is eruit. Leg hem vannacht onder je kussen.` : ''}
          </Txt>
          <Row gap={8} style={{ marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: 'rgba(142,124,248,0.12)' }}>
            <Icon name="wand" size={15} color="#8E7CF8" />
            <Txt v="small" weight="600" color="#6A57E0">
              Nieuwe sticker: Tandenfee
            </Txt>
          </Row>
          <Button title="Hoera!" kind="brand" full onPress={onClose} style={{ marginTop: 8 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Kinderhoek: Sofia's and Adam's own corner. The story of a first visit, a sticker book, Adam's tooth-fairy log on a
 * chart of his milk teeth, a link to the brushing coach and their reminders. A golden key floats somewhere; it opens a
 * hidden layer with a 3D tooth to paint on.
 */
export default function Kinderhoek() {
  useWarmLight();
  const { now, today, saved, update } = useApp();
  const toast = useToast();
  const [kid, setKid] = useState<Kid>(saved.member === 'sofia' ? 'sofia' : 'adam');
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [paint, setPaint] = useState(PAINTS[0].color);
  const [strokes, setStrokes] = useState(0);
  const [losing, setLosing] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [party, setParty] = useState<number | null>(null);
  const doodle = useRef<DoodleApi | null>(null);
  const member = memberById(kid);

  const visit = upcoming(today).find((u) => u.who === kid);
  const doc = visit ? doctorById(visit.doctor) : null;
  const extra = lostTeethOf(saved);
  const lost = [...LOST_TEETH.map((t) => ({ tooth: t.tooth, at: addDays(today, -t.daysAgo).getTime() })), ...extra].sort((a, b) => b.at - a.at);
  const recent = lost.filter((t) => now.getTime() - t.at < 14 * 86400000).map((t) => t.tooth);
  const have = saved.stickers;

  const earn = (id: string) => {
    if (saved.stickers.includes(id)) return false;
    update((s) => ({ stickers: [...s.stickers, id] }));
    return true;
  };

  const turnKey = () => {
    const next = !unlocked;
    setUnlocked(next);
    try {
      globalThis.localStorage?.setItem(UNLOCK_KEY, next ? '1' : '0');
    } catch {
      // Remembered for this visit only.
    }
    if (next) {
      tap('success');
      const fresh = earn('geheime-sleutel');
      toast(tr('Je vond de gouden sleutel!'), { text: tr(fresh ? 'Een geheime krabbelkamer is open. En je krijgt een sticker.' : 'De geheime krabbelkamer is open.'), icon: 'key' });
    }
  };

  return (
    <Screen back gap={22}>
      {/* --------------------------------------------------------------------------------------------- header */}
      <View style={{ gap: 6, marginTop: -6 }}>
        <Bracket color="#B97A0E">Kinderhoek</Bracket>
        <Txt v="hero">
          {'Hoi '}
          <Txt v="hero" color={kid === 'adam' ? '#E39A12' : '#12A28A'}>
            {member.first}
          </Txt>
          !
        </Txt>
        <Txt v="serif" size={18} color={C.soft}>
          {kid === 'adam' ? 'Verhalen, stickers en de tandenfee. Allemaal voor jou.' : 'Je stickers, je beugel en je volgende controle.'}
        </Txt>
      </View>

      <Row gap={8}>
        {(['adam', 'sofia'] as Kid[]).map((id) => {
          const m = memberById(id);
          const on = id === kid;
          return (
            <Press
              key={id}
              onPress={() => setKid(id)}
              accessibilityState={{ selected: on }}
              accessibilityLabel={m.first}
              style={[
                { flex: 1, height: 56, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: on ? 'transparent' : C.line2, backgroundColor: on ? C.paper : 'transparent' },
                on ? shadow(1) : null,
                web({ transition: 'background-color .3s ease, border-color .3s ease' }),
              ]}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? m.color : C.bg2 }}>
                <Txt v="h3" weight="700" color={on ? '#FFFFFF' : C.muted}>
                  {m.first.slice(0, 1)}
                </Txt>
              </View>
              <View>
                <Txt v="h3" color={on ? C.ink : C.muted}>
                  {m.first}
                </Txt>
                <Txt v="label" size={9} color={C.muted}>
                  {`${m.age} ${tr('jaar')}`}
                </Txt>
              </View>
            </Press>
          );
        })}
      </Row>

      {/* -------------------------------------------------------------------------------------- the next visit */}
      {visit && doc ? (
        <PopIn key={`visit-${kid}`}>
          <View style={[{ borderRadius: R.lg, padding: 18, gap: 14, backgroundColor: '#FFF1DA', borderWidth: 1, borderColor: 'rgba(255,177,46,0.28)' }, web({ backgroundImage: 'linear-gradient(135deg,#FFF6E6 0%,#FFE9C6 100%)' }), shadow(1)]}>
            <Row gap={14} align="flex-start">
              <View style={[{ width: 62, alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: '#FFFFFF' }, shadow(1)]}>
                <Txt v="label" size={9.5} color="#B97A0E">
                  {weekdayLong(visit.day).slice(0, 3)}
                </Txt>
                <Txt v="stat" size={27} color={INK}>
                  {String(visit.day.getDate())}
                </Txt>
                <Txt v="num" size={11.5} color={MUTED}>
                  {clock(new Date(visit.day.getTime() + visit.start * 60000))}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Bracket color="#B97A0E">{kid === 'adam' ? 'Volgende controle' : 'Volgende beugelcontrole'}</Bracket>
                <Txt v="title" color={INK}>
                  {relativeDay(visit.day, now) === dayShort(visit.day) ? dayShort(visit.day) : tr(relativeDay(visit.day, now))}
                </Txt>
                <Txt v="small" color={SOFT}>
                  {visit.note}
                </Txt>
              </View>
            </Row>
            <Row gap={10}>
              <Avatar id={doc.id} size={34} ring="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Txt v="h3" size={14.5} color={INK}>
                  {doc.name}
                </Txt>
                <Txt v="small" size={12} color={MUTED}>
                  {doc.title}
                </Txt>
              </View>
              {kid === 'sofia' ? <Button title="Beugel" icon="braces" size="sm" kind="brand" onPress={() => router.push('/beugel' as never)} /> : null}
            </Row>
          </View>
        </PopIn>
      ) : null}

      {/* -------------------------------------------------------------------------------------------- the story */}
      <View>
        <View style={{ paddingRight: 56 }}>
          <SectionHead kicker="Verhaal" title="Mijn eerste bezoek" serif="Zo gaat het bij Elite Smile." />
        </View>
        <KidsKey onPress={turnKey} open={unlocked} style={{ position: 'absolute', right: -6, top: -4 }} />
        <KidsStory pages={FIRST_VISIT} />
      </View>

      {/* ------------------------------------------------------------------------------- the secret doodle room */}
      {unlocked ? (
        <PopIn>
          <View style={[{ borderRadius: 28, overflow: 'hidden', backgroundColor: '#14254F' }, web({ backgroundImage: 'radial-gradient(120% 80% at 50% 0%,#2A4590 0%,#14254F 55%,#0B1A3A 100%)' }), shadow(2)]}>
            <View style={{ padding: 18, paddingBottom: 0, gap: 4 }}>
              <Row gap={8}>
                <KeyArt size={22} />
                <Bracket color="#FFD27A">Geheime krabbelkamer</Bracket>
              </Row>
              <Txt v="title" color="#FFFFFF">
                {`De krabbeltand van ${member.first}`}
              </Txt>
              <Txt v="small" color="#B6C2DF">
                Tik op de tand om te tekenen. Sleep ernaast om hem te draaien.
              </Txt>
            </View>
            <KidsDoodleTooth key={kid} kid={kid} color={paint} api={doodle} onChange={setStrokes} style={{ height: 300 }} />
            <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                {PAINTS.map((p) => {
                  const on = p.color === paint;
                  return (
                    <Press key={p.id} onPress={() => setPaint(p.color)} accessibilityLabel={tr(p.name)} accessibilityState={{ selected: on }} scaleTo={0.88} style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={[{ width: on ? 38 : 30, height: on ? 38 : 30, borderRadius: 19, backgroundColor: p.color, borderWidth: on ? 3 : 0, borderColor: '#FFFFFF' }, web({ transition: 'all .25s cubic-bezier(.2,.9,.25,1.2)', boxShadow: on ? `0 0 0 3px ${p.color}55` : 'none' })]} />
                    </Press>
                  );
                })}
              </Row>
              <Row gap={8}>
                <Press
                  onPress={() => doodle.current?.undo()}
                  disabled={!strokes}
                  accessibilityLabel={tr('Ongedaan maken')}
                  style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}
                >
                  <Icon name="undo" size={20} color="#FFFFFF" />
                </Press>
                <Press
                  onPress={() => doodle.current?.clear()}
                  accessibilityLabel={tr('Alles wissen')}
                  style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}
                >
                  <Icon name="trash" size={19} color="#FFFFFF" />
                </Press>
                <Press
                  onPress={() => {
                    const ok = doodle.current?.save();
                    if (!ok) return toast(tr('Bewaren lukte niet'), { icon: 'alert' });
                    tap('success');
                    const fresh = earn('kunstenaar');
                    toast(tr('Bewaard!'), { text: tr(fresh ? 'Je tekening staat op je tand. Nieuwe sticker: Kunstenaar.' : 'Je tekening staat op je tand.'), icon: 'paint' });
                  }}
                  accessibilityLabel={tr('Bewaar')}
                  style={[{ flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: SUN }, web({ backgroundImage: 'linear-gradient(120deg,#FFC24D,#FF9F1C)' })]}
                >
                  <Icon name="check" size={18} color="#3B2500" stroke={2.4} />
                  <Txt v="h3" weight="700" color="#3B2500">
                    Bewaar
                  </Txt>
                </Press>
              </Row>
            </View>
          </View>
        </PopIn>
      ) : null}

      {/* ------------------------------------------------------------------------------------ the tooth fairy */}
      {kid === 'adam' ? (
        <View>
          <SectionHead kicker="Tandenfee" title="Mijn melktanden" serif="Elke tand die eruit gaat, krijgt een gouden ster." />
          <Card pad={16} style={{ gap: 6 }}>
            <KidsTeeth lost={lost.map((t) => t.tooth)} recent={recent} />
            <View style={{ marginTop: 2 }}>
              {lost.map((t, i) => (
                <Row key={`${t.tooth}-${t.at}`} gap={12} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,177,46,0.14)' }}>
                    <Icon name="starFill" size={16} color={SUN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="h3" size={14.5}>
                      {`${milkName(t.tooth).slice(0, 1).toUpperCase()}${milkName(t.tooth).slice(1)}`}
                    </Txt>
                    <Txt v="small" size={12} color={C.muted}>
                      {`${tr('Tand')} ${t.tooth} · ${tr(ago(new Date(t.at), now))}`}
                    </Txt>
                  </View>
                </Row>
              ))}
            </View>
            <Button title="Tand kwijt!" icon="sparkle" kind="brand" full onPress={() => (setPick(null), setLosing(true))} style={{ marginTop: 6 }} />
          </Card>
        </View>
      ) : (
        <Card pad={16} onPress={() => router.push('/beugel' as never)} label={tr('Beugelmaatje')}>
          <Row gap={14}>
            <IconTile name="braces" color="#17BFA3" size={46} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">Je beugelmaatje</Txt>
              <Txt v="small" color={C.muted}>
                Elastiekjes kiezen, je volgende controle en hulp bij een los slotje.
              </Txt>
            </View>
            <Icon name="chevron" size={17} color={C.muted} />
          </Row>
        </Card>
      )}

      {/* ---------------------------------------------------------------------------------------- the stickers */}
      <View>
        <SectionHead kicker="Stickerboek" title={`${STICKERS.filter((s) => have.includes(s.id)).length} van ${STICKERS.length} stickers`} />
        <Card pad={14}>
          <KidsStickers have={have} />
        </Card>
      </View>

      {/* ------------------------------------------------------------------------------------------ brushing */}
      <Card pad={16} onPress={() => router.push('/poetsen' as never)} label={tr('Poetscoach')} style={{ borderColor: 'rgba(23,191,163,0.25)' }}>
        <Row gap={14}>
          <IconTile name="brush" color="#17BFA3" size={48} solid />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h3">Poets mee met de poetscoach</Txt>
            <Txt v="small" color={C.muted}>
              Twee minuten, vier hoekjes, en een prijs aan het eind.
            </Txt>
          </View>
          <Icon name="chevron" size={17} color={C.muted} />
        </Row>
      </Card>

      {/* --------------------------------------------------------------------------------------- reminders */}
      <View>
        <SectionHead kicker="Herinneringen" title="Niet vergeten" />
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          <ListItem
            icon="calendar"
            color="#0A63B5"
            title="Elk half jaar naar de tandarts"
            sub={visit && kid === 'adam' ? `${tr('Volgende')}: ${dayShort(visit.day)} · ${tr('daarna rond')} ${dayShort(addDays(visit.day, 182))}` : 'Je eigen controle, naast de beugelcontroles'}
          />
          <ListItem icon="drop" color="#2DB4E8" title="Fluoride" sub="Thuis: fluoridetandpasta, uitspugen en niet naspoelen. Bij de controle krijg je een laagje extra." />
          <ListItem icon="brush" color="#17BFA3" title="Twee keer per dag poetsen" sub="’s Ochtends en voor het slapen. Tot je tiende poetst papa of mama na." last />
        </Card>
      </View>

      <Txt v="small" color={C.muted} align="center" style={{ paddingHorizontal: 12 }}>
        Demo met verzonnen kinderen. De tips zijn algemeen; volg het advies van je eigen tandarts.
      </Txt>

      <KidsGraffiti open={unlocked} />

      {/* ------------------------------------------------------------------------------ a tooth came out */}
      <Sheet open={losing} onClose={() => setLosing(false)} title="Welke tand is eruit?" tall>
        <Txt v="serif" size={17} color={C.soft}>
          Tik op de tand die eruit is gevallen.
        </Txt>
        <KidsTeeth lost={lost.map((t) => t.tooth)} selected={pick} onSelect={setPick} />
        <Txt v="h3" align="center" color={pick ? C.ink : C.muted}>
          {pick ? `${milkName(pick).slice(0, 1).toUpperCase()}${milkName(pick).slice(1)} (${pick})` : 'Nog geen tand gekozen'}
        </Txt>
        <Button
          title="Ja, deze is eruit"
          icon="sparkle"
          kind="brand"
          full
          disabled={!pick}
          onPress={() => {
            if (!pick) return;
            update((s) => ({ ...withLostTooth(s, pick), stickers: s.stickers.includes('tandenfee') ? s.stickers : [...s.stickers, 'tandenfee'] }));
            setLosing(false);
            tap('success');
            setTimeout(() => setParty(pick), 260);
          }}
        />
      </Sheet>
      <Celebrate open={party !== null} tooth={party} name={memberById('adam').first} onClose={() => setParty(null)} />
    </Screen>
  );
}
