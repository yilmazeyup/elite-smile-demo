import { View } from 'react-native';

import type { Canvas3DProps } from './types';

export type { Scene3D, Stage } from './types';

/** Natively the 3D scenes are not drawn; the box stays, so layouts hold. */
export function Canvas3D({ style }: Canvas3DProps) {
  return <View style={style} />;
}

export const pageIsNight = () => true;
