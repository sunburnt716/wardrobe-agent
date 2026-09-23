/**
 * The Closet filter row: underlined words in a horizontal scroll, not
 * buttons. Active word carries a 2px terracotta underline.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { colour, space } from '../../theme/tokens';
import type { ClosetFilter } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { PressScale } from '../primitives/PressScale';

export function FilterRow({
  filters,
  activeId,
  onSelect,
}: {
  filters: ClosetFilter[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {filters.map((f) => {
        const active = f.id === activeId;
        return (
          <PressScale key={f.id} onPress={() => onSelect(f.id)}>
            <View
              style={[
                styles.word,
                { borderBottomColor: active ? colour.brand : 'transparent' },
              ]}
            >
              <AppText
                variant="microLabel"
                style={{
                  color: active ? colour.brand : colour.inkA(0.6),
                  letterSpacing: 1.3,
                }}
              >
                {f.label}
              </AppText>
            </View>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 16,
    paddingHorizontal: space.edge,
    paddingVertical: 12,
  },
  word: {
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
});
