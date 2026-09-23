/**
 * Stands in for real garment photography / an extracted composite. Sized and
 * positioned exactly where the image will land; renders a tinted surface
 * with an optional category icon (the mocks' placeholder line-art is NOT
 * reproduced — see the handoff README's Fidelity note).
 *
 * `children` is for overlays on top of the slot (the Closet "Wash" badge,
 * the Ask "3 pieces" badge, Today's hotspots).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colour } from '../../theme/tokens';
import { Icon } from './Icon';

export interface ImageSlotProps {
  tint: string;
  icon?: string;
  iconSize?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function ImageSlot({
  tint,
  icon,
  iconSize = 40,
  borderRadius = 0,
  style,
  children,
}: ImageSlotProps) {
  return (
    <View
      style={[
        styles.slot,
        { backgroundColor: tint, borderRadius },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize} color={colour.inkA(0.5)} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
