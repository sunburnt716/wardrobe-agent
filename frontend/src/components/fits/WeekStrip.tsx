/**
 * Seven-day strip in the Fits head: worn days filled, today solid.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius, space } from '../../theme/tokens';
import type { WeekDay } from '../../data/types';
import { AppText } from '../primitives/AppText';

export function WeekStrip({ week }: { week: WeekDay[] }) {
  return (
    <View style={styles.strip}>
      {week.map((d, i) => {
        const bg =
          d.state === 'today'
            ? colour.brand
            : d.state === 'worn'
              ? colour.inkA(0.14)
              : 'transparent';
        const fg =
          d.state === 'today' ? colour.paperAlt : colour.inkA(0.75);
        return (
          <View key={i} style={styles.day}>
            <AppText variant="microLabelSm" style={styles.label}>
              {d.day}
            </AppText>
            <View style={[styles.circle, { backgroundColor: bg }]}>
              <AppText style={[styles.num, { color: fg }]}>{d.date}</AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingTop: 13,
  },
  day: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.9,
    color: colour.inkA(0.6),
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: 'Lora-Medium',
    fontSize: 11,
  },
});
