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
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { colour, space } from '../../theme/tokens';
import { AppText } from '../../components/primitives/AppText';
import { ScreenScaffold } from '../../components/layout/ScreenScaffold';
import { GarmentDetailSheet } from '../../components/today/GarmentDetailSheet';
import { OutfitCard } from '../../components/today/OutfitCard';
import { OutfitCardStack } from '../../components/today/OutfitCardStack';
import { ProgressRail } from '../../components/today/ProgressRail';
import { useToday } from '../../data/useToday';
import type { Outfit, WeatherContext } from '../../data/types';
import { TodaySessionProvider } from '../../state/TodaySessionProvider';
import { useTodaySession } from '../../state/todaySession';
import { ProposalHeader } from '../ProposalHeader';
import { PCommitRow } from '../PCommitRow';
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
  const session = useTodaySession();
  const { isSaved, toggle } = useSavedLooks();

  // Completes the Ask handoff. Clearing the request in the shell is what keeps
  // this from fighting the user if they then browse to another look.
  useEffect(() => {
    if (!requestedLook) return;
    const i = proposals.findIndex((o) => o.id === requestedLook);
    if (i >= 0) session.setLook(i);
    onLookShown?.();
  }, [requestedLook, proposals, session, onLookShown]);

  const look = proposals[session.lookIndex]!;
  const openPiece =
    session.openPieceIndex !== null
      ? look.pieces[session.openPieceIndex] ?? null
      : null;

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
        rightText={`${session.lookIndex + 1} / ${proposals.length}`}
        topRule={3}
      />

      <View style={styles.cardSection}>
        <View style={styles.stackWrap}>
          <OutfitCardStack>
            <OutfitCard
              outfit={look}
              lookNumber={session.lookIndex + 1}
              openPieceIndex={session.openPieceIndex}
              pieceVerdict={session.pieceVerdict}
              onPieceTap={session.openPiece}
            />
          </OutfitCardStack>
        </View>

        <View style={styles.railArea}>
          <ProgressRail
            count={proposals.length}
            activeIndex={session.lookIndex}
            onJump={session.setLook}
          />
          <AppText variant="microLabel" style={styles.swipeHint}>
            Swipe the rail for the next look
          </AppText>
        </View>
      </View>

      <PCommitRow
        verdict={session.lookVerdict()}
        onCommit={session.commitLook}
        saved={isSaved(look.id)}
        onToggleSave={() => toggle(look)}
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
  },
  cardSection: {
    flex: 1,
    paddingHorizontal: space.edge - 2,
    paddingTop: 16,
  },
  stackWrap: {
    flex: 1,
    marginBottom: 56,
  },
  railArea: {
    position: 'absolute',
    left: space.edge - 2,
    right: space.edge - 2,
    bottom: 6,
  },
  swipeHint: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 1.6,
    opacity: 0.8,
  },
});
