/**
 * Pill button (label + optional icon) and its circular icon-only sibling.
 * Colours are passed in so the same components serve the terracotta primary,
 * the dark reject fill, and the muted secondary states.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import type { TypeName } from '../../theme/typography';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressScale } from './PressScale';

export interface PillProps {
  label: string;
  icon?: string;
  onPress?: () => void;
  background?: string;
  color?: string;
  height?: number;
  labelVariant?: TypeName;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Pill({
  label,
  icon,
  onPress,
  background = colour.brand,
  color = colour.paperAlt,
  height = 52,
  labelVariant = 'buttonLabel',
  style,
  disabled,
}: PillProps) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.pill, { backgroundColor: background, height }, style]}
    >
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <AppText variant={labelVariant} style={{ color }}>
        {label}
      </AppText>
    </PressScale>
  );
}

export interface IconButtonProps {
  icon: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  background?: string;
  color?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 52,
  iconSize = 20,
  background = colour.inkA(0.07),
  color = colour.ink,
  borderColor,
  style,
}: IconButtonProps) {
  return (
    <PressScale
      onPress={onPress}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: background,
          borderWidth: borderColor ? 1.5 : 0,
          borderColor,
        },
        style,
      ]}
    >
      <View pointerEvents="none">
        <Icon name={icon} size={iconSize} color={color} />
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: radius.pill,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
