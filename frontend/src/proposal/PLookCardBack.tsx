/**
 * PROPOSAL ONLY. The reverse of a look card.
 *
 * Replaces two bottom sheets. The look's details and a garment's details used
 * to open as modal sheets over the card; now they are simply the other side
 * of it. The card is the object, so the information about it belongs on the
 * object rather than in a panel that covers it.
 *
 * TWO MODES, decided by what was tapped:
 *   a garment hotspot -> that garment: category, name, chips, why it is here,
 *                        and its love / not-this verdict
 *   the card itself   -> the whole look: title, meta, what it was dressed
 *                        for, and why each piece is in it
 *
 * Dark text on the card surface, no scrim — the back is paper, not an image.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { colour, radius, space } from '../theme/tokens';
import type { Outfit, OutfitPiece, Verdict, WeatherContext } from '../data/types';
import { AppText } from '../components/primitives/AppText';
import { Chip } from '../components/primitives/Chip';
import { Icon } from '../components/primitives/Icon';
import { IconButton, Pill } from '../components/primitives/Pill';

export interface PLookCardBackProps {
  outfit: Outfit;
  weather: WeatherContext;
  /** When set, the back shows this garment instead of the whole look. */
  piece: OutfitPiece | null;
  pieceVerdict: Verdict | null;
  onVote: (verdict: Verdict) => void;
  onFlipBack: () => void;
}

export function PLookCardBack({
  outfit,
  weather,
  piece,
  pieceVerdict,
  onVote,
  onFlipBack,
}: PLookCardBackProps) {
  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <View style={styles.headings}>
          <AppText variant="kicker">
            {piece ? piece.garment.category : 'This look'}
          </AppText>
          <AppText variant="sheetName" style={styles.name}>
            {piece ? piece.garment.name : outfit.title}
          </AppText>
        </View>
        <IconButton
          icon="arrow-counter-clockwise"
          size={38}
          iconSize={17}
          background={colour.inkA(0.07)}
          onPress={onFlipBack}
        />
      </View>

      {piece ? (
        <GarmentBody
          piece={piece}
          verdict={pieceVerdict}
          onVote={onVote}
        />
      ) : (
        <LookBody outfit={outfit} weather={weather} />
      )}
    </View>
  );
}

function GarmentBody({
  piece,
  verdict,
  onVote,
}: {
  piece: OutfitPiece;
  verdict: Verdict | null;
  onVote: (v: Verdict) => void;
}) {
  return (
    <>
      <View style={styles.chips}>
        {piece.chips.map((c, i) => (
          <Chip key={`${c.label}-${i}`} chip={c} />
        ))}
      </View>

      {piece.rationale ? (
        <AppText variant="note" style={styles.note}>
          {piece.rationale}
        </AppText>
      ) : null}

      <View style={styles.spacer} />

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
          icon="heart"
          height={46}
          labelVariant="buttonLabelSm"
          background={verdict === 'LOVE' ? colour.brand : colour.inkA(0.07)}
          color={verdict === 'LOVE' ? colour.paperAlt : colour.ink}
          onPress={() => onVote('LOVE')}
          style={styles.action}
        />
      </View>
    </>
  );
}

function LookBody({
  outfit,
  weather,
}: {
  outfit: Outfit;
  weather: WeatherContext;
}) {
  return (
    <>
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Icon name={weather.icon} size={13} color={colour.inkA(0.85)} />
          <AppText style={styles.metaChipText}>{weather.label}</AppText>
        </View>
        <View style={styles.metaChip}>
          <Icon name="coat-hanger" size={13} color={colour.inkA(0.85)} />
          <AppText style={styles.metaChipText}>
            {outfit.pieces.length} pieces
          </AppText>
        </View>
      </View>

      <AppText variant="metaItalic" style={styles.standfirst}>
        {outfit.metaLine}
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
        {outfit.pieces.map((p) => (
          <View key={p.garment.id} style={styles.pieceRow}>
            <AppText variant="microLabelSm" style={styles.pieceCategory}>
              {p.garment.category}
            </AppText>
            <AppText style={styles.pieceName}>{p.garment.name}</AppText>
            {p.rationale ? (
              <AppText variant="note" style={styles.pieceNote}>
                {p.rationale}
              </AppText>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: space.edge,
    paddingTop: 20,
    // The action row rotates away with the front face now, so the back has
    // its full height and no longer reserves space for it.
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headings: { flex: 1, minWidth: 0 },
  name: { marginTop: 2 },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 16,
  },
  note: { marginTop: 14 },
  spacer: { flex: 1 },
  actions: { flexDirection: 'row', gap: 9 },
  action: { flex: 1 },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
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
    fontSize: 11,
    color: colour.inkA(0.85),
  },
  standfirst: { marginTop: 12 },
  rule: {
    height: 1,
    backgroundColor: colour.inkA(0.14),
    marginTop: 16,
  },
  sectionLabel: {
    marginTop: 14,
    color: colour.brandInk,
    letterSpacing: 1.6,
  },
  list: { marginTop: 4 },
  listInner: { paddingTop: 8, gap: 14, paddingBottom: 4 },
  pieceRow: { gap: 2 },
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
  pieceNote: { marginTop: 2 },
});
