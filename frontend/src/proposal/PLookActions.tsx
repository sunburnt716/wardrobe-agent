/**
 * PROPOSAL ONLY. The three verbs for a look: reject, wear, save.
 *
 * A self-contained object rather than markup inlined in the card, so it can
 * be dropped onto any surface that needs look-level actions — the Today
 * card, a saved-look card, a future "look of the week" — without copying the
 * layout and state mapping each time.
 *
 * It renders inside the card's FRONT face, so it rotates away with the card
 * when flipped. Consequence worth knowing: while the back is showing, these
 * are not reachable, and committing means flipping home first. That is the
 * intended behaviour — the verbs belong to the side showing the look.
 *
 * Positioning is the caller's business: this returns a row and takes a
 * `style` so the card decides where it sits.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colour, radius } from '../theme/tokens';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { IconButton } from '../components/primitives/Pill';
import { PressScale } from '../components/primitives/PressScale';
import type { LookVerdict } from './LookVerdictsProvider';

export interface PLookActionsProps {
  /** Whole-look verdict for the outfit this row belongs to. */
  verdict: LookVerdict | null;
  onCommit: (verdict: LookVerdict) => void;
  /** Save is a separate axis — a look can be rejected AND saved. */
  saved: boolean;
  onToggleSave: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PLookActions({
  verdict,
  onCommit,
  saved,
  onToggleSave,
  style,
}: PLookActionsProps) {
  const accepted = verdict === 'ACCEPT';
  const rejected = verdict === 'REJECT';

  return (
    <View style={[styles.row, style]}>
      <IconButton
        icon="x"
        size={44}
        iconSize={17}
        background={rejected ? colour.inkSolid : colour.paper}
        color={rejected ? colour.paperAlt : colour.inkA(0.85)}
        borderColor={rejected ? undefined : colour.inkA(0.2)}
        onPress={() => onCommit('REJECT')}
      />

      <PressScale
        onPress={() => onCommit('ACCEPT')}
        accessibilityRole="button"
        accessibilityLabel={accepted ? 'Wearing this today' : 'Wear this'}
        style={[
          styles.accept,
          { backgroundColor: accepted ? colour.brandDeep : colour.brand },
        ]}
      >
        <Icon
          name={accepted ? 'check-circle' : 'check'}
          size={17}
          color={colour.paperAlt}
        />
        <AppText variant="buttonLabelSm" style={{ color: colour.paperAlt }}>
          {accepted ? 'Wearing this' : 'Wear this'}
        </AppText>
      </PressScale>

      <IconButton
        icon="bookmark-simple"
        size={44}
        iconSize={17}
        background={saved ? colour.brand : colour.paper}
        color={saved ? colour.paperAlt : colour.inkA(0.85)}
        borderColor={saved ? undefined : colour.inkA(0.2)}
        onPress={onToggleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accept: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
