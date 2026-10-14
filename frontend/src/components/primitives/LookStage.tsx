/**
 * The area a look's garments sit in — a stage, not a frame.
 *
 * Shared primitive: the Today card and the Ask look card both use it, so a
 * look is washed the same way wherever it appears.
 *
 * WHY THIS REPLACES THE FLAT ImageSlot ON THE OUTFIT CARD
 *
 * Two problems, one fix.
 *
 * 1. `washColorB` was never rendered. The design spec gives every look TWO
 *    wash colours ("Rain-ready: #e7dcc6 / #cfd8d2"), the schema stores both,
 *    the mock data carries both — and the card painted a single flat tint
 *    from `washColorA`. A flat rectangle of one colour is the most "pasted
 *    in" thing you can draw, which is what made the card feel inconsistent.
 *
 * 2. The garments will be CUTOUT EXTRACTIONS — transparent-background PNGs of
 *    clothes, not photographs. A cutout has no rectangle of its own, so
 *    framing it in a hard-edged box invents an edge the content does not
 *    have. The box then fights both the cutout (which wants to float) and
 *    the card (which is rounded and soft).
 *
 * So: a two-stop gradient wash from washColorA to washColorB, feathered at
 * its edges into the card's own paper, with no hard boundary anywhere. The
 * garments float on a tinted pool of their own colours rather than sitting
 * in a window.
 *
 * This also dissolves the alignment problem it used to have: the old block
 * ran full-bleed while the title was inset 18px, so the card read as two
 * misaligned columns. A feathered edge has nothing to misalign.
 *
 * Built on react-native-svg, which is already a dependency (phosphor renders
 * through it), so this costs no new package.
 *
 * The aspect-ratio region is kept because hotspot boxes are percentages
 * WITHIN it — the geometry still has to exist, it just stops being visible.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export interface LookStageProps {
  /** Per-look wash, both stops. Falls back to one colour if B is missing. */
  from: string;
  to?: string | null;
  /** The card surface this feathers into. Must match, or a halo appears. */
  paper: string;
  /**
   * Unique per mounted stage. react-native-svg resolves gradient `id`s
   * globally, so three cards mounted at once with the same id would all
   * paint the first card's gradient.
   */
  gradientKey: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Feather the edges into `paper`. True when the stage sits INSIDE a card
   * and must dissolve into it. False when the stage IS the page background —
   * there is nothing to dissolve into, and feathering would just vignette
   * the screen.
   */
  feather?: boolean;
  children?: ReactNode;
}

export function LookStage({
  from,
  to,
  paper,
  gradientKey,
  style,
  feather = true,
  children,
}: LookStageProps) {
  // Ids must be valid XML names, and outfit ids are free-form strings.
  const key = gradientKey.replace(/[^a-zA-Z0-9]/g, '');
  const washId = `wash${key}`;
  const featherId = `feather${key}`;

  return (
    <View style={[styles.stage, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Off-axis so the wash reads as light falling across the look
              rather than a straight top-to-bottom ramp. */}
          <LinearGradient id={washId} x1="0" y1="0" x2="0.45" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to ?? from} />
          </LinearGradient>

          {/* Transparent through the middle, card paper by the edges. This is
              what removes the boundary: the wash is at full strength where
              the garments are and gone by the time it reaches the card. */}
          <RadialGradient id={featherId} cx="50%" cy="50%" r="78%">
            <Stop offset="0.42" stopColor={paper} stopOpacity="0" />
            <Stop offset="0.78" stopColor={paper} stopOpacity="0.55" />
            <Stop offset="1" stopColor={paper} stopOpacity="1" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${washId})`} />
        {feather ? (
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${featherId})`}
          />
        ) : null}
      </Svg>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
