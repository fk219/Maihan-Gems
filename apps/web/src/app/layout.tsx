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
import './globals.css';
import { MAIHAN_THEME_CSS } from '../lib/theme-styles.js';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Montserrat:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme_preference')||'light';var r=document.documentElement;r.setAttribute('data-theme',t);r.classList.remove('dark','light');r.classList.add(t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
        <style id="maihan-theme" dangerouslySetInnerHTML={{ __html: MAIHAN_THEME_CSS }} />
      </head>
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
