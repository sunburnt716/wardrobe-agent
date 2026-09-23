/**
 * Fits — what was actually worn, as a run of back issues, with a week strip
 * in the head.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { colour } from '../theme/tokens';
import { DatelineHeader } from '../components/layout/DatelineHeader';
import { ScreenScaffold } from '../components/layout/ScreenScaffold';
import { BackIssueCard } from '../components/fits/BackIssueCard';
import { WeekStrip } from '../components/fits/WeekStrip';
import { AppText } from '../components/primitives/AppText';
import { useFits } from '../data/useFits';

export function FitsScreen() {
  const { week, entries, wornDayCount, month, rewear } = useFits();

  return (
    <ScreenScaffold
      wash={colour.washFits}
      pillIcon="check-circle"
      pillLabel={`Worn ${wornDayCount} days`}
    >
      <DatelineHeader left={month} center="Fits" rightIcon="calendar-blank" />
      <WeekStrip week={week} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {entries.map((entry) => (
          <BackIssueCard key={entry.id} entry={entry} onRewear={rewear} />
        ))}
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="metaItalic">Nothing worn yet this month.</AppText>
          </View>
        ) : null}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 14,
  },
  empty: {
    paddingTop: 40,
    alignItems: 'center',
  },
});
