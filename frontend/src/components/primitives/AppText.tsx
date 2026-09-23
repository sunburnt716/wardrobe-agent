/**
 * Text with a design-system preset. Use `variant` for the named styles in
 * `theme/typography.ts`; pass `style` to layer on colour/margins.
 *
 *   <AppText variant="lookTitle">Rain-ready</AppText>
 */
import {
  Text as RNText,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { textPresets, type TypeName } from '../../theme/typography';

export interface AppTextProps extends TextProps {
  variant?: TypeName;
  style?: StyleProp<TextStyle>;
}

export function AppText({ variant = 'note', style, ...rest }: AppTextProps) {
  return (
    <RNText {...rest} style={[textPresets[variant] as TextStyle, style]} />
  );
}
