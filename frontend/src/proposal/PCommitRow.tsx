/**
 * PROPOSAL ONLY. Today's commit row with three verbs instead of two:
 * reject, wear, save.
 *
 * The shipped WholeLookVerdict is reject + wear, with the pill taking all
 * remaining width. Adding a third action means re-laying out the row, so this
 * proposal carries its own rather than editing the shipped component. It uses
 * the same primitives (Pill, IconButton, hence PressScale), the same tokens
 * and the same spring, so the feel is unchanged.
 *
 * Save is a THIRD state, not a variant of accepting. Accept answers "wearing
 * this today"; save answers "another day". Saving a look you just rejected is
 * a normal thing to do -- right look, wrong weather -- so the save button's
 * state is independent of the verdict.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { colour, radius, space, spring } from '../theme/tokens';
import { shadow } from '../theme/shadows';
import type { LookVerdict } from '../state/todaySession';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { IconButton } from '../components/primitives/Pill';
import { PressScale } from '../components/primitives/PressScale';

// Hoisted: a worklet closure may hold shared values, numbers and strings, but
// never a function. Reading colour.inkA() inside one crashed the app on load.
const SAVE_ON = colour.brand;
const SAVE_OFF = 'rgba(255,253,249,0.9)';

export function PCommitRow({
  verdict,
  onCommit,
  saved,
  onToggleSave,
}: {
  verdict: LookVerdict | null;
  onCommit: (v: LookVerdict) => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const accepted = verdict === 'ACCEPT';
  const rejected = verdict === 'REJECT';

  // Pops the save button when it changes state, matching the verdict pop.
  const pop = useSharedValue(saved ? 1 : 0);
  useEffect(() => {
    pop.value = withSpring(saved ? 1 : 0, spring.pop);
  }, [saved, pop]);

  const saveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.value * 0.06 }],
  }));

  return (
    <View style={styles.row}>
      <IconButton
        icon="x"
        size={48}
        iconSize={18}
        background={rejected ? colour.inkSolid : SAVE_OFF}
        color={rejected ? colour.paperAlt : colour.inkA(0.85)}
        borderColor={rejected ? undefined : colour.inkA(0.22)}
        onPress={() => onCommit('REJECT')}
      />

      <PressScale
        onPress={() => onCommit('ACCEPT')}
        accessibilityRole="button"
        accessibilityLabel={accepted ? 'Wearing this today' : 'Wear this'}
        style={[
          styles.accept,
          shadow('badge'),
          { backgroundColor: accepted ? colour.brandDeep : colour.brand },
        ]}
      >
        <Icon
          name={accepted ? 'check-circle' : 'check'}
          size={18}
          color={colour.paperAlt}
        />
        <AppText variant="buttonLabel" style={{ color: colour.paperAlt }}>
          {accepted ? 'Wearing this' : 'Wear this'}
        </AppText>
      </PressScale>

      <Animated.View style={saveStyle}>
        <IconButton
          icon="bookmark-simple"
          size={48}
          iconSize={18}
          background={saved ? SAVE_ON : SAVE_OFF}
          color={saved ? colour.paperAlt : colour.inkA(0.85)}
          borderColor={saved ? undefined : colour.inkA(0.22)}
          onPress={onToggleSave}
        />
      </Animated.View>
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
    height: 48,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
});
