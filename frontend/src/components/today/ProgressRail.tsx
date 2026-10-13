/**
 * Segmented rail near the card bottom. The active segment grows to ~4× the
 * others; any segment is a direct tap target to jump to that look.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colour, radius, timing } from '../../theme/tokens';
import { PressScale } from '../primitives/PressScale';

// Resolved to plain strings at module scope, on purpose. A worklet captures
// its free variables into a `__closure` that is SERIALIZED into the UI
// runtime: shared values, numbers and strings cross fine, but a function
// cannot. Reading `colour.inkA(0.18)` inside the worklet captured the whole
// `colour` tokens object just to call that arrow function on the UI thread,
// which crashed the app at first paint. Keep these as strings and the closure
// stays serializable.
const BAR_OFF = colour.inkA(0.18);
const BAR_ON = colour.brand;

function Segment({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  // `flexGrow` is deliberately NOT animated. Returning a layout property from
  // useAnimatedStyle forces a Yoga layout pass on the UI thread every frame,
  // and on the New Architecture that segfaults the process at first paint --
  // it was the cause of the Expo Go startup crash. The width change is a
  // plain prop now, so React lays it out once per look change.
  //
  // Composing an animated style into PressScale is fine and was ruled out as
  // a cause. Colour still animates, since that is a paint property and safe
  // on the UI thread -- but note that being a safe PROPERTY was never the
  // whole story: this component then crashed a second time because the
  // worklet CALLED `colour.inkA()`. What a worklet may read and what it may
  // call are separate questions. See the BAR_OFF / BAR_ON note above.
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: timing.colour });
  }, [active, on]);

  // interpolateColor is itself a worklet, so it is safe to call here -- and it
  // actually crossfades. The previous `on.value > 0.5 ? a : b` snapped at the
  // midpoint, so `timing.colour` ("colour / opacity crossfades") produced no
  // visible transition at all.
  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [BAR_OFF, BAR_ON]),
  }));

  return (
    <PressScale
      onPress={onPress}
      style={[styles.segment, { flexGrow: active ? 4 : 1 }]}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </PressScale>
  );
}

export function ProgressRail({
  count,
  activeIndex,
  onJump,
}: {
  count: number;
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <View style={styles.rail}>
      {Array.from({ length: count }).map((_, i) => (
        <Segment key={i} active={i === activeIndex} onPress={() => onJump(i)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    gap: 5,
  },
  segment: {
    flexBasis: 0,
  },
  track: {
    height: 24,
    justifyContent: 'center',
  },
  bar: {
    width: '100%',
    height: 3,
    borderRadius: radius.pill,
  },
});
