/**
 * Horizontally-scrolling follow-up prompts under the thread.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import { AppText } from '../primitives/AppText';
import { PressScale } from '../primitives/PressScale';

export function SuggestionPills({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A horizontal ScrollView sitting in a flex COLUMN will grow to take
      // every spare pixel of vertical space, rendering its pills at the top
      // of a tall invisible box. That was the large dead gap between the
      // pills and the input. flexGrow: 0 makes it size to its content.
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {suggestions.map((s) => (
        <PressScale key={s} onPress={() => onPick(s)}>
          <View style={[styles.pill, shadow('soft')]}>
            <AppText variant="chip" style={{ color: colour.ink }}>
              {s}
            </AppText>
          </View>
        </PressScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
  },
  row: {
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  pill: {
    // Chrome, not paper: a white pill on a white page has nothing to
    // separate it but its shadow.
    backgroundColor: colour.chrome,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
  },
});
