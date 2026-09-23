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
  row: {
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  pill: {
    backgroundColor: 'rgba(253,250,244,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
  },
});
