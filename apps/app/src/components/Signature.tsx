import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tr } from '../i18n';
import { C, fx, R } from '../theme';
import { Icon } from './Icon';
import { Press, Txt } from './ui';

/** A place to sign with a finger: strokes become one smooth SVG path. */
export function Signature({ onChange, height = 150 }: { onChange: (signed: boolean) => void; height?: number }) {
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef<string>('');
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        current.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        setPaths((p) => [...p, current.current]);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        current.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        setPaths((p) => [...p.slice(0, -1), current.current]);
      },
      onPanResponderRelease: () => {
        onChange(true);
      },
    }),
  ).current;
  return (
    <View style={{ gap: 8 }}>
      <View
        {...responder.panHandlers}
        {...fx('grab')}
        accessibilityLabel={tr('Teken hier')}
        style={{ height, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line2, backgroundColor: C.paper, overflow: 'hidden' }}
      >
        <Svg width="100%" height="100%" pointerEvents="none">
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke="#0B1A3A" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
        {!paths.length ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 18, borderTopWidth: 1, borderColor: C.line2, paddingTop: 6 }}>
            <Txt v="label" color={C.muted}>
              Teken hier
            </Txt>
          </View>
        ) : null}
      </View>
      {paths.length ? (
        <Press
          onPress={() => {
            setPaths([]);
            onChange(false);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}
        >
          <Icon name="undo" size={15} color={C.muted} />
          <Txt v="small" color={C.muted}>
            Opnieuw
          </Txt>
        </Press>
      ) : null}
    </View>
  );
}
