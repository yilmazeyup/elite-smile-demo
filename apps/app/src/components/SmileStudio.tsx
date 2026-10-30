import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PHOTOS } from '../photos';
import { Txt } from './ui';

export type StudioStatus = 'loading' | 'scanning' | 'found' | 'measured' | 'none' | 'error';
export type StudioInfo = { status: StudioStatus; estimate: string | null; own: boolean };

export type SmileStudioProps = {
  photo: string | null;
  shade: string;
  before: string | null;
  facings: boolean;
  onInfo?: (info: StudioInfo) => void;
  style?: StyleProp<ViewStyle>;
};

/** Natively the photo shows as it is; the colour work runs in the web app (it needs a canvas and the face model). */
export function SmileStudio({ photo, style }: SmileStudioProps) {
  return (
    <View style={[{ borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B1A3A' }, style]}>
      <Image source={photo ? { uri: photo } : PHOTOS.smile} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition={{ top: '45%', left: '53%' }} />
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, padding: 12, borderRadius: 14, backgroundColor: 'rgba(8,16,38,0.7)' }}>
        <Txt v="small" color="#FFFFFF">
          De kleurstudio werkt in de webversie van de app.
        </Txt>
      </View>
    </View>
  );
}
