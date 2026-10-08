/**
 * apps/web/src/app/(storefront)/account/[[...accountPath]]/page.tsx
 *
 * `/account/**` — orders, addresses, profile, wishlist and sign-in/verify
 * flows. SoT 12.2 `account/...` — no further sub-structure is prescribed in
 * the SoT itself, so we DO NOT invent one; a single account segment catches
 * all account paths until Phase 6 (E6.5 accounts) prescribes the real sub-
 * routes. SoT 13.1 targets `/account` (identity 200) and routes `/auth` and
 * `/verify-email` DEEP into `/account/sign-in` and `/account/verify-email`.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account',
};

export default function AccountPage() {
  return null;
}
