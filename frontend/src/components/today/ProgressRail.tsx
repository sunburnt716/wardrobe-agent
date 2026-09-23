/**
 * Segmented rail near the card bottom. The active segment grows to ~4× the
 * others; any segment is a direct tap target to jump to that look.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colour, radius, spring, timing } from '../../theme/tokens';
import { PressScale } from '../primitives/PressScale';

function Segment({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  // Animating flex-grow triggers a layout each frame — fine for three items
  // and it matches the prototype's `flex-grow` transition.
  const grow = useSharedValue(active ? 4 : 1);
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    grow.value = withSpring(active ? 4 : 1, spring.gentle);
    on.value = withTiming(active ? 1 : 0, { duration: timing.colour });
  }, [active, grow, on]);

  const growStyle = useAnimatedStyle(() => ({ flexGrow: grow.value }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: 1,
    backgroundColor: on.value > 0.5 ? colour.brand : colour.inkA(0.18),
  }));

  return (
    <PressScale onPress={onPress} style={[styles.segment, growStyle]}>
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
