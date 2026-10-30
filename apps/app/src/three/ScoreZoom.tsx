import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ToothMark } from '../components/Logo';

/** Natively the zoom into the enamel is not drawn; the score itself works everywhere. */
export function ScoreZoom({ style }: { zoom: { current: number }; onZoom: (z: number) => void; onScale: (label: string) => void; onBugs: (alive: number, brushed: number) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ToothMark size={110} />
    </View>
  );
}
