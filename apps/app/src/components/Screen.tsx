import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rtl } from '../i18n';
import { C, fx, MAX_WIDTH, PAD } from '../theme';
import { Bracket, IconButton, Txt } from './ui';

/** The page behind every screen: porcelain with a slow pearl light (deep navy with blue light at night). */
export function Backdrop({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" {...fx('pearl')} style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }, style]} />;
}

type ScreenProps = PropsWithChildren<{
  title?: string;
  kicker?: string;
  serif?: string;
  /** Shows a back button; on a fresh deep link with no history it goes home. */
  back?: boolean;
  right?: ReactNode;
  /** Inside the tabs: room at the bottom for the tab bar. */
  tabs?: boolean;
  /** Full-bleed content above the padded column. */
  hero?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  gap?: number;
}>;

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Screen({ title, kicker, serif, back, right, tabs, hero, scroll = true, contentStyle, footer, gap = 18, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const header =
    title || back || right ? (
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: PAD, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          {back ? (
            <View style={rtl() ? { transform: [{ scaleX: -1 }] } : null}>
              <IconButton name="back" label="Terug" onPress={goBack} />
            </View>
          ) : (
            <View />
          )}
          {right ?? <View />}
        </View>
        {title ? (
          <View style={{ gap: 6, marginTop: 2 }}>
            {kicker ? <Bracket color={C.blue}>{kicker}</Bracket> : null}
            <Txt v="display">{title}</Txt>
            {serif ? (
              <Txt v="serif" size={18} color={C.soft}>
                {serif}
              </Txt>
            ) : null}
          </View>
        ) : null}
      </View>
    ) : null;

  const body = (
    <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
      {header}
      {hero}
      <View style={[{ paddingHorizontal: PAD, paddingTop: 18, gap }, contentStyle]}>{children}</View>
      <View style={{ height: (tabs ? 130 : 48) + insets.bottom + (footer ? 90 : 0) }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 14, paddingTop: 14, paddingHorizontal: PAD, alignItems: 'center' }}>
          <View {...fx('glass-strong')} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.glass, borderTopWidth: 1, borderColor: C.line }} />
          <View style={{ width: '100%', maxWidth: MAX_WIDTH - PAD * 2 }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}
