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

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StorefrontHeader />
      {children}
    </>
  );
}
