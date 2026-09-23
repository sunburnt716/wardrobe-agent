# CLAUDE.md

Agentic outfit picker. Postgres + GraphQL Yoga + TypeScript. An LLM agent proposes outfits against a system of record; a deterministic layer constrains what it can produce.

**Two actors write to this database:** the GraphQL server and the agent. The agent does not go through GraphQL. Every rule below follows from that.

---

## Read before writing

| Before working on                                | Read first                          |
| ------------------------------------------------ | ----------------------------------- |
| Anything touching entities or columns            | `schema.sql`                        |
| Server composition, transactions, error taxonomy | `wardrobe-server-dev-spec.md`       |
| GraphQL types and operations                     | `wardrobe-graphql-dev-spec.md`      |
| Resolvers                                        | `wardrobe-resolver-dev-spec.md`     |
| Tests for `withTransaction`                      | `wardrobe-transaction-test-spec.md` |

Do not infer the shape of an entity from surrounding code or from a type definition. `schema.sql` is canonical; TypeScript types are a projection of it and may lag. If the two disagree, stop and say so rather than picking one.

---

## Architecture rules

These are not stylistic. Violating them produces silent data corruption.

**Invariants live in the DAL, nowhere else.** Resolvers validate shape — is the request well-formed. The DAL validates truth — is this write legal against current state. An invariant enforced in a resolver is unenforced for the agent, which never reaches resolvers.

**Multi-statement writes take `TxClient`.** Single-statement reads and writes take `Queryable`. A multi-write function that accepts `Queryable` will run each statement on a different pooled connection in autocommit, and a partial failure commits partial state permanently.

**`as unknown as TxClient` appears exactly once**, inside `withTransaction`, immediately after `BEGIN`. A second occurrence anywhere is a review failure — do not add one, and flag it if you find one.

**Mutations use `RETURNING *`.** Never infer success from `rowCount`.

**`worn_on = NULL` is the proposal/reality boundary.** Agent-created outfits have it null; only `markOutfitWorn` sets it. Anything reading confirmed history filters on it. A half-written outfit is indistinguishable from a legitimate proposal — this is why atomicity is not optional here.

**Actor permissions differ.** What a user client may mutate is not what the agent may mutate. Check the permission model before adding a mutation path.

---

## Testing

**Tests derive from specs, not from implementations.** A test written by reading the code under test mirrors that code's mistakes and reports agreement as correctness. When writing tests, work from the numbered requirements in the relevant spec. If a requirement isn't written down, say so — do not infer it from the implementation and proceed.

**Every test must be seen to fail.** New tests are not done until a deliberate mutation of the code turns them red for the expected reason. Specs list the mutations to apply; if none are listed, propose them.

**Never resolve a failing test by changing the assertion.** A red test means either the code is wrong or the test is wrong. That decision belongs to the human. Report the failure and the two candidate explanations; do not pick one.

**Assert on `InvariantViolation.code`, never on message text.** Codes are the stable contract; messages are human-facing and change freely.

**DAL tests run against real Postgres**, transaction-per-test with rollback. Do not mock the database in the DAL layer — a mocked database returns invented rows and proves nothing about whether an invariant holds.

**Type-level guarantees are verified by `tsc --noEmit`**, not by the runtime suite. Types are erased at runtime; there is nothing to assert against.

---

## Change discipline

- **No new dependencies without asking.** The tree is deliberately small.
- **Schema changes require a migration file.** Never edit `schema.sql` alone.
- **New `InvariantCode` values need a decision, not just an addition.** Where the code list lives is unresolved (server spec §7); adding one silently commits to an answer.
- **Do not widen a parameter type to make something compile.** Narrow types here are load-bearing. If a signature blocks you, that is usually the design working.

---

## Ask rather than assume

- A requirement that would need to be inferred from existing code
- Anything that changes the agent's action vocabulary
- Anything that changes what the eval harness asserts
- Any case where following a rule above appears to be impossible

---

_This file states rules. It cannot create the conditions some of them require — in particular, test independence comes from a separate session that has not read the implementation, not from an instruction to disregard what is already in context._

# Fitcheck — design spec

Reference for engineering. Describes the screens as designed in `Fitcheck Today alive.dc.html` (Today) and `Fitcheck other screens.dc.html` (Closet, Add, Ask, Fits).

---

## 1. Product model

Fitcheck proposes complete outfits from the user's own wardrobe, one day at a time. The user cycles proposals, inspects individual garments, and gives feedback at two levels:

- **Look level** — accept or reject the whole proposal.
- **Piece level** — love / not-this on a single garment inside a proposal.

Piece-level verdicts are the interesting signal: they are captured in the context of a specific look, so they should be stored as `(item_id, outfit_id, verdict, timestamp)` rather than a flat item rating. That lets the recommender learn compatibility edges ("this knit, but not with these jeans") instead of only item popularity.

---

## 2. Screens and features

### Today (primary screen)

- Full-bleed image of the assembled look, edge to edge, no card frame.
- **Tap-to-inspect hotspots.** One circular marker per garment, positioned over that garment in the image. Tapping opens a detail card from the bottom.
- **Detail card** contains: category kicker, garment name, status chips, one line of context, and love-it / not-this.
- Arrows left and right cycle proposals; progress dots show position in the set.
- Persistent hint line: "Tap a piece to see what it is."
- Verdicts persist on the marker itself — the marker turns into a heart or an x in the verdict colour, so the outfit visibly carries what the user has said.
- Newspaper dateline head: heavy rule, date / "Fitcheck" masthead / avatar, hairline rule.
- Weather lives in the Dynamic Island as a live-activity pill (Android: a straight tape banner spaced clear of the punch-hole).

Hotspot coordinates are per-garment-per-look. They must come from the garment-extraction step (bounding box centroid of each detected piece in the composite), not be hand-placed.

### Closet

- Wardrobe as a two-column run of **uneven tile heights** — deliberately not a uniform grid.
- Each tile: garment image, name, category and wear count.
- "Due a wash" badge in magenta, driven by `wears_since_wash` against the item's threshold.
- Filters are underlined words in a scrolling row, not buttons.
- Island carries a live count of items due a wash.

### Add

- Dark viewfinder screen — the only dark surface in the app — so the capture step feels like a different mode.
- Detection frame over the garment with a confidence read ("Knitwear · 92%").
- Raised paper sheet below with what the model read: colour, warmth, formality, material, as chips the user can correct.
- `water_resistant` as an explicit toggle (not inferred silently).
- One commit button, plus retake.

### Ask

- Stylist conversation on the indigo wash.
- User bubbles in the accent; replies on paper.
- A reply can carry an **openable look card** — garment sketches, piece count, "Open in Today" — which hands off to the Today screen with that proposal loaded.
- Suggestion pills for common follow-ups ("Something warmer", "Swap the knit").
- Island shows "Thinking…" while the agent runs.

### Fits

- What was actually worn, as a run of back issues.
- Week strip in the head: worn days filled, today solid.
- Each entry: look image, date, the verdict the user gave, the weather it was, and a re-wear action.

---

## 3. Design decisions

### Depth instead of borders

No hairline boxes anywhere for layout. Hierarchy comes from whitespace, type scale, and layered shadows. Cards use large soft shadows (`0 18px 34px -20px rgba(32,30,29,.6)`) and the detail sheet sits at the top elevation. Rules print only as newspaper furniture in the head — a 4px rule above the dateline, a 1px rule below it — and never around content.

### Colour derived from the outfit, not fixed

Each look carries its own wash and accent, sampled from the garments:

| Look            | Wash                  | Accent    |
| --------------- | --------------------- | --------- |
| Rain-ready      | `#e7dcc6` / `#cfd8d2` | `#4b6157` |
| Off-duty indigo | `#dde2ef` / `#c8d2ea` | `#2f4a7a` |
| All charcoal    | `#ddd9d4` / `#c6c3c0` | `#39393b` |

The accent drives the active tab, the progress dot, love-it verdicts and the sheet kicker. In production these come from dominant-colour extraction on the day's garments, so the app's colour changes daily and is tied to real data. Rejection is always `#b0004f` (magenta) regardless of look, so negative signals read consistently.

Ground paper is `#fdfaf4`; the desk behind the phone is a warm beige. Warm ground, cool accents.

### Type

Yeseva One for display (look titles, masthead, garment names, commit buttons). The design-system serif for body. All meta lines are uppercase, letter-spaced, ~10px minimum, at ≥0.78 alpha for legibility. No sans-serif anywhere.

### Motion

Motion carries most of the liveliness — it is not decoration:

- Cycling a look: image and title slide ~26px in the direction of travel and cross-fade (550ms, `cubic-bezier(.2,.9,.25,1.08)`).
- Hotspots re-enter staggered 60ms apart, scaling up from 0.8.
- Active hotspot pulses a halo ring (1.6s loop) and grows 34px → 42px.
- Detail sheet springs up (`cubic-bezier(.2,1.2,.3,1)`) over a 42% scrim.
- Verdict changes pop the marker with a spring, and commit changes the button's icon, label and glow.
- Every tappable element scales to ~0.94 on press. Add haptics on commit and on verdicts.

### Shape and touch

Fully rounded: pills for all actions, 30px radius on sheets, 20–24px on cards, circular hotspots and avatars. All hit targets ≥34px, primary actions 46–54px. Tab bar is a floating pill with 34px bottom padding to clear the home indicator.

### Content restraint

Look titles are two or three words. One uppercase meta line ("Three layers · smart"). No body paragraph on the main screen — the image does that work. Longer copy appears only inside the detail card, where the user asked for it.

### What was removed and why

- **Garment cards in a row.** Four equal rectangles read as an infographic and duplicated what the image already shows. Replaced by hotspots on the image itself.
- **Bottom action bar on Today.** With per-piece verdicts in the detail card, the two large buttons were redundant weight. The whole-look commit still needs a home — decide between a pill in the head and a swipe-up gesture.
- **The raised top banner.** Too much chrome; the newspaper dateline does the same job on open paper.
- **Swipe deck, "Why this", "Shuffle".** Superseded by arrows plus the two-level verdict system.

---

## 4. Data the UI needs

Per garment: `id`, `name`, `category`, `colour`, `warmth_band` (5-band schema), `formality`, `material`, `water_resistant`, `wears_since_wash`, `wash_threshold`, `image`, and — new — `hotspot: {x, y}` per composite it appears in.

Per proposal: `id`, `title`, `meta`, ordered `items[]`, `wash_colours[2]`, `accent`, `composite_image`, `rationale` per item, and `weather_context`.

Per verdict: `item_id`, `outfit_id`, `verdict`, `timestamp`.

---

## 5. Open items

1. Where the whole-look accept lives now that Today's button row is gone.
2. Garment extraction: composites plus per-piece cutouts plus hotspot coordinates, from one pipeline.
3. Dominant-colour extraction feeding the wash and accent per day.
4. Android parity for the island treatment.
5. Real photography — the current garment drawings are placeholders.
