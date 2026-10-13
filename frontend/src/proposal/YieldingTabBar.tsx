/**
 * PROPOSAL ONLY. The floating pill tab bar, with two changes from
 * components/layout/TabBar.
 *
 * 1. FOUR destinations, not five. `add` is gone -- it is a verb, and Apple's
 *    guidance is that tabs are for navigation, not for taking action (they
 *    moved an Add button out of the tab bar for exactly this reason).
 *    Instagram did the same in 2025-26, moving `+` to the header. Add now
 *    lives in ProposalHeader's left slot.
 * 2. It YIELDS on scroll, sliding down out of the way and fading. iOS's 2025
 *    design language does this natively (the tab bar floats above content and
 *    can minimise on scroll); Pinterest has done it for years.
 *
 * Labels stay. Pinterest's unlabelled bar is the counter-example here, not
 * the model: NN/g's position is that icon meaning has no standard usage and a
 * text label must be present, and Apple says the same. Minimal means fewer
 * destinations, not less clarity.
 */
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colour, radius, space } from '../theme/tokens';
import { shadow } from '../theme/shadows';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { PressScale } from '../components/primitives/PressScale';
import { useChrome } from './ChromeContext';

/** Bar height plus its own top padding — what content must clear. */
export const TAB_BAR_TOTAL = 92;

export interface Destination {
  key: string;
  label: string;
  icon: string;
}

/** Four destinations. Every one is a place; none is an action. */
export const DESTINATIONS: Destination[] = [
  { key: 'today', label: 'Today', icon: 'sparkle' },
  { key: 'closet', label: 'Closet', icon: 'coat-hanger' },
  { key: 'ask', label: 'Ask', icon: 'chat-teardrop-dots' },
  { key: 'fits', label: 'Fits', icon: 'bookmark-simple' },
];

export function YieldingTabBar({
  index,
  onSelect,
  savedCount,
}: {
  index: number;
  onSelect: (i: number) => void;
  savedCount: number;
}) {
  const insets = useSafeAreaInsets();
  const { hidden } = useChrome();

  const bottomPad =
    insets.bottom > 0
      ? insets.bottom + 6
      : Platform.OS === 'ios'
        ? space.homeIndicator
        : 16;

  // Slide the whole thing past its own full height so no sliver remains.
  const travel = TAB_BAR_TOTAL + bottomPad;

  const barStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * travel }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }, barStyle]}
    >
      <View style={[styles.card, shadow('tabBar')]}>
        {DESTINATIONS.map((d, i) => {
          const focused = index === i;
          const tint = focused ? colour.brand : colour.inkA(0.8);
          // Fits owns saved looks, so the count belongs on that tab.
          const badge = d.key === 'fits' && savedCount > 0 ? savedCount : null;

          return (
            <PressScale
              key={d.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                badge ? `${d.label}, ${badge} saved` : d.label
              }
              style={styles.tab}
              onPress={() => onSelect(i)}
            >
              <View>
                <Icon name={d.icon} size={19} color={tint} />
                {badge ? (
                  <View style={styles.badge}>
                    <AppText variant="microLabelSm" style={styles.badgeText}>
                      {badge}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText
                variant="microLabelSm"
                style={{ color: tint, fontSize: 10, letterSpacing: 1 }}
              >
                {d.label}
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
    </Animated.View>
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
    zIndex: 8,
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
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 15,
    height: 15,
    borderRadius: radius.pill,
    paddingHorizontal: 3,
    backgroundColor: colour.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colour.paperAlt,
    fontSize: 9,
    letterSpacing: 0,
  },
});
