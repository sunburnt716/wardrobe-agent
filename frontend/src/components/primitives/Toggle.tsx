/**
 * The water-resistant switch on Add. 52×30 track, 24 knob, 3 inset →
 * 22px of travel. Design calls for an explicit toggle, never inferred.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colour, radius, spring } from '../../theme/tokens';

const TRAVEL = 22;

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const x = useSharedValue(value ? TRAVEL : 0);

  useEffect(() => {
    x.value = withSpring(value ? TRAVEL : 0, spring.gentle);
  }, [value, x]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: value ? colour.brand : colour.inkA(0.18) },
        ]}
      >
        <Animated.View style={[styles.knob, knobStyle]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 30,
    borderRadius: radius.pill,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colour.paperAlt,
  },
});
