/**
 * PROPOSAL ONLY. ScreenScaffold for a scrolling screen whose chrome yields.
 *
 * The structural difference from components/layout/ScreenScaffold: the header
 * block is ABSOLUTELY POSITIONED over the scroll view instead of sitting
 * above it in flow, and the scroll content carries an equal top padding. That
 * ordering is what makes hiding the header actually return the space -- a
 * header translated up while still in flow would just leave a gap, and the
 * content would gain nothing. The gain is the whole point: ~32% of the screen
 * was chrome.
 *
 * The StatusPill stays pinned and never yields. It is the weather live
 * activity -- the thing you most want while deciding what to wear -- and the
 * design has it fusing with the Dynamic Island, so it is not scroll furniture.
 *
 * `children` must be the Animated.ScrollView; this component supplies the
 * padding it needs via `scrollTopPad`.
 */
import { useState, type ReactNode } from 'react';
import { StatusBar, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/tokens';
import { StatusPill } from '../components/layout/StatusPill';
import { useChrome } from './ChromeContext';
import { TAB_BAR_TOTAL } from './YieldingTabBar';

/**
 * Extra room below the header block before content starts.
 *
 * NOTE: `headerH` is the measured height of the header block, and that block
 * already carries `paddingTop: topPad` in its own style — so the measurement
 * INCLUDES topPad. Adding topPad to it again double-counts the status-pill
 * clearance and leaves a ~100px hole above the first row. That was the gap on
 * Closet. Measure once, add once.
 */
const HEADER_GAP = 4;

export interface YieldScaffoldProps {
  wash: string;
  pillIcon?: string;
  pillLabel: string;
  light?: boolean;
  /** The dateline plus any sub-row (filter words, week strip). Yields. */
  header: ReactNode;
  /** Receives the top padding the floating header needs. */
  children: (scrollTopPad: number) => ReactNode;
}

export function YieldScaffold({
  wash,
  pillIcon,
  pillLabel,
  light = false,
  header,
  children,
}: YieldScaffoldProps) {
  const insets = useSafeAreaInsets();
  const { hidden } = useChrome();
  const [headerH, setHeaderH] = useState(0);

  // Clears the status pill, exactly as ScreenScaffold does.
  const topPad = Math.max(space.datelineTop, insets.top + 44);

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - headerH) > 1) setHeaderH(h);
  };

  // transform + opacity only, and `headerH` is a plain number, so the worklet
  // closure stays serializable. It already includes topPad, so translating by
  // it clears the whole block — adding topPad would over-travel, for the same
  // reason the padding double-counted.
  const headerStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: -hidden.value * headerH }],
  }));

  // Before the first onLayout there is no measurement; estimate from topPad
  // plus a typical dateline + sub-row so the first frame is close, then the
  // measurement corrects it.
  const scrollTopPad = (headerH > 0 ? headerH : topPad + 84) + HEADER_GAP;

  return (
    <View style={[styles.root, { backgroundColor: wash }]}>
      <StatusBar
        barStyle={light ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <StatusPill icon={pillIcon} label={pillLabel} dark />

      {children(scrollTopPad)}

      <Animated.View
        pointerEvents="box-none"
        onLayout={onHeaderLayout}
        style={[
          styles.headerBlock,
          // Opaque, or the content scrolling underneath shows through it.
          { paddingTop: topPad, backgroundColor: wash },
          headerStyle,
        ]}
      >
        {header}
      </Animated.View>
    </View>
  );
}

/** Bottom padding a yielding screen's scroll content needs to clear the bar. */
export function useScrollBottomPad(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_TOTAL + insets.bottom;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBlock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Under the status pill (zIndex 9), over the scrolling content.
    zIndex: 5,
  },
});
