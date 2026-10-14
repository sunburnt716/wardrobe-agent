/**
 * PROPOSAL ONLY. Today, with the Apple/Instagram header action and a
 * save-for-later verb.
 *
 * Unchanged from the shipped TodayScreen: the session store, the card stack,
 * the hotspots, the progress rail, the detail sheet. Those are the
 * fundamentals and this proposal is about navigation and verbs, not the card.
 *
 * Today deliberately does NOT yield chrome. It has no scroll -- the card is
 * fixed -- so there is nothing to yield against. Reducing Today's chrome is a
 * layout decision (a shorter dateline, a smaller pill), not a scroll
 * behaviour, and is left alone here on purpose so the comparison stays clean.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colour, space } from '../../theme/tokens';
import { AppText } from '../../components/primitives/AppText';
import { ScreenScaffold } from '../../components/layout/ScreenScaffold';
import { GarmentDetailSheet } from '../../components/today/GarmentDetailSheet';
import { useToday } from '../../data/useToday';
import { PLookPager } from '../PLookPager';
import { PVerticalRail, RAIL_WIDTH } from '../PVerticalRail';
import { TAB_BAR_TOTAL } from '../YieldingTabBar';
import type { Outfit, WeatherContext } from '../../data/types';
import { TodaySessionProvider } from '../../state/TodaySessionProvider';
import { useTodaySession } from '../../state/todaySession';
import { ProposalHeader } from '../ProposalHeader';
import { PLookSheet } from '../PLookSheet';
import { useLookVerdicts } from '../LookVerdictsProvider';
import { useSavedLooks } from '../SavedLooksProvider';

export interface PTodayScreenProps {
  onAdd: () => void;
  /** Outfit id handed over from Ask's look card, or null. */
  requestedLook?: string | null;
  /** Called once the requested look has been selected, so it fires once. */
  onLookShown?: () => void;
}

export function PTodayScreen({
  onAdd,
  requestedLook = null,
  onLookShown,
}: PTodayScreenProps) {
  const { proposals, weather, date, status } = useToday();

  if (status !== 'ready' || proposals.length === 0) {
    return (
      <ScreenScaffold
        wash={colour.washToday}
        pillIcon={weather.icon}
        pillLabel={weather.label}
      >
        <ProposalHeader
          actionIcon="camera-plus"
          onAction={onAdd}
          actionLabel="Add a piece"
          center="Fitcheck"
          centerVariant="wordmark"
          rightText={date}
          topRule={3}
        />
        <View style={styles.empty}>
          <AppText variant="metaItalic">
            {status === 'loading'
              ? 'Putting today together…'
              : 'No look for today yet.'}
          </AppText>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <TodaySessionProvider lookCount={proposals.length}>
      <TodayContent
        proposals={proposals}
        weather={weather}
        date={date}
        onAdd={onAdd}
        requestedLook={requestedLook}
        onLookShown={onLookShown}
      />
    </TodaySessionProvider>
  );
}

function TodayContent({
  proposals,
  weather,
  date,
  onAdd,
  requestedLook,
  onLookShown,
}: {
  proposals: Outfit[];
  weather: WeatherContext;
  date: string;
  onAdd: () => void;
  requestedLook: string | null;
  onLookShown?: () => void;
}) {
  const insets = useSafeAreaInsets();
  // What the floating nav bar occupies at the foot of the screen.
  const bottomInset = TAB_BAR_TOTAL + insets.bottom;

  const session = useTodaySession();
  const { isSaved, toggle } = useSavedLooks();
  const { verdictFor, commit, isRejected } = useLookVerdicts();

  // Rejecting removes the look from Today. The verdict is still recorded in
  // LookVerdictsProvider, so a disliked-outfits view can read it later.
  const visible = useMemo(
    () => proposals.filter((o) => !isRejected(o.id)),
    [proposals, isRejected],
  );

  // Rejecting the last card would leave lookIndex past the end of the list.
  useEffect(() => {
    if (visible.length === 0) return;
    if (session.lookIndex > visible.length - 1) {
      session.setLook(visible.length - 1);
    }
  }, [visible.length, session]);

  // Which look's whole-look sheet is open, if any. Separate from the session's
  // openPieceIndex: the garment sheet and the look sheet are two levels, and
  // tapping a hotspot must not also open the look sheet behind it.
  const [detailLook, setDetailLook] = useState<Outfit | null>(null);

  // The pager needs a concrete page height; flex alone won't give paging a
  // page size. Measured once, then re-measured only on a real change.
  const [pageHeight, setPageHeight] = useState(0);
  const onSectionLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - pageHeight) > 1) setPageHeight(h);
  };

  // Completes the Ask handoff. Indexes into `visible`, since that is what the
  // pager renders — a rejected look is no longer reachable by index.
  useEffect(() => {
    if (!requestedLook) return;
    const i = visible.findIndex((o) => o.id === requestedLook);
    if (i >= 0) session.setLook(i);
    onLookShown?.();
  }, [requestedLook, visible, session, onLookShown]);

  const safeIndex = Math.min(session.lookIndex, Math.max(visible.length - 1, 0));
  const look = visible[safeIndex] ?? null;
  const openPiece =
    look && session.openPieceIndex !== null
      ? look.pieces[session.openPieceIndex] ?? null
      : null;

  // Every look rejected. Not an error state — the user did this deliberately.
  if (visible.length === 0) {
    return (
      <ScreenScaffold
        wash={colour.washToday}
        pillIcon={weather.icon}
        pillLabel={weather.label}
      >
        <ProposalHeader
          actionIcon="camera-plus"
          onAction={onAdd}
          actionLabel="Add a piece"
          center="Fitcheck"
          centerVariant="wordmark"
          rightText={date}
          topRule={3}
        />
        <View style={styles.empty}>
          <AppText variant="metaItalic" style={styles.emptyLine}>
            That's all of today's looks.
          </AppText>
          <AppText variant="microLabel" style={styles.emptySub}>
            Ask the stylist for something else
          </AppText>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      wash={colour.washToday}
      pillIcon={weather.icon}
      pillLabel={weather.label}
      // The look pager runs to the bottom of the screen so cards continue
      // behind the floating nav bar. The pager reserves the bar's height
      // itself, so the active card's buttons still clear it.
      padBottom={false}
    >
      <ProposalHeader
        actionIcon="camera-plus"
        onAction={onAdd}
        actionLabel="Add a piece"
        center="Fitcheck"
        centerVariant="wordmark"
        rightText={`${safeIndex + 1} / ${visible.length}`}
        topRule={3}
      />

      <View style={styles.cardSection} onLayout={onSectionLayout}>
        <View style={styles.pagerWrap}>
          <PLookPager
            proposals={visible}
            index={safeIndex}
            onIndexChange={session.setLook}
            pageHeight={pageHeight}
            bottomInset={bottomInset}
            openPieceIndex={session.openPieceIndex}
            pieceVerdict={session.pieceVerdict}
            onPieceTap={session.openPiece}
            verdictFor={verdictFor}
            onCommit={commit}
            isSaved={isSaved}
            onToggleSave={toggle}
            onOpenDetails={setDetailLook}
          />
        </View>

        <View
          style={[styles.railArea, { bottom: bottomInset }]}
          pointerEvents="box-none"
        >
          <PVerticalRail
            count={visible.length}
            activeIndex={safeIndex}
            onJump={session.setLook}
          />
        </View>
      </View>

      <PLookSheet
        outfit={detailLook}
        weather={weather}
        onClose={() => setDetailLook(null)}
      />

      <GarmentDetailSheet
        piece={openPiece}
        verdict={
          session.openPieceIndex !== null
            ? session.pieceVerdict(session.openPieceIndex)
            : null
        }
        onClose={session.closePiece}
        onVote={session.votePiece}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyLine: {
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 11.5,
    letterSpacing: 1.6,
    opacity: 0.7,
  },
  cardSection: {
    flex: 1,
    paddingLeft: space.edge - 2,
    // Room for the rail beside the card rather than under it, which is what
    // gives the card back the ~56px the horizontal rail used to take.
    paddingRight: space.edge - 2 + RAIL_WIDTH,
    paddingTop: 16,
  },
  pagerWrap: {
    flex: 1,
  },
  railArea: {
    position: 'absolute',
    right: space.edge - 2 - RAIL_WIDTH / 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
