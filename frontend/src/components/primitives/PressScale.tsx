/**
 * Every tappable element dips to ~0.94 on press, then springs back
 * (design: "Every tappable element scales to ~0.94 on press"). Wrap a
 * button/row/card in this instead of a bare Pressable.
 */
import type { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PRESS_SCALE, spring, timing } from '../../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PressScale({
  children,
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(PRESS_SCALE, { duration: timing.press });
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, spring.gentle);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
