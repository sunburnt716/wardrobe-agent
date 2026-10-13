/**
 * Phosphor icon by kebab-case name (the same names the mocks and mock data
 * use). Duotone weight throughout, matching the design.
 */
// Deep imports, one file per icon. The barrel ('phosphor-react-native')
// re-exports ~1500 icons, and Metro does not tree-shake the dev bundle, so
// importing from it made a cold bundle transform thousands of extra modules
// to reach these 32 -- 75s to first byte, well past what Expo Go waits for.
// The package's exports map publishes './src/icons/*' for exactly this case.
// Each icon file's only reference to the barrel is a type-only import, which
// Babel elides, so this does not pull the barrel back in.
// Aliased to the non-deprecated *Icon export so REGISTRY below is unchanged.
import { ArrowClockwiseIcon as ArrowClockwise } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArrowCounterClockwiseIcon as ArrowCounterClockwise } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ArrowUpIcon as ArrowUp } from 'phosphor-react-native/src/icons/ArrowUp';
import { ArrowUpRightIcon as ArrowUpRight } from 'phosphor-react-native/src/icons/ArrowUpRight';
import { BookmarkSimpleIcon as BookmarkSimple } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { BriefcaseIcon as Briefcase } from 'phosphor-react-native/src/icons/Briefcase';
import { CalendarBlankIcon as CalendarBlank } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CameraPlusIcon as CameraPlus } from 'phosphor-react-native/src/icons/CameraPlus';
import { ChatTeardropDotsIcon as ChatTeardropDots } from 'phosphor-react-native/src/icons/ChatTeardropDots';
import { CheckIcon as Check } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon as CheckCircle } from 'phosphor-react-native/src/icons/CheckCircle';
import { CloudRainIcon as CloudRain } from 'phosphor-react-native/src/icons/CloudRain';
import { CoatHangerIcon as CoatHanger } from 'phosphor-react-native/src/icons/CoatHanger';
import { CouchIcon as Couch } from 'phosphor-react-native/src/icons/Couch';
import { CrosshairIcon as Crosshair } from 'phosphor-react-native/src/icons/Crosshair';
import { DotsThreeIcon as DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { DropIcon as Drop } from 'phosphor-react-native/src/icons/Drop';
import { HeartIcon as Heart } from 'phosphor-react-native/src/icons/Heart';
import { HoodieIcon as Hoodie } from 'phosphor-react-native/src/icons/Hoodie';
import { LightningIcon as Lightning } from 'phosphor-react-native/src/icons/Lightning';
import { MagnifyingGlassIcon as MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PaletteIcon as Palette } from 'phosphor-react-native/src/icons/Palette';
import { PantsIcon as Pants } from 'phosphor-react-native/src/icons/Pants';
import { ScissorsIcon as Scissors } from 'phosphor-react-native/src/icons/Scissors';
import { SneakerIcon as Sneaker } from 'phosphor-react-native/src/icons/Sneaker';
import { SparkleIcon as Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { TShirtIcon as TShirt } from 'phosphor-react-native/src/icons/TShirt';
import { ThermometerSimpleIcon as ThermometerSimple } from 'phosphor-react-native/src/icons/ThermometerSimple';
import { ThumbsDownIcon as ThumbsDown } from 'phosphor-react-native/src/icons/ThumbsDown';
import { ThumbsUpIcon as ThumbsUp } from 'phosphor-react-native/src/icons/ThumbsUp';
import { WashingMachineIcon as WashingMachine } from 'phosphor-react-native/src/icons/WashingMachine';
import { XIcon as X } from 'phosphor-react-native/src/icons/X';
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
