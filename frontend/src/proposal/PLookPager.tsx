/**
 * PROPOSAL ONLY. Vertical paging through the day's looks.
 *
 * The axes are now orthogonal: vertical cycles looks, horizontal pages
 * destinations. Nothing has to arbitrate between them, which is the whole
 * reason for choosing this over discriminating by region -- a region boundary
 * is invisible to the user, and OutfitCard fills most of the screen, so the
 * horizontal destination swipe would have become unusable on Today.
 *
 * Native paging again rather than a pan gesture: no worklet, no new
 * dependency, and the scroll cannot desynchronise from the finger.
 *
 * Two-way sync with the session store. A swipe sets the index on settle; a
 * rail tap sets the index and this scrolls to match. Scrolling to a position
 * it is already at is a no-op, so the two directions do not fight.
 *
 * TRADE-OFF ACCEPTED: using the vertical axis here forecloses
 * swipe-up-to-commit, which the design spec listed as an open option for the
 * whole-look commit. That is fine because the commit now has a home in the
 * three-verb pill row, but it is a real door closing.
 */
import { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type {
  Outfit,
  OutfitPiece,
  Verdict,
  WeatherContext,
} from '../data/types';
import { PLookCard } from './PLookCard';
import type { LookVerdict } from './LookVerdictsProvider';

/**
 * How much of the next card shows ABOVE the nav bar before running behind it.
 *
 * The scroll now extends to the bottom of the screen, under the floating
 * bar, so the next card is literally cut off by it. That is the affordance —
 * a card disappearing behind the bar says "there is more below" better than
 * a line of text saying so, which is what this replaced.
 */
const PEEK = 26;
/** Breathing room between cards, so the peek reads as a separate object. */
const CARD_GAP = 14;

/**
 * OutfitCardStack is deliberately not used here any more. Its two rotated
 * paper layers sold the illusion of a deck when exactly one proposal was on
 * screen. Now that the next card is genuinely visible below, a fake stack
 * behind each real card reads as clutter and its rotated corners bleed into
 * the gap. The real cards do that job now.
 */

export interface PLookPagerProps {
  proposals: Outfit[];
  index: number;
  onIndexChange: (i: number) => void;
  /** Measured height of one page. Pages render only once this is known. */
  pageHeight: number;
  /** Height of the floating nav bar plus its safe-area padding. The active
   *  card stops above this so its action row is never behind the bar. */
  bottomInset: number;
  openPieceIndex: number | null;
  pieceVerdict: (i: number) => Verdict | null;
  onPieceTap: (i: number) => void;
  /** Per-outfit, because each card now carries its own actions. */
  verdictFor: (outfitId: string) => LookVerdict | null;
  onCommit: (outfitId: string, verdict: LookVerdict) => void;
  isSaved: (outfitId: string) => boolean;
  onToggleSave: (outfit: Outfit) => void;
  onOpenDetails: (outfit: Outfit) => void;
  /** Flip state. Only the card at `index` can be showing its back. */
  weather: WeatherContext;
  flippedIndex: number | null;
  onFlipBack: () => void;
  focusPiece: OutfitPiece | null;
  focusVerdict: Verdict | null;
  onVote: (verdict: Verdict) => void;
}

export function PLookPager({
  proposals,
  index,
  onIndexChange,
  pageHeight,
  bottomInset,
  openPieceIndex,
  pieceVerdict,
  onPieceTap,
  verdictFor,
  onCommit,
  isSaved,
  onToggleSave,
  onOpenDetails,
  weather,
  flippedIndex,
  onFlipBack,
  focusPiece,
  focusVerdict,
  onVote,
}: PLookPagerProps) {
  const ref = useRef<ScrollView>(null);

  // The card ends above the nav bar, so its buttons are always reachable.
  // Everything past that — the gap and the head of the next card — falls
  // behind the bar.
  const cardHeight = Math.max(pageHeight - bottomInset - PEEK, 1);
  const interval = cardHeight + CARD_GAP;

  // Follow the session index — this is how a rail tap moves the pager.
  useEffect(() => {
    if (pageHeight <= 0) return;
    ref.current?.scrollTo({ y: index * interval, animated: true });
  }, [index, interval, pageHeight]);

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageHeight <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.y / interval);
    if (next !== index) onIndexChange(next);
  };

  // Before the first measurement there is no page size to lay out against.
  if (pageHeight <= 0) return <View style={styles.fill} />;

  return (
    <ScrollView
      ref={ref}
      // snapToInterval rather than pagingEnabled: paging snaps to the
      // VIEWPORT height, which would hide the peek. This snaps to the card.
      snapToInterval={interval}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={onSettled}
      scrollEventThrottle={16}
      style={styles.fill}
      // Lets the last card still reach the top of the viewport.
      // Lets the last card snap to the top with the bar still covering the
      // space below it.
      contentContainerStyle={{ paddingBottom: bottomInset + PEEK }}
    >
      {proposals.map((look, i) => (
        <View
          key={look.id}
          style={{
            height: cardHeight,
            marginBottom: i === proposals.length - 1 ? 0 : CARD_GAP,
          }}
        >
            <PLookCard
              outfit={look}
              lookNumber={i + 1}
              // Hotspot state belongs to the look on screen, so the cards
              // off-screen render inert rather than mirroring the open sheet.
              openPieceIndex={i === index ? openPieceIndex : null}
              pieceVerdict={i === index ? pieceVerdict : () => null}
              onPieceTap={onPieceTap}
              // Verdict and save are per-outfit, so every card shows its own
              // state whether or not it is the one on screen.
              verdict={verdictFor(look.id)}
              onCommit={(v) => onCommit(look.id, v)}
              saved={isSaved(look.id)}
              onToggleSave={() => onToggleSave(look)}
              onOpenDetails={() => onOpenDetails(look)}
              weather={weather}
              flipped={flippedIndex === i}
              onFlipBack={onFlipBack}
              focusPiece={flippedIndex === i ? focusPiece : null}
              focusVerdict={flippedIndex === i ? focusVerdict : null}
              onVote={onVote}
            />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
