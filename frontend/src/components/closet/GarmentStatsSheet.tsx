/**
 * Closet garment detail — the bottom sheet that opens when a tile is tapped.
 *
 * Shows what the wardrobe actually knows about one piece: how much of the
 * rotation it carries, how close it is to a wash, what weather it is for,
 * and how dressy it is.
 *
 * WHY THE NUMBERS ARE SHAPED THE WAY THEY ARE
 *
 * Several of these are DERIVED rather than stored, and the display follows
 * the same rule so it cannot drift from the database:
 *
 *   clean/dirty  `wearsSinceWash < washThreshold` — never a boolean column,
 *                because a flag would fall out of step with the counters
 *                that actually decide it
 *   age          from `acquired_at` at query time — a stored age is wrong the
 *                day after it is written
 *
 * The warmth and formality bands are the schema's own 1-5 scales, labelled
 * here rather than re-encoded: warmth 1 is hot-weather only (linen, mesh)
 * through 5 for deep winter; formality runs gym/lounge, everyday casual,
 * smart casual, business, black tie.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colour, radius, space } from '../../theme/tokens';
import { TAB_BAR_SPACE } from '../layout/TabBar';
import type { ClosetItem } from '../../data/types';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';
import { IconButton } from '../primitives/Pill';
import { Sheet } from '../primitives/Sheet';

/** Schema scale: 1 hot-weather only … 5 deep winter. */
const WARMTH = [
  { label: 'Hot weather only', icon: 'lightning' },
  { label: 'Warm days', icon: 'lightning' },
  { label: 'Mild, most of the year', icon: 'thermometer-simple' },
  { label: 'Cold weather', icon: 'thermometer-simple' },
  { label: 'Deep winter', icon: 'thermometer-simple' },
];

/** Schema scale: 1 gym/lounge … 5 black tie. */
const FORMALITY = [
  'Gym and lounge',
  'Everyday casual',
  'Smart casual',
  'Business',
  'Black tie',
];

function band(scale: readonly unknown[], value: number) {
  return scale[Math.min(Math.max(value, 1), scale.length) - 1];
}

export function GarmentStatsSheet({
  item,
  onClose,
}: {
  item: ClosetItem | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  /**
   * The panel is anchored near the bottom of the SCREEN, so its lower part
   * sits behind the floating nav bar. Rather than lifting the whole panel —
   * which would make it look like it came from halfway up — the panel grows
   * taller and reserves this much room at its foot. It still reads as rising
   * from the bottom edge, and nothing is ever hidden behind the bar.
   */
  const bottomClear = TAB_BAR_SPACE + insets.bottom;

  // Keep the last garment rendered through the slide-out, or the content
  // disappears before the animation finishes.
  const [shown, setShown] = useState<ClosetItem | null>(item);
  useEffect(() => {
    if (item) setShown(item);
  }, [item]);

  if (!shown) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const wearsLeft = Math.max(shown.washThreshold - shown.wearsSinceWash, 0);
  const warmth = band(WARMTH, shown.warmthRating) as (typeof WARMTH)[number];
  const formality = band(FORMALITY, shown.formalityBand) as string;
  const years = shown.ageDays !== null ? shown.ageDays / 365 : null;

  return (
    <Sheet visible={!!item} onClose={onClose}>
      <View style={[styles.body, { paddingBottom: bottomClear + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headings}>
            <AppText variant="kicker">{shown.category}</AppText>
            <AppText variant="sheetName" style={styles.name}>
              {shown.name}
            </AppText>
          </View>
          <IconButton
            icon="x"
            size={34}
            iconSize={15}
            background={colour.inkA(0.07)}
            onPress={onClose}
          />
        </View>

        {/* The two numbers that answer "is this pulling its weight" and
            "can I wear it right now". */}
        <View style={styles.statRow}>
          <Stat
            value={String(shown.outfitCount)}
            label={shown.outfitCount === 1 ? 'outfit' : 'outfits'}
            note={`${shown.wornCount} actually worn`}
          />
          <Stat
            value={shown.isClean ? String(wearsLeft) : 'Wash'}
            label={shown.isClean ? (wearsLeft === 1 ? 'wear left' : 'wears left') : 'due now'}
            note={`${shown.wearsSinceWash} of ${shown.washThreshold} since washing`}
            warn={!shown.isClean}
          />
        </View>

        <View style={styles.rule} />

        <Row
          icon={warmth.icon}
          label="Weather"
          value={warmth.label}
          meter={shown.warmthRating}
        />
        <Row
          icon="briefcase"
          label="Dressiness"
          value={formality}
          meter={shown.formalityBand}
        />
        <Row
          icon="drop"
          label="Water resistant"
          value={shown.waterResistant ? 'Yes' : 'No'}
        />
        <Row
          icon="palette"
          label="Colour"
          value={shown.primaryColor ?? 'Not recorded'}
        />
        {years !== null ? (
          <Row
            icon="calendar-blank"
            label="Owned"
            value={
              years < 1
                ? `${Math.round(shown.ageDays! / 30)} months`
                : `${years.toFixed(1)} years`
            }
          />
        ) : null}
      </View>
    </Sheet>
  );
}

function Stat({
  value,
  label,
  note,
  warn,
}: {
  value: string;
  label: string;
  note: string;
  warn?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        <AppText
          variant="itemTitle"
          style={[styles.statValue, warn && { color: colour.brandInk }]}
        >
          {value}
        </AppText>
        <AppText variant="microLabelSm" style={styles.statLabel}>
          {label}
        </AppText>
      </View>
      <AppText variant="note" style={styles.statNote}>
        {note}
      </AppText>
    </View>
  );
}

/** One attribute line, with an optional 1-5 meter for the banded scales. */
function Row({
  icon,
  label,
  value,
  meter,
}: {
  icon: string;
  label: string;
  value: string;
  meter?: number;
}) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={16} color={colour.inkA(0.7)} />
      <AppText variant="microLabelSm" style={styles.rowLabel}>
        {label}
      </AppText>
      <View style={styles.rowValue}>
        <AppText style={styles.rowValueText} numberOfLines={1}>
          {value}
        </AppText>
        {meter !== undefined ? (
          <View style={styles.meter}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View
                key={n}
                style={[
                  styles.pip,
                  {
                    backgroundColor:
                      n <= meter ? colour.brand : colour.inkA(0.14),
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.edge,
    paddingTop: 16,
    // paddingBottom is applied inline — it depends on the safe-area inset.
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headings: { flex: 1, minWidth: 0 },
  name: { marginTop: 2 },

  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colour.inkA(0.05),
    borderRadius: radius.bubble,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statValue: { fontSize: 24 },
  statLabel: { color: colour.inkA(0.7) },
  statNote: { marginTop: 5, fontSize: 12 },

  rule: {
    height: 1,
    backgroundColor: colour.inkA(0.14),
    marginTop: 20,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  rowLabel: { color: colour.inkA(0.7), width: 118 },
  rowValue: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rowValueText: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 13.5,
    color: colour.ink,
    flexShrink: 1,
  },
  meter: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
});
