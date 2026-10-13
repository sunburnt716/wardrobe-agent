/**
 * PROPOSAL ONLY. The newspaper dateline, with a pressable action in the LEFT
 * column.
 *
 * Why a near-copy of components/layout/DatelineHeader rather than a prop on
 * it: the real one renders `rightIcon` as a plain, unpressable Icon, and
 * Apple's guidance plus Instagram's 2025-26 redesign both put the create
 * action in the header rather than the tab bar. Adding a press handler to the
 * shipped component would be an edit outside this proposal's revert boundary,
 * so the proposal carries its own. All furniture is unchanged: 4px/1px rules,
 * the three-column baseline row, the terracotta wordmark.
 *
 * Column order follows Instagram: action left, identity centre, context
 * right. The date/count that normally sits left moves right, which is why
 * `rightText` is still here.
 */
import { StyleSheet, View } from 'react-native';
import { colour, space } from '../theme/tokens';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { PressScale } from '../components/primitives/PressScale';

export interface ProposalHeaderProps {
  /** Left column action. Apple: tabs are for navigation, so verbs live here. */
  actionIcon: string;
  onAction: () => void;
  actionLabel: string;
  center: string;
  centerVariant?: 'wordmark' | 'title';
  /** Right column context: a date, a count, "1 / 3". */
  rightText?: string;
  tone?: 'dark' | 'light';
  topRule?: number;
}

export function ProposalHeader({
  actionIcon,
  onAction,
  actionLabel,
  center,
  centerVariant = 'title',
  rightText,
  tone = 'dark',
  topRule = 4,
}: ProposalHeaderProps) {
  const ruleColour = tone === 'light' ? colour.paperAlt : colour.ink;
  const textColour = tone === 'light' ? colour.paperAlt : colour.ink;

  return (
    <View style={styles.wrap}>
      <View style={{ height: topRule, backgroundColor: ruleColour }} />
      <View style={styles.row}>
        <View style={styles.side}>
          <PressScale
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            // 36px drawn, 44pt touchable. hitSlop buys Apple's minimum tap
            // target without spending 8px of header height on it — which
            // matters, because header chrome is the thing we are reducing.
            hitSlop={4}
            style={styles.action}
          >
            <Icon name={actionIcon} size={19} color={colour.paperAlt} />
          </PressScale>
        </View>

        <AppText
          variant={centerVariant === 'wordmark' ? 'wordmark' : 'itemTitle'}
          style={
            centerVariant === 'wordmark'
              ? undefined
              : { color: textColour, fontSize: 19 }
          }
        >
          {center}
        </AppText>

        <View style={[styles.side, styles.right]}>
          <AppText variant="microLabel" style={{ color: textColour }}>
            {rightText ?? ''}
          </AppText>
        </View>
      </View>
      <View
        style={{
          height: 1,
          backgroundColor:
            tone === 'light' ? 'rgba(253,250,244,0.55)' : colour.inkA(0.9),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.edge,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 7,
    paddingBottom: 6,
  },
  side: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  // Drawn at 36; hitSlop above extends the touch area to Apple's 44pt
  // minimum. The design's own floor is 34px, which is under the platform
  // guidance this proposal is following.
  action: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colour.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
