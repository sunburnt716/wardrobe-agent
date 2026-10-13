# Fonts

These files are vendored, not fetched at build time. They are registered at
app startup by `src/theme/fonts.ts` (`expo-font`) and named from
`src/theme/typography.ts`.

| File | Registration key | Role |
| --- | --- | --- |
| `YesevaOne-Regular.ttf` | `YesevaOne-Regular` | Display — look titles, masthead, garment names, commit buttons, big index numerals |
| `Lora-Regular.ttf` | `Lora-Regular` | Body serif |
| `Lora-Italic.ttf` | `Lora-Italic` | Secondary / meta copy (subtitles, hints, kickers) |
| `Lora-Medium.ttf` | `Lora-Medium` | Emphasised body |
| `Lora-SemiBold.ttf` | `Lora-SemiBold` | Button labels, chip text |

The key is whatever `fonts.ts` maps the file to — it is *not* read from the
PostScript name inside the file. Renaming a key is a rename in
`typography.ts` too.

**Why Lora for body:** the design spec calls for "the design-system serif"
for body and "no sans-serif anywhere". Lora is the canonical pairing with
Yeseva One on Google Fonts. Swap it in `typography.ts` if the design system
names a different serif later.

## Provenance — and why not straight from Google Fonts

- `YesevaOne-Regular.ttf` — `google/fonts`, `ofl/yesevaone/`.
- The four `Lora-*.ttf` — static instances from the npm package
  `@expo-google-fonts/lora@0.4.2` (`400Regular`, `400Regular_Italic`,
  `500Medium`, `600SemiBold`), renamed to the keys above.

Google Fonts no longer ships static Lora. `ofl/lora/` contains only the
variable fonts `Lora[wght].ttf` and `Lora-Italic[wght].ttf`. React Native
cannot select a named instance out of a variable font — it renders the
default weight (400) and ignores the rest — so loading those two files would
make `Lora-Medium` and `Lora-SemiBold` render identically to
`Lora-Regular`. That failure is silent: no error, just a flattened type
hierarchy. Hence the pre-instanced static cuts.

If a weight is added later, take it from the same package so the
instancing stays consistent, and add it to both `fonts.ts` and the table
above.
