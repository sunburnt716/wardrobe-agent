/**
 * One wardrobe tile: image slot (uneven heights across tiles — deliberately
 * not a grid), a "Wash" badge when the garment is due, then name + meta.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { ClosetItem } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { ImageSlot } from '../primitives/ImageSlot';
import { PressScale } from '../primitives/PressScale';

export function GarmentTile({ item }: { item: ClosetItem }) {
  return (
    <PressScale style={[styles.tile, shadow('soft')]}>
      <ImageSlot
        tint={item.tintHint}
        icon={item.iconHint}
        iconSize={38}
        style={{ height: item.slotHeight }}
      >
        {!item.isClean ? (
          <View style={styles.badge}>
            <Icon name="washing-machine" size={10} color={colour.paperAlt} />
            <AppText
              style={styles.badgeText}
              variant="microLabelSm"
            >
              Wash
            </AppText>
          </View>
        ) : null}
      </ImageSlot>

      <View style={styles.caption}>
        <AppText variant="tileName">{item.name}</AppText>
        <AppText variant="microLabelSm" style={styles.meta}>
          {`${item.category} · ${item.wearsSinceWash} of ${item.washThreshold}`}
        </AppText>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.tile,
    backgroundColor: colour.paperAlt,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colour.brand,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: colour.paperAlt,
    fontSize: 8.5,
    letterSpacing: 0.7,
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  meta: { marginTop: 5 },
});
