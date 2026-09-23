# Fonts

The app references these families by their PostScript names. Drop the `.ttf`
files here, then run `npm run link-fonts` (and rebuild the native app).

All are free on Google Fonts.

| File | PostScript name (used in `src/theme/typography.ts`) | Role |
| --- | --- | --- |
| `YesevaOne-Regular.ttf` | `YesevaOne-Regular` | Display — look titles, masthead, garment names, commit buttons, big index numerals |
| `Lora-Regular.ttf` | `Lora-Regular` | Body serif |
| `Lora-Italic.ttf` | `Lora-Italic` | Secondary / meta copy (subtitles, hints, kickers) |
| `Lora-Medium.ttf` | `Lora-Medium` | Emphasised body |
| `Lora-SemiBold.ttf` | `Lora-SemiBold` | Button labels, chip text |

**Why Lora for body:** the design spec calls for "the design-system serif"
for body and "no sans-serif anywhere". Lora is the canonical pairing with
Yeseva One on Google Fonts. Swap it in `typography.ts` if the design system
names a different serif later.

Download:
- Yeseva One — https://fonts.google.com/specimen/Yeseva+One
- Lora — https://fonts.google.com/specimen/Lora
