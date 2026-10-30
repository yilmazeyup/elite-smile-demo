import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../i18n';
import { C, fx, MAX_WIDTH } from '../theme';
import { Icon, type IconName } from './Icon';
import { ToothMark } from './Logo';
import { Press, Txt } from './ui';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Vandaag', icon: 'home' },
  afspraken: { label: 'Afspraken', icon: 'calendar' },
  zorg: { label: 'Zorg', icon: 'heart' },
  gebit: { label: 'Mijn gebit', icon: 'tooth' },
};

/**
 * A floating bar of frosted porcelain with booking raised in the middle: the tooth from the logo on navy, because a
 * free check-up is what the clinic offers first.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);
  const item = (route: (typeof routes)[number]) => {
    const tab = TABS[route.name];
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    return (
      <Press
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tr(tab.label)}
        scaleTo={0.9}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, height: 62 }}
      >
        <Icon name={tab.icon} size={22} color={focused ? C.blue : C.muted} stroke={focused ? 2.1 : 1.7} />
        <Txt v="small" size={10.5} weight={focused ? '700' : '600'} numberOfLines={1} color={focused ? C.ink : C.muted}>
          {tab.label}
        </Txt>
        <View style={{ position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: focused ? C.sky : 'transparent' }} />
      </Press>
    );
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View
        {...fx('glass-strong')}
        style={{ width: '92%', maxWidth: MAX_WIDTH - 36, height: 66, borderRadius: 33, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}
      >
        {left.map(item)}
        <Press
          accessibilityLabel={tr('Afspraak maken')}
          scaleTo={0.9}
          onPress={() => router.push('/afspraak')}
          fxNames="dye-navy glow"
          style={{ width: 62, height: 62, borderRadius: 31, marginHorizontal: 4, marginTop: -26, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg }}
        >
          <ToothMark size={30} color="#FFFFFF" />
          <View style={{ position: 'absolute', right: 9, top: 9, width: 15, height: 15, borderRadius: 8, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.navy }}>
            <Icon name="plus" size={9} color="#FFFFFF" stroke={3} />
          </View>
        </Press>
        {right.map(item)}
      </View>
    </View>
  );
}
