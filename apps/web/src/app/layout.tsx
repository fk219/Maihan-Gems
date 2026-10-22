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
import '../styles/maison.css';
import '../styles/atelier.css';
import { MAIHAN_THEME_CSS } from '../lib/theme-styles.js';
import { Cormorant_Garamond, JetBrains_Mono, Jost } from 'next/font/google';

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jost',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${cormorant.variable} ${mono.variable}`}>
      <head>
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
