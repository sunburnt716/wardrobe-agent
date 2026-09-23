/**
 * The raised light panel on the dark Add screen: what the model read, as
 * correctable chips, the explicit water-resistant toggle, and commit /
 * retake. Docked (not a modal), rounded on the top corners only.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius, space } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { DetectedGarment } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Chip } from '../primitives/Chip';
import { IconButton, Pill } from '../primitives/Pill';
import { Toggle } from '../primitives/Toggle';

export interface ReadFromPhotoSheetProps {
  detected: DetectedGarment;
  waterResistant: boolean;
  onWaterResistantChange: (v: boolean) => void;
  onCommit: () => void;
  onRetake: () => void;
}

export function ReadFromPhotoSheet({
  detected,
  waterResistant,
  onWaterResistantChange,
  onCommit,
  onRetake,
}: ReadFromPhotoSheetProps) {
  return (
    <View style={[styles.sheet, shadow('sheet')]}>
      <AppText variant="microLabelSm" style={styles.kicker}>
        Read from the photo
      </AppText>
      <AppText variant="itemTitle" style={styles.name}>
        {detected.name}
      </AppText>

      <View style={styles.chips}>
        {detected.chips.map((c, i) => (
          <Chip key={`${c.label}-${i}`} chip={c} />
        ))}
      </View>

      <View style={styles.waterRow}>
        <AppText variant="bubble" style={{ color: colour.ink }}>
          Water resistant
        </AppText>
        <Toggle value={waterResistant} onChange={onWaterResistantChange} />
      </View>

      <View style={styles.actions}>
        <IconButton
          icon="arrow-counter-clockwise"
          size={52}
          background={colour.inkA(0.07)}
          onPress={onRetake}
          style={{ height: 50 }}
        />
        <Pill
          label="Add to closet"
          icon="check"
          onPress={onCommit}
          height={50}
          labelVariant="buttonLabel"
          style={styles.commit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colour.paperAlt,
    borderTopLeftRadius: radius.sheet + 4,
    borderTopRightRadius: radius.sheet + 4,
    paddingHorizontal: space.edge,
    paddingTop: 18,
    paddingBottom: 18,
  },
  kicker: {
    color: colour.brand,
    letterSpacing: 1.8,
  },
  name: { marginTop: 5 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },
  commit: { flex: 1 },
});
