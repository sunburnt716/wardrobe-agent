/**
 * PROPOSAL ONLY. One look, with its own verdict and save actions ON the card.
 *
 * Structure follows components/today/OutfitCard exactly -- terracotta spine
 * with rotated text, title + italic meta, the aspect-locked composite with
 * tappable hotspots, the ghosted index numeral. The proposal carries its own
 * copy because the action row replaces the hint line INSIDE the card bounds,
 * which is a change to the card's own layout rather than something that can
 * be overlaid from outside.
 *
 * Why actions belong here: a fixed row at the foot of the screen silently
 * retargets as you scroll, so the thing you are judging and the buttons you
 * judge it with drift apart. On the card, "wear this" always means this card.
 *
 * Three tap targets, in a deliberate hierarchy:
 *   hotspot      -> that garment's detail sheet  (child wins the touch)
 *   action row   -> verdict / save               (child wins the touch)
 *   anywhere else-> this look's detail sheet
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { colour, radius } from '../theme/tokens';
import { shadow } from '../theme/shadows';
import type { Outfit, Verdict } from '../data/types';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { LookStage } from '../components/primitives/LookStage';
import { IconButton } from '../components/primitives/Pill';
import { PressScale } from '../components/primitives/PressScale';
import { Hotspot } from '../components/today/Hotspot';
import type { LookVerdict } from './LookVerdictsProvider';

const UNSET_FILL = 'rgba(255,253,249,0.92)';

export interface PLookCardProps {
  outfit: Outfit;
  lookNumber: number;
  /** Hotspot state. Null for off-screen cards so only one sheet can be open. */
  openPieceIndex: number | null;
  pieceVerdict: (index: number) => Verdict | null;
  onPieceTap: (index: number) => void;
  /** Whole-look verdict for THIS outfit. */
  verdict: LookVerdict | null;
  onCommit: (verdict: LookVerdict) => void;
  saved: boolean;
  onToggleSave: () => void;
  /** Tap on the card body — opens this look's detail sheet. */
  onOpenDetails: () => void;
}

export function PLookCard({
  outfit,
  lookNumber,
  openPieceIndex,
  pieceVerdict,
  onPieceTap,
  verdict,
  onCommit,
  saved,
  onToggleSave,
  onOpenDetails,
}: PLookCardProps) {
  const numeral = String(lookNumber).padStart(2, '0');
  const accepted = verdict === 'ACCEPT';
  const rejected = verdict === 'REJECT';

  return (
    <View style={[styles.card, shadow('card')]}>
      {/* The 26px terracotta spine from OutfitCard is gone. It printed
          "LOOK 01 — FITCHECK" rotated -90deg as magazine-spine furniture, but
          rotation is a paint-time transform: the Text still laid out inside a
          26px-wide box first, so numberOfLines={1} truncated it to "LO…"
          before it was ever rotated. Doing it properly needs a container
          sized to the card's HEIGHT and then rotated. Dropped rather than
          fixed -- it also cost 26px of card width, and the index numeral
          already says which look this is. */}
      <View style={styles.content}>
        {/* Plain Pressable, not PressScale: scaling a full-bleed card on every
            tap reads as a glitch, and it would fight the scroll. */}
        <Pressable
          onPress={onOpenDetails}
          accessibilityRole="button"
          accessibilityLabel={`${outfit.title}, see details`}
          style={styles.body}
        >
          <View style={styles.header}>
            <AppText variant="lookTitle">{outfit.title}</AppText>
            <AppText variant="metaItalic" style={styles.meta}>
              {outfit.metaLine}
            </AppText>
          </View>

          <View style={styles.imageArea}>
            <LookStage
              from={outfit.washColorA}
              to={outfit.washColorB}
              paper={colour.paper}
              gradientKey={outfit.id}
              style={styles.composite}
            >
              {/* Placeholder until the extraction pipeline lands. Faint on
                  purpose: it marks where the cutouts will float, without
                  pretending to be one. */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={styles.placeholder}>
                  <Icon name="coat-hanger" size={54} color={colour.inkA(0.28)} />
                </View>
              </View>

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
            </LookStage>
          </View>
        </Pressable>

        <AppText variant="hint" style={styles.hint}>
          {openPieceIndex !== null
            ? 'Tap another piece'
            : 'Tap a piece, or the card for details'}
        </AppText>

        <View style={styles.actions}>
          <IconButton
            icon="x"
            size={44}
            iconSize={17}
            background={rejected ? colour.inkSolid : UNSET_FILL}
            color={rejected ? colour.paperAlt : colour.inkA(0.85)}
            borderColor={rejected ? undefined : colour.inkA(0.2)}
            onPress={() => onCommit('REJECT')}
          />

          <PressScale
            onPress={() => onCommit('ACCEPT')}
            accessibilityRole="button"
            accessibilityLabel={accepted ? 'Wearing this today' : 'Wear this'}
            style={[
              styles.accept,
              { backgroundColor: accepted ? colour.brandDeep : colour.brand },
            ]}
          >
            <Icon
              name={accepted ? 'check-circle' : 'check'}
              size={17}
              color={colour.paperAlt}
            />
            <AppText variant="buttonLabelSm" style={{ color: colour.paperAlt }}>
              {accepted ? 'Wearing this' : 'Wear this'}
            </AppText>
          </PressScale>

          <IconButton
            icon="bookmark-simple"
            size={44}
            iconSize={17}
            background={saved ? colour.brand : UNSET_FILL}
            color={saved ? colour.paperAlt : colour.inkA(0.85)}
            borderColor={saved ? undefined : colour.inkA(0.2)}
            onPress={onToggleSave}
          />
        </View>
      </View>

      <AppText variant="indexNumeral" style={styles.numeral}>
        {numeral}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colour.hairline,
    backgroundColor: colour.paper,
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    // Was left: 26 to clear the spine. The card gets that width back.
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  body: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 18,
    // The composite starts immediately after this block, so without a bottom
    // pad the meta line's descenders sit on the image edge. `metaItalic` is
    // an italic serif with long descenders, which makes the collision worse
    // than the type size suggests.
    paddingBottom: 16,
  },
  meta: { marginTop: 6 },
  imageArea: {
    flex: 1,
  },
  /**
   * The stage fills whatever the card gives it.
   *
   * It used to be `width: '100%'` + `aspectRatio: 402/440` + `maxHeight`.
   * Once cards grew taller than that ratio, Yoga resolved the conflict by
   * shrinking the box to satisfy the aspect ratio — so the wash became a
   * narrow panel floating in the upper-left with dead space beside and below
   * it. The 402x440 figure described the mock's composite image, not a shape
   * the card has to be.
   *
   * Hotspot boxes are percentages OF this box, so they still land correctly;
   * they simply map onto a taller stage.
   */
  composite: {
    flex: 1,
    alignSelf: 'stretch',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    paddingHorizontal: 18,
    // Same problem on the other edge: the hint sat against the bottom of the
    // image. The image now has clear air above and below it.
    paddingTop: 14,
    paddingBottom: 8,
  },
  // Inside the card, where OutfitCard's hint line used to sit.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  accept: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  numeral: {
    position: 'absolute',
    right: 14,
    bottom: 56,
  },
});
