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
import { Icon as PlaceholderIcon } from '../primitives/Icon';
import { LookStage } from '../primitives/LookStage';
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
      <LookStage
        from={card.tintHint}
        paper={colour.paper}
        gradientKey={card.outfitId}
        style={styles.image}
      >
        <View style={styles.placeholder} pointerEvents="none">
          <PlaceholderIcon name="coat-hanger" size={40} color={colour.inkA(0.28)} />
        </View>
        <View style={styles.count}>
          <AppText style={styles.countText} variant="microLabelSm">
            {`${card.pieceCount} pieces`}
          </AppText>
        </View>
      </LookStage>

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
    borderWidth: 1,
    borderColor: colour.hairline,
    borderRadius: radius.bubble,
    backgroundColor: colour.paper,
    overflow: 'hidden',
  },
  image: {
    height: 150,
    width: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 11,
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
