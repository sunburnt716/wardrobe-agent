/**
 * The paper stack: two static rotated layers suggesting a deck, with the
 * live card on top. Pass 2 makes the live card draggable (fly-off on a
 * >64px swipe); for now it sits still.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';

export function OutfitCardStack({ children }: { children: ReactNode }) {
  return (
    <View style={styles.stack}>
      <View style={[styles.layer, styles.back]} />
      <View style={[styles.layer, styles.mid, shadow('soft')]} />
      <View style={[styles.layer, styles.live]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    ...StyleSheet.absoluteFillObject,
  },
  layer: {
    position: 'absolute',
    borderRadius: radius.card,
  },
  back: {
    top: 8,
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: colour.brandA(0.16),
    transform: [{ rotate: '3.4deg' }],
  },
  mid: {
    top: 4,
    left: 2,
    right: 2,
    bottom: 6,
    backgroundColor: '#f2e6d9',
    transform: [{ rotate: '-1.8deg' }],
  },
  live: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
