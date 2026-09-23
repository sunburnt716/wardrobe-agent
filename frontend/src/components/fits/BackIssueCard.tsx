/**
 * One "back issue": a worn look with its date, the verdict the user gave,
 * the weather it was, and a re-wear action.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { FitEntry } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { ImageSlot } from '../primitives/ImageSlot';
import { IconButton } from '../primitives/Pill';
import { PressScale } from '../primitives/PressScale';

const TONES: Record<
  FitEntry['verdict']['tone'],
  { bg: string; fg: string }
> = {
  positive: { bg: 'rgba(75,97,87,0.14)', fg: colour.positive },
  neutral: { bg: colour.inkA(0.08), fg: colour.inkA(0.85) },
  negative: { bg: 'rgba(176,0,79,0.10)', fg: colour.magentaDeep },
};

export function BackIssueCard({
  entry,
  onRewear,
}: {
  entry: FitEntry;
  onRewear: (outfitId: string) => void;
}) {
  const tone = TONES[entry.verdict.tone];

  return (
    <PressScale style={[styles.card, shadow('soft')]}>
      <ImageSlot
        tint={entry.tintHint}
        icon="coat-hanger"
        iconSize={34}
        borderRadius={16}
        style={styles.thumb}
      />

      <View style={styles.body}>
        <AppText variant="microLabelSm" style={styles.when}>
          {entry.when}
        </AppText>
        <AppText variant="itemTitle" style={styles.name}>
          {entry.name}
        </AppText>
        <View style={styles.metaRow}>
          <View style={[styles.verdict, { backgroundColor: tone.bg }]}>
            <Icon name={entry.verdict.icon} size={13} color={tone.fg} />
            <AppText style={[styles.verdictText, { color: tone.fg }]}>
              {entry.verdict.label}
            </AppText>
          </View>
          <AppText style={styles.weather}>{entry.weather}</AppText>
        </View>
      </View>

      <IconButton
        icon="arrow-clockwise"
        size={34}
        iconSize={18}
        background="transparent"
        color={colour.inkA(0.5)}
        onPress={() => onRewear(entry.outfitId)}
      />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colour.paperAlt,
    borderRadius: radius.sheet - 2,
    padding: 12,
  },
  thumb: {
    width: 84,
    height: 96,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  when: {
    fontSize: 9.5,
    letterSpacing: 1.4,
  },
  name: {
    fontSize: 18,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  verdictText: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 10.5,
  },
  weather: {
    fontFamily: 'Lora-Regular',
    fontSize: 10.5,
    color: colour.inkA(0.6),
  },
});
