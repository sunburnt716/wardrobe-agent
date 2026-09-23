/**
 * Phosphor icon by kebab-case name (the same names the mocks and mock data
 * use). Duotone weight throughout, matching the design.
 */
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowUp,
  ArrowUpRight,
  BookmarkSimple,
  Briefcase,
  CalendarBlank,
  CameraPlus,
  ChatTeardropDots,
  Check,
  CheckCircle,
  CloudRain,
  CoatHanger,
  Couch,
  Crosshair,
  DotsThree,
  Drop,
  Heart,
  Hoodie,
  Lightning,
  MagnifyingGlass,
  Palette,
  Pants,
  Scissors,
  Sneaker,
  Sparkle,
  TShirt,
  ThermometerSimple,
  ThumbsDown,
  ThumbsUp,
  WashingMachine,
  X,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { colour } from '../../theme/tokens';

export type IconWeight =
  | 'thin'
  | 'light'
  | 'regular'
  | 'bold'
  | 'fill'
  | 'duotone';

type PhosphorIcon = ComponentType<{
  size?: number;
  color?: string;
  weight?: IconWeight;
}>;

const REGISTRY = {
  'arrow-clockwise': ArrowClockwise,
  'arrow-counter-clockwise': ArrowCounterClockwise,
  'arrow-up': ArrowUp,
  'arrow-up-right': ArrowUpRight,
  'bookmark-simple': BookmarkSimple,
  briefcase: Briefcase,
  'calendar-blank': CalendarBlank,
  'camera-plus': CameraPlus,
  'chat-teardrop-dots': ChatTeardropDots,
  check: Check,
  'check-circle': CheckCircle,
  'cloud-rain': CloudRain,
  'coat-hanger': CoatHanger,
  couch: Couch,
  crosshair: Crosshair,
  'dots-three': DotsThree,
  drop: Drop,
  heart: Heart,
  hoodie: Hoodie,
  lightning: Lightning,
  'magnifying-glass': MagnifyingGlass,
  palette: Palette,
  pants: Pants,
  scissors: Scissors,
  sneaker: Sneaker,
  sparkle: Sparkle,
  't-shirt': TShirt,
  'thermometer-simple': ThermometerSimple,
  'thumbs-down': ThumbsDown,
  'thumbs-up': ThumbsUp,
  'washing-machine': WashingMachine,
  x: X,
} as Record<string, PhosphorIcon>;

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
}

export function Icon({
  name,
  size = 18,
  color = colour.ink,
  weight = 'duotone',
}: IconProps) {
  const Cmp = REGISTRY[name] ?? Sparkle;
  return <Cmp size={size} color={color} weight={weight} />;
}
