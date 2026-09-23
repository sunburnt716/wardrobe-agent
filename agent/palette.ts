// Palette extraction, injected into AgentContext and surfaced to the model
// as the get_palette tool (tools/getPalette.ts). The look card's accent and
// wash colours are "sampled from the garments" (Fitcheck design spec §3) --
// the model can't derive a hex from the coarse colour string it sees in
// get_candidates, so it asks for one here.
//
// Two implementations behind one interface:
//   - LookupPaletteProvider: deterministic colour-name -> hex table. Ships
//     now. Every "navy" garment yields the same swatch -- lower fidelity,
//     but no image pipeline required.
//   - (future) ImagePaletteProvider: reads the garment's photo_key blob and
//     extracts dominant colours, falling back to the lookup table for any
//     garment with photo_key = NULL. Swapped in at composition.ts; the tool
//     contract and the model prompt do not change.

export interface Swatch {
  hex: string; // '#rrggbb', lowercase
  // Rough share of the garment this colour covers, 0..1. The lookup provider
  // reports 1.0 for a primary and 0.4 for a secondary -- a hint for the
  // model, not a measured value until the image provider exists.
  coverage: number;
}

// What the tool handler hands the provider: everything either implementation
// might need, resolved from the garments row once so the provider stays a
// pure function of its input.
export interface GarmentColorInput {
  garmentId: number;
  photoKey: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface PaletteProvider {
  // Keyed by garmentId. A garment the provider can say nothing about is
  // omitted from the map rather than mapped to [] -- same contract as
  // getLastWornDates.
  extract(garments: GarmentColorInput[]): Promise<Map<number, Swatch[]>>;
}

// Named colours the model or a createGarment caller is likely to use, mapped
// to a representative hex. Deliberately small and cool-leaning to match the
// design's "warm ground, cool accents"; unknown names fall through to a
// neutral so the provider never returns nothing for a garment that has a
// colour string at all.
const NAMED_COLORS: Record<string, string> = {
  black: '#1c1c1e',
  charcoal: '#39393b',
  grey: '#8a8a8e',
  gray: '#8a8a8e',
  white: '#f4f1ea',
  cream: '#efe9d8',
  beige: '#d9cdb4',
  tan: '#c9b29a',
  brown: '#6f5844',
  navy: '#2f4a7a',
  blue: '#3f6bb0',
  'light blue': '#9fc0e8',
  indigo: '#2f4a7a',
  teal: '#2f6f6a',
  green: '#4b6157',
  olive: '#6b6a3c',
  forest: '#2f4331',
  burgundy: '#5c2233',
  red: '#a83232',
  pink: '#d98aa6',
  purple: '#5b4a7a',
  yellow: '#c9a53f',
  orange: '#c47a3a',
  rust: '#a15a3a',
};

const NEUTRAL_HEX = '#c6c3c0';

function hexForName(name: string | null): string | null {
  if (!name) return null;
  return NAMED_COLORS[name.trim().toLowerCase()] ?? NEUTRAL_HEX;
}

export class LookupPaletteProvider implements PaletteProvider {
  async extract(
    garments: GarmentColorInput[],
  ): Promise<Map<number, Swatch[]>> {
    const out = new Map<number, Swatch[]>();
    for (const g of garments) {
      const swatches: Swatch[] = [];
      const primary = hexForName(g.primaryColor);
      if (primary) swatches.push({ hex: primary, coverage: 1 });
      const secondary = hexForName(g.secondaryColor);
      if (secondary && secondary !== primary) {
        swatches.push({ hex: secondary, coverage: 0.4 });
      }
      if (swatches.length > 0) out.set(g.garmentId, swatches);
    }
    return out;
  }
}
