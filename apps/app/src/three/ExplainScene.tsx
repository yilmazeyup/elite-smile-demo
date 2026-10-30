import type { ExplainerId } from '@smile/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ToothMark } from '../components/Logo';

/** Natively the 3D explainer is not drawn; the steps and their text still guide you. */
export function ExplainScene({ style }: { id: ExplainerId; progress: { current: number }; style?: StyleProp<ViewStyle>; onDrag?: (dragging: boolean) => void }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ToothMark size={120} color="#FFFFFF" />
    </View>
  );
}
