import type { MutableRefObject } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ToothMark } from '../components/Logo';

export type DoodleApi = { undo: () => void; clear: () => void; save: () => boolean; strokes: () => number };

export type KidsDoodleToothProps = {
  color: string;
  kid: string;
  api: MutableRefObject<DoodleApi | null>;
  onChange?: (strokes: number) => void;
  style?: StyleProp<ViewStyle>;
};

/** Natively the logo's tooth stands in; painting in 3D runs in the web app. */
export function KidsDoodleTooth({ style }: KidsDoodleToothProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ToothMark size={120} />
    </View>
  );
}
