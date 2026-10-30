import type { Tooth } from '@smile/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';
import type { BrushState } from './BrushScene.web';

export type { BrushState };

/** Natively the 3D mouth is not drawn; the timer and the quadrant map still coach you. */
export function BrushScene({ style }: { teeth: Tooth[]; state: { current: BrushState }; skin: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name="brush" size={96} color="#2DB4E8" stroke={1.3} />
    </View>
  );
}
