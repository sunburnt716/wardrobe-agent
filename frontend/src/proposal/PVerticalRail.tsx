/**
 * PROPOSAL ONLY. The progress rail, rotated to match the gesture.
 *
 * Looks now cycle on the vertical axis, so a horizontal rail would be
 * labelling the wrong axis -- the indicator and the gesture have to agree or
 * the rail stops reading as "where am I in the set". Same visual language as
 * components/today/ProgressRail: segments, the active one ~4x the others,
 * every segment a direct tap target.
 *
 * Deliberately NOT animating flexGrow, and deliberately NOT calling a token
 * helper inside the worklet -- the two faults that crashed this app on load.
 * Growth is a plain prop; colour crossfades via interpolateColor over hoisted
 * string constants.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colour, radius, timing } from '../theme/tokens';
import { PressScale } from '../components/primitives/PressScale';

const BAR_OFF = colour.inkA(0.18);
const BAR_ON = colour.brand;

/** Total rail height. Fixed so the segments have a bound to flexGrow within. */
export const RAIL_HEIGHT = 132;
/** Horizontal room the rail needs beside the card. */
export const RAIL_WIDTH = 24;

function Segment({ active, onPress }: { active: boolean; onPress: () => void }) {
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: timing.colour });
  }, [active, on]);

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

export function PVerticalRail({
  count,
  activeIndex,
  onJump,
}: {
  count: number;
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <View style={styles.rail} pointerEvents="box-none">
      {Array.from({ length: count }).map((_, i) => (
        <Segment key={i} active={i === activeIndex} onPress={() => onJump(i)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: RAIL_HEIGHT,
    width: RAIL_WIDTH,
    flexDirection: 'column',
    gap: 5,
  },
  segment: {
    flexBasis: 0,
  },
  track: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 3,
    height: '100%',
    borderRadius: radius.pill,
  },
});
