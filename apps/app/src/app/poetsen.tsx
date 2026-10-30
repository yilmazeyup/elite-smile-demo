import { dateShort, laylaTeeth } from '@smile/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { alpha, Bracket, Button, Card, DemoNote, IconTile, PopIn, Press, Ring, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { ACHIEVEMENTS, demoWeek, earned, FULL, QUADRANTS, SKINS, streak, unlockedSkins } from '../lib/brushData';
import { useApp } from '../state/app';
import { BrushScene, type BrushState } from '../three/BrushScene';
import { C, fx, R, shadow, web } from '../theme';

const PER = FULL / 4;
const SIDE_LABEL = (phase: number) => (phase < 0.4 ? 'buitenkant' : phase < 0.8 ? 'binnenkant' : 'kauwvlakken');

/** A soft tick on the web (the haptic does the same on a phone). */
function blip(ctx: AudioContext | null, high = false) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = high ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  } catch {
    // no sound, the haptic is enough
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The brushing coach: two minutes, four quadrants, a streak, and achievements that unlock toothbrush skins. */
export default function Poetsen() {
  const { saved, update, now } = useApp();
  const toast = useToast();
  const teeth = useMemo(() => laylaTeeth(), []);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [last, setLast] = useState<{ seconds: number; fresh: string[] } | null>(null);
  const state = useRef<BrushState>({ quadrant: -1, phase: 0, running: false });
  const clock = useRef({ start: 0, before: 0 });
  const audio = useRef<AudioContext | null>(null);
  const quadrant = Math.min(3, Math.floor(elapsed / PER));
  const phase = (elapsed % PER) / PER;

  state.current = { quadrant: mode === 'running' || mode === 'paused' ? quadrant : -1, phase, running: mode === 'running' || mode === 'paused' };

  const sessions = saved.brushing;
  const days = streak(sessions, now);
  const list = useMemo(() => earned(sessions), [sessions]);
  const skins = useMemo(() => unlockedSkins(sessions), [sessions]);

  const finish = (seconds: number) => {
    const before = new Set(earned(sessions).filter((e) => e.at).map((e) => e.a.id));
    const next = [...sessions, { at: Date.now(), seconds: Math.round(seconds) }];
    update((s) => ({ brushing: [...s.brushing, { at: Date.now(), seconds: Math.round(seconds) }] }));
    const fresh = earned(next)
      .filter((e) => e.at && !before.has(e.a.id))
      .map((e) => e.a.id);
    setLast({ seconds, fresh });
    tap('success');
    blip(audio.current, true);
  };

  // the timer, running on real time so a slow frame never loses seconds
  useEffect(() => {
    if (mode !== 'running') return;
    clock.current.start = performance.now();
    let prevQ = Math.floor(clock.current.before / PER);
    const id = setInterval(() => {
      const s = clock.current.before + (performance.now() - clock.current.start) / 1000;
      const q = Math.floor(s / PER);
      if (q !== prevQ && q < 4) {
        prevQ = q;
        tap('medium');
        blip(audio.current);
      }
      if (s >= FULL) {
        clearInterval(id);
        setElapsed(FULL);
        setMode('done');
        finish(FULL);
        return;
      }
      setElapsed(s);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const start = () => {
    if (Platform.OS === 'web' && !audio.current) {
      try {
        audio.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        audio.current = null;
      }
    }
    tap('medium');
    clock.current.before = mode === 'paused' ? elapsed : 0;
    if (mode !== 'paused') setElapsed(0);
    setLast(null);
    setMode('running');
  };
  const pause = () => {
    clock.current.before = elapsed;
    setMode('paused');
  };
  const stop = () => {
    const s = elapsed;
    setMode(s >= 20 ? 'done' : 'idle');
    if (s >= 20) finish(s);
    else setElapsed(0);
  };

  const q = QUADRANTS[quadrant];
  const active = mode === 'running' || mode === 'paused';
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const n = sessions.filter((s) => s.at >= d.getTime() && s.at < d.getTime() + 86400000).length;
    return { d, n };
  });

  return (
    <Screen back kicker="Poetscoach" title="Twee minuten" serif="Vier kwadranten van dertig seconden: buiten, binnen, kauwvlak.">
      <View {...fx('dye-pearl')} style={[{ height: 360, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }, shadow(1)]}>
        <BrushScene teeth={teeth} state={state} skin={saved.skin} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View {...fx('glass')} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line }}>
            <Txt v="label" size={9} color={C.blue}>
              {active ? `Kwadrant ${quadrant + 1} / 4` : mode === 'done' ? 'Klaar' : 'Klaar om te beginnen'}
            </Txt>
            <Txt v="h3">{active ? `${q.label} · ${SIDE_LABEL(phase)}` : mode === 'done' ? 'Alles schoon' : 'Rechtsboven begint'}</Txt>
          </View>
        </View>
      </View>

      {/* ------------------------------------------------------------------------------------- the timer */}
      <Card>
        <Row gap={18}>
          <Ring value={elapsed / FULL} size={140} stroke={10}>
            <Txt v="stat" size={38} align="center">
              {mmss(Math.max(0, FULL - elapsed))}
            </Txt>
            <Txt v="label" size={9} color={C.muted} align="center">
              {active ? (mode === 'paused' ? 'Pauze' : 'Nog') : mode === 'done' ? 'Gedaan' : '2 minuten'}
            </Txt>
          </Ring>
          <View style={{ flex: 1, gap: 10 }}>
            {/* the four quadrants as a little map: upper right, upper left / lower right, lower left */}
            <View style={{ gap: 6 }}>
              {[
                [0, 1],
                [3, 2],
              ].map((row, r) => (
                <Row key={r} gap={6}>
                  {row.map((i) => {
                    const done = elapsed >= (i + 1) * PER;
                    const now2 = active && quadrant === i;
                    const fill = done ? 1 : now2 ? phase : 0;
                    return (
                      <View key={i} style={{ flex: 1, height: 38, borderRadius: 12, overflow: 'hidden', backgroundColor: C.bg2, borderWidth: 1, borderColor: now2 ? C.sky : C.line, justifyContent: 'center', paddingHorizontal: 8 }}>
                        <View {...fx('dye-blue')} style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, backgroundColor: C.sky, opacity: done ? 0.28 : 0.22 }, web({ transition: 'width .2s linear' })]} />
                        <Txt v="small" size={11.5} weight="700" color={done ? C.blue : now2 ? C.ink : C.muted} numberOfLines={1}>
                          {['Boven R', 'Boven L', 'Onder L', 'Onder R'][i]}
                        </Txt>
                      </View>
                    );
                  })}
                </Row>
              ))}
            </View>
            <Txt v="small" size={12} color={C.muted}>
              {active ? `Nu: ${q.label.toLowerCase()}, ${SIDE_LABEL(phase)}` : 'Rechtsboven → linksboven → linksonder → rechtsonder'}
            </Txt>
          </View>
        </Row>
        <Row gap={8} style={{ marginTop: 14 }}>
          {mode === 'running' ? (
            <Button title="Pauze" icon="pause" kind="brand" onPress={pause} style={{ flex: 1 }} full />
          ) : (
            <Button title={mode === 'paused' ? 'Verder' : mode === 'done' ? 'Nog eens' : 'Start'} icon="play" kind="blue" onPress={start} style={{ flex: 1 }} full />
          )}
          {active ? <Button title="Stop" icon="stop" kind="line" onPress={stop} style={{ flex: 1 }} full /> : null}
        </Row>
        {mode === 'idle' ? (
          <Txt v="small" color={C.muted} style={{ marginTop: 12 }}>
            Poets zacht in kleine rondjes, de borstel schuin naar het tandvlees. Rond je implantaat (36) de eerste week extra voorzichtig, zoals je tandarts zei.
          </Txt>
        ) : null}
      </Card>

      {/* ------------------------------------------------------------------------------------ finished */}
      {mode === 'done' && last ? (
        <PopIn>
          <Card tone="navy">
            <Row gap={14}>
              <IconTile name="sparkle" color="#2DB4E8" size={48} solid />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="title" color="#FFFFFF">
                  {last.seconds >= FULL ? 'Twee minuten. Mooi gedaan.' : `${mmss(last.seconds)} gepoetst`}
                </Txt>
                <Txt v="small" color="#B6C2DF">
                  {days > 1 ? `${days} dagen op rij` : 'Bewaard in je poetsgeschiedenis'}
                </Txt>
              </View>
            </Row>
            {last.fresh.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id)!;
              return (
                <Row key={id} gap={10} style={{ marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <Icon name={a.icon} size={18} color="#FFD27A" />
                  <View style={{ flex: 1 }}>
                    <Txt v="h3" color="#FFFFFF">{`Nieuw: ${a.title}`}</Txt>
                    {a.skin ? (
                      <Txt v="small" color="#B6C2DF">{`Borstel ontgrendeld: ${SKINS.find((s) => s.id === a.skin)!.name}`}</Txt>
                    ) : null}
                  </View>
                </Row>
              );
            })}
          </Card>
        </PopIn>
      ) : null}

      {/* -------------------------------------------------------------------------------------- streak */}
      <Card tone="pearl">
        <Row style={{ justifyContent: 'space-between' }} align="flex-end">
          <View style={{ gap: 3 }}>
            <Bracket>Reeks</Bracket>
            <Txt v="display">{days === 0 ? 'Nog geen' : days === 1 ? '1 dag' : `${days} dagen`}</Txt>
            <Txt v="small" color={C.muted}>
              op rij gepoetst · {sessions.length} {sessions.length === 1 ? 'sessie' : 'sessies'}
            </Txt>
          </View>
          <Row gap={6}>
            {week.map((w) => (
              <View key={w.d.getTime()} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 22, height: 44, borderRadius: 11, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, justifyContent: 'flex-end', overflow: 'hidden' }}>
                  <View {...fx(w.n ? 'dye-blue' : '')} style={{ height: `${Math.min(1, w.n / 2) * 100}%`, backgroundColor: C.sky }} />
                </View>
                <Txt v="label" size={8.5} color={C.muted}>
                  {['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][w.d.getDay()]}
                </Txt>
              </View>
            ))}
          </Row>
        </Row>
      </Card>

      {/* -------------------------------------------------------------------------------- achievements */}
      <View>
        <Row style={{ justifyContent: 'space-between' }} align="flex-end">
          <View style={{ gap: 4 }}>
            <Bracket>Prestaties</Bracket>
            <Txt v="title">{`${list.filter((e) => e.at).length} van ${list.length}`}</Txt>
          </View>
          <Txt v="small" color={C.muted} style={{ maxWidth: 170 }} align="right">
            Sommige zijn een raadsel tot je ze haalt.
          </Txt>
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {list.map(({ a, at, progress, count }) => {
            const got = !!at;
            const secret = a.cryptic && !got;
            return (
              <View key={a.id} style={[{ width: '48.4%', minHeight: 150, padding: 14, borderRadius: R.lg, backgroundColor: got ? C.paper : C.bg2, borderWidth: 1, borderColor: got ? alpha('#C9A15B', 0.45) : C.line, gap: 8 }, got ? shadow(1) : null]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View {...fx(got ? 'sheen' : '')} style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: got ? '#0B1A3A' : C.paper, borderWidth: got ? 0 : 1, borderColor: C.line2 }}>
                    <Icon name={secret ? 'lock' : a.icon} size={18} color={got ? '#FFD27A' : C.muted} />
                  </View>
                  {a.skin ? (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: SKINS.find((s) => s.id === a.skin)!.handle, borderWidth: 2, borderColor: C.paper, opacity: got ? 1 : 0.45 }} />
                  ) : null}
                </Row>
                <Txt v="h3" color={got ? C.ink : C.soft}>
                  {secret ? '???' : a.title}
                </Txt>
                <Txt v="small" size={12} color={C.muted} style={{ flex: 1 }}>
                  {got ? a.done : a.hint}
                </Txt>
                {got ? (
                  <Txt v="label" size={8.5} color="#B8904A">{`Behaald ${dateShort(new Date(at!))}`}</Txt>
                ) : (
                  <Row gap={6}>
                    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' }}>
                      <View {...fx('dye-blue')} style={{ width: `${progress * 100}%`, height: 4, backgroundColor: C.sky }} />
                    </View>
                    <Txt v="num" size={10} color={C.muted}>
                      {secret ? '' : count ?? ''}
                    </Txt>
                  </Row>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* --------------------------------------------------------------------------------------- skins */}
      <View>
        <Bracket>Borstels</Bracket>
        <Txt v="small" color={C.muted} style={{ marginTop: 4 }}>
          Elke borstel komt vrij met een prestatie.
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {SKINS.map((s) => {
            const open = skins.has(s.id);
            const on = saved.skin === s.id;
            return (
              <Press
                key={s.id}
                onPress={() => {
                  if (!open) {
                    const by = ACHIEVEMENTS.find((a) => a.skin === s.id);
                    toast(tr('Nog op slot'), { text: by ? tr(`Haal “${by.cryptic ? '???' : by.title}”`) : '', icon: 'lock' });
                    return;
                  }
                  update({ skin: s.id });
                }}
                accessibilityState={{ selected: on, disabled: !open }}
                accessibilityLabel={tr(s.name)}
                scaleTo={0.94}
                style={{ width: '22.5%', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: R.md, backgroundColor: on ? C.ice : C.paper, borderWidth: on ? 1.5 : 1, borderColor: on ? C.sky : C.line, opacity: open ? 1 : 0.55 }}
              >
                <View style={{ width: 16, height: 46, borderRadius: 8, backgroundColor: s.handle, borderWidth: 1, borderColor: 'rgba(11,26,58,0.12)', alignItems: 'center', paddingTop: 4 }}>
                  <View style={{ width: 10, height: 12, borderRadius: 3, backgroundColor: s.bristles }} />
                  <View style={{ marginTop: 10, width: 8, height: 12, borderRadius: 4, backgroundColor: s.accent }} />
                </View>
                {open ? null : (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Icon name="lock" size={12} color={C.muted} />
                  </View>
                )}
                <Txt v="small" size={10.5} weight="600" color={on ? C.ink : C.soft} numberOfLines={1}>
                  {s.name}
                </Txt>
              </Press>
            );
          })}
        </View>
      </View>

      <DemoNote text="Demo: je sessies worden alleen op dit apparaat bewaard. Wil je de prestaties laten zien, vul dan een demoweek." />
      <Row gap={8} wrap>
        <Button
          title="Vul een demoweek"
          icon="calendar"
          size="sm"
          kind="soft"
          onPress={() => {
            update((s) => ({ brushing: [...s.brushing.filter((x) => x.at > Date.now() - 3600000), ...demoWeek(new Date())].sort((a, b) => a.at - b.at) }));
            toast(tr('Demoweek ingevuld'), { text: tr('Negen dagen ochtend en avond, een paar keer laat.'), icon: 'brush' });
          }}
        />
        {sessions.length ? <Button title="Wis poetsgeschiedenis" icon="trash" size="sm" kind="ghost" onPress={() => update({ brushing: [], skin: 'navy' })} /> : null}
      </Row>
    </Screen>
  );
}
