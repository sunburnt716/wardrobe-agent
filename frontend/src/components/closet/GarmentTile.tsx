/**
 * One wardrobe tile. The garment fills the whole tile and its name sits ON
 * the image over a gradient scrim — no separate caption block.
 *
 * WHAT CHANGED AND WHY
 *
 * The tile used to be an image with a solid paper caption panel beneath it.
 * That panel is what made a tile read as a document rather than a garment:
 * two stacked rectangles of different materials, with the text living in the
 * lesser one. Letting the image run the full height and overlaying the text
 * makes the garment the whole object.
 *
 * Legibility comes from `Scrim`, not from a clamped colour, because these
 * will be photographs once extraction lands and a photo cannot be clamped.
 *
 * Uneven tile heights are unchanged — the masonry is still deliberately not
 * a grid.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius, space } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { ClosetItem } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { ImageSlot } from '../primitives/ImageSlot';
import { PressScale } from '../primitives/PressScale';
import { Scrim } from '../primitives/Scrim';

/** Extra height the tile gains now that the caption sits inside it. */
const CAPTION_ROOM = 54;

export function GarmentTile({
  item,
  onPress,
}: {
  item: ClosetItem;
  onPress?: (item: ClosetItem) => void;
}) {
  return (
    <PressScale
      onPress={onPress ? () => onPress(item) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.category}`}
      style={[styles.tile, shadow('soft')]}
    >
      <ImageSlot
        tint={item.tintHint}
        icon={item.iconHint}
        iconSize={38}
        style={{ height: item.slotHeight + CAPTION_ROOM }}
      >
        <Scrim gradientKey={item.id} />

        {!item.isClean ? (
          <View style={styles.badge}>
            <Icon name="washing-machine" size={10} color={colour.paperAlt} />
            <AppText style={styles.badgeText} variant="microLabelSm">
              Wash
            </AppText>
          </View>
        ) : null}

        <View style={styles.caption}>
          <AppText variant="tileName" style={styles.name}>
            {item.name}
          </AppText>
          <AppText variant="microLabelSm" style={styles.meta}>
            {`${item.category} · ${item.wearsSinceWash} of ${item.washThreshold}`}
          </AppText>
        </View>
      </ImageSlot>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colour.hairline,
    backgroundColor: colour.paper,
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
    fontSize: 11,
    letterSpacing: 0.7,
  },
  // Sits on the image, bottom-left, over the scrim.
  caption: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 10,
  },
  name: {
    color: colour.paperAlt,
  },
  meta: {
    marginTop: 4,
    // Lighter than the name but still well clear of AA against the scrim.
    color: 'rgba(253,250,244,0.82)',
  },
});

export { CAPTION_ROOM };
