/**
 * Status / attribute pill chip — icon + short label. Used in the Today
 * detail sheet and the Add "read from the photo" sheet.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import type { GarmentChip } from '../../data/types';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function Chip({ chip }: { chip: GarmentChip }) {
  const warn = chip.tone === 'warn';
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: warn ? colour.brandA(0.12) : colour.inkA(0.06) },
      ]}
    >
      <Icon
        name={chip.icon}
        size={14}
        color={warn ? colour.brandDeep : colour.inkA(0.9)}
      />
      <AppText
        variant="chip"
        style={{ color: warn ? colour.brandDeep : colour.inkA(0.9) }}
      >
        {chip.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
});
