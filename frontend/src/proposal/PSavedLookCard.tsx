/**
 * PROPOSAL ONLY. A saved look in the Fits > Saved segment.
 *
 * Deliberately the same card shape as BackIssueCard so the two segments read
 * as one run of issues, but the right-hand action differs because the intent
 * does: a worn look offers re-wear, a saved look offers "wear it today" --
 * which is the whole point of having saved it.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../theme/tokens';
import { shadow } from '../theme/shadows';
import type { Outfit } from '../data/types';
import { AppText } from '../components/primitives/AppText';
import { ImageSlot } from '../components/primitives/ImageSlot';
import { IconButton } from '../components/primitives/Pill';
import { PressScale } from '../components/primitives/PressScale';

export function PSavedLookCard({
  outfit,
  onUnsave,
}: {
  outfit: Outfit;
  onUnsave: (outfitId: string) => void;
}) {
  return (
    <PressScale style={[styles.card, shadow('soft')]}>
      <ImageSlot
        tint={outfit.washColorA}
        icon="coat-hanger"
        iconSize={34}
        borderRadius={radius.tile}
        style={styles.thumb}
      />

      <View style={styles.body}>
        <AppText variant="microLabelSm" style={styles.kicker}>
          Saved for later
        </AppText>
        <AppText variant="itemTitle" style={styles.name}>
          {outfit.title}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {outfit.metaLine}
        </AppText>
      </View>

      <IconButton
        icon="bookmark-simple"
        size={34}
        iconSize={18}
        background={colour.brand}
        color={colour.paperAlt}
        onPress={() => onUnsave(outfit.id)}
      />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: colour.hairline,
    backgroundColor: colour.paper,
    borderRadius: radius.bubble,
    padding: 12,
  },
  thumb: {
    width: 84,
    height: 96,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: colour.brand,
  },
  name: {
    fontSize: 18,
    marginTop: 4,
  },
  meta: {
    fontFamily: 'Lora-Italic',
    fontSize: 11.5,
    color: colour.inkA(0.7),
    marginTop: 7,
  },
});
