# Homepage v12 — spec compliance report

**Spec:** `docs/BRAND_ANALYSIS.md` §8 (the client-approved brand analysis).
**Viewport for every acceptance number:** 1440 × 900, production build,
`DATABASE_URL` unset (the fixture-backed demo state, so the page renders the
illustrative records the screenshots show).
**Measured by:** `apps/web/scripts/v12-spec-audit.mjs` → `docs/design-shots/v12/audit.json`.
**Screenshots:** `docs/design-shots/v12/home-{1440,1024,768,390}.png` and one
crop per band in `docs/design-shots/v12/sections/`.

---

## 1. What was rebuilt

| File | Change |
|---|---|
| `apps/web/src/app/(storefront)/page.tsx` | Rewritten: nine-section order, card data built from the catalogue, two data reads. |
| `apps/web/src/components/mgh/home/v12/*` | New sections: `HeroSection`, `CategoryRail`, `StoneRecordSection`, `FeaturedPieces`, `ProductCard`, `DesignYourOwnSection`, `RecordSection`, `AiStrip`, `ServiceStrip`, `ClosingSection`, `ArrowLink`. |
| `apps/web/src/styles/home-v12.css` | New sheet: tokens, seven type steps, card, grid, three section heights, motion, footer. |
| `apps/web/src/components/mgh/shell/StorefrontFooter.tsx` | Rebuilt to the measured footer: paper, four-item service row, four link columns, evidence note, base row. |
| `apps/web/src/app/(storefront)/layout.tsx` | One added import (`home-v12.css`) so the shared footer is styled. No other layout change. |
| `apps/web/scripts/v12-spec-audit.mjs` | Measurement + axe + screenshots at four widths. |
| `apps/web/scripts/v12-section-shots.mjs` | One screenshot per band. |
| `apps/web/scripts/v12-interaction-check.mjs` | Hover/arrow/focus/reduced-motion probe. |
| `apps/web/scripts/v12-contrast-incomplete.mjs` | Lists the nodes axe cannot compute (photo/gradient backgrounds). |

The navbar, `api/`, `packages/`, `app/admin`, `app/vendor` and every other page
are untouched. The v11 home components are no longer imported by the homepage;
they remain in the tree (unused) rather than being deleted.

**Page order, exactly as specified:** hero → category rail → stone/record →
four priced cards → design your own → record/certificate → AI strip → service
strip → closing → footer.

---

## 2. Section table (measured at 1440)

| # | Section | Height (px) | Surface | Type | What it contains |
|---|---|---|---|---|---|
| 1 | Hero | **810** | obsidian | 810 hero | one stone full-bleed, one line 56/60, one sentence 18/28, one search |
| 2 | Category rail | **738** | paper | editorial | 3 tiles 437 × 546 (4:5), label under, illustrative note |
| 3 | Stone and record | **723** | paper | editorial | 21:9 full-bleed photograph, one line 36/44 at its foot, one action |
| 4 | Featured pieces | **631.5** | paper | editorial | 4 cards 322 wide, spec → name → price → evidence |
| 5 | Design your own | **688** | obsidian | editorial | split, one 3:4 photograph, one line, one action |
| 6 | Record / certificate | **728** | paper | editorial | split, real fields, evidence chip, the record's own photograph |
| 7 | AI gemologist | **420** | paper | service strip | one line, one honest form entry, one refusal note |
| 8 | Service strip | **460** | paper | service strip | four facts, four hairlines |
| 9 | Closing | **560** | obsidian | editorial | one line, one action, gold hairline |
| - | Footer | **672.39** | paper | footer | 4-item service row, 4 link columns, brand + evidence note, base row |

Document height 6,431 px. No section is outside {420–500, 560–760, 810}; the
footer is inside its own 520–680 target.

---

## 3. Spec compliance table

| Rule (BRAND_ANALYSIS §8) | Implemented | Measured |
|---|---|---|
| Paper `#F7F4EC` 62–68 % | band background, all paper sections | **68.00 %** (4,372.89 px of 6,431) |
| Obsidian `#08121E` 28–32 % | hero, DYO, closing | **32.00 %** (2,058 px) |
| Gold ≤ 3 uses | 2 uses: closing top hairline, closing gradient-text action | **2** elements with any gold paint in home + footer |
| Never gold text on paper | no gold glyph outside obsidian | 0 gold glyphs on paper (only a 1 px rule at the closing boundary) |
| 2 families | Cormorant Garamond + Jost, declared on the page | **2** rendered families: Jost (106 text nodes), Cormorant Garamond (15) |
| 7 steps, ≤ 7 sizes, max 56 px | 56/60, 36/44, 18/28, 16/26, 16/22, 12/18, 14/20 | **6 distinct sizes**: 56, 36, 18, 16, 14, 12 px (16 px carries two steps) |
| Mono deleted from the homepage | no `--font-mono` use in `home-v12.css`; marquee gone | 0 mono text nodes |
| 2 weights, headings only | 500 display/labels, 400 text | 400 and 500 only |
| Label 12/18, 500, +0.07em, caps | `.mh12-label` | 12 px / 18 px / 500 / **0.84 px** (0.07 em) / uppercase |
| Nothing below 12 px | smallest step is 12 | **12 px** minimum |
| Card: image → spec → name → price/on request → evidence | `ProductCard`, used 4× | image 322×322 (1:1), spec 12/18, name 16/22, price 14/20 tabular, chip 12/18 |
| Card radius 0, border 0, shadow none | borderless, no container | radius **0**, border **0**, shadow **none** |
| Card hover: underline 200 ms, image 300 ms, no lift | pseudo-element underline + opacity | underline scaleX 0→1 **200 ms**, opacity 1→0.96 **300 ms**; transform none |
| 4:5 variant for pieces | `ratio="4:5"` supported by the card | implemented; homepage grid uses 1:1 stones |
| 12-col grid, max 1360, gutter 24, margin 40 | `.mh12-wrap` + grids | margins **40 / 40**, gap **24 px**, cards **322 px**, categories **437.33 px** |
| Hero 810 ± 20, one headline, one action | 810 fixed, h1 only, search only | **810 px**, h1 56/60, one search |
| No price above y = 1800 | cards start at y = 2288 | first price top **y = 2,824** |
| Section heights from the three bands | min-block-size rhythm | 810, 738, 723, 631.5, 688, 728, 420, 460, 560 (footer 672.39) |
| No two adjacent sections share a recipe | 9 distinct compositions | confirmed band by band |
| Motion 150–300 ms hover, 240 ms arrow, one 600 ms hero entrance | CSS only | link 150 ms, card 200/300 ms, arrow 4 px / 240 ms, hero 600 ms |
| Remove scroll blur/28 px, marquee, ambient light | no `animation-timeline`, no marquee, no `mh6-hold` | 0 scroll-driven rules; hero img animation `mh12-hero-in`; reduced motion → `none` |
| Navbar untouched | not edited | 0 diff in `StorefrontHeader.tsx`; nav conflicts reported in §5 |
| Footer 520–680, 4 service items, 4 link columns, evidence note, no gold fills | rebuilt | **672.39 px**, 4 + 4, note kept, 0 gold |
| Service strip added, keepable claims | four factual items | delivery/returns say the terms publish when settled; certificate/viewing describe what the site does |
| Honesty: demo badge kept, illustrative images labelled | badge untouched; captions on every stock photograph | badge present; 5 captions + 1 section note |
| Every link resolves | internal links checked against the running build | **31 unique internal links, 0 failing** |

---

## 4. Gate numbers

| Gate | Result |
|---|---|
| Typecheck (`tsc -b`) | **0 errors** |
| Build with `DATABASE_URL` unset | **exit 0** |
| Tests | **618 passed / 21 skipped** (62 files passed, 2 skipped) — no regression |
| `node scripts/check-slop.mjs` | **clean** |
| axe (WCAG 2.0/2.1/2.2 A+AA) | **0 violations** at 1440, 1024, 768, 390 |
| Document overflow | **0 px** at all four widths |
| Page errors / non-200 | **0** at all four widths |
| ESLint on changed files | **0 problems** (repository-wide lint has 293 pre-existing errors in `packages/domain`, `packages/observability`, `scripts/check-slop.mjs`; none in this work) |

### axe detail

The run also counts nodes axe marks **incomplete** because it cannot compute a
background over photography. At 1440 there are 13 such nodes inside the page:

- 4 are the `→` glyphs, which are `aria-hidden` non-text characters;
- 1 is the empty search input (no value to test);
- 4 are text over the hero scrim (h1, lede, search submit);
- 2 are text over the stone photograph (title, action);
- 1 is the closing gradient-text action;
- 1 is the stone action.

Worst-case contrast for those was solved by construction: the hero scrim is
≥ 0.97 obsidian at the text column (cream-muted ≥ 5.3 : 1 even over a pure-white
image pixel), the stone scrim is 0.94 → 0.82 across the title box (cream ≥ 4.4 : 1
for the large title, 0.91 at the 12 px action → ≥ 5.4 : 1), and the closing
gradient runs `#CC9200` → `#E9CD6B`, i.e. **6.88 : 1** at its darkest stop on
`#08121E` (AA for 12 px) and 12.02 : 1 at its lightest. Palette pairs:
ink/paper 16.71 : 1, muted/paper 6.50 : 1, cream/obsidian 16.98 : 1,
cream-muted/obsidian 9.03 : 1, gold/obsidian 8.24 : 1, gold/paper 2.08 : 1
(never used as a glyph).

### Per-width measurements

| Width | Document | Paper | Obsidian | Media area | Footer | Axe | Overflow |
|---|---|---|---|---|---|---|---|
| 1440 | 6,431 | **68.00 %** | **32.00 %** | **40.06 %** | 672.39 | 0 | 0 |
| 1024 | 6,802 | 70.21 % | 29.79 % | 33.96 % | 698.39 | 0 | 0 |
| 768 | 6,894 | 69.00 % | 31.00 % | 39.11 % | 993.39 | 0 | 0 |
| 390 | 9,604 | 77.97 % | 22.03 % | 44.32 % | 1,310.39 | 0 | 0 |

Method: each `[data-section]` band is measured and assigned its declared
background surface; the document height is the denominator. Media area is the
sum of the image boxes' areas ÷ document area. Type sizes and families are
computed from every text-bearing element inside `.mh12-home` and
`.mh12-footer` at each width.

---

## 5. What could not be complied with, and why

1. **Gold use #1 — the 2 px active-nav underline — is not implemented.**
   The navbar is explicitly out of scope and approved. The homepage therefore
   spends gold **twice**, under the ceiling of three, rather than inventing a
   third use inside the page. The navbar itself uses gold about twenty times
   (`#D4AF37` / `#E6C97A` text, chevrons, dot, cart badge); that is approved
   chrome, not this page's budget.

2. **The navbar conflicts with the type spec and was left alone.**
   It is 13 px EB Garamond uppercase at +0.17 em, with a 48 px wordmark, an
   11 px gold sub-label and 9–10 px counters. The spec asks for 12 px Jost at
   +0.07 em and seven steps. Per the brief, it is untouched; the conflict is
   recorded here rather than fixed.

3. **The 55 % photography-area acceptance bullet (§10) is not met: 40.06 %.**
   The nine-section order in the same spec allocates ~1,500 px to text-only
   strips (AI 420 + service 460 + footer 672), a small type ladder and a 4-up
   grid of 322 px squares. Reaching 55 % needs roughly 1.4 M more media pixels,
   which only cinema-scale full-bleed bands (Cartier's four 810 px heroes)
   supply. That would contradict the section order the client approved, so the
   measured share is reported instead of faking it. (Media-led band *heights*
   total 3,455.8 px of 6,431 = 53.7 %, closer to the study's 60–70 % band-height
   reading but still short.)

4. **The surface ranges only intersect at 68 / 32.**
   Paper 62–68 % and obsidian 28–32 % sum to 100 only at 68 + 32. At 1440 the
   page lands exactly there. Below 1024 the layouts stack (cards, footer,
   record split), which adds paper height: 1024 is 70.21 / 29.79 (obsidian still
   in range), 768 is 69.00 / 31.00 (obsidian in range), 390 is 77.97 / 22.03.
   Holding the ratio at every width would require adding obsidian height to
   the three dark bands at each breakpoint, which the spec's own fixed section
   heights do not describe. The acceptance viewport (1440 × 900) complies.

5. **The footer is 672 px at 1440, 698 px at 1024, 993 px at 768 and 1,310 px
   at 390.** 520–680 is met at the acceptance viewport; below that the service
   row and link columns stack because a 4-column footer at 390 would be
   unreadable.

6. **The card's evidence chip says “Report · <number>” or “Evidence not
   recorded”, not the literal word “VERIFIED”.**
   The contract reserves `VERIFIED` for documents; catalogue rows carry
   `OBSERVED / EXTRACTED / PATTERN / INFERRED / UNKNOWN`, and INV-07 forbids
   presenting an unverified field as verified truth. The chip prints what the
   record actually carries, in ink. When the live catalogue exposes a report,
   the number is printed; when it does not, the card says so.

7. **Delivery and returns are not promised.** The policy pages are “being
   prepared for publication” and the SRS leaves shipping, returns and refund
   rules `UNKNOWN` (OTD-03). The service strip and the footer service row
   therefore say the terms publish when settled / no window is promised until
   one is decided. That is weaker than the reference brands' promises, but it
   is the only claim the business can keep today.

8. **Card images use the committed illustrative variety photographs, not the
   fixtures' own image fields.** The fixture image fields point at finished
   jewellery photographs; printing a necklace above “1.31 ct Tanzanite” would
   present illustrative stock as the object. Each lot is captioned
   “Photography is illustrative” and the page carries the demo badge.

9. **Fixed chrome can overlay content at the viewport corners.** The demo badge
   (bottom-left) and the AI concierge launcher (bottom-right) are fixed. They
   are retained because the badge is the honesty device and the launcher is a
   working feature. The footer reserves 96 px at its foot and the mobile hero
   120 px, so the badge never covers the base row or the hero search; at other
   scroll positions it can cover whatever sits at the bottom-left of the
   viewport, as a cookie bar would.

10. **The v11 components remain in the tree.** `HomeHero`, `StoneMarquee`,
    `CollectionSection`, `AtelierSection`, `DesignYourOwnSection`,
    `CertificateSection`, `GemologistSection`, `TryOnSection`, `ClosingSection`
    (all under `components/mgh/home/v11` and the root `home/`) and
    `styles/home-v11.css` are no longer imported by the homepage. Deleting
    committed work was left out of scope; they can be removed in a cleanup PR.

11. **The footer journal form keeps its field and endpoint but its explanatory
    copy is hidden** to fit 672 px. The label, input and confirmation remain.

---

## 6. Reproduce

```bash
# production build with no database
$env:DATABASE_URL=""
pnpm --filter @maihan/web run build
pnpm --filter @maihan/web exec next start -p 3113

# measurements + screenshots (from apps/web)
$env:BASE_URL="http://localhost:3113"
node scripts/v12-spec-audit.mjs
node scripts/v12-section-shots.mjs
node scripts/v12-interaction-check.mjs
node scripts/link-check.mjs
```

`audit.json` is the machine-readable record behind every number above.
