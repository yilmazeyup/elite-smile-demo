import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { tr } from '../i18n';
import { nativeDriver, prefersReducedMotion, Press } from './ui';

let seq = 0;

/** The golden key, drawn: an ornate bow, a shaft and a bit. */
export function KeyArt({ size = 34 }: { size?: number }) {
  const id = useRef(`key-${++seq}`).current;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE9A8" />
          <Stop offset="0.45" stopColor="#E7B54A" />
          <Stop offset="1" stopColor="#A9792A" />
        </LinearGradient>
      </Defs>
      <G transform="rotate(-38 24 24)">
        {/* bow: a ring with three petals */}
        <Circle cx={12} cy={24} r={8.5} fill="none" stroke={`url(#${id}-g)`} strokeWidth={3.6} />
        <Circle cx={4.2} cy={24} r={2.4} fill={`url(#${id}-g)`} />
        <Circle cx={12} cy={16} r={2.4} fill={`url(#${id}-g)`} />
        <Circle cx={12} cy={32} r={2.4} fill={`url(#${id}-g)`} />
        <Circle cx={12} cy={24} r={2.4} fill="#FFF4D2" />
        {/* shaft and bit */}
        <Path d="M20 22.2h22.5a1.8 1.8 0 0 1 0 3.6H20z" fill={`url(#${id}-g)`} />
        <Path d="M33 25.6h3.2v5h-3.2zM38.6 25.6h3.2v7h-3.2z" fill={`url(#${id}-g)`} />
        <Path d="M21 23.2h20" stroke="#FFF6D8" strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
      </G>
    </Svg>
  );
}

/**
 * A small golden key that drifts and glints somewhere on the Kinderhoek. The idea is from the Renaissance Edition
 * (Awwwards Site of the Month, February 2026): a floating key that unlocks a hidden layer.
 */
export function KidsKey({ onPress, style, open }: { onPress: () => void; style?: StyleProp<ViewStyle>; open?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const drift = Animated.loop(Animated.timing(t, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }));
    const shine = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(glint, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(glint, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    );
    drift.start();
    shine.start();
    return () => {
      drift.stop();
      shine.stop();
    };
  }, [t, glint]);
  const y = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -6, 0, 5, 0] });
  const r = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-8deg', '9deg', '-8deg'] });
  return (
    <Animated.View style={[{ transform: [{ translateY: y }, { rotate: r }] }, style]}>
      <Press onPress={onPress} accessibilityLabel={tr(open ? 'Gouden sleutel: sluit de geheime laag' : 'Een gouden sleutel')} scaleTo={0.85} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,200,90,0.22)', opacity: glint.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: glint.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }] }}
        />
        <KeyArt size={38} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 6, right: 8, opacity: glint, transform: [{ scale: glint }] }}>
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M6 0l1.2 4.8L12 6 7.2 7.2 6 12 4.8 7.2 0 6l4.8-1.2z" fill="#FFFFFF" />
          </Svg>
        </Animated.View>
      </Press>
    </Animated.View>
  );
}
