/**
 * An invisible tap region over one garment in the look composite. Turns into
 * a dashed outline when its detail sheet is open, and carries a heart / x
 * badge once the user has given it a verdict — which persists after the
 * sheet closes.
 *
 * Positioned from a `[x%, y%, w%, h%]` box (placeholder coords from the mock;
 * the real extraction pipeline replaces these).
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import type { Verdict } from '../../data/types';
import { Icon } from '../primitives/Icon';
import { PressScale } from '../primitives/PressScale';

export interface HotspotProps {
  box: [number, number, number, number];
  active: boolean;
  verdict: Verdict | null;
  onPress: () => void;
}

export function Hotspot({ box, active, verdict, onPress }: HotspotProps) {
  const [x, y, w, h] = box;

  const borderColor = active
    ? colour.brand
    : verdict
      ? colour.inkA(0.25)
      : 'transparent';

  return (
    <PressScale
      onPress={onPress}
      style={[
        styles.region,
        {
          left: `${x}%`,
          top: `${y}%`,
          width: `${w}%`,
          height: `${h}%`,
          borderColor,
          backgroundColor: active ? colour.brandA(0.1) : 'transparent',
        },
      ]}
    >
      {verdict ? (
        <View
          style={[
            styles.badge,
            shadow('badge'),
            {
              backgroundColor:
                verdict === 'LOVE' ? colour.brand : colour.inkSolid,
            },
          ]}
        >
          <Icon
            name={verdict === 'LOVE' ? 'heart' : 'x'}
            size={12}
            color={colour.paperAlt}
          />
        </View>
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 18,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
