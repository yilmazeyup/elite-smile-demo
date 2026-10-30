import type { Tooth } from '@smile/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ToothMark } from '../components/Logo';

export type MouthView = 'front' | 'upper' | 'lower';

/** Natively the 3D mouth is not drawn; the logo's tooth keeps the place (the site plan view works everywhere). */
export function MouthScene({ style }: { teeth: Tooth[]; selected: number | null; onSelect: (n: number | null) => void; view: MouthView; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ToothMark size={110} />
    </View>
  );
}
