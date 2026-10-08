/**
 * apps/web/src/app/(storefront)/checkout/order-summary/page.tsx
 *
 * `/checkout/order-summary` — checkout step 1 (target of the observed
 * /cart/order-summary 301). SoT 12.2. Route structure only; checkout is
 * Phase 6 (four-step funnel with server checkpoints).
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order summary',
};

export default function CheckoutOrderSummaryPage() {
  return null;
}
