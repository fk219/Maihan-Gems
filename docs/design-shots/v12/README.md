# Homepage v12, second build: mobile-first

Status: measured on `main` plus this pass. **The navbar is untouched.** Only the
homepage composition, the shared footer's presentation, one shared-shell
overflow clip and the homepage stylesheet changed. No other route's composition
was edited, and no dependency was added.

This build answers the client's five criteria: it must look premium, the cards
must be compelling, mobile sections must not be tall and empty, the page must be
genuinely responsive at 390 and 320, and each capability must be marketed rather
than decorated around.

---

## 1. What changed in one screen

| Before | After |
|---|---|
| Desktop-first: 810/738/723/688/728/560 px bands, then stacked on a phone | 390 px first; every non-hero section is 411–588 px on a 390 phone |
| 9,604 px of mobile document | **4,530 px** (52.8 % shorter) |
| Cards were 1:1 stone crops with four lines of metadata | 4:5 photograph, one fact line, one action, nothing else |
| A typographic marquee and three category tiles | every variety as a photograph in a snap rail / continuous band |
| About was missing | one statement, one paragraph, one gold-lit plate, one action |
| No try-on marketing; DYO had no visible sequence | phone-frame try-on visual; three real DYO steps |
| Footer was 1,310 px on a phone | 590 px with four native disclosures |

Document height at 1440: **4,698 px** against 6,431 px before (−26.9 %).

---

## 2. The locked system as applied

| Token | Value |
|---|---|
| Radius | 0 on images, rules, tables; 4 on buttons, inputs, chips; 12 on cards and the search panel; 20 on the phone frame; circular only if needed (none) |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, plus the specified 20 px phone margin |
| Type | display 40 → 88; h1 32 → 64; h2 24 → 40; h3 20 → 24; body 16/26; meta 14/20; label 11/16 +0.18em. Weights 600 headings, 400 body, 500 labels. Tracking −0.02em display, −0.01em h1/h2, 0 body, +0.18em label. |
| Grid | 390: 4 columns, 16 gutter, 20 margin. 768: 8 / 24 / 32. 1024+: 12 / 24 / 48. Content max 1280, centred (at 1440 the max width wins, so the visible side margin is 80). |
| Breakpoints | 390 base; 768, 1024, 1440 min-width only |
| Colour | ink `#0B1117`, paper `#F6F3EC`, obsidian `#060D16`, gold `#C9A84C` (light only), gold-ink `#7C6323` (gold text on paper) |
| Motion | 150 / 300 / 520 ms, one curve `cubic-bezier(.16,1,.3,1)`; reduced motion removes every transition, entrance and loop |

Rendered type at 390 is exactly 40, 32, 24, 20, 16, 14, 11 px; at 1024/1440 it
is 88, 64, 40, 24, 16, 14, 11 px. Only Cormorant Garamond and Jost render. The
only 12 px runs are the two screen-reader-only form labels.

---

## 3. Section table

Height is the rendered band at 390 × 844 and 1440 × 900. "70vh" on the phone is
590.8 px; every section except the hero is under it, and the footer is 590.

| # | Section | 390 | 1440 | Mobile behaviour | Gold accent |
|---|---|---|---|---|---|
| 1 | Hero | 844 | 760 | 100svh photo; h1 40 on one/two lines; the search is the last element, 23 px above the demo badge on a 320 × 568 screen. Lede appears only from 1024. | 32 × 1 px rule above the title |
| 2 | Varieties | 569 | 551 | Horizontal snap rail; cards 78vw capped at 304; the next card peeks 50 px at 390. Sixteen-pixel gutter. | 1 px gold band top |
| 3 | Jewellery | 588 | 683 | 2-up snap rail; cards 52vw capped at 203; the second card is clipped by the margin. | gold-ink rule above the heading |
| 4 | The house | 411 | 598 | Statement full width; 2-col plate + paragraph + action. | 1 px gold frame around the plate |
| 5 | Design your own | 537 | 372 | Three stacked rows, number and title on one line, body beneath; one action. | gold step numbers 01/02/03 |
| 6 | AI gemologist | 279 | 341 | Question at h1 scale, one real input + Ask, refusal note. | gold question mark |
| 7 | Try-on | 482 | 584 | Copy left, 167 px phone frame right; one line, one action. | gold phone outline |
| 8 | CTA | 231 | 241 | One line, full-width 48 px button in the thumb zone. | 1 px gold band top |
| 9 | Footer | 590 | 568 | Four native `<details>` disclosures, brand line, evidence note, base row. | none |

Cross-check at the other widths: 320 document 4,505, 430 4,526, 768 4,504,
1024 4,529, 1440 4,698. At 320 the tallest non-hero section is DYO at 583; at
430 it is jewellery at 588; at 768 try-on at 584. The 70vh rule holds at every
phone and tablet width tested.

---

## 4. The card, as built

```
4:5 photograph   radius 12  1 px hairline  no shadow  no lift
fact line        14/20, tabular numerals, one line, ellipsis if needed
action           14/20, underline draws over 150 ms; arrow travels 4 px over 300 ms
target           44 px minimum height
hover            image opacity 1 → 0.9 over 300 ms; no scale, no translate
```

- No badges, no wishlist, no compare, no second price line.
- Stone cards: one line, `Tanzanite · 6.5-7.0 Mohs` (the hardness is taxonomy
  data; the en dash in the source is normalised to a hyphen in visible text).
- Piece cards: record name at h3, then `2.15 ct · $12,800`, then `View the record`.
- Phone rail: 78vw, capped at 304 px so a wider phone cannot make the section
  exceed 70vh; 16 px gutter; `scroll-snap-type: x mandatory`; the next card's
  peek is the rail's affordance.
- Desktop band: 200 px cards in a continuous 70 s loop. The duplicate half has
  no links and `aria-hidden`; hover and keyboard focus pause it; reduced motion
  turns it back into a scrollable rail.
- Jewellery: 2-up at 52vw (capped 203) on a phone; an asymmetric pair from
  1024 (254 / 161 at 1024, 356 / 230 at 1440), the second piece set 64 px
  lower. At 768 the same pair scales down to 203 / 128.

---

## 5. Measured gates

Production build, `DATABASE_URL` unset; server on 3113 with an unreachable
database so the fixture ledger is the labelled basis.

| Gate | Result |
|---|---|
| `pnpm --filter @maihan/web typecheck` | **0 errors**, exit 0 |
| `pnpm --filter @maihan/web build`, `DATABASE_URL` unset | **exit 0** |
| Tests (`vitest run`) | **618 passed / 21 skipped**, 0 failed |
| `node scripts/check-slop.mjs` | **clean** |
| axe (WCAG 2.0/2.1/2.2 A+AA) | **0 violations / 0 rule types** at 320, 390, 430, 768, 1024, 1440 |
| Horizontal overflow | **0 px** at 320, 390 and 430 (and at 768, 1024, 1440) |
| Home initial JS | **181.3 KB gzip** against **181.8 KB** on the base commit: **−0.5 KB** |
| Internal links | **35 of 35 resolve** (`scripts/link-check.mjs`) |
| Reduced motion | marquee animation `none`, hero animation `none`, every section visible, overflow 0 |
| Desktop marquee hover | `animation-play-state: paused`; card image `0.9`; underline `scaleX(1)` |
| Keyboard | skip link is the first stop; the hero search's focus ring is a visible 2 px paper outline |
| Screenshots | `home-{320,390,768,1024,1440}.png`, `home-320x568.png`, `sections-mobile-first/{section}-{390,1440}.png` |

### 5.1 Contrast by construction

Axe cannot compute a background over the gallery's painted wrapper, so it
returns colour-contrast nodes as *incomplete* (38 at 390, 35 at 1440), never as
violations. The palette was checked directly:

| Pair | Ratio |
|---|---|
| ink / paper | 17.12 : 1 |
| muted / paper | 6.23 : 1 |
| paper / obsidian | 17.60 : 1 |
| muted-dark / obsidian (0.74 cream) | 9.72 : 1 |
| gold / obsidian | 8.53 : 1 |
| gold-ink / paper | 5.17 : 1 |

Hero title over a hypothetical pure-white image pixel at the 58 % scrim stop:
4.31 : 1, above the 3 : 1 large-text threshold; the title sits lower, where the
scrim is 0.70 → 6.68 : 1, and the hero's desktop column is 0.94 → 15.49 : 1.

### 5.2 Notes

- The **62 px overflow at 320** came from the locked navbar's icon rail, not the
  page. One `overflow-x-clip` on the shared storefront wrapper stops it creating
  horizontal scroll; the navbar markup and styles are untouched.
- The **footer is shared** by every storefront route, so its presentation changed
  everywhere. No other route's composition changed. The newsletter client form
  was removed from it; this is where the −0.5 KB comes from.
- `axe` reports one sub-24 px target at 1024/1440: the telephone link in the
  footer's address, which is a text link in a disclosure-free desktop block.
  Everything on the phone is ≥ 24 px.

---

## 6. What was removed

| Removed | Why |
|---|---|
| The four-card priced grid and its `ProductCard`/`FeaturedPieces` | The brief's order has no card grid; the variety band and the two record cards carry the imagery and commerce without a spec table |
| The three-tile category rail and the 21:9 stone band | Two competing catalogue entrances before any product; the variety band now does that job once |
| The certificate split and the four-item service strip | Not in the mandated order; the record is reachable from the two piece cards and `/products/...` |
| The old AI strip | Replaced by the question-led section with a real form |
| The fixed 810/738/723/688/728/420/460/560 px section heights | They produced empty bands on a phone |
| The footer journal form | Compact footer; removes one client component |
| The gold gradient-text CTA | A paper button is the page's single filled control and clears contrast without a gradient |
| The 56/36/18 type ladder, 12 px +0.07em labels and 500-weight display | Replaced by the locked 40/32/24/20/16/14/11 ladder and 600 headings |
| `CategoryRail`, `StoneRecordSection`, `FeaturedPieces`, `ProductCard`, `RecordSection`, `AiStrip`, `ServiceStrip` | Superseded; deleted from the tree (git history keeps them) |

No dependency, no motion library, no client component was added.

---

## 7. Honesty

- The hero, the eight variety photographs and the About plate are illustrative
  and say so: the hero's own label, the band's "Illustrative images", the
  plate's "Before the bench. Illustrative photograph.", and the try-on's
  "Illustrative photograph". The demo badge is unchanged.
- The two jewellery cards use the records' own committed photographs, names,
  carat and price. Nothing is computed from weight, and no product, certificate,
  testimonial or shipping promise is invented.
- The AI section is a real `GET /concierge` form and states the refusal rule.
- The try-on line promises only what the product does: a calibrated stone and a
  camera feed that stays on the device. The studio route itself states when no
  calibrated asset is recorded.
- Every link resolves; there are no `#` targets.

---

## 8. Evidence layout

```
docs/design-shots/v12/
  README.md                     this report
  mobile-audit.json             heights, axe, overflow, type, card geometry
  home-320.png                  full page
  home-320x568.png              320 sanity viewport
  home-390.png                  full page
  home-768.png                  full page
  home-1024.png                 full page
  home-1440.png                 full page
  sections-mobile-first/         one plate per section at 390 and 1440
  interactions/
    interactions.json            typeahead, disclosure, reduced motion, keyboard, hover
    search-panel-390.png
    footer-disclosure-open-390.png
    reduced-motion-390.png
    keyboard-focus-390.png
    marquee-hover-1440.png
  REPORT.md, audit.json, sections/   the superseded first v12 spec pass
```

---

## 9. Reproduce

```bash
# production build, no catalogue URL in the environment
$env:DATABASE_URL=""
pnpm --filter @maihan/web run build

# serve against an unreachable database so the fixture ledger is the labelled basis
$env:SITE_URL="http://localhost:3113"
$env:DATABASE_URL="postgres://127.0.0.1:1/maihan_offline"
pnpm --filter @maihan/web exec next start -p 3113

# measurements + full-page and section screenshots
$env:BASE_URL="http://localhost:3113"
node scripts/v12-mobile-audit.mjs

# search, disclosure, reduced motion, keyboard and hover states
node scripts/v12-interactions.mjs

# every internal link
node scripts/link-check.mjs
```

The initial-JS number is the build manifest's `rootMainFiles` plus the home
route's client chunks, gzip of the exact bytes, measured with
`scripts/check-bundle-budgets.mjs` and a one-route budget file.
