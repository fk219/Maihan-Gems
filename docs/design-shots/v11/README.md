# Design pass v11 — the Apple formula: type is the design

Status: measured on `main` (base `506a2d8`) plus this pass. The navbar, the
admin and vendor consoles, `packages/`, `api/` and every other route are
untouched. The homepage composition, the footer's presentation CSS and the
hero's title/accent word are the only render changes.

This pass answers the client bar: **the homepage must feel like Apple built a
jewellery site.** The response is a system, not a re-skin: one statement per
screen, full-bleed photography, hard light/dark cuts, and scroll-driven
entrances with no scroll-jacking.

---

## 1. The system

| Rule | Implementation |
|---|---|
| Type is the design | One statement per screen: Cormorant Garamond 600, tracking −0.02em, `clamp(3rem, 8vw, 8rem)` (48 px → 8vw → 128 px). Copy is one sentence. No paragraphs in sections; no paragraphs added to the hero. |
| Whitespace is the luxury | Each section: one statement + one visual + one action. Section padding `clamp(7rem, 14vh, 11rem)`. |
| Scroll is the story | CSS scroll-driven entrances (`animation-timeline: view()`) behind `@supports` and `prefers-reduced-motion: no-preference` guards. No JS, no listeners, no hijacking. |
| Photography is the hero art | Full-bleed, edge to edge, no card chrome. Locked ratios with `object-fit: cover` + `object-position`; captures/photos never stretched. |
| Light and dark alternate | Obsidian (hero + marquee) → paper (collection, atelier) → obsidian (DYO) → paper (certificate) → obsidian (gemologist) → paper (try-on) → obsidian (closing + footer). Each flip is a hard cut. |
| Gold is spent four times | 1. the hero accent word "stone"; 2. the marquee band (gold on obsidian); 3. the closing section's top hairline; 4. the closing CTA's gold border. Everything else is ink on paper / cream on obsidian. |
| Motion | Scroll entrances: opacity + transform + blur, linear timeline progress. Hover/focus: the house curve `cubic-bezier(.16,1,.3,1)`, 150–240 ms. Reduced motion: no marquee motion, no entrances; all content fully visible. |

---

## 2. Section table

| # | Section | Ground | Statement | Visual | Action | Motion |
|---|---|---|---|---|---|---|
| 1 | Hero | obsidian | "The **stone** comes first." (gold accent word) | The approved hero still, full-height right | Search + "Ask a gemologist" → `/concierge` | Composition as built; title rides the statement scale |
| 2 | Marquee | obsidian | none (band) | Typographic only: stone name · carat · origin, read from the records | — (non-interactive; region focus pauses it) | 90 s linear loop, `translateX(-50%)`, paused on hover + focus, static under reduced motion |
| 3 | The collection | paper | "The stone, and the record behind it." | Full-bleed illustrative tanzanite, 2:1 band (4:3 ≤640 px), caption below | "See every gemstone" → `/gemstones` | Statement: fade + rise + unblur on entry (view(), entry 0→55%). Photograph: slow settle from 1.06 scale (entry 0→cover 35%) |
| 4 | Atelier | paper | "A finished jewel, or the mounting for your stone." | The record's own 4:5 plate (Elysian Ring), captioned name · spec · price | "Enter the jewellery rooms" → `/jewellery` | Split enter, same two animations |
| 5 | Design your own | obsidian | "Design your own, stone first." | Illustrative rough tanzanite, centred 3:4 plate | "Open the configurator" → `/design-your-own` | Statement enter, media settle |
| 6 | Certificate intelligence | paper | "Every claim carries its evidence." | Illustrative diamond plate, 4:5; the record's real fields beside it (laboratory, report, specimen, treatment, origin) | "Open the {name} record" → the record | Statement + fields enter, media settle |
| 7 | AI gemologist | obsidian | "Where was this stone mined?" — one question, italic | Full-bleed illustrative amethyst, 2:1 band | "Ask the gemologist" → `/concierge` | Statement enter; the band settles at full bleed |
| 8 | Try-on | paper | "See the stone in place." | One catalogue photograph, 4:3 plate | "Open the try-on studio" → `/ar/webar-tz-0131` | Statement enter, media settle |
| 9 | Closing | obsidian | "See the stone before you decide." | none — the decision is the visual | Gold-bordered "Request an appointment" → `/contact`; gold hairline above | Statement enter |
| 10 | Footer | obsidian | "The stone comes first. / The record follows." | Large serif wordmark (clamp 40→64 px), hairline rules, four quiet columns, INV-07/08 note | Links as before, all resolving | none |

The marquee carries the range proof (names, carats, origins from real
records); the collection index ledger was folded into it.

---

## 3. Exact scroll-behaviour implementation

Pure CSS, no JavaScript:

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .v11-enter {
      animation: v11-enter linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 55%;
    }
    .v11-enter-media {
      animation: v11-enter-media linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 35%;
    }
  }
}
```

- **Enter** (`v11-enter`, statements/fields/actions): from `opacity 0`,
  `translateY(28px) scale(0.985)`, `blur(8px)` to settled; progress mapped to
  the element's entry, complete by 55% of its entry — it then holds fully
  visible, and the next section's own entrance is the handover.
- **Media settle** (`v11-enter-media`, full-bleed/plates): from `opacity 0.35`,
  `scale(1.06)`, `blur(10px)`; mapped over entry → 35% of cover, so the
  photograph is still settling while the statement has already arrived.
- **Fallbacks**: without `animation-timeline: view()` support (older
  Firefox/Safari) or under `prefers-reduced-motion: reduce`, the block does not
  apply and everything renders static and fully visible. The global
  reduced-motion kill in `storefront-craft.css` also stops the keyframes.
- **No scroll-jacking**: the animations only read scroll position; the page
  never moves the user, nothing pins, and scrolling is native.

The marquee is the only always-on motion: a 90 s linear `translateX(-50%)`
loop over two identical halves (second half `aria-hidden`), paused on
`:hover` and `:focus-within`, disabled under reduced motion. The band is a
focusable region so keyboard users can pause it (WCAG 2.2.2).

---

## 4. Provenance and honesty

- **No new dependency, no new client component, no JS added.** The entire
  motion system is CSS.
- **Imagery**: the collection, DYO, certificate and gemologist plates come
  from `apps/web/public/media/stock/` (Wikimedia Commons, licences and per-use
  captions recorded in `docs/IMAGE_CREDITS.md`); each is captioned
  "Illustrative" on the plate and the global demo badge explains that fixture
  pieces stand in for the catalogue. The atelier plate is the fixture record's
  own committed image, captioned with that record's name, weight, form and
  price. The try-on plate is a catalogue photograph, captioned as one.
- **Certificate fields** are read from the record (laboratory, report number,
  specimen, treatment, origin); a field the record does not carry prints "Not
  recorded" (INV-07). The section renders nothing if the record has no report
  number.
- **No fabricated products, prices, testimonials, client counts, or shipping
  promises.**

## 5. Removed because it did not meet the bar

| Removed | Why |
|---|---|
| The vendor programme section | Not in the brief's section order; at this bar it repeated the portal-door composition of the capture era. Its link lives in the footer. |
| The collection's 8-row index ledger | A row grid competing with the statement; the range proof moved into the typographic marquee, the catalogue proof into `/gemstones`. |
| The atelier's ready-made + mountings ledgers | Two priced lists and a second CTA competed with the one-statement rule; the register lives at `/jewellery`. |
| The DYO 3-step list (01/02/03) | Decorative sequence numbers; the studio itself demonstrates the sequence. |
| The gemologist "Reads / Refuses" fact table | Condensed into one honest line. |
| Gold eyebrows, gold actions, the gold search hairline | Gold exceeded its four uses; hierarchy now comes from size and space (DESIGN_DIRECTION §8.4). |

## 6. Measured gates

Build basis: `tsc -b && next build --webpack`, `DATABASE_URL` empty; production
server on 3109 with an unreachable database (`postgres://127.0.0.1:1/maihan_offline`)
so the fixture ledger is the labelled basis.

| Gate | Result |
|---|---|
| `pnpm typecheck` (tsc -b) | **0 errors**, exit 0 |
| `next build --webpack`, `DATABASE_URL` empty | **exit 0** |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed |
| `node scripts/check-slop.mjs` | **clean** |
| axe at 1440 / 1024 / 768 / 390 (home) | **4 / 4 captures, 0 violation nodes, 0 rule types** |
| Horizontal overflow | **0 px** at all four widths |
| Contrast probe (20 text runs) | **20 / 20 pass**; lowest pass 6.50:1 (paper meta), marquee 12.27:1, statements 17.4–17.9:1 |
| Internal links | **27 of 27 resolve** (`node scripts/link-check.mjs`: 0 failing) |
| Home initial JS | **173.3 KB gzip** (v9: 181.8 KB → **−8.5 KB**; gate was +5 KB) |
| Bundle budget (category / product) | Pre-existing overruns (196.1 / 201.3 vs 170 / 190) **unchanged** — they are page-level, pre-date this pass, and the home pass adds no JS |

### 6.1 Notes

- The category/product budget FAIL is the pre-existing absolute overrun the
  v9 README recorded; this pass adds 0.0 KB of JS and does not touch it.
- The 9 sub-24 px targets at 1440 are pre-existing global chrome (navbar
  toggles, phone link, hidden skip link) — the navbar is out of scope by brief.
- During measurement, a parallel working session rebuilt `.next` twice while
  the server was running, which briefly served an unstyled page and produced
  two failed audit rows; the final run above is the settled one. A type-narrowing
  error in `v9/StoneIndexSection.tsx` (from the same parallel work) blocked
  `tsc -b` and was fixed minimally with an equivalent `flatMap` narrowing.

## 7. Evidence layout

```
docs/design-shots/v11/
  README.md                   this file
  after/                      v11 home at 1440 / 1024 / 768 / 390 + audit.json
  sections/                   marquee, collection, atelier, dyo, certificate,
                              gemologist, tryon, close at 1440 + 390
  scroll/                     hero → marquee → collection sequence at 1440 + 390
```

## 8. Reproduce

```bash
# production build, no catalogue URL in the environment
DATABASE_URL= pnpm --filter @maihan/web build

# serve with an unreachable database so the fixture ledger is the labelled basis
SITE_URL=http://localhost:3109 PORT=3109 \
  DATABASE_URL=postgres://127.0.0.1:1/maihan_offline \
  pnpm --filter @maihan/web start

# full-page captures + axe + overflow + type scale
BASE_URL=http://localhost:3109 LABEL=after OUT_DIR=../../../docs/design-shots/v11 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home node scripts/craft-audit.mjs --only=home

# one plate per section
BASE_URL=http://localhost:3109 OUT_DIR=../../../docs/design-shots/v11/sections \
  WIDTH=1440 node scripts/section-shots.mjs

# hero → marquee → collection scroll sequence
BASE_URL=http://localhost:3109 OUT_DIR=../../../docs/design-shots/v11/scroll \
  WIDTH=1440 node scripts/scroll-sequence.mjs

# measured contrast over photography and solid surfaces
BASE_URL=http://localhost:3109 node scripts/contrast-probe.mjs

# every internal link on the rendered home page
BASE_URL=http://localhost:3109 node scripts/link-check.mjs
```

## 9. Deliberately not done

- **The navbar** — untouched (brief).
- **Every other page** — no route added or changed; only the home composition,
  the footer's presentation CSS and the hero's title/accent word changed.
- **The demo badge** — global chrome, still on the page, and it is the reason
  the illustrative stock plates are honest.
- **JS-driven scroll effects** — rejected; the brief's CSS-only scroll story
  needs no library and none was added.
