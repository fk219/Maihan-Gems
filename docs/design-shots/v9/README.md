# Design pass v9 — editorial luxury, proof per section

Status: measured on `main` at `036ecbb` plus this pass. The navbar, the footer's
structure, the admin and vendor consoles, `packages/`, `api/` and every other
route are untouched. The homepage is the only page whose composition changed.

This pass answers the client verdict on v8: **"still childish."** The response is
not another polish pass. It changes the art direction from gradient plates to
editorial luxury, and it makes every section sell one specific capability with
proof.

---

## 1. The art direction

| Element | Decision |
|---|---|
| Reference bar | Bulgari and Cartier product storytelling, Rolex material confidence, Apple restraint. Luxury is photography, space and precision, not ornamental gradients. |
| Palette | Warm paper `#f3eee4`, paper-2 `#ebe3d3`, ink `#13110d`, soft ink `#4f4a41`, obsidian `#0b0a08`, and one gold `#7a5c26` on paper / `#d9bb7c` on dark. Gold is a hairline, a light, an eyebrow, a price, or the closing plaque. It is never a section background. |
| Type | Cormorant Garamond for display, Jost for text, JetBrains Mono for references. Display is 76 px at 1440, 55.3 px at 1024, 42.4 px at 768, 39 px at 390. The hero remains the largest line at 88 px. Hierarchy is size, space and weight, not colour. |
| Rhythm | Full-bleed photograph → quiet paper → full-bleed capture → quiet paper → dark certificate → two-plate atelier → quiet portal → one closing line. No two sections share a skeleton. |
| Space | Section padding is `clamp(5.5rem, 10vw, 9.5rem)`. The gallery is a 100 svh paper-and-photograph spread. The atelier is a two-plate portrait spread. The closing section is deliberately two elements. |
| Gold | The only filled gold control on the page is the closing appointment action. Every other action is a rule and a verb. |
| Motion | The existing `data-reveal` entrance only. No new motion library, no new client component, no animation added to the section proof plates. |

The old v8 gold field is gone. The dark sections are warm black; the paper
sections are warm paper; the photography carries the colour.

---

## 2. Section table

One eyebrow names the capability, one line states the benefit, one proof asset
carries the claim, and exactly one action matches the promise.

| # | Section | Capability (eyebrow) | Promise line | Proof asset | Action |
|---|---|---|---|---|---|
| 1 | Hero | none, approved minimal | "Maihan Gems is a gemstone house: loose stones, matched pairs and atelier mountings, each published with the record behind it." | The approved hero still, `/mgh/images/gems/sapphire-gem.jpg` (1200 × 1800). | Search + the existing quiet concierge link (hero composition unchanged). |
| 2 | The collection | The collection | "See the stone, the carat it weighs, the origin it carries and the certificate it references, before you ask a question." | `/media/stone-tanzanite.jpg` (1152 × 864), plus eight real catalogue rows with carat, origin and certificate reference. | **See every gemstone** → `/gemstones` |
| 3 | Design your own | Design your own | "Choose the stone first. The studio fits the mounting to its shape and carat, then prices the whole commission before the bench begins." | `/proof/configurator.jpg` (1280 × 942), captured from `/design-your-own`. | **Open the configurator** → `/design-your-own` |
| 4 | AI gemologist | AI gemologist | "Ask about variety, origin, treatment, shape or budget. The concierge reads the catalogue and returns only what the records carry." | `/proof/gemologist.jpg` (1152 × 451), captured from `/concierge`. | **Ask the gemologist** → `/concierge` |
| 5 | Certificate intelligence | Certificate intelligence | "Open a certificate and see the laboratory, the report number, the specimen and the treatment the record discloses. Nothing is inferred from a neighbouring stone." | `/proof/certificate.jpg` (576 × 425), captured from the Elysian Ring certificate dossier at `/products/elysian-ring`; the record fields are printed beside it. | **Open the Elysian Ring record** → `/products/elysian-ring` |
| 6 | Atelier | Jewellery & mountings | "Buy a finished jewel, or choose a mounting made for the stone you have already selected. Metal, weight and price are read from the record." | The Elysian Ring and Verdant Drop records' own images, `/mgh/images/elysian-ring.jpg` and `/mgh/images/verdant-drop.jpg` (900 × 1200), plus the ready-made and mounting ledgers. | **Enter the jewellery rooms** → `/jewellery` |
| 7 | Vendor programme | Vendor programme | "Consign stock, follow orders and read statements in one portal, opened only to approved suppliers of the atelier." | `/proof/vendor.jpg` (720 × 1000), captured from the vendor portal door at `/vendor/login`. | **Open the vendor portal** → `/vendor/login` |
| 8 | Closing | none, one line | "See the stone before you decide." | No separate proof; the section is the decision, not a feature claim. | **Request an appointment** → `/contact` |
| 9 | Footer | none | The existing couture footer, unchanged. | The existing footer. | The existing footer links. |

The CTA is the one exception to the eyebrow rule, by instruction: one line, one
action, nothing else.

---

## 3. What each proof capture actually shows

The captures are genuine screenshots of this app, produced by
`apps/web/scripts/capture-proofs.mjs` against the production server. They are not
mockups, and no image was generated, downloaded or hotlinked.

| Asset | Source route | What it shows | What it does not claim |
|---|---|---|---|
| `configurator.jpg` | `/design-your-own` | The shipped five-step bar (Stone → Setting → Metal → Size → Review), the stone panel, and the commission ledger. | The vault had no evidenced stone in the capture environment, so the studio's own empty state is visible. The caption says so. No stand-in specimen is shown. |
| `gemologist.jpg` | `/concierge` | The shipped ask surface: one plain-language query field, four example questions, and the catalogue reading. | It is not a staged transcript. No answer is pasted into the picture. The section states the refusal rule in words because the surface itself is the proof. |
| `certificate.jpg` | `/products/elysian-ring` | The shipped certificate dossier modal: "Verified Laboratory Report", the GIA / Maihan report number, the specimen, carat, shape, origin, treatment, refractive index and dimensions. | It is a capture of the application's demo record, not a claim that this certificate is live inventory. The site-wide demo badge still marks the ledger. |
| `vendor.jpg` | `/vendor/login` | The vendor portal door: the partner sign-in card with empty fields and the approval note. | No credentials, no session, no vendor statement or order data is captured. The dashboard was deliberately not entered. |

The global fixed chrome (demo badge, concierge trigger, scroll-to-top, dev
overlay) is hidden for the frame so the surface is legible. It remains in the
live page.

---

## 4. Photography provenance

No image was created, downloaded or hotlinked in this pass. Every photograph
already existed in `apps/web/public/`.

| Section | File | Provenance | Use |
|---|---|---|---|
| Hero | `mgh/images/gems/sapphire-gem.jpg` | The existing hero still (applet asset set) | Full-bleed hero, unchanged |
| Collection | `media/stone-tanzanite.jpg` | The catalogue's representative tanzanite photograph | Captioned "Tanzanite. Catalogue photograph." It does not wear a product name. |
| Atelier | `mgh/images/elysian-ring.jpg` | The Elysian Ring record's own `images[0]` | Captioned with that record's name, weight, form and price |
| Atelier | `mgh/images/verdant-drop.jpg` | The Verdant Drop record's own `images[0]` | Captioned with that record's name, weight, form and price |

The two atelier plates are different records, and each is captioned with the
record it belongs to. The gallery plate is a representative catalogue
photograph, so it is captioned as one. No photograph appears under another
record's name.

---

## 5. Removed because it had no proof: AR Virtual Try-On

The AR Virtual Try-On section was removed. This is the honest outcome of the
proof rule, not an omission.

| Evidence | Finding |
|---|---|
| `webar_assets` in the reachable dev database | 0 rows |
| `apps/web/src/lib/webar-server.ts` | `loadWebArAssetView` returns `null`; `listReadyWebArAssets` returns `[]` |
| `/ar/webar-tz-0131` | Renders "No 3D asset is recorded" and "Calibrated WebAR assets currently registered: 0" |
| The try-on modal | `WebArModal` exists but is not mounted by any route on `main` |

There is no live try-on surface to capture. A dark frame with a stock hand, a
drawn phone, or a repurposed 3D render would be a mockup, and the brief forbids
that. The section is therefore removed rather than decorated. If a calibrated
`webar_assets` row is recorded and the viewer is mounted, the section can return
with a real capture of that surface. The privacy promise is already implemented
in `WebArModal` (permission on explicit action, frames stay in local memory, no
upload, tracks stopped on close), but implemented code that is not reachable is
not a capture.

No other requested section was removed. The old v8 "record" section was not
dropped; it became Certificate Intelligence, which now carries a real
certificate capture instead of a loupe photograph and a prose rule.

---

## 6. Measured gates

Build basis: `next build --webpack`, `DATABASE_URL` set to an empty string in the
process environment, `SITE_URL=http://localhost:3108`. The production server
used for screenshots ran on port 3109 with an unreachable database so every
catalogue row is the labelled fixture ledger, matching the v8 measurement basis.

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` | **0 errors**, exit 0 |
| `next build --webpack`, `DATABASE_URL` empty | **exit 0** |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed (unchanged) |
| `node scripts/check-slop.mjs` | **clean** |
| axe at 1440 / 1024 / 768 / 390 (home) | **4 / 4 captures, 0 violation nodes, 0 rule types** |
| Horizontal overflow | **0 px** at all four widths |
| Contrast probe (15 text runs) | **15 / 15 pass**, 0 fail; lowest 5.36 (atelier meta), gallery caption 16.98, closing action 10.10 |
| Initial JS, home | **181.8 KB gzip** (v8: 181.8 KB, **+0.0**) |
| CSS, `home-v9.css` | 20,622 bytes raw · 4,234 bytes gzip |
| Internal links | **39 of 39 resolve** (`node scripts/link-check.mjs`: 0 failing) |
| Section screenshots | 7 sections × 4 widths = **28 plates** |
| Home screenshots | 4 widths + `audit.json` |

### 6.1 Type scale

| Width | Hero | Section display | Eyebrow | Body |
|---|---|---|---|---|
| 1440 | 88 px | 76 px | 11 px | 16 px |
| 1024 | 72 px | 55.3 px | 11 px | 16 px |
| 768 | 72 px | 42.4 px | 11 px | 16 px |
| 390 | 55.8 px | 39 px | 11 px | 16 px |

The section display is intentionally larger than v8's 48 px section title. The
hero remains the largest line. The scale is one display step, one text step and
one mono reference step; the extra rendered buckets in the audit are the
pre-existing header/footer and the legal micro-links.

### 6.2 Contrast note

axe reports 84 `color-contrast` *incomplete* nodes at 1440 because some text
sits over photography and because the fixed header's backdrop is translucent. It
does not report a violation. The measured probe settles the text axe cannot:
the gallery caption over the scrim is **16.98:1**, the certificate note on warm
black is **7.43:1**, the atelier gold meta on paper is **5.36:1**, and the
closing label on the gold plaque is **10.10:1**.

### 6.3 Budget note

Home initial JS is unchanged at 181.8 KB gzip; this pass adds no client
component and no dependency. The pre-existing absolute overrun on the category
(196.1 vs 170) and product (201.3 vs 190) pages is unchanged and is not
increased by this pass. The budget gate that matters for this change is the
delta: **+0.0 KB JS**.

---

## 7. Evidence layout

```
docs/design-shots/v9/
  README.md                  this file
  before/                    v8 after screenshots at 1440 / 1024 / 768 / 390
                             + the v8 audit, used as the comparison baseline
                             (the v8 audit is kept verbatim; its screenshot
                             paths still name the v8 directory)
  after/                     v9 home at 1440 / 1024 / 768 / 390 + audit.json
  sections/                  gallery, dyo, ai, certificate, atelier, vendor, close
                             at 1440 / 1024 / 768 / 390
  proofs/                    archival copies of the four shipped proof captures
```

Shipped proof assets live at `apps/web/public/proof/` and are referenced by the
homepage sections:

```
apps/web/public/proof/configurator.jpg   1280 × 942
apps/web/public/proof/gemologist.jpg     1152 × 451
apps/web/public/proof/certificate.jpg     576 × 425
apps/web/public/proof/vendor.jpg          720 × 1000
apps/web/public/proof/manifest.json       source-route manifest
```

---

## 8. Reproduce

```bash
# production build, no catalogue URL in the process environment
DATABASE_URL= pnpm --filter @maihan/web build

# serve with an unreachable database so the fixture ledger is the labelled basis
SITE_URL=http://localhost:3109 PORT=3109 \
  DATABASE_URL=postgres://127.0.0.1:1/maihan_offline \
  pnpm --filter @maihan/web start

# full-page captures + axe + overflow + type scale
BASE_URL=http://localhost:3109 LABEL=after OUT_DIR=../../../docs/design-shots/v9 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home node scripts/craft-audit.mjs --only=home

# one plate per section, four widths
BASE_URL=http://localhost:3109 OUT_DIR=../../../docs/design-shots/v9/sections \
  WIDTH=1440 node scripts/section-shots.mjs

# the four shipped proof captures
BASE_URL=http://localhost:3109 node scripts/capture-proofs.mjs

# measured contrast over photography and solid surfaces
BASE_URL=http://localhost:3109 node scripts/contrast-probe.mjs

# every internal link on the rendered home page
BASE_URL=http://localhost:3109 node scripts/link-check.mjs
```

`section-shots.mjs` hides the fixed global chrome for the plate. The live page
keeps it. The proof capture script also hides the demo badge, the concierge
trigger and the scroll-to-top button so the captured surface is legible.

---

## 9. Deliberately not done

- **The navbar.** Untouched, including its mega menu, currency and language
  controls, search trigger and sample review links.
- **The footer.** Structure, links, address, journal form and demo gate
  unchanged. Only the page above it changed.
- **Every other page.** Catalogue, PDPs, cart, checkout, account, the admin and
  vendor consoles, the login frames and the AR route are unchanged. No route was
  added.
- **No new dependency, font, icon set or motion library.** The section proof
  images are plain `<img>` elements with explicit dimensions.
- **No generated, stock or hotlinked imagery.** No AI image, no download, no
  hotlink.
- **No fabricated product, price, certificate, testimonial, client count,
  founding year or shipping promise.** The gallery index omits a variety with no
  record. The atelier names only the records whose own images it shows. The
  vendor section states that approval is required and captures the empty door.
- **No AR section.** See section 5.
- **No claim that the configurator had stock in the capture.** The caption names
  the empty state; the studio's own copy is visible in the capture.
- **The demo badge.** It is global chrome and still overlays the lower-left of
  the viewport. It is pre-existing and out of scope; the proof captures hide it
  for legibility, but the live page still carries it.
- **The absolute JS ceiling overrun.** Pre-existing on category and product;
  this pass adds 0.0 KB and does not close a gap that belongs to a separate
  budget decision.
