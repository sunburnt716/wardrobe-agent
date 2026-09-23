/**
 * Today — the primary screen. The daily proposal(s): browse looks, tap a
 * garment to inspect it, give piece- and look-level verdicts.
 *
 * Pass 1: everything except the card drag/fly-off gesture (Pass 2).
 */
import { StyleSheet, View } from 'react-native';
import { colour, space } from '../theme/tokens';
import { AppText } from '../components/primitives/AppText';
import { DatelineHeader } from '../components/layout/DatelineHeader';
import { ScreenScaffold } from '../components/layout/ScreenScaffold';
import { GarmentDetailSheet } from '../components/today/GarmentDetailSheet';
import { OutfitCard } from '../components/today/OutfitCard';
import { OutfitCardStack } from '../components/today/OutfitCardStack';
import { ProgressRail } from '../components/today/ProgressRail';
import { WholeLookVerdict } from '../components/today/WholeLookVerdict';
import { useToday } from '../data/useToday';
import type { Outfit, WeatherContext } from '../data/types';
import { TodaySessionProvider } from '../state/TodaySessionProvider';
import { useTodaySession } from '../state/todaySession';

export function TodayScreen() {
  const { proposals, weather, date, status } = useToday();

  if (status !== 'ready' || proposals.length === 0) {
    return (
      <ScreenScaffold
        wash={colour.washToday}
        pillIcon={weather.icon}
        pillLabel={weather.label}
      >
        <DatelineHeader
          left={date}
          center="Fitcheck"
          centerVariant="wordmark"
          rightText="—"
          topRule={3}
        />
        <View style={styles.empty}>
          <AppText variant="metaItalic">
            {status === 'loading'
              ? 'Putting today together…'
              : "No look for today yet."}
          </AppText>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <TodaySessionProvider lookCount={proposals.length}>
      <TodayContent proposals={proposals} weather={weather} date={date} />
    </TodaySessionProvider>
  );
}

function TodayContent({
  proposals,
  weather,
  date,
}: {
  proposals: Outfit[];
  weather: WeatherContext;
  date: string;
}) {
  const session = useTodaySession();
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
      <DatelineHeader
        left={date}
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
            Swipe for the next look
          </AppText>
        </View>
      </View>

      <WholeLookVerdict
        verdict={session.lookVerdict()}
        onCommit={session.commitLook}
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
