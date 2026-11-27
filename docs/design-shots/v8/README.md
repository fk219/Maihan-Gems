# Design pass v8 — gold as material, one purpose per section, seven plates

Status: measured on `main` at `5f33236` plus this pass. Supersedes the homepage
composition in `v7`; the navbar, the consoles, every other page and
`packages/` are untouched.

This pass answers four client notes, in order:

| Note | Response in this pass |
|---|---|
| "Why are you not using the golden gradient and only black" | One full gold-gradient field (the atelier), a gold wash on warm paper, gold light on warm black, gold type accents, and a gold plaque holding the closing action. The ground is no longer a single obsidian note. |
| "The sections are very very boring, it is not sharing its purpose" | Every section opens with an eyebrow that names its job and a one-line statement of what it is, then real content, then one action. |
| "Each section layout is shitty" | Eight sections, eight structures: full-bleed still, horizontal rail, dissolving side-by-side, ledger split, circular loupe pair, image band over a three-cell grid, centred camera window, statement plus plaque. No two share a skeleton. |
| "Add more images" | Seven of the eight sections carry a real image plate. All of them already existed under `apps/web/public/`. Nothing was generated, downloaded or hotlinked. |

The v7 note that "gold is light, never a fill" no longer holds for exactly one
surface. The client owns the brand and asked for the gradient; `DESIGN_DIRECTION.md`
says gold is "light, never a fill", so the atelier field is a deliberate,
documented exception, and every text run on it was measured rather than eyeballed
(section 5). Everywhere else gold is still light: a hairline, a wash, a glow, type
ink, a rim.

---

## 1. The ground sequence

The page alternates so it breathes. Warm blacks are new: `--mh-obsidian-warm`
(`#0b0906`) replaces the cool obsidian under gold light, which is what makes the
metal read as metal instead of as a grey hairline.

| # | Section | Ground | Rhythm |
|---|---|---|---|
| 1 | Hero | obsidian `#070a0f` | dark |
| 2 | The variety index | warm paper `#f2e9d6` | light |
| 3 | The atelier | **gold field** | gradient |
| 4 | Jewellery | warm black `#0b0906` | dark |
| 5 | The record | paper `#f7f4ec` | light |
| 6 | The gemologist | warm black | dark |
| 7 | Try-on | paper | light |
| 8 | Appointments | warm black + gold plaque | dark, gold close |
| 9 | Footer | warm black `#080604` | dark |

---

## 2. Section by section

One primary action per section. Record rows, question links and the search field
are content, not actions; they are noted where they occur.

### 2.1 Hero — unchanged

| | |
|---|---|
| Composition | Full-bleed still, one scrim, one warm light on the right, one editorial line, the 60 px search, one quiet concierge link. |
| Image | `/mgh/images/gems/sapphire-gem.jpg` (1200 × 1800), the existing hero still. Gold necklaces and a blue pendant on a warm ground; the section reads gold before it reads black. |
| Gold | A single `rgba(230, 201, 122, 0.2)` radial that breathes on a 12 s alternation, over the photograph's own gold. Unchanged. |
| Why untouched | The brief says the hero stays minimal. Its image, copy and search behaviour are identical to v7. |

### 2.2 The variety index — full-bleed horizontal rail

| | |
|---|---|
| Composition | A warm-paper band ruled top and bottom in gold. Header in two registers above (eyebrow, statement, then the derived count and the action). Below, a full-bleed running rail of material plates, each with the variety, carat, origin and certificate reference. |
| Images | Eight plates, one per variety with a record: `/media/stone-tanzanite.jpg`, `stone-sapphire.jpg`, `stone-emerald.jpg`, `stone-ruby.jpg`, `stone-spinel-pink.jpg`, `stone-paraiba.jpg` (tourmaline), `stone-alexandrite.jpg`, `stone-tsavorite.jpg`. These are the catalogue's own representative stone photographs, mapped by `lib/storefront-images.ts`. |
| Gold | Warm paper ground with a gold wash from the top left; gold hairlines at the band edges; certificate references in gold ink `#7c6323`; variety names turn gold on hover; the pale-ground ruby plate is set on champagne with `mix-blend-mode: multiply` so it prints into the paper instead of sitting in a white rectangle. |
| Content | Every active variety with at least one record, one record each. The count and origin total are derived from the loaded rows (`8 varieties with a record · 7 origins`), never hardcoded. A variety with no plate falls back to the record's own image, then to a typographic plate. |
| Action | **All gemstones** → `/gemstones` |
| Accessibility | The duplicate track is `aria-hidden` and out of the tab order; the first track is fully keyboard reachable (v7 left both copies at `tabindex="-1"`), and the rail pauses on hover and focus. Reduced motion turns it into a scroll rail. |

### 2.3 The atelier — the gold field

| | |
|---|---|
| Composition | The page's only gradient ground. Text on the left (eyebrow, statement, one paragraph, three numbered steps as a ruled index, one action); the photograph on the right dissolves into the field on all three edges, so the ring appears to lie on the gold rather than in a card. |
| Image | `/mgh/images/elysian-ring.jpg` (900 × 1200), the Elysian Ring's own first image from the record. Its warm-stone ground is the same temperature as the field, which is why the mask is invisible. |
| Gold | Five-stop `148deg` field (`#f0d99b → #e2c47c → #d3ae5d → #c6a04c → #bd9646`) with two radials for specular falloff. Rules at 24% ink. The action is the page's only filled control: ink `#211a0c` with `#f3e3b6` label (16.5:1). |
| Content | Stone → mounting → review, the real configurator's steps. Prices are not estimated anywhere in this section. |
| Action | **Begin with a stone** → `/design-your-own?step=stone#dyoj-studio` |

Below 1024 px the section stacks: the photograph becomes a 16–24 rem band that
fades into the field, and the text follows it.

### 2.4 Jewellery — ledger against one tall plate

| | |
|---|---|
| Composition | A 12-column dark split: head and then a two-register ledger in columns 1–6, one tall plate in columns 8–12 spanning both rows. The plate is not a card in a grid; it is a column of its own. |
| Image | `/mgh/images/verdant-drop.jpg` (900 × 1200), the Verdant Drop's own first image, captioned with that record's name, weight and price. Deliberately a different record from the atelier ring, so no photograph appears twice on the page. |
| Gold | Warm black ground with a gold wash from the top right; gold hairline at the section top; prices and the caption meta in `#e6c97a` (12.3:1); row rules at 18% gold, brightening to full gold on hover. |
| Content | Ready-made records with the price their row carries; mountings with the design's base price and metal count. No invented piece, price or metal. |
| Action | **Enter the jewellery rooms** → `/jewellery` |

### 2.5 The record — circular loupe on paper

| | |
|---|---|
| Composition | Editorial two-column on paper: the page's only round plate on the left (a loupe: a circular crop with gold rims and an optical falloff), the method on the right with a three-row evidence list. |
| Image | `/media/stone-ruby.jpg`, the catalogue's representative ruby photograph, captioned "A ruby, photographed for the catalogue." |
| Gold | Gold lens rim (three concentric rings at 30%, 90% and 16% opacity), gold-ink terms, gold-outlined action. |
| Content | What a product page will and will not print: carried, refused, marked. This is the INV-07 rule in plain language, on the homepage, without a founding year or a client count. |
| Action | **How to read a record** → `/education/reading-a-record` |

### 2.6 The gemologist — image band over a three-cell desk

| | |
|---|---|
| Composition | A full-bleed band of one stone across the top of the section, then a wide statement, then three question cells in a grid divided by vertical gold rules. The only grid-of-cells composition on the page. |
| Image | `/media/stone-sapphire.jpg` in a 5–7.5 rem band at 66% opacity under a scrim. Decorative: it carries no text and no claim. |
| Gold | Warm black ground; gold-on-dark eyebrow; gold question underlines; gold hairlines on every cell edge. |
| Content | Three real questions, each carrying its own words into `/concierge?q=…`. They are underlined quotes you can send, not three buttons, so the section keeps a single bordered action. No staged transcript, no pre-written answer. |
| Action | **Ask the gemologist** → `/concierge` |

### 2.7 Try-on — one centred camera window

| | |
|---|---|
| Composition | The only vertically centred section: eyebrow, statement, paragraph, then a 3:4 window with four corner marks, a caption, the action and an honest note, all on the centre line. |
| Image | `/media/jew-sapphire-ring.jpg`, the catalogue's representative sapphire ring. Caption: "Sapphire and diamond ring. Catalogue image." |
| Gold | Four gold corner marks, a gold hairline frame, a gold-outlined action. |
| Content | The camera feed stays on the device; a calibrated asset opens when one is recorded; if not, the studio says so instead of showing a stand-in. |
| Action | **Open the try-on studio** → `/ar/webar-tz-0131` |

### 2.8 Appointments — statement plus gold plaque

| | |
|---|---|
| Composition | 6/5 split: the closing statement on warm black, the appointment on a gold plaque with ink type. The plaque is the only gold surface outside the atelier band, so the page ends on metal rather than on a second black rectangle above the footer. |
| Image | None. The section is deliberately imageless and typographic; the plaque is the material. |
| Gold | A 3 px gold-field seam along the top edge, a left radial gold light, and the plaque: `#c6a04c` base with the field gradient and an ink button (16.5:1). |
| Content | New York, Geneva and London by appointment; the no-obligation note is unchanged. |
| Action | **Request an appointment** → `/contact` |

### 2.9 Footer — refined, not rebuilt

Warm black (`#05080c → #080604`), so it belongs to the same metal family as the
CTA above it. Structure, links, address, journal form and demo gate unchanged.

---

## 3. Which image came from where

No image was created, downloaded or hotlinked in this pass. Every plate resolves
to a file already in `apps/web/public/`.

| Section | File | Provenance | Size |
|---|---|---|---|
| Hero | `mgh/images/gems/sapphire-gem.jpg` | Existing hero still (applet asset set) | 1200 × 1800 |
| Index ×8 | `media/stone-*.jpg` | The catalogue's representative stone photography, mapped in `lib/storefront-images.ts` | 1152 × 864 (ruby 1774 × 1428) |
| Atelier | `mgh/images/elysian-ring.jpg` | `elysian-ring` record's own `images[0]` | 900 × 1200 |
| Jewellery | `mgh/images/verdant-drop.jpg` | `verdant-drop` record's own `images[0]` | 900 × 1200 |
| Record | `media/stone-ruby.jpg` | Representative catalogue photograph | 1774 × 1428 |
| Gemologist | `media/stone-sapphire.jpg` | Representative catalogue photograph (band crop) | 1152 × 864 |
| Try-on | `media/jew-sapphire-ring.jpg` | Representative catalogue photograph (`HERO_IMAGE` in the same map) | 1152 × 864 |

Two honesty rules held throughout: a photograph is captioned with a product name
only when it is that record's own image (atelier, jewellery), and a
representative photograph is captioned as a catalogue image (record, try-on).
The index plates are `alt=""` because the tile's own text names the variety, so
the plate repeats no information for a screen reader.

---

## 4. What each section is for

| Section | Eyebrow | Statement | The job |
|---|---|---|---|
| Index | The vault | Every variety we hold, one record each. | Show the range and prove each tile is a record. |
| Atelier | Design your own | Made around the stone. | Explain the commission before asking for it. |
| Jewellery | Jewellery | The finished piece, and the bench that holds it. | Two registers: buy finished, or mount your stone. |
| Record | The record | What the page will tell you, and what it will not. | Make the evidence rule legible before a product page. |
| Gemologist | The gemologist | A gemologist's eye, on request. | Offer judgement, and state its limit. |
| Try-on | Before you buy | See the stone in place. | Offer the AR surface and its missing-asset state. |
| Appointments | Appointments | See the stone before you decide. | Convert to a private viewing. |

---

## 5. Measured gates

Build basis: `next build --webpack`, `DATABASE_URL` unset in the process
environment, `SITE_URL=http://localhost:3108`, served on 3108 with no reachable
database so every catalogue row is the labelled fixture ledger.

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` | **0 errors**, exit 0 |
| `next build --webpack`, `DATABASE_URL` unset | **exit 0** |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed (unchanged) |
| `node scripts/check-slop.mjs` | **clean** |
| axe at 1440 / 1024 / 768 / 390 (home) | **4 / 4 captures, 0 violation nodes, 0 rule types** |
| Horizontal overflow | **0 px** at all four widths |
| Type sizes (1440) | **11 / 12 / 14 / 24.48 / 48 / 88** — identical to v7; five steps plus the hero instance, no new size |
| Type sizes (1024, 768) | 11 / 12 / 14 / 22 / 36 / 72 |
| Type sizes (390) | 11 / 12 / 14 / 22 / 36 / 55.8 |
| Initial JS, home | **181.8 KB gzip** (v7: 181.8, **+0.0**) |
| Initial JS, category | **196.1 KB gzip** (v7: 196.1, **+0.0**) |
| Initial JS, product | **201.3 KB gzip** (v7: 201.3, **+0.0**) |
| CSS, `storefront-craft.css` | 87,476 → 97,038 bytes (**+9.6 KB raw, +2.79 KB gzip**) |
| Budget delta | **+0.0 KB JS** and **+2.79 KB gzip CSS**, inside the 15 KB allowance. The absolute JS ceiling overrun on category and product is pre-existing and was not increased. |
| Internal links | **44 of 44 resolve** (`node scripts/link-check.mjs`: 0 non-2xx) |

### 5.1 Contrast on the gold field

axe reports 311 `color-contrast` *incomplete* nodes (v7: 124) because it cannot
resolve a gradient and returns "incomplete" rather than a pass. Guessing is not
evidence, so the gold surface is measured directly:
`node scripts/contrast-probe.mjs` hides each text run, screenshots its exact box,
decodes the pixels in-page and takes the **worst pixel** behind the text.

```
PASS   8.78  atelier eyebrow        fg=#3a2e16  bg=#e8d097
PASS  11.41  atelier title          fg=#211a0c  bg=#e8d096
PASS   7.40  atelier lede           fg=#3a2e16  bg=#ddbe76
PASS   6.43  atelier step copy      fg=#3a2e16  bg=#d4b060
PASS   7.25  atelier numeral        fg=#3a2e16  bg=#dcbc71
PASS  16.47  atelier button label   fg=#f3e3b6  bg=#211a0c
PASS   9.14  cta plaque line        fg=#3a2e16  bg=#ebd4a0
PASS   5.59  cta plaque note        fg=#3a2e16  bg=#c9a350
...
21 / 21 pass, 0 fail
```

The field's darkest stop is `#bd9646`; the ink `#211a0c` measures 6.25:1 on it and
the soft ink `#3a2e16` measures 4.81:1. Nothing darker than `#bd9646` is ever
placed under text, and the gradient is defined in that measured range at the top
of the sheet so the rule cannot drift.

---

## 6. Evidence

```
docs/design-shots/v8/
  before/    home at 1440 / 1024 / 768 / 390 (v7 baseline)
  after/     home at 1440 / 1024 / 768 / 390 (this pass) + audit.json
  sections/  index, atelier, jewellery, record, gemologist, tryon, cta
             at 1440 / 1024 / 768 / 390
```

Reproduce:

```
# production build, no database
DATABASE_URL= pnpm --filter @maihan/web build
SITE_URL=http://localhost:3108 PORT=3108 pnpm --filter @maihan/web start

# full-page captures + axe + overflow + type scale
BASE_URL=http://localhost:3108 LABEL=after OUT_DIR=../../../docs/design-shots/v8 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home node scripts/craft-audit.mjs --only=home

# one plate per section
BASE_URL=http://localhost:3108 WIDTH=1440 node scripts/section-shots.mjs

# measured contrast on the gradient
BASE_URL=http://localhost:3108 node scripts/contrast-probe.mjs

# every internal link on the rendered home page
BASE_URL=http://localhost:3108 node scripts/link-check.mjs
```

---

## 7. Deliberately not done

- **The navbar.** Untouched, including its mega menu, search trigger and sample
  review links.
- **The hero.** Untouched by instruction. Its copy, image, search behaviour and
  the two quiet links are exactly v7's. It is the one section with more than one
  action.
- **The footer's structure.** Only the ground warms. No column, link, form or
  address changed.
- **Every other page.** Catalogue, PDPs, cart, checkout, account, the admin and
  vendor consoles, the login frames and the AR route are unchanged. No route was
  added.
- **No new dependency, font, icon set, radius, shadow or type size.** The only
  new tokens are the gold field, its inks and rules, the warm-paper ground and
  the warm-black ground.
- **No generated or stock imagery.** No AI image, no download, no hotlink. The
  `hero-blueprint/` renders were considered for the atelier and rejected: they
  are 216 px wide and AI-generated, so they cannot carry a plate.
- **No fabricated product, price, certificate, testimonial, client count,
  founding year or shipping promise.** The index omits a variety with no record;
  the try-on does not claim a calibrated asset exists; the record section
  publishes only the evidence rule.
- **No invented comparison.** The atelier shows a record's real image and the
  jewellery section names a different record, so the page never shows one
  product's photograph under another product's name.
- **No second gradient field.** One dominant gradient section. The CTA's gold is
  a plaque and a seam, not a competing ground.
- **No change to the demo badge.** `DemoContentBadge` is global chrome and still
  overlays the lower-left of the viewport at every width; it was out of scope
  and is pre-existing in v7.
- **The absolute JS ceiling overrun.** Pre-existing on category (196.1 vs 170)
  and product (201.3 vs 190); this pass adds 0.0 KB and does not close a gap
  that belongs to a separate budget decision.
- **`DESIGN_DIRECTION.md`.** Not rewritten. The one-line exception (gold as a
  fill on exactly one surface, measured) is recorded here and encoded in the
  token comment in `storefront-craft.css`.
