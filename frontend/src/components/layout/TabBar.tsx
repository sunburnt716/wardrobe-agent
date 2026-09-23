/**
 * The floating pill tab bar — one raised white card, five equal columns,
 * an 18px terracotta rule under the active label. Passed to React
 * Navigation as a custom `tabBar`.
 */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colour, radius, space } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { PressScale } from '../primitives/PressScale';

/** Space a screen should leave at the bottom so content clears the bar. */
export const TAB_BAR_SPACE = 96;

const ICONS: Record<string, string> = {
  today: 'sparkle',
  closet: 'coat-hanger',
  add: 'camera-plus',
  ask: 'chat-teardrop-dots',
  fits: 'bookmark-simple',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad =
    insets.bottom > 0 ? insets.bottom + 6 : Platform.OS === 'ios' ? space.homeIndicator : 16;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={[styles.card, shadow('tabBar')]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const colourFor = focused ? colour.brand : colour.inkA(0.8);
          const label = route.name.charAt(0).toUpperCase() + route.name.slice(1);

          return (
            <PressScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              <Icon
                name={ICONS[route.name] ?? 'sparkle'}
                size={19}
                color={colourFor}
              />
              <AppText
                variant="microLabelSm"
                style={{ color: colourFor, fontSize: 10, letterSpacing: 1 }}
              >
                {label}
              </AppText>
              <View
                style={[
                  styles.rule,
                  { width: focused ? 18 : 0, backgroundColor: colour.brand },
                ]}
              />
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colour.paper,
    borderRadius: radius.card,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  rule: {
    height: 2,
    borderRadius: radius.pill,
  },
});
