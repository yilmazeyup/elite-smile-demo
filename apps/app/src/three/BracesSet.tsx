import { View, type StyleProp, type ViewStyle } from 'react-native';

export type BracesSetProps = { colors: string[]; spin: number; style?: StyleProp<ViewStyle> };

/** Natively the 3D set is not drawn; a row of coloured rings stands in, so the layout holds. */
export function BracesSet({ colors, style }: BracesSetProps) {
  const list = colors.length ? colors : ['#B7C3D9'];
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }, style]}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 6, borderColor: list[i % list.length] }} />
      ))}
    </View>
  );
}
