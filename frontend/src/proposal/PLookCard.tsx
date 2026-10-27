/**
 * PROPOSAL ONLY. One look, as a card that flips.
 *
 * FRONT holds nothing but the look and the three verbs — no title, no meta,
 * no hint. Anything written on the front competes with the garments, which
 * are the only thing the front is for.
 *
 * BACK holds the words. Tapping the card flips to the whole look; tapping a
 * garment flips to THAT garment. The back replaces the two bottom sheets
 * that used to cover the card, because information about an object belongs
 * on the object rather than in a panel over it.
 *
 * THE BUTTONS LIVE ON THE FRONT FACE, as a `PLookActions` object rather than
 * inline markup, so they rotate away with the card and can be dropped onto
 * any other surface that needs look-level verbs. While the back is showing
 * they are not reachable, which is intended: the verbs belong to the side
 * showing the look.
 *
 * HOW THE FLIP WORKS
 * One shared value, 0 = front, 1 = back. Each face rotates on Y, offset 180°
 * from the other, with a `perspective` ahead of the rotation so it reads as
 * depth and not as a horizontal squash. `backfaceVisibility: 'hidden'` hides
 * whichever face is turned away; the opacity switch at the halfway point is a
 * belt-and-braces guard, because backface culling is not reliable across
 * every RN/Fabric version and a ghost of the reversed face is very visible.
 *
 * Worklet discipline: the styles below close over the shared value and plain
 * numbers only — no tokens object, no helper call. See ProgressRail.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colour, radius } from '../theme/tokens';
import { shadow } from '../theme/shadows';
import type { Outfit, OutfitPiece, Verdict, WeatherContext } from '../data/types';
import { AppText } from '../components/primitives/AppText';
import { Icon } from '../components/primitives/Icon';
import { LookStage } from '../components/primitives/LookStage';
import { Hotspot } from '../components/today/Hotspot';
import { PLookActions } from './PLookActions';
import type { LookVerdict } from './LookVerdictsProvider';
import { PLookCardBack } from './PLookCardBack';

const FLIP_MS = 460;

export interface PLookCardProps {
  outfit: Outfit;
  lookNumber: number;
  weather: WeatherContext;
  /** Hotspot state. Null for off-screen cards so only one can be active. */
  openPieceIndex: number | null;
  pieceVerdict: (index: number) => Verdict | null;
  onPieceTap: (index: number) => void;
  /** True when this card is showing its back. */
  flipped: boolean;
  /** Tapped the look itself — flip to the whole-look side. */
  onOpenDetails: () => void;
  onFlipBack: () => void;
  /** Garment currently on the back, or null for the whole look. */
  focusPiece: OutfitPiece | null;
  focusVerdict: Verdict | null;
  onVote: (verdict: Verdict) => void;
  /** Whole-look verdict for THIS outfit. */
  verdict: LookVerdict | null;
  onCommit: (verdict: LookVerdict) => void;
  saved: boolean;
  onToggleSave: () => void;
}

export function PLookCard({
  outfit,
  lookNumber,
  weather,
  openPieceIndex,
  pieceVerdict,
  onPieceTap,
  flipped,
  onOpenDetails,
  onFlipBack,
  focusPiece,
  focusVerdict,
  onVote,
  verdict,
  onCommit,
  saved,
  onToggleSave,
}: PLookCardProps) {
  const numeral = String(lookNumber).padStart(2, '0');
  const accepted = verdict === 'ACCEPT';
  const rejected = verdict === 'REJECT';

  const flip = useSharedValue(flipped ? 1 : 0);
  useEffect(() => {
    flip.value = withTiming(flipped ? 1 : 0, {
      duration: FLIP_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [flipped, flip]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [
      { perspective: 1200 },
      { rotateY: `${flip.value * 180}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 0 : 1,
    transform: [
      { perspective: 1200 },
      { rotateY: `${180 + flip.value * 180}deg` },
    ],
  }));

  return (
    <View style={styles.root}>
      {/* ---------------- FRONT: the look, nothing written on it ---------- */}
      <Animated.View style={[styles.face, shadow('card'), frontStyle]}>
        <LookStage
          from={outfit.washColorA}
          to={outfit.washColorB}
          paper={colour.paper}
          gradientKey={outfit.id}
          feather={false}
          style={StyleSheet.absoluteFill}
        />

        <Pressable
          onPress={onOpenDetails}
          accessibilityRole="button"
          accessibilityLabel={`${outfit.title}, see details`}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.placeholder} pointerEvents="none">
            <Icon name="coat-hanger" size={54} color="rgba(32,30,29,0.22)" />
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
        </Pressable>

        <AppText variant="indexNumeral" style={styles.numeral}>
          {numeral}
        </AppText>

        {/* Inside the front face, AFTER the Pressable, so it rotates with the
            card and still wins touches against the card-tap target. */}
        <PLookActions
          verdict={verdict}
          onCommit={onCommit}
          saved={saved}
          onToggleSave={onToggleSave}
          style={styles.actions}
        />
      </Animated.View>

      {/* ---------------- BACK: the words -------------------------------- */}
      <Animated.View style={[styles.face, shadow('card'), backStyle]}>
        <PLookCardBack
          outfit={outfit}
          weather={weather}
          piece={focusPiece}
          pieceVerdict={focusVerdict}
          onVote={onVote}
          onFlipBack={onFlipBack}
        />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Both faces occupy the same box; only one is ever turned toward you.
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colour.hairline,
    backgroundColor: colour.paper,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeral: {
    position: 'absolute',
    right: 16,
    top: 10,
    color: 'rgba(32,30,29,0.16)',
  },
  actions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
