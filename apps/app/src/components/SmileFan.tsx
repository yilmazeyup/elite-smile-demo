import { VITA } from '@smile/shared';
import { useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

import { tr } from '../i18n';
import { SHADE_GROUP, shadeEdge, shadeHex, shadeIndex } from '../lib/smileShade';
import { C, web } from '../theme';
import { Icon } from './Icon';
import { Flip, Press, tap, Txt } from './ui';

const H = 176;
/** The pivot sits below the box, so only the porcelain ends and the top of the holders show, like a guide in a hand. */
const DROP = 96;
const TAB_W = 30;
/** Room above the middle tab for the chosen one to rise. */
const HEAD = 26;

/**
 * The VITA classical guide as a fan of sixteen tabs, lightest (B1) on the left to darkest (C4) on the right. Tap a tab
 * or slide a finger over the fan; the chosen tab rises out of it. The patient's own measured shade has a small mark.
 */
export function SmileFan({ value, onChange, mine, compact }: { value: string; onChange: (shade: string) => void; mine?: string | null; compact?: boolean }) {
  const [w, setW] = useState(340);
  const last = useRef(value);
  last.current = value;
  const h = compact ? 150 : H;
  const pivotY = h + DROP;
  const tabH = pivotY - HEAD;
  // As wide as the box allows, at most forty degrees to each side.
  const spread = Math.min(40, (Math.asin(Math.min(1, (w - TAB_W - 16) / (2 * tabH))) * 180) / Math.PI);
  const step = (spread * 2) / (VITA.length - 1);
  const sel = shadeIndex(value);

  const pick = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const angle = (Math.atan2(locationX - w / 2, pivotY - locationY) * 180) / Math.PI;
    const i = Math.max(0, Math.min(VITA.length - 1, Math.round((angle + spread) / step)));
    if (VITA[i] !== last.current) {
      tap('select');
      last.current = VITA[i];
      onChange(VITA[i]);
    }
  };

  const move = (d: number) => onChange(VITA[Math.max(0, Math.min(VITA.length - 1, sel + d))]);

  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h, overflow: 'hidden' }}>
        {/* a soft pool of light the fan stands in */}
        <View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: '10%', right: '10%', bottom: -40, height: 120, borderRadius: 999 },
            web({ backgroundImage: 'radial-gradient(closest-side,rgba(45,180,232,.16),rgba(45,180,232,0))' }),
          ]}
        />
        {VITA.map((shade, i) => {
          const angle = -spread + i * step;
          const on = i === sel;
          const isMine = shade === mine;
          return (
            <View
              key={shade}
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: w / 2 - TAB_W / 2,
                  top: pivotY - tabH,
                  width: TAB_W,
                  height: tabH,
                  zIndex: on ? 40 : i,
                  transformOrigin: '50% 100%',
                  transform: [{ rotate: `${angle}deg` }, { translateY: on ? -16 : 0 }],
                },
                web({ transition: 'transform .5s cubic-bezier(.2,.9,.25,1.12)' }),
              ]}
            >
              {/* the porcelain: translucent edge, body, warmer neck */}
              <View
                style={[
                  {
                    height: 50,
                    borderTopLeftRadius: 13,
                    borderTopRightRadius: 13,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    backgroundColor: shadeHex(shade),
                    borderWidth: 1,
                    borderColor: on ? 'rgba(10,99,181,0.55)' : 'rgba(11,26,58,0.10)',
                  },
                  web({
                    backgroundImage: `linear-gradient(180deg,${shadeEdge(shade, 'incisal')} 0%,${shadeHex(shade)} 38%,${shadeHex(shade)} 62%,${shadeEdge(shade, 'cervical')} 100%)`,
                    boxShadow: on
                      ? '0 14px 26px -10px rgba(11,26,58,.45), inset 0 1px 0 rgba(255,255,255,.9), inset 0 -3px 6px rgba(120,80,30,.12)'
                      : '0 6px 14px -8px rgba(11,26,58,.35), inset 0 1px 0 rgba(255,255,255,.8), inset 0 -3px 6px rgba(120,80,30,.10)',
                  }),
                ]}
              >
                {/* the sheen across the enamel */}
                <View pointerEvents="none" style={[{ position: 'absolute', left: 5, top: 6, width: 6, height: 22, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' }, web({ filter: 'blur(1.5px)' })]} />
              </View>
              {/* the holder, with the code on it */}
              <View
                style={[
                  {
                    flex: 1,
                    marginTop: -3,
                    marginHorizontal: 6,
                    borderTopLeftRadius: 5,
                    borderTopRightRadius: 5,
                    backgroundColor: on ? '#0A63B5' : '#E3E9F3',
                    borderWidth: 1,
                    borderColor: on ? 'rgba(10,99,181,0.9)' : 'rgba(11,26,58,0.10)',
                    alignItems: 'center',
                    paddingTop: 8,
                  },
                  web({
                    backgroundImage: on ? 'linear-gradient(180deg,#2DB4E8,#0A63B5 40%,#16306F)' : 'linear-gradient(180deg,#F4F7FC,#DCE4F0 60%,#CBD5E5)',
                    boxShadow: on ? '0 10px 20px -10px rgba(10,99,181,.6)' : '1px 0 0 rgba(255,255,255,.7) inset',
                  }),
                ]}
              >
                <Txt v="label" size={shade.length > 2 ? 6.2 : 7.5} color={on ? '#FFFFFF' : '#5B6B8C'} style={{ letterSpacing: 0 }} numberOfLines={1}>
                  {shade}
                </Txt>
                {isMine ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#2DB4E8', marginTop: 5 }} /> : null}
              </View>
            </View>
          );
        })}
        {/* one surface that takes the finger: tap or slide over the fan */}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={tr('Kies een tint')}
          accessibilityValue={{ text: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => move(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={pick}
          onResponderMove={pick}
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 60 }, web({ touchAction: 'pan-y', cursor: 'pointer' })]}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <Press onPress={() => move(-1)} disabled={sel === 0} accessibilityLabel={tr('Lichter')} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.paper }}>
          <Flip>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="chevron" size={18} color={C.ink} />
            </View>
          </Flip>
        </Press>
        <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
          <Txt v="display" size={compact ? 26 : 32}>
            {value}
          </Txt>
          <Txt v="label" color={C.muted} size={9.5}>
            {`${tr('VITA')} · ${tr(SHADE_GROUP[value[0]] ?? '')}`}
          </Txt>
        </View>
        <Press onPress={() => move(1)} disabled={sel === VITA.length - 1} accessibilityLabel={tr('Donkerder')} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.paper }}>
          <Flip>
            <Icon name="chevron" size={18} color={C.ink} />
          </Flip>
        </Press>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 6 }}>
        <Txt v="label" size={9} color={C.muted}>
          Lichter
        </Txt>
        <Txt v="label" size={9} color={C.muted}>
          Donkerder
        </Txt>
      </View>
    </View>
  );
}
