import { useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { PanResponder, View, type StyleProp, type ViewStyle } from 'react-native';

import { tap } from '../components/ui';
import { rtl, tr } from '../i18n';
import { C, fx, web } from '../theme';

/**
 * A calm slider: a thin track filled with the logo's blue and a porcelain thumb, 44 px tall to touch. Optional ticks
 * (step chips sit elsewhere) snap with a tiny tick. Mirrors in right-to-left languages.
 */
export function Slider({
  value,
  onChange,
  onStart,
  onEnd,
  label,
  ticks,
  dark,
  style,
  children,
}: {
  value: number;
  onChange: (v: number) => void;
  onStart?: () => void;
  onEnd?: (v: number) => void;
  label: string;
  /** Positions 0 … 1 where it ticks as you pass. */
  ticks?: number[];
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const track = useRef<ComponentRef<typeof View>>(null);
  const box = useRef({ x: 0, w: 1 });
  const [w, setW] = useState(1);
  const last = useRef(value);
  const cb = useRef({ onChange, onStart, onEnd, ticks });
  cb.current = { onChange, onStart, onEnd, ticks };
  const flip = rtl();

  const at = (pageX: number) => {
    const t = Math.min(1, Math.max(0, (pageX - box.current.x) / box.current.w));
    return flip ? 1 - t : t;
  };
  const emit = (v: number) => {
    const t = cb.current.ticks;
    if (t?.some((k) => (last.current - k) * (v - k) < 0)) tap('select');
    last.current = v;
    cb.current.onChange(v);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const pageX = e.nativeEvent.pageX;
          cb.current.onStart?.();
          track.current?.measure((_x: number, _y: number, width: number, _h: number, px: number) => {
            box.current = { x: px, w: Math.max(1, width) };
            emit(at(pageX));
          });
        },
        onPanResponderMove: (e) => emit(at(e.nativeEvent.pageX)),
        onPanResponderRelease: () => cb.current.onEnd?.(last.current),
        onPanResponderTerminate: () => cb.current.onEnd?.(last.current),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const v = Math.min(1, Math.max(0, value));
  const x = (flip ? 1 - v : v) * w;
  return (
    <View
      ref={track}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={tr(label)}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => emit(Math.min(1, Math.max(0, v + (e.nativeEvent.actionName === 'increment' ? 0.05 : -0.05))))}
      onLayout={(e) => {
        setW(e.nativeEvent.layout.width);
        box.current.w = e.nativeEvent.layout.width;
      }}
      {...fx('pointer nosel')}
      style={[{ height: 44, justifyContent: 'center' }, web({ touchAction: 'none' }), style]}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: dark ? 'rgba(255,255,255,0.16)' : C.line2, overflow: 'hidden' }}>
        <View {...fx('dye-blue')} style={{ position: 'absolute', top: 0, bottom: 0, left: flip ? x : 0, width: flip ? w - x : x, backgroundColor: '#0A63B5' }} />
      </View>
      {ticks?.map((k) => (
        <View key={k} pointerEvents="none" style={{ position: 'absolute', left: (flip ? 1 - k : k) * w - 1, top: 16, width: 2, height: 12, borderRadius: 1, backgroundColor: dark ? 'rgba(255,255,255,0.3)' : C.line2 }} />
      ))}
      <View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: x - 13, top: 9, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(11,26,58,0.12)' },
          web({ boxShadow: '0 4px 14px -4px rgba(11,26,58,.45)' }),
        ]}
      >
        {children}
      </View>
    </View>
  );
}
