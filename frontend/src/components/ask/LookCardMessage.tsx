/**
 * An openable look attached to an agent reply — image slot with a piece
 * count, name, and "Open in Today", which hands off to the Today screen
 * with that proposal loaded.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { ChatLookCard } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { ImageSlot } from '../primitives/ImageSlot';
import { PressScale } from '../primitives/PressScale';

export function LookCardMessage({
  card,
  onOpen,
}: {
  card: ChatLookCard;
  onOpen: (outfitId: string) => void;
}) {
  return (
    <PressScale
      style={[styles.card, shadow('soft')]}
      onPress={() => onOpen(card.outfitId)}
    >
      <ImageSlot tint={card.tintHint} icon="coat-hanger" iconSize={40} style={styles.image}>
        <View style={styles.count}>
          <AppText style={styles.countText} variant="microLabelSm">
            {`${card.pieceCount} pieces`}
          </AppText>
        </View>
      </ImageSlot>

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <AppText variant="itemTitle" style={{ fontSize: 15 }}>
            {card.name}
          </AppText>
          <AppText variant="microLabelSm" style={styles.open}>
            Open in Today
          </AppText>
        </View>
        <Icon name="arrow-up-right" size={18} color={colour.brand} />
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'flex-start',
    width: '78%',
    borderRadius: radius.bubble,
    backgroundColor: colour.paperAlt,
    overflow: 'hidden',
  },
  image: {
    height: 150,
  },
  count: {
    position: 'absolute',
    bottom: 9,
    left: 11,
    backgroundColor: colour.brand,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  countText: {
    color: colour.paperAlt,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 13,
  },
  footerText: { flex: 1 },
  open: { marginTop: 4 },
});
