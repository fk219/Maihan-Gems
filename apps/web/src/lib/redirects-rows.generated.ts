/**
 * apps/web/src/lib/redirects-rows.generated.ts
 *
 * The materialised `redirects` rows, generated at deploy time.
 *
 * Authority: technical_design/34 section 6-7. The migration stage
 * `cms-redirects` (`tools/migrate/src/stages/cms-redirects.ts`) writes ONE row
 * per source URL into the `redirects` table. That table is the materialised
 * form of the section 3 mapping; this module is its build-time export so the
 * Next proxy can hold it in memory without a per-request database read.
 *
 * This committed file is an EMPTY placeholder — no fabricated mapping. It is
 * deliberately not populated with sample rows. Replace it in the deploy
 * pipeline by running the generator against the migrated database:
 *
 *   pnpm --filter @maihan/web exec node scripts/generate-redirects.mjs
 *
 * which rewrites this file with the real rows. The family rules in
 * `redirects.ts` already cover every URL whose target is derivable from the
 * URL text; the rows are what carry the READY_MADE family (canonical
 * `products.slug`) and any future slug change.
 */
import type { RedirectRow } from './redirects.js';

export const GENERATED_REDIRECT_ROWS: readonly RedirectRow[] = [];
