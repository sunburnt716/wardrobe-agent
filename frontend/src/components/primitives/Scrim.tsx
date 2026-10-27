/**
 * A bottom-anchored gradient that makes light text legible over ANY surface.
 *
 * WHY A SCRIM AND NOT A CLAMPED COLOUR
 *
 * `safeWash` solves the same problem by walking a tint back until dark text
 * clears AA. That works when the surface is a colour we generate. It does not
 * work once the surface is a PHOTOGRAPH — you cannot clamp a photo, and
 * garment cutouts are photographs. A scrim darkens whatever is underneath,
 * so it holds regardless of what the image turns out to be.
 *
 * STRENGTH IS NOT A TASTE DECISION. The binding case is the LIGHTEST possible
 * garment (#f4efe6 in the current data): at 0.40 alpha, `paperAlt` on it
 * measures 3.09:1 and fails AA. 0.60 brings the worst case to 6.02:1, and
 * every darker garment is comfortably above that. Below 0.60 the floor
 * breaks, so treat it as a minimum rather than a default.
 *
 * Rendered with react-native-svg, already a dependency.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Minimum that keeps light text legible on the lightest surface.
 *
 * Measured, not chosen: on the lightest Today wash (#f4efe6), `paperAlt`
 * needs 0.52 and dimmed text needs 0.62. 0.68 clears both with margin.
 */
export const SCRIM_FLOOR = 0.68;

export interface ScrimProps {
  /** Unique per mounted scrim — svg gradient ids resolve globally. */
  gradientKey: string;
  /** Opacity at the very bottom. Do not go under SCRIM_FLOOR. */
  strength?: number;
  /** Fraction of the height the gradient occupies, measured from the bottom. */
  height?: number;
}

export function Scrim({
  gradientKey,
  strength = SCRIM_FLOOR,
  height = 0.6,
}: ScrimProps) {
  const key = gradientKey.replace(/[^a-zA-Z0-9]/g, '');
  const id = `scrim${key}`;
  const topPct = `${Math.round((1 - height) * 100)}%`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/*
            Ramps, then PLATEAUS at full strength from 50% of the scrim
            region down — roughly the bottom 30% of the card.

            That plateau is the important part. A ramp that only reaches
            full strength at the very bottom edge leaves anything stacked
            above it — a title, a meta line — sitting on a much weaker
            scrim than the measurement assumed. The text block has to land
            entirely inside the full-strength zone, so the zone has to start
            above the text rather than under it.

            Eased rather than linear at the top, so there is no visible edge
            where the gradient begins.
          */}
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.28" stopColor="#000000" stopOpacity={strength * 0.22} />
            <Stop offset="0.5" stopColor="#000000" stopOpacity={strength} />
            <Stop offset="1" stopColor="#000000" stopOpacity={strength} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y={topPct}
          width="100%"
          height={`${Math.round(height * 100)}%`}
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
}
