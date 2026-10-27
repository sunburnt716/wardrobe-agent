/**
 * Two-column masonry. RN has no CSS `columns`, so items are dealt into the
 * currently-shorter column (greedy) using their slot height as an estimate —
 * which keeps the columns roughly balanced while staying deliberately
 * uneven.
 */
import { StyleSheet, View } from 'react-native';
import { space } from '../../theme/tokens';
import type { ClosetItem } from '../../data/types';
import { CAPTION_ROOM, GarmentTile } from './GarmentTile';

// The caption now sits INSIDE the image rather than in a block beneath it,
// so a tile's height is its slot plus the room the tile adds for the
// overlay — not slot + a separate caption block. Must track
// GarmentTile.CAPTION_ROOM or the two columns drift uneven.
const CAPTION_ESTIMATE = CAPTION_ROOM;

export function ClosetMasonry({
  items,
  onSelect,
}: {
  items: ClosetItem[];
  onSelect?: (item: ClosetItem) => void;
}) {
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
              <GarmentTile item={item} onPress={onSelect} />
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
