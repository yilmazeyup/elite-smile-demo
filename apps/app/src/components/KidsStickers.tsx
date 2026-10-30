import { useRef } from 'react';
import { Animated, View } from 'react-native';

import { tr } from '../i18n';
import { STICKERS, type Sticker } from '../lib/kidsCorner';
import { C, web } from '../theme';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { nativeDriver, prefersReducedMotion, Press, tap, Txt } from './ui';

function Badge({ s, have, i }: { s: Sticker; have: boolean; i: number }) {
  const toast = useToast();
  const wob = useRef(new Animated.Value(0)).current;
  const tilt = ((i * 37) % 13) - 6;
  const wobble = () => {
    if (prefersReducedMotion()) return;
    wob.setValue(0);
    Animated.sequence([
      Animated.timing(wob, { toValue: 1, duration: 110, useNativeDriver: nativeDriver }),
      Animated.timing(wob, { toValue: -1, duration: 140, useNativeDriver: nativeDriver }),
      Animated.spring(wob, { toValue: 0, stiffness: 260, damping: 8, useNativeDriver: nativeDriver }),
    ]).start();
  };
  return (
    <Press
      onPress={() => {
        wobble();
        if (have) {
          tap('success');
          toast(tr(s.name), { text: tr('In je stickerboek'), icon: s.icon });
        } else toast(tr('Nog op slot'), { text: tr(s.hint), icon: 'lock' });
      }}
      scaleTo={0.9}
      accessibilityLabel={`${tr(s.name)}${have ? '' : `, ${tr('op slot')}`}`}
      style={{ width: '25%', alignItems: 'center', gap: 7, paddingVertical: 6 }}
    >
      <Animated.View
        style={[
          {
            width: 64,
            height: 64,
            borderRadius: 32,
            padding: 4,
            backgroundColor: have ? '#FFFFFF' : 'transparent',
            borderWidth: have ? 0 : 1.5,
            borderColor: C.line2,
            borderStyle: have ? 'solid' : 'dashed',
            transform: [{ rotate: wob.interpolate({ inputRange: [-1, 0, 1], outputRange: [`${tilt - 12}deg`, `${tilt}deg`, `${tilt + 12}deg`] }) }],
          },
          have ? web({ boxShadow: '0 8px 18px -8px rgba(11,26,58,.35), 0 1px 2px rgba(11,26,58,.08)' }) : null,
        ]}
      >
        <View
          style={[
            { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: have ? s.color : C.bg2 },
            have ? web({ backgroundImage: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), linear-gradient(140deg, ${s.color}, ${s.color})` }) : null,
          ]}
        >
          <Icon name={have ? s.icon : 'lock'} size={have ? 26 : 18} color={have ? '#FFFFFF' : C.muted} stroke={2} />
        </View>
      </Animated.View>
      <Txt v="small" size={11.5} weight="600" color={have ? C.ink : C.muted} align="center" numberOfLines={2} style={{ minHeight: 30 }}>
        {s.name}
      </Txt>
    </Press>
  );
}

/** The sticker book: the ones you earned shine, the others wait behind a lock with a hint. */
export function KidsStickers({ have }: { have: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
      {STICKERS.map((s, i) => (
        <Badge key={s.id} s={s} have={have.includes(s.id)} i={i} />
      ))}
    </View>
  );
}
