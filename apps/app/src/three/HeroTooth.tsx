import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ToothMark } from '../components/Logo';

/** Natively the logo's tooth stands in for the 3D one. */
export function HeroTooth({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ToothMark size={120} />
    </View>
  );
}
