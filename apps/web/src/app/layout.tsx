/**
 * apps/web/src/app/layout.tsx
 *
 * The root layout: every route group below it inherits <html>/<body>.
 * Deliberately contains NO chrome — header/main/footer and the mega menu are
 * the (storefront) group's layouts (SoT 12.2 note: "(storefront)/ layout.tsx
 * header, mega menu, footer, chat launcher"), which lands with later Phase 4
 * tasks. Admin does not inherit storefront chrome; each group contributes
 * its own layout over this base.
 */
import { organizationJsonLdPayload } from '../lib/jsonld.js';
import { JsonLd } from '../components/seo/JsonLd.js';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Task 8: the site-wide Organization entity, emitted only when the
            canonical base (SITE_URL) is configured. Statically prerendered
            pages build without it; the honest fallback omits the entity rather
            than fabricating a domain. Surfaces whose correctness depends on
            the base (sitemap, product canonicals) still fail loudly. */}
        {organizationJsonLdPayload() !== null && <JsonLd payload={organizationJsonLdPayload() as string} />}
        {children}
      </body>
    </html>
  );
}
