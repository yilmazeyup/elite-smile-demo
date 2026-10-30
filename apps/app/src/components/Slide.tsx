import { useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';

import { rtl, tr } from '../i18n';
import { C, fx, R } from '../theme';
import { Icon } from './Icon';
import { nativeDriver, tap, Txt } from './ui';

/**
 * Slide to confirm: a navy handle you drag along a track (Son Daven's "Drag to slide", Awwwards Site of the Month June
 * 2026). Past most of the way it snaps through and confirms; let go earlier and it springs back.
 */
export function Slide({ label, done, onDone }: { label: string; done?: string; onDone: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(300);
  const [finished, setFinished] = useState(false);
  const max = Math.max(1, width - 64);
  const dir = rtl() ? -1 : 1;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        if (finished) return;
        x.setValue(Math.max(0, Math.min(max, g.dx * dir)));
      },
      onPanResponderRelease: (_e, g) => {
        // A mouse drag on the web can leave text selected; clear it.
        if (typeof window !== 'undefined') window.getSelection?.()?.removeAllRanges();
        if (finished) return;
        if (g.dx * dir > max * 0.82) {
          Animated.spring(x, { toValue: max, useNativeDriver: nativeDriver, stiffness: 260, damping: 24 }).start();
          setFinished(true);
          tap('success');
          onDone();
        } else Animated.spring(x, { toValue: 0, useNativeDriver: nativeDriver, stiffness: 300, damping: 18 }).start();
      },
    }),
  ).current;
  const fade = x.interpolate({ inputRange: [0, max * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <View
      {...fx('nosel')}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={tr(label)}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => {
        if (!finished) {
          setFinished(true);
          onDone();
        }
      }}
      style={{ height: 64, borderRadius: R.pill, backgroundColor: finished ? C.ok : C.bg2, borderWidth: 1, borderColor: C.line, justifyContent: 'center', overflow: 'hidden' }}
    >
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', opacity: finished ? 1 : fade }}>
        <Txt v="h3" color={finished ? '#FFFFFF' : C.soft} weight="700">
          {finished ? (done ?? label) : label}
        </Txt>
      </Animated.View>
      <Animated.View
        {...responder.panHandlers}
        {...fx('grab dye-navy')}
        style={{
          position: 'absolute',
          [rtl() ? 'right' : 'left']: 4,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.navy,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: Animated.multiply(x, dir) }],
        }}
      >
        <View style={rtl() ? { transform: [{ scaleX: -1 }] } : null}>
          <Icon name={finished ? 'check' : 'arrow'} size={22} color="#FFFFFF" stroke={2.2} />
        </View>
      </Animated.View>
    </View>
  );
}
