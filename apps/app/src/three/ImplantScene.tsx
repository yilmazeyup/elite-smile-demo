import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';

/** Natively the implant is not drawn in 3D; its icon keeps the place. */
export function ImplantScene({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name="implant" size={96} color="#7FC9F2" stroke={1.2} />
    </View>
  );
}
