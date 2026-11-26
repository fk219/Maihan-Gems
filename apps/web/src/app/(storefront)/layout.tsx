/**
 * apps/web/src/app/(storefront)/layout.tsx
 *
 * The storefront group layout.
 *
 * SoT 12.2 comment: "header, mega menu, footer, chat launcher" — the header
 * with the mega menu lands here (Task 9). The chat launcher is a Phase 7
 * surface (post-MVP) and the footer arrives with content phases; both slots
 * are intentionally empty until their phase, not stubbed with fake chrome.
 */
import { StorefrontHeader } from '../../components/layout/StorefrontHeader.js';
import { StorefrontFooter } from '../../components/layout/StorefrontFooter.js';
import { AiConciergeDrawer } from '../../components/ai/AiConciergeDrawer.js';

/**
 * StorefrontHeader reads the mega-menu taxonomy from Postgres on every render,
 * so every route in this group needs request-time data. Without this the build
 * prerenders static routes (e.g. /blog, /cart) and queries a database that a
 * CI/Vercel build does not have.
 */
export const dynamic = 'force-dynamic';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sf-v2">
      <a className="sf-skip" href="#sf-main">
        Skip to content
      </a>
      <StorefrontHeader />
      <div id="sf-main">{children}</div>
      <StorefrontFooter />
      <AiConciergeDrawer />
    </div>
  );
}

