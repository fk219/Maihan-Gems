# 35 ACCESSIBILITY AND INTERNATIONALISATION ARCHITECTURE

**Package:** `technical_design/` doc 35 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 12, 6 (NFR-02), and the observed evidence constraints.
**Evidence status:** `[OBSERVED]` for structural implications; `[INFERRED]` for the accessibility targets.

---

## Purpose

Define accessibility requirements, the accessibility-specific behaviour of gemological data presentation, and the localisation strategy including right-to-left readiness.

## 1. Why accessibility is load-bearing here, not merely a compliance item

A jewellery storefront is used by people making expensive, irreversible decisions under time pressure. The audience skews toward older buyers, and the domain is visually complex: 145 varieties distinguished by subtle colour and cut differences.

Two practical consequences:

1. **Colour is a primary navigation axis.** `[OBSERVED]` ~60+ colour tokens appear in stone slugs and `color_help` values. Colour cannot be the sole carrier of meaning anywhere, or a colour-blind customer cannot filter at all.
2. **A customer who cannot see the stone must still be able to buy it.** Every visual attribute needs a text equivalent, or the site excludes buyers who use a screen reader.

## 2. Targets

| Guideline | Level | Notes |
|---|---|---|
| WCAG | 2.2 AA | The baseline for all public surfaces |
| Keyboard | Full operation | No mouse required for any purchase path |
| Contrast | 4.5:1 text, 3:1 large text and UI components | Measured, not estimated |
| Focus visible | Always | Never removed without a stronger replacement |
| Motion | `prefers-reduced-motion` respected | Required for AR and page transitions |
| Zoom | Usable to 200% | No horizontal scrolling at 200% |
| Target size | 24×24 CSS px minimum | Filters, swatches, close buttons |

## 3. Gemological data presentation

| Data | Visual form | Accessible equivalent |
|---|---|---|
| Colour | colour swatch | colour name as text, always |
| Shape | shape thumbnail | shape name as text |
| Cut | image | cut name plus facet count where recorded |
| Clarity | grade badge | grade as text: eye-clean, included |
| Weight | - | carats as text, always |
| Treatment | colour chip | treatment name as text; disclosure must never be colour-only |
| Certificate status | badge | status as text: verified, on file unverified |
| Availability | badge | status as text: in stock, sold out, check availability |
| Setting style | image | style name as text |

| Rule | Detail |
|---|---|
| No colour-only signals | Every swatch has a text label |
| Treatment is never subtle | A treated stone must be as visible as its colour; this is a disclosure obligation, not a UI preference |
| Certificate status is textual | The `UNVERIFIED` state (doc 17) must be readable, not colour-coded |
| Gemological vocabulary is spelled out | "Tsavorite", not a colour name alone |
| Images need real alt text | Alt text uses the recorded gemological attributes, not "gemstone image" |

Alt text is a trust surface, not an accessibility afterthought. `[OBSERVED]` descriptions are LLM-generated prose, so alt text must be derived from structured attributes, never from that prose.

## 4. Keyboard and focus

| Concern | Requirement |
|---|---|
| DYO configurator | Fully operable by keyboard, including stone selection, metal choice and add to cart |
| Facet filters | Native inputs, reachable by tab, operable by keyboard alone |
| Modals and drawers | Focus trapped while open, focus restored on close |
| Skip link | First focusable element on every page |
| Focus order | Matches visual order; no positive `tabindex` |
| Custom controls | `role`, state and keyboard behaviour correct, or use a native element |

The DYO configurator is the highest-risk surface: it is the most interactive component in the system, it is inherently visual, and it is where a customer spends the most time. Keyboard operability there is not a nice-to-have.

## 5. AR accessibility

| Rule | Detail |
|---|---|
| AR is optional | Every AR affordance has a non-AR equivalent; AR is never the only way to view a product |
| Camera is opt-in | Permission requested on an explicit action, never on load (doc 21 section 8) |
| AR launcher | A labelled button with a text alternative describing what it does |
| Reduced motion | Hand-tracking animation respects `prefers-reduced-motion`; a static 3D view is offered |
| Status announcements | Tracking state changes announced politely, not on every frame |

## 6. Images and media

| Rule | Detail |
|---|---|
| Dimensions | `width`/`height` on every image to prevent CLS |
| Lazy loading | Below-fold only; never on the LCP image |
| Format | AVIF with WebP fallback, plus a format the browser actually receives |
| Video | Captions and a transcript for the 360 and white-glove video (doc 24) |
| Decorative | `alt=""` and `aria-hidden`, so screen readers skip decoration |

Captions on product video are worth the effort: they are also the transcript that search and the AI can use, and they make the video content auditable.

## 7. Performance as accessibility

| Requirement | Target | Basis |
|---|---|---|
| LCP p75 | < 2.5s | NFR-02 |
| INP p75 | < 200ms | interaction responsiveness |
| CLS p75 | < 0.1 | visual stability |

These are accessibility requirements before they are performance targets. A page that shifts while a customer is trying to read a certificate field, or that ignores their first tap for two seconds, excludes people.

## 8. Internationalisation

`[OBSERVED]` The source content is English, with US currency (`[VERIFIED]` USD 1,024 of 1,024) and a US address in the `LocalBusiness` JSON-LD.

### Locale readiness

| Layer | Approach |
|---|---|
| URLs | Optional locale prefix, `/[locale]/...`, default `en` unprefixed to preserve the 44,218 observed URLs |
| Content | `pages` keyed by locale; fall back to the default locale |
| Taxonomy | Localised display names, canonical keys unchanged |
| Formatting | `Intl` for numbers, dates, currency and relative time; never hand-formatted strings |
| Currency | Display-only conversion; prices are stored in one currency and never converted in the database |
| URLs in slugs | Never localised. A slug is a stable identifier; translating it would break every redirect in doc 34 |
| RTL | CSS logical properties throughout (`margin-inline-start`, not `margin-left`) |
| Search | Per-locale `tsvector` configuration and stemming |
| AI | Answers in the user's locale; **citations and refusal thresholds are identical** |

| Rule | Detail |
|---|---|
| Slugs stay untranslated | Localised slugs would invalidate all 44,218 redirects |
| Currency display only | No conversion in storage; a converted price is a different product |
| Taxonomy keys stable | Localisation changes display names only |
| AI refuses identically in every locale | A refusal rule that applies in English must apply in every language |

The last rule is the one most easily broken by localisation work. Grounding thresholds and refusal behaviour are locale-independent by construction, never by translation.

## 9. Validation rules

1. No meaning is conveyed by colour alone, anywhere.
2. Every image has an alt attribute: descriptive text or `alt=""` with `aria-hidden`.
3. All interactive elements are keyboard operable with a visible focus indicator.
4. The DYO flow completes without a pointer.
5. Contrast meets 4.5:1 for text, 3:1 for UI components.
6. `prefers-reduced-motion` is respected.
7. All strings come from a message catalogue; no hard-coded user-facing text.
8. Dates, numbers and currency use `Intl`.
9. Slugs are never localised.
10. AI grounding and refusal rules are identical across locales.

## 10. Error handling

| Condition | Behaviour |
|---|---|
| Missing alt text | A CI check fails on any image without an alt attribute |
| Missing translation key | Falls back to the default locale and reports the gap; never renders a raw key |
| Missing message | Reports the missing key rather than rendering an empty string |
| RTL not covered | Logical properties make it render correctly; a test verifies no directional hard-coding |
| Contrast regression | Automated check in CI |

## 11. Security boundaries

- Locale is validated against an allow-list; it never reaches a query unsanitised.
- Localised content is escaped identically to default content; a translation cannot introduce an injection.
- Locale never alters authorization or pricing behaviour.

## 12. Observability

Metrics: alt-text coverage, keyboard-trap incidents, contrast check pass rate, translation key coverage, fallback usage by locale, LCP/INP/CLS by locale and device class, AR launcher usage with reduced motion. Alerts on alt-text coverage dropping below 100% and on any keyboard-trap report.

## 13. Testing requirements

| Test | Proves |
|---|---|
| Automated audit | axe-core reports zero critical issues on every public route |
| Keyboard walkthrough | Product browse, search, DYO and checkout complete without a pointer |
| Colour-only signals | No filter, badge or chip conveys meaning without text |
| Contrast | 4.5:1 text, 3:1 components, measured not estimated |
| Reduced motion | Page and AR respect `prefers-reduced-motion` |
| Zoom | 200% zoom produces no horizontal scroll |
| Alt text coverage | Every image has an alt attribute, derived from structured attributes |
| Locale fallback | A missing translation falls back cleanly and reports the gap |
| Slug stability | Localisation does not alter any slug |
| AI locale parity | Refusal thresholds and grounded-ratio behaviour are identical in every locale |
| Redirect integrity | Locale prefixes do not affect the 44,218 redirect set |

## 14. Failure modes

| Failure | Behaviour |
|---|---|
| Colour-only filter | Test failure; the filter gains a text label |
| AR blocks the only view path | Fallback matrix (doc 21 section 6); AR is never required |
| Missing translation | Default-locale fallback plus a gap report |
| Contrast regression | CI failure |
| Localised slug introduced | Review rejection; it would break redirects |
| Alt text sourced from generated prose | Rejected; alt text derives from structured attributes |

## 15. Implementation constraints

1. WCAG 2.2 AA for all public surfaces; no colour-only meaning anywhere.
2. The full purchase path, including DYO, is keyboard operable.
3. Treatment and certificate status are textual, never colour-coded.
4. Alt text derives from structured attributes, never from LLM-generated prose.
5. Slugs are never localised.
6. Currency is display-only; prices are never converted in storage.
7. AI grounding and refusal rules are locale-independent.
8. Core Web Vitals are accessibility requirements.

## Evidence status

`[OBSERVED]`: the colour-token taxonomy (~60+ colours), English source content, USD for all 1,024 prices, the US address in `LocalBusiness` JSON-LD, LLM-generated descriptions, the 360 and white-glove video, and the DYO route being the most interactive surface. `[INFERRED]`: the WCAG targets, the text-equivalent table, the localisation strategy and the locale-prefix decision, which is derived from the requirement that the 44,218 observed URLs keep resolving unprefixed. No accessibility audit of the source exists, so no accessibility claim about the original site is made.