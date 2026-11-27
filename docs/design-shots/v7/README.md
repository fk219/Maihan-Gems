# Design pass v7 — rounded surfaces, the full homepage, split sign-ins and demo access

Status: measured on `main` at `fa4e580` plus this pass.

This pass touches the **homepage**, the **storefront footer**, `/admin/login`,
`/vendor/login`, and one new server route (`POST /api/v1/auth/demo-login`).
The navbar is untouched. So are the admin console, the vendor console, the
catalogue components, every other page, `packages/`, `api/` (except the new
route) and the `develop` worktree.

The demo catalogue is still **fixture-backed demo content** (`DEMO_CONTENT`).
Every price, reference and availability in these images is illustrative, not
inventory, and the global badge says so. Nothing in this pass invents a
product, a price, a certificate, a testimonial or a shipping promise.

---

## 1. The rounded-surface system

The client asked for rounded backgrounds on content divs. One scale, applied
by role, no mixed values:

| Token | Value | Applied to |
|---|---|---|
| `--mh-radius-control` | **4 px** | buttons, framed controls |
| `--mh-radius-soft` | **16 px** | inputs, search field and panel, viewfinder inner frame |
| `--mh-radius-plate` | **28 px** | section plates, image plates, form card, footer blocks |
| `--mh-radius-full` | **999 px** | circular controls only |

The old scale was 2 / 8 / 24 px. The three aliases are re-pointed, so existing
cards across the storefront inherit 4 / 16 / 28 rather than a second system.

Rounded panels are still **paper or obsidian**: no `backdrop-filter`, no
translucent blur, no glass. A plate is a flat surface with a 1 px hairline and
one inset top highlight; depth comes from the line and the light falloff, not
from transparency. The marquee, the gemologist section, the try-on plate and
the footer blocks are obsidian plates on the paper page; the about and
jewellery plates are paper on paper.

---

## 2. Homepage, section by section

Order: hero first; the rest compose as follows.

| # | Section | Composition | What carries the content |
|---|---|---|---|
| 1 | **Hero** | Unchanged. Full-bleed still, one raking light, one editorial line, the 60 px search, one quiet concierge link. | The current hero and its search behaviour are preserved; only the search field takes the 16 px field radius. |
| 2 | **Variety marquee** | One inset obsidian plate, one running typographic track. No cards, no illustrations. | **Every active gemstone variety that has at least one record** gets exactly one tile: variety name, carat, origin and certificate reference (or “Certificate not recorded”). A variety with no record is omitted. The count is derived (`n varieties with a record`), not decorative. The duplicated track is `aria-hidden` and out of the tab order; reduced motion turns it into a static scroll rail. |
| 3 | **Jewellery** | A 5 / 7 split: one tall image plate with a caption below, against a two-register ledger. | **Ready-made** rows carry the piece name, weight/form and the price the record holds. **Mountings** rows carry the design name, style, metal-option count and base price (or “Price on request” when the record has no price). Four category links live in the navbar and the footer, not in a third grid here. |
| 4 | **About** | The page's text-only composition: one rounded paper plate, a display statement, a body column and a hairline definition list. No photograph, no founder story the application cannot publish. | The method (one stone, one record; price from the record, not a per-carat estimate) and the **observed** organization identity: 608 5th Avenue, New York, and the three salon cities already emitted site-wide. |
| 5 | **Design your own** | Existing split: obsidian image plate left, three numbered steps right, one action. | Stone → mounting → review, using the real configurator vocabulary. No sample code, no delivery promise. |
| 6 | **AI gemologist** | A dark rounded plate on the paper page: statement and one action left, three real questions right. | Each question carries its text into `/concierge?q=…`. The copy states the rule: answers are quoted from the catalogue, and a field the record does not carry is refused, not guessed. |
| 7 | **Virtual try-on** | A viewfinder plate: image right, one hairline reticle, copy and one action left. | Links to the existing `/ar/webar-tz-0131` surface. The note is explicit: a calibrated asset opens when one is recorded; if it is not, the studio says so instead of showing a stand-in. Camera frames stay on the device. |
| 8 | **CTA** | Existing full-bleed obsidian closing invitation: one line, one hairline action, one honest note. | Unchanged copy; the button picks up the 4 px control radius. |
| 9 | **Footer** | The couture back cover, now three rounded obsidian blocks: the four-column identity panel, the statement + Journal panel, and the legal base. | Every link still resolves to a real route. The observed address and telephone are unchanged. The Journal form is a 16 px field bar. The demo entry appears in the base **only when the flag is on** (below). |

No two sections share a composition: a photograph split, a running rail, a
5/7 ledger, a text-only plate, a numbered split, a dark question plate, a
viewfinder, and a full-bleed close.

---

## 3. The split sign-in pages

`/admin/login` and `/vendor/login` now share one frame and one component
(`components/auth/AuthAside.tsx`).

| Piece | Treatment |
|---|---|
| Left half | One lit still (`sapphire-gem.jpg`) under a single scrim and light falloff, the wordmark, the house line “The stone comes first. The record follows.”, and a surface caption with the observed New York address. The **same image and quote on both pages**; only the surface label changes. |
| Right half | The form on paper, in a 28 px card: 12 px label/eyebrow, 48 px display title, 16 px inputs, 4 px submit, a gold hairline. One eyebrow per page. |
| Split | 50 / 50 above 900 px. At 900 px and below the image/quote collapses **above** the form as a 17–24 rem band; the whole page then scrolls as one column. |
| Auth behaviour | Unchanged. Both forms still post `/api/v1/auth/login`; the vendor form still checks `/api/v1/vendor/me`; the admin form still requires an administrative role; the redirects remain `/admin` and `/vendor`; session guards still redirect an already-signed-in user. |
| Accessibility | One `<main id="main-content">`, labelled inputs, `role="status"` errors, 44 px minimum targets, a visible paper/dark focus ring, and a plain-CSS skip-link rule because these routes do not load the storefront utility sheet. |

The admin and vendor doors therefore read as two entrances to one building,
not two products.

---

## 4. Demo access — `DEMO_LOGIN_ENABLED`

### Behaviour

| Condition | Result |
|---|---|
| Flag is **not** exactly `"true"` on the server | `POST /api/v1/auth/demo-login` answers **404**. Neither login page nor the footer renders the affordance. |
| Flag is `"true"` | Both login pages and the storefront footer render “View demo account”. The route mints a normal first-party session for the seeded identity and returns `{ ok, surface, redirectTo }`. |
| Flag is on, database unavailable | The route passes the flag gate and answers **503** rather than 404. |
| Flag is on, seeded user missing / wrong role / vendor not approved | 404 for a missing or mismatched identity; 403 for a suspended user or an unapproved vendor. |

Verified on the final build:

```
flag off: admin login contains "View demo account" -> False
flag off: home footer contains "View demo account" -> False
flag off: POST /api/v1/auth/demo-login                -> 404
flag on : admin login contains "View demo account" -> True
flag on : vendor login / home footer                  -> True
flag on : POST with no reachable database             -> 503
client chunks containing admin@maihan.local / MaihanDemo -> none
```

### Seeded identities

Created by `packages/db/seed-demo.mjs` (idempotent):

| Surface | Email | Role / state | Redirect |
|---|---|---|---|
| Admin | `admin@maihan.local` | `ADMIN_SUPER` | `/admin` |
| Vendor | `vendor@maihan.local` | `OWNER` of **Atelier North** (`APPROVED`) | `/vendor` |
| Customer | `customer@maihan.local` | no administrative role | `/account` |

The seed password is `MaihanDemo!2026`; it must be changed before any real use.
Seed with:

```
DATABASE_URL=… node packages/db/seed-demo.mjs
```

The client component holds **no email, password or seeded identity**. It sends
only the surface name and follows the `redirectTo` the server returns. The
identities live in `apps/web/src/lib/demo-login.ts`, which is `server-only`.
The flag is documented in `.env.example` and must never be enabled in
production.

### The storefront entry point

A quiet, underlined “View demo account” sits in the footer's legal base. It
signs in as the seeded **customer** and lands on `/account`. It is server-gated
with the same flag, so it is absent from the markup, not merely hidden, when
the flag is off.

---

## 5. Measured gates

Build basis: `next build --webpack`, `DATABASE_URL` unset in the process
environment, `SITE_URL=http://localhost:3101`, served on 3101 with an
unreachable local database so every catalogue row is the labelled fixture
ledger.

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` (`tsc -b`) | **0 errors**, exit 0 |
| `next build --webpack`, `DATABASE_URL` unset | **exit 0** |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed |
| `node scripts/check-slop.mjs` | **clean** |
| axe — home, admin login, vendor login at 1440 / 1024 / 768 / 390 | **12 / 12 captures, 0 violation nodes, 0 rule types** |
| axe — flag-on demo affordance | **4 / 4 captures** at 1440 / 390 on both login pages, **0 violation nodes** |
| Horizontal overflow | **0 px** on all 12 gate captures and all 4 flag-on captures |
| Home type sizes | 11 / 12 / 14 / 24.48 / 48 / 88 at 1440; 11 / 12 / 14 / 22 / 36 / 72 at 1024 and 768; 11 / 12 / 14 / 22 / 36 / 55.8 at 390. The 11 px node is pre-existing global chrome; the page content uses the five-step scale plus the hero instance. |
| Login type sizes | 12 / 14 / 48 at 1440; 12 / 14 / 36 at 1024 and 390; 12 / 14 / 36 / 48 at 768. |
| Initial JS, home | **181.8 KB gzip** (v6: 181.4 KB, **+0.4 KB**) |
| Initial JS, category | **196.1 KB gzip** (v6: 195.7 KB, **+0.4 KB**) |
| Initial JS, product | **201.3 KB gzip** (v6: 200.9 KB, **+0.4 KB**) |
| Budget delta | **+0.4 KB on every measured route**, well inside the 10 KB allowance. The absolute ceiling overrun is pre-existing (documented in v5/v6) and was not increased. |
| Screenshots | `after/` 12 (3 routes × 4 widths), `before/` 4 (the v6 home baseline), `demo-on/` 3 (flag-on affordances). |

The v6 home images were copied to `before/` as the previous baseline; v6 never
captured the two login pages, so they are shown only in `after/`.

Comparison command:

```
BASE_URL=http://localhost:3101 LABEL=after OUT_DIR=../../../docs/design-shots/v7 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home,admin-login,vendor-login \
  node scripts/craft-audit.mjs --only=home,admin-login,vendor-login
```

---

## 6. Deliberately not done

- **The navbar.** Untouched, including its mega menu, its search trigger and
  its existing sample review links.
- **Every other page and console.** `app/admin/[[...adminPath]]`,
  `app/vendor/[[...vendorPath]]`, `/account/login`, the catalogue, PDPs, cart,
  checkout, admin and vendor consoles are unchanged. The customer demo entry
  lives in the footer because the customer login page was out of scope.
- **`api/`.** No handler, route table, contract or auth logic changed. The one
  addition is the standalone `app/api/v1/auth/demo-login/route.ts`, which
  reuses the existing session model and cookie helper.
- **`packages/`.** No schema, seed, migration or domain change. The demo route
  reads the identities that `seed-demo.mjs` already creates.
- **No new dependency.** No new runtime package, no test framework, no
  motion library. Icons are existing `lucide-react`; the reticle is CSS.
- **No fabricated content.** No invented product, price, certificate,
  testimonial, client count, founding year or shipping promise. The marquee
  omits a variety with no record; the try-on section does not claim an asset
  exists; the about section publishes only the method and the observed
  address.
- **No new 3D or AR asset.** The try-on action opens the existing WebAR route;
  its honest missing-asset state is the destination when no calibrated asset
  is recorded.
- **No production demo credentials.** The flag is off by default, the route
  404s when off, and no seeded email or password appears in client code.
- **The absolute JS ceiling overrun.** Pre-existing; this pass adds 0.4 KB per
  route rather than closing a gap that belongs to a separate budget decision.
