/**
 * The newspaper dateline: a heavy rule, a three-column row (label / centre /
 * label-or-icon), then a hairline rule. Rules are the ONLY furniture — never
 * a box around content.
 */
import { StyleSheet, View } from 'react-native';
import { colour, space } from '../../theme/tokens';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';

export interface DatelineHeaderProps {
  left: string;
  center: string;
  /** Right column: a short text (e.g. "1 / 3") or a single icon. */
  rightText?: string;
  rightIcon?: string;
  /** "Fitcheck" is the terracotta wordmark; screen names are plain serif. */
  centerVariant?: 'wordmark' | 'title';
  /** Add's header sits on the dark wash. */
  tone?: 'dark' | 'light';
  topRule?: number;
}

export function DatelineHeader({
  left,
  center,
  rightText,
  rightIcon,
  centerVariant = 'title',
  tone = 'dark',
  topRule = 4,
}: DatelineHeaderProps) {
  const ruleColour = tone === 'light' ? colour.paperAlt : colour.ink;
  const textColour = tone === 'light' ? colour.paperAlt : colour.ink;

  return (
    <View style={styles.wrap}>
      <View style={{ height: topRule, backgroundColor: ruleColour }} />
      <View style={styles.row}>
        <AppText variant="microLabel" style={[styles.side, { color: textColour }]}>
          {left}
        </AppText>

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
          {rightIcon ? (
            <Icon name={rightIcon} size={19} color={textColour} />
          ) : (
            <AppText variant="microLabel" style={{ color: textColour }}>
              {rightText ?? ''}
            </AppText>
          )}
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
    alignItems: 'baseline',
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
});
