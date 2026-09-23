# Fitcheck — mobile client

React Native (bare, no Expo yet). Recreates the five screens from the design
handoff: **Today, Closet, Add, Ask, Fits**.

## Status: Pass 1

What's here:

- Project config, TypeScript, Babel/Metro, font-linking config
- **Theme** — `src/theme/`: every colour, type preset, and shadow recipe
  from the handoff, in one place
- **Data layer** — `src/data/`: typed shapes that mirror
  `../api/schema.graphql`, placeholder data ported from the prototypes, and
  the `use*` hooks that are the **only** seam to the real backend
- **All five screens**, laid out faithfully, with the interactions that
  don't need gesture work: filter row, detail sheet, piece + look verdicts,
  water toggle, chat send (canned reply), progress-rail jump, re-wear stub
- Shared primitives + per-screen components

Deferred to **Pass 2** (gestures / motion):

- Today card **drag + fly-off** swipe (the card is static for now; the
  progress rail and arrows still change looks)
- Hotspot staggered entry + halo pulse
- Cross-fade on look change

Deferred to **Pass 3** (polish):

- Haptics on verdict / commit (`react-native-haptic-feedback` is installed)
- Grain texture overlay
- Shadow / spacing fidelity pass

## Backend seam — do not cross yet

Screens never fetch. They call one hook per screen from `src/data/`:

| Hook | Serves | `TODO(backend)` |
| --- | --- | --- |
| `useToday` | proposed looks, weather | `Query.outfits({PROPOSED})`, `Query.weather` |
| `useCloset` | wardrobe grid, filters, wash count | `Query.garments({filters})` |
| `useAsk` | chat thread, send | `Mutation.sendMessage` + job poll |
| `useFits` | worn history, re-wear | `Query.outfits({WORN})`, `Mutation.rewearOutfit` |
| `useAddGarment` | detected garment, commit | classification service, `Mutation.createGarment` |

Piece/look verdicts live in `src/state/todaySession.ts` (also carrying their
`TODO(backend)` mutations). `grep -rn "TODO(backend)" src` lists every wire-up
point.

## Running it (later)

This folder is the JS/TS source only — there are no `android/` / `ios/`
native projects yet. To run:

1. Scaffold a native shell (RN CLI: `npx @react-native-community/cli init
   Fitcheck`, or an Expo prebuild) and copy `App.tsx`, `index.js`, `src/`,
   and the config files in, reconciling `package.json`.
2. Drop the font `.ttf` files into `assets/fonts/` (see the README there) and
   `npm run link-fonts`.
3. `npm install`, then `npm run android` (Android emulator on Windows) or
   `npm run ios` (needs macOS).

## Fonts

**Yeseva One** (display) + **Lora** (body serif — the spec forbids
sans-serif). See `assets/fonts/README.md`.

> Note: `.claude/CLAUDE.md`'s embedded design spec and the handoff README
> disagree on the display font (Yeseva One vs Instrument Serif). Per your
> call we're using **Yeseva One**; the embedded spec should be updated to
> match so it stops contradicting the handoff.
