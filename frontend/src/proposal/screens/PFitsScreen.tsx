/**
 * PROPOSAL ONLY. Fits with yielding chrome and a Worn / Saved segment.
 *
 * Why saved looks live here rather than in a fifth tab: Apple's guidance is
 * to keep the tab count low, and this proposal has just removed a tab to get
 * actions out of the bar -- adding one back for Saved would undo that. Fits
 * is already "your looks over time", so past (worn) and future (saved) are
 * two views of one destination.
 *
 * The segment control borrows the Closet's idiom on purpose: underlined
 * words, not buttons, per the design spec's "filters are underlined words in
 * a scrolling row, not buttons".
 *
 * NOTE: this is the placement I'd defend, but it is a real UX choice with a
 * live alternative -- saved looks could sit in Closet instead, on the grounds
 * that Closet is "things I own" and Fits is "things I did". Easy to move.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colour, space } from '../../theme/tokens';
import { DatelineHeader } from '../../components/layout/DatelineHeader';
import { BackIssueCard } from '../../components/fits/BackIssueCard';
import { WeekStrip } from '../../components/fits/WeekStrip';
import { AppText } from '../../components/primitives/AppText';
import { PressScale } from '../../components/primitives/PressScale';
import { useFits } from '../../data/useFits';
import { useChromeScroll } from '../ChromeContext';
import { useSavedLooks } from '../SavedLooksProvider';
import { PSavedLookCard } from '../PSavedLookCard';
import { YieldScaffold, useScrollBottomPad } from '../YieldScaffold';

type Segment = 'worn' | 'saved';

export function PFitsScreen() {
  const { week, entries, wornDayCount, month, rewear } = useFits();
  const { saved, remove, count } = useSavedLooks();
  const [segment, setSegment] = useState<Segment>('worn');
  const onScroll = useChromeScroll();
  const bottomPad = useScrollBottomPad();

  const showingSaved = segment === 'saved';

  return (
    <YieldScaffold
      wash={colour.washFits}
      pillIcon={showingSaved ? 'bookmark-simple' : 'check-circle'}
      pillLabel={
        showingSaved ? `${count} saved` : `Worn ${wornDayCount} days`
      }
      header={
        <>
          <DatelineHeader
            left={month}
            center="Fits"
            rightIcon="calendar-blank"
          />
          {showingSaved ? null : <WeekStrip week={week} />}
          <View style={styles.segments}>
            <SegmentWord
              label="Worn"
              active={segment === 'worn'}
              onPress={() => setSegment('worn')}
            />
            <SegmentWord
              label={count > 0 ? `Saved (${count})` : 'Saved'}
              active={showingSaved}
              onPress={() => setSegment('saved')}
            />
          </View>
        </>
      }
    >
      {(topPad) => (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad, paddingBottom: bottomPad },
          ]}
        >
          {showingSaved ? (
            saved.length > 0 ? (
              saved.map((o) => (
                <PSavedLookCard key={o.id} outfit={o} onUnsave={remove} />
              ))
            ) : (
              <View style={styles.empty}>
                <AppText variant="metaItalic">
                  Nothing saved yet. Tap the bookmark on a look in Today.
                </AppText>
              </View>
            )
          ) : (
            <>
              {entries.map((entry) => (
                <BackIssueCard key={entry.id} entry={entry} onRewear={rewear} />
              ))}
              {entries.length === 0 ? (
                <View style={styles.empty}>
                  <AppText variant="metaItalic">
                    Nothing worn yet this month.
                  </AppText>
                </View>
              ) : null}
            </>
          )}
        </Animated.ScrollView>
      )}
    </YieldScaffold>
  );
}

function SegmentWord({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressScale onPress={onPress}>
      <View
        style={[
          styles.word,
          { borderBottomColor: active ? colour.brand : 'transparent' },
        ]}
      >
        <AppText
          variant="microLabel"
          style={{
            color: active ? colour.brandInk : colour.inkA(0.7),
            letterSpacing: 1.3,
          }}
        >
          {label}
        </AppText>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: space.edge,
    paddingTop: 10,
    paddingBottom: 2,
  },
  word: {
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  scroll: {
    paddingHorizontal: 18,
    gap: 14,
  },
  empty: {
    paddingTop: 40,
    alignItems: 'center',
  },
});
