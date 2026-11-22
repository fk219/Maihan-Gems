# AUTONOMOUS BUILD BRIEF

Mission: take the Maihan Gems platform from a working foundation to a
production-deployed, awards-calibre storefront that can stand next to Bulgari
and Prada.

This brief authorises autonomous execution: make the decisions, write the code,
run the checks, and commit. Do not stop to ask for approval on engineering
detail. Stop only for the four escalations in section 6.

---

## 1. Definition of done

The work is finished when all of these are true **and evidenced**:

1. A stranger opens the deployed URL, understands what is sold within 5 seconds,
   and the page scores visually at Awwwards-jury standard.
2. Admin can sign in, publish content, publish a product, and every action
   writes an audit row.
3. A vendor can sign in, see their stock and orders, and see an accurate
   payable balance.
4. A customer can register, verify, sign in, add to cart, pay (sandbox), and
   receive an email.
5. Product images render from object storage, not placeholders.
6. The site passes: WCAG 2.2 AA (axe clean), bundle budgets (170/190 KB),
   LCP p75 < 2.5 s, and a full E2E run against staging.
7. Deployed to Vercel with production env vars; preview and production URLs
   both green.

---

## 2. Order of work

Never start a later item before the earlier one is green.

1. **Build without a database.** `next build` must succeed with no `DATABASE_URL`.
   Dynamic routes that need data opt into `force-dynamic`; nothing may query at
   build time.
2. **Media.** S3/R2 driver, backfill, `/api/v1/media/{id}`, `media[]` in DTOs,
   real images on cards and PDP.
3. **Customer identity.** Register, verify, login, reset, account page.
4. **Vendor portal.** Login, stock intake, orders, payouts from the ledger.
5. **Payments + email + worker.** One real end-to-end order.
6. **Admin remaining modules** (11 of 13 Phase-12 tasks).
7. **Design.** Execute `docs/DESIGN_DIRECTION.md` at awards standard.
8. **Deploy.** Vercel, env vars, smoke test, then showcase.

---

## 3. Design standard

Read `docs/DESIGN_DIRECTION.md` first. Rules that are not negotiable:

- One concept: **light through stone**. Any motion that is not light entering,
  bending, passing or leaving is removed.
- Build the hero to final quality before touching the next section.
- No filled cards, no generic fade-ups, no stock photography.
- Every interactive element keyboard-reachable with a visible focus ring.
- `prefers-reduced-motion` honoured everywhere.
- Bundle budgets and LCP are gates, not aspirations.

Reference bar: Bulgari, Cartier, Van Cleef. A jury should be able to name the
idea after five seconds.

---

## 4. Engineering rules

- Follow `AGENTS.md`. Stage explicit paths; never `git add .`.
- Migrations are expand-only; never weaken a locked constraint.
- Every new dependency needs an ADR in `technical_design/40`.
- Money in integer minor units. Never floats.
- Every privileged mutation writes before/after audit state.
- The LLM mutates nothing; it calls deterministic tools.
- Tests are written with the code, not after.
- Commit in coherent units with a message that explains why.

---

## 5. Verification loop

After every unit of work:

```
pnpm -r run typecheck
pnpm --filter <pkg> run test
```

Before every deploy:

```
pnpm --filter @maihan/web run build
pnpm --filter @maihan/web run check:budgets
```

A unit is not done because it compiles. It is done when a test proves the
behaviour and, where visual, a screenshot at 1440/768/390 confirms it.

---

## 6. Escalate only for these

1. A secret or credential is required that is not in `.env`.
2. A destructive action on the database or a paid provider.
3. A decision that changes the business model or pricing.
4. Something that cannot be undone.

Everything else: decide, implement, document, commit, continue.

---

## 7. Deployment

Target: Vercel, project already connected to the repository.

Required environment variables (production and preview):

```
DATABASE_URL        Neon pooled connection string (maihan_dev for preview)
NODE_ENV            production
ENVIRONMENT         production
```

Steps:

1. Build must pass locally with no database present.
2. Push to the connected branch.
3. Verify the deployment URL: `/api/v1/health/live` returns 200.
4. Run the smoke script against the deployment.
5. Report the URL with what to click.

If deployment fails, read the build log, fix the cause, redeploy. Do not report
success until the URL serves the storefront and the admin login.
