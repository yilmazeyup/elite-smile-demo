import { LOGO_BLUE, TOOTH_PATH, TOOTH_TRANSFORM, TOOTH_VIEWBOX } from '@smile/shared';
import { Image } from 'expo-image';
import { useRef } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { LOGO } from '../photos';
import { useTheme } from '../state/theme';

/** The logo as Elite Smile uses it: navy "ELITE" on light, white "ELITE" on the night look. */
export function Logo({ width = 150, onDark }: { width?: number; onDark?: boolean }) {
  const { mode } = useTheme();
  const dark = onDark ?? mode === 'night';
  return <Image source={dark ? LOGO.dark : LOGO.light} style={{ width, height: width * (288 / 1324) }} contentFit="contain" accessibilityLabel="Elite Smile" />;
}

let seq = 0;

/** The tooth with the smile and braces from the logo, deep blue running into sky blue (or one colour). */
export function ToothMark({ size = 40, color }: { size?: number; color?: string }) {
  const id = useRef(`tooth-${++seq}`).current;
  return (
    <Svg width={size} height={size * (884 / 902)} viewBox={TOOTH_VIEWBOX}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor={LOGO_BLUE.deep} />
          <Stop offset="1" stopColor={LOGO_BLUE.sky} />
        </LinearGradient>
      </Defs>
      <G transform={TOOTH_TRANSFORM}>
        <Path d={TOOTH_PATH} fill={color ?? `url(#${id})`} />
      </G>
    </Svg>
  );
}
