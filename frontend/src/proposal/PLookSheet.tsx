/**
 * PROPOSAL ONLY. The whole-look detail sheet — what tapping the card opens.
 *
 * Fitcheck already had a sheet for ONE garment within a look
 * (GarmentDetailSheet). This is the level above it: what the agent dressed
 * you for, and why these pieces together. The design spec's own split
 * ("outfits.rationale for the whole look, vs outfit_garments.rationale for
 * why THIS piece") is exactly this distinction, so the data model already
 * expects two levels even though the UI only had one.
 *
 * Reuses the Sheet primitive, so the spring, the scrim and the accent bar
 * behave identically to the garment sheet.
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colour, radius, space } from '../theme/tokens';
import type { Outfit, WeatherContext } from '../data/types';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { IconButton } from '../components/primitives/Pill';
import { Sheet } from '../components/primitives/Sheet';

export function PLookSheet({
  outfit,
  weather,
  onClose,
}: {
  outfit: Outfit | null;
  weather: WeatherContext;
  onClose: () => void;
}) {
  // Keep the last look rendered through the slide-out, same as the garment
  // sheet does, or the content vanishes before the animation finishes.
  const [shown, setShown] = useState<Outfit | null>(outfit);
  useEffect(() => {
    if (outfit) setShown(outfit);
  }, [outfit]);

  return (
    <Sheet visible={!!outfit} onClose={onClose}>
      {shown ? (
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.headings}>
              <AppText variant="kicker">This look</AppText>
              <AppText variant="sheetName" style={styles.name}>
                {shown.title}
              </AppText>
            </View>
            <IconButton
              icon="x"
              size={34}
              iconSize={15}
              background={colour.inkA(0.07)}
              onPress={onClose}
            />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Icon name={weather.icon} size={13} color={colour.inkA(0.85)} />
              <AppText style={styles.metaChipText}>{weather.label}</AppText>
            </View>
            <View style={styles.metaChip}>
              <Icon name="coat-hanger" size={13} color={colour.inkA(0.85)} />
              <AppText style={styles.metaChipText}>
                {shown.pieces.length} pieces
              </AppText>
            </View>
          </View>

          <AppText variant="metaItalic" style={styles.standfirst}>
            {shown.metaLine}
          </AppText>

          <View style={styles.rule} />

          <AppText variant="microLabel" style={styles.sectionLabel}>
            Why these pieces
          </AppText>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listInner}
          >
            {shown.pieces.map((piece) => (
              <View key={piece.garment.id} style={styles.piece}>
                <AppText variant="microLabelSm" style={styles.pieceCategory}>
                  {piece.garment.category}
                </AppText>
                <AppText style={styles.pieceName}>{piece.garment.name}</AppText>
                {piece.rationale ? (
                  <AppText variant="note" style={styles.pieceNote}>
                    {piece.rationale}
                  </AppText>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.edge,
    paddingTop: 16,
    paddingBottom: 22,
    // Bounded so a long piece list scrolls inside the sheet rather than
    // pushing the sheet past the top of the screen.
    maxHeight: 460,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headings: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colour.inkA(0.07),
  },
  metaChipText: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 11.5,
    color: colour.inkA(0.85),
  },
  standfirst: {
    marginTop: 12,
  },
  rule: {
    height: 1,
    backgroundColor: colour.inkA(0.14),
    marginTop: 16,
  },
  sectionLabel: {
    marginTop: 14,
    color: colour.brand,
    letterSpacing: 1.6,
  },
  list: {
    marginTop: 4,
  },
  listInner: {
    paddingTop: 8,
    gap: 14,
  },
  piece: {
    gap: 2,
  },
  pieceCategory: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: colour.inkA(0.7),
  },
  pieceName: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 14,
    color: colour.ink,
  },
  pieceNote: {
    marginTop: 2,
  },
});
