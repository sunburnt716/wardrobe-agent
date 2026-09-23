/**
 * The whole-look commit row: a reject circle and the "Wear this" pill. On
 * accept the pill deepens, its icon becomes check-circle, the label changes,
 * and it settles at scale 1.02.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colour, radius, space, spring, timing } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { LookVerdict } from '../../state/todaySession';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { IconButton } from '../primitives/Pill';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WholeLookVerdict({
  verdict,
  onCommit,
}: {
  verdict: LookVerdict | null;
  onCommit: (v: LookVerdict) => void;
}) {
  const accepted = verdict === 'ACCEPT';
  const rejected = verdict === 'REJECT';

  const pressed = useSharedValue(0);
  const committed = useSharedValue(accepted ? 1 : 0);

  useEffect(() => {
    committed.value = withSpring(accepted ? 1 : 0, spring.pop);
  }, [accepted, committed]);

  const acceptStyle = useAnimatedStyle(() => {
    const base = 1 + committed.value * 0.02;
    return { transform: [{ scale: base * (1 - pressed.value * 0.06) }] };
  });

  return (
    <View style={styles.row}>
      <IconButton
        icon="x"
        size={52}
        background={rejected ? colour.inkSolid : 'rgba(255,253,249,0.9)'}
        color={rejected ? colour.paperAlt : colour.inkA(0.85)}
        borderColor={rejected ? undefined : colour.inkA(0.22)}
        onPress={() => onCommit('REJECT')}
      />

      <AnimatedPressable
        onPress={() => onCommit('ACCEPT')}
        onPressIn={() => {
          pressed.value = withTiming(1, { duration: timing.press });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, spring.gentle);
        }}
        style={[
          styles.accept,
          shadow('badge'),
          { backgroundColor: accepted ? colour.brandDeep : colour.brand },
          acceptStyle,
        ]}
      >
        <Icon
          name={accepted ? 'check-circle' : 'check'}
          size={18}
          color={colour.paperAlt}
        />
        <AppText variant="buttonLabel" style={{ color: colour.paperAlt }}>
          {accepted ? 'Wearing this today' : 'Wear this'}
        </AppText>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: space.edge - 2,
    paddingTop: 4,
  },
  accept: {
    flex: 1,
    height: 52,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
});
