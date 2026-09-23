/**
 * The bottom sheet that opens when a garment is tapped: category kicker,
 * name, status chips, the agent's one-line rationale, and the two
 * piece-level verdict buttons.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colour, space } from '../../theme/tokens';
import type { OutfitPiece, Verdict } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Chip } from '../primitives/Chip';
import { IconButton, Pill } from '../primitives/Pill';
import { Sheet } from '../primitives/Sheet';

export interface GarmentDetailSheetProps {
  piece: OutfitPiece | null;
  verdict: Verdict | null;
  onClose: () => void;
  onVote: (verdict: Verdict) => void;
}

export function GarmentDetailSheet({
  piece,
  verdict,
  onClose,
  onVote,
}: GarmentDetailSheetProps) {
  // Keep the last piece rendered through the slide-out animation.
  const [shown, setShown] = useState<OutfitPiece | null>(piece);
  useEffect(() => {
    if (piece) setShown(piece);
  }, [piece]);

  return (
    <Sheet visible={!!piece} onClose={onClose}>
      {shown ? (
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.headings}>
              <AppText variant="kicker">{shown.garment.category}</AppText>
              <AppText variant="sheetName" style={styles.name}>
                {shown.garment.name}
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

          <View style={styles.chips}>
            {shown.chips.map((c, i) => (
              <Chip key={`${c.label}-${i}`} chip={c} />
            ))}
          </View>

          {shown.rationale ? (
            <AppText variant="note" style={styles.note}>
              {shown.rationale}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            <Pill
              label="Not this"
              icon="thumbs-down"
              height={46}
              labelVariant="buttonLabelSm"
              background={
                verdict === 'NOT_THIS' ? colour.inkSolid : colour.inkA(0.07)
              }
              color={verdict === 'NOT_THIS' ? colour.paperAlt : colour.ink}
              onPress={() => onVote('NOT_THIS')}
              style={styles.action}
            />
            <Pill
              label="Love it"
              icon="thumbs-up"
              height={46}
              labelVariant="buttonLabelSm"
              background={verdict === 'LOVE' ? colour.brand : colour.inkA(0.07)}
              color={verdict === 'LOVE' ? colour.paperAlt : colour.ink}
              onPress={() => onVote('LOVE')}
              style={styles.action}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.edge,
    paddingTop: 17,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headings: { flex: 1 },
  name: { marginTop: 2 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 13,
  },
  note: {
    marginTop: 13,
    marginBottom: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 4,
  },
  action: { flex: 1 },
});
