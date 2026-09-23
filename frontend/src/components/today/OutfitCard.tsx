/**
 * One proposed look. Terracotta spine with vertical text, title + italic
 * meta, the composite image area with tappable hotspots, a hint line, and
 * the big ghosted index numeral.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { Outfit, Verdict } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { ImageSlot } from '../primitives/ImageSlot';
import { Hotspot } from './Hotspot';

export interface OutfitCardProps {
  outfit: Outfit;
  lookNumber: number;
  openPieceIndex: number | null;
  pieceVerdict: (index: number) => Verdict | null;
  onPieceTap: (index: number) => void;
}

export function OutfitCard({
  outfit,
  lookNumber,
  openPieceIndex,
  pieceVerdict,
  onPieceTap,
}: OutfitCardProps) {
  const numeral = String(lookNumber).padStart(2, '0');
  const hasOpen = openPieceIndex !== null;

  return (
    <View style={[styles.card, shadow('card')]}>
      <View style={styles.spine}>
        <View style={styles.spineTextRotator}>
          <AppText
            numberOfLines={1}
            style={styles.spineText}
          >{`LOOK ${numeral} — FITCHECK`}</AppText>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant="lookTitle">{outfit.title}</AppText>
          <AppText variant="metaItalic" style={styles.meta}>
            {outfit.metaLine}
          </AppText>
        </View>

        <View style={styles.imageArea}>
          <View style={styles.composite}>
            <ImageSlot
              tint={outfit.washColorA}
              icon="coat-hanger"
              iconSize={54}
              style={StyleSheet.absoluteFill}
            />
            {outfit.pieces.map((piece, i) =>
              piece.box ? (
                <Hotspot
                  key={piece.garment.id}
                  box={piece.box}
                  active={openPieceIndex === i}
                  verdict={pieceVerdict(i)}
                  onPress={() => onPieceTap(i)}
                />
              ) : null,
            )}
          </View>
        </View>

        <AppText variant="hint" style={styles.hint}>
          {hasOpen ? 'Tap another piece' : 'Tap any piece to read it'}
        </AppText>
        <AppText variant="indexNumeral" style={styles.numeral}>
          {numeral}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    backgroundColor: colour.paper,
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 26,
    backgroundColor: colour.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineTextRotator: {
    transform: [{ rotate: '-90deg' }],
  },
  spineText: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.3,
    color: '#fdf6ee',
  },
  content: {
    position: 'absolute',
    left: 26,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingTop: 15,
    paddingHorizontal: 18,
  },
  meta: { marginTop: 5 },
  imageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composite: {
    width: '100%',
    aspectRatio: 402 / 440,
    maxHeight: '100%',
  },
  hint: {
    position: 'absolute',
    left: 16,
    bottom: 10,
  },
  numeral: {
    position: 'absolute',
    right: 14,
    bottom: 2,
  },
});
