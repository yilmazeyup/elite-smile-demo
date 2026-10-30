import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';
import { Txt } from './ui';

export type WoundSource = 'camera' | 'upload' | 'sample';

export type WoundCameraProps = {
  value: string | null;
  source: WoundSource | null;
  onChange: (photo: string | null, source: WoundSource | null) => void;
  style?: StyleProp<ViewStyle>;
};

/** Natively the guided camera is not built yet; the web app has it. The box stays, so the layout holds. */
export function WoundCamera({ style }: WoundCameraProps) {
  return (
    <View style={[{ borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B1A3A', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, style]}>
      <Icon name="camera" size={30} color="#7FD3F2" />
      <Txt v="h3" color="#FFFFFF" align="center">
        De begeleide camera werkt in de webversie van de app.
      </Txt>
    </View>
  );
}
