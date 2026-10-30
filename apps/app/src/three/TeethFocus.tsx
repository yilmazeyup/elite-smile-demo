import type { Tooth } from '@smile/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ToothMark } from '../components/Logo';

/** Natively the single tooth is not drawn in 3D; the logo's tooth keeps its place. */
export function TeethFocus({ style }: { tooth: Tooth; cut: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ToothMark size={140} />
    </View>
  );
}
