# v14 homepage evidence

The restored hero and the rebuilt homepage, measured on the production build
(`next start`, `DATABASE_URL` empty) at 320, 390, 430, 768 and 1440.

## Shots

| File | What it shows |
|---|---|
| `home-320.png`, `home-390.png`, `home-430.png`, `home-768.png`, `home-1440.png` | Full-page captures at each width |
| `home-*-reduced.png` | The same page with `prefers-reduced-motion: reduce` (content identical, no loop) |
| `scroll/00-hero-390.png` … `scroll/11-footer-390.png` | The 390 scroll sequence, one frame per section offset |
| `search-open-390.png`, `search-error-390.png` | The hero search panel, open downward and in its error state |
| `focus-hero-search-390.png` | The hero search's focus ring (the field rings, not the bare input) |
| `audit.json` | Per-width axe, overflow, section heights, hero metrics |

`audit.json` is the machine record; the numbers below are read from it.

## Section table

Heights at 390 (viewport 844, so 70vh = 590) and at 1440 (viewport 900), with
the one action each section carries. Cards are the sections' content: each card
is one link to one record, and is not counted as the section's action.

| # | Section | 390 | 1440 | Action |
|---|---|---|---|---|
| 1 | Hero | 844 (100vh) | 900 (100vh) | The catalogue search (plus one quiet link: Ask a gemologist) |
| 2 | Varieties | 586 (69.4vh) | 682 (75.8vh) | See all varieties → `/varieties` |
| 3 | Collection | 488 (57.8vh) | 821 (91.2vh) | Enter the collection → `/gemstones` |
| 4 | Jewellery | 542 (64.2vh) | 692 (76.9vh) | Enter the jewellery rooms → `/jewellery` |
| 5 | About | 423 (50.1vh) | 733 (81.4vh) | Read about the house → `/about` |
| 6 | Design your own | 579 (68.6vh) | 409 (45.4vh) | Open the configurator → `/design-your-own` |
| 7 | AI gemologist | 287 (34.0vh) | 327 (36.3vh) | Ask the AI gemologist → `/concierge` |
| 8 | Try-on | 583 (69.1vh) | 660 (73.3vh) | Open the try-on studio → `/ar/webar-tz-0131` |
| 9 | Certificate | 519 (61.5vh) | 584 (64.9vh) | Open the record → `/products/...` |
| 10 | Closing | 245 (29.0vh) | 197 (21.9vh) | Request a private viewing → `/contact` |
| 11 | Footer | 568 (67.3vh) | 566 (62.9vh) | Navigation surface (accordions on a phone, columns from 1024) |

At 390 no non-hero section exceeds 70vh; the tallest is the variety band at
69.4vh. At 1440 five sections run past 70vh by design: the variety band (with
its pause control), the photographic tray, the bench split, the house page and
the device stage. The 70vh cap is a phone rule, not a desktop one.

## The hero as built

- 100svh (with a 100vh fallback), full width, edge to edge, no container.
- One photograph: `/media/stone-tanzanite.jpg`, `object-fit: cover`,
  `brightness(.5) saturate(1.06)`.
- The slogan's own centre line is the viewport's centre line (measured offset
  0px at every width). The block's top padding is the trailing block (142px)
  plus the bottom padding (88px), so centring the stack puts the slogan where
  the brief says it goes and leaves the search below it.
- `clamp(40px, 6.7vw, 96px)`, Montserrat 300, tracking −0.035em, line-height
  1.02. One line from 768 up; two lines at 320–430 because 21 characters at
  40px do not fit 350px without overflow (measured, not assumed).
- Search: 58px tall, max 560px, full width minus the 20px gutters on a phone,
  12px radius, 1px gold hairline at rest, gold border and a 2px gold ring on
  focus-within. The panel opens downward, capped at 32vh so it cannot be
  clipped by the hero.
- One quiet link under the search: Ask a gemologist → `/concierge`.
- Measured worst-case contrast behind the type (the lightest pixel under each
  text box, text hidden, screenshot decoded): title 11.3:1 at 390 and 12.8:1 at
  1440; search field 13.5:1 / 13.7:1; quiet link 14.1:1 / 13.8:1.

## Measured gates

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Build, `DATABASE_URL` empty | exit 0 |
| Tests | 618 passed / 21 skipped (unchanged) |
| `node scripts/check-slop.mjs` | clean |
| axe (WCAG 2.0/2.1/2.2 A+AA) | 0 violation nodes at 320, 390, 430, 768, 1440; 0 again at 320, 390, 768, 1440 with reduced motion |
| Horizontal overflow | 0px at 320, 390 and 430 (and at 768/1440) |
| Section heights at 390 | none over 70vh (max 69.4vh) |
| Home initial JS | 210.8 KB gzip, unchanged from the baseline; page chunk 3.8 KB |
| Links on `/` | 39 unique internal hrefs, all resolve (GET, redirects followed) |
| Keyboard | 24 tab stops, every one paints a focus indicator |
| Hero contrast | 11.3:1 worst case (see above) |

## What was removed or refused

- No client component was added. The only client code on the page is the
  existing hero search; the rest is Server Components and CSS. There is no
  scroll-reveal library and no new dependency.
- No scroll-triggered reveal animation on every section: the page is static at
  rest, with the hero's load, the variety band's marquee (desktop only, paused
  on hover/focus, with a native Pause/Play control beside it, and off under
  reduced motion) and the hover states carrying motion.
- The hero image is a stand-in, not a listed lot. It keeps a descriptive alt
  and the site-wide demo badge; no extra label sits inside the hero, because
  the brief allows nothing else there.
- No fabricated product, price, certificate, testimonial or shipping promise.
  The collection and certificate read fixture records; the demo badge says so.
- The navbar was not touched.
