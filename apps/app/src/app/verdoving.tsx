import { CARE, clock, memberById, type CareId } from '@smile/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Bracket, Button, Card, Chip, PopIn, Ring, Row, tap, Txt } from '../components/ui';
import { toWall, useApp, useTick } from '../state/app';
import { C } from '../theme';

const KINDS: { id: CareId; label: string }[] = [
  { id: 'vulling', label: 'Vulling' },
  { id: 'wortelkanaal', label: 'Wortelkanaal' },
  { id: 'extractie', label: 'Trekken' },
  { id: 'implantaat', label: 'Implantaat' },
  { id: 'kind-vulling', label: 'Kind' },
];

/**
 * How long until the feeling comes back after a local anaesthetic, as a ring that empties, with the two things that
 * matter meanwhile: nothing hot, and don't bite your numb lip or cheek (children do this without noticing).
 */
export default function Verdoving() {
  const { saved, update } = useApp();
  // Redraw every second; the countdown itself runs on real time (Date.now()), like the stamp it started from.
  useTick(1000);
  const [kind, setKind] = useState<CareId>((saved.numbFor as CareId) || 'vulling');
  const total = (CARE[kind].numbing ?? 150) * 60000;
  const left = saved.numbAt ? Math.max(0, saved.numbAt + total - Date.now()) : 0;
  const running = saved.numbAt > 0 && left > 0;
  const kid = kind === 'kind-vulling' || memberById(saved.member).kid;
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);

  return (
    <Screen back title="Verdovingstimer" kicker="Tot het gevoel terug is" serif="Meestal twee tot vier uur.">
      <Row gap={8} wrap>
        {KINDS.map((k) => (
          <Chip key={k.id} label={k.label} on={kind === k.id} onPress={() => (setKind(k.id), running ? update({ numbFor: k.id }) : undefined)} small />
        ))}
      </Row>
      <PopIn>
        <Card tone="pearl" style={{ alignItems: 'center', paddingVertical: 26, gap: 14 }}>
          <Ring value={running ? left / total : 0} size={220} stroke={12}>
            <Txt v="mega" size={running ? 44 : 30} style={{ fontVariant: ['tabular-nums'] }}>
              {running ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : saved.numbAt ? 'Voorbij' : 'Start'}
            </Txt>
            <Txt v="small" color={C.muted}>
              {running ? `tot ±${clock(toWall(saved.numbAt + total))}` : saved.numbAt ? 'Het gevoel komt terug' : 'Tik hieronder na de prik'}
            </Txt>
          </Ring>
          {running ? (
            <Button title="Het gevoel is al terug" kind="line" size="sm" icon="check" onPress={() => update({ numbAt: 0 })} />
          ) : (
            <Button
              title="Ik ben net verdoofd"
              icon="timer"
              kind="blue"
              onPress={() => {
                tap('success');
                update({ numbAt: Date.now(), numbFor: kind });
              }}
            />
          )}
        </Card>
      </PopIn>
      <Card style={kid ? { borderColor: C.warn, borderWidth: 1.5 } : null}>
        <Bracket color={kid ? C.warn : C.muted}>{kid ? 'Let op bij kinderen' : 'Zolang je verdoofd bent'}</Bracket>
        {[
          { icon: 'thermo' as const, text: 'Drink en eet niets heets: je voelt niet of het te heet is.' },
          { icon: 'alert' as const, text: kid ? 'Kinderen bijten of zuigen op hun verdoofde lip zonder het te merken. Houd ze in de gaten tot het gevoel terug is.' : 'Bijt niet op je lip, wang of tong; je voelt het niet.' },
          { icon: 'bowl' as const, text: 'Eet pas als het gevoel terug is. Drinken mag, voorzichtig.' },
        ].map((r) => (
          <Row key={r.text} gap={10} align="flex-start" style={{ paddingVertical: 6, marginTop: 4 }}>
            <Icon name={r.icon} size={16} color={kid ? C.warn : C.blue} />
            <Txt v="body" style={{ flex: 1 }}>
              {r.text}
            </Txt>
          </Row>
        ))}
      </Card>
      <View>
        <Txt v="small" color={C.muted}>
          Is je lip of tong de volgende dag nog gevoelloos, bel dan de kliniek.
        </Txt>
      </View>
    </Screen>
  );
}
