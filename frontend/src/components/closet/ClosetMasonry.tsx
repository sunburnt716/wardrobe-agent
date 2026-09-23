/**
 * Two-column masonry. RN has no CSS `columns`, so items are dealt into the
 * currently-shorter column (greedy) using their slot height as an estimate —
 * which keeps the columns roughly balanced while staying deliberately
 * uneven.
 */
import { StyleSheet, View } from 'react-native';
import { space } from '../../theme/tokens';
import type { ClosetItem } from '../../data/types';
import { GarmentTile } from './GarmentTile';

const CAPTION_ESTIMATE = 56;

export function ClosetMasonry({ items }: { items: ClosetItem[] }) {
  const columns: [ClosetItem[], ClosetItem[]] = [[], []];
  const heights: [number, number] = [0, 0];

  for (const item of items) {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(item);
    heights[target] += item.slotHeight + CAPTION_ESTIMATE + 12;
  }

  return (
    <View style={styles.row}>
      {columns.map((col, i) => (
        <View key={i} style={styles.column}>
          {col.map((item) => (
            <View key={item.id} style={styles.cell}>
              <GarmentTile item={item} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: space.edge - 2,
  },
  column: {
    flex: 1,
  },
  cell: {
    marginBottom: 12,
  },
});
