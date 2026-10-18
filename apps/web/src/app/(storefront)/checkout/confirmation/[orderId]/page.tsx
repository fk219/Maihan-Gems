/**
 * apps/web/src/app/(storefront)/checkout/confirmation/[orderId]/page.tsx
 *
 * `/checkout/confirmation/<orderId>` — the order confirmation, rendered
 * strictly from the authoritative order read model (`GET /api/v1/orders/{id}`
 * served by the API process). The payment state shown is the state the
 * backend recorded — a freshly placed order is PENDING_PAYMENT until the
 * provider webhook reconciles it, and this page says so.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiFetch } from '../../../../../lib/api-origin.js';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

interface OrderReadModel {
  id: string;
  order_number: string;
  email: string;
  state: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  placed_at: string | null;
  shipping_address: Record<string, string | null> | null;
  items: { title_snapshot: string; sku_snapshot: string; quantity: number; line_total: string }[];
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Order confirmation | Maihan Gems',
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;
  const response = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}`);
  if (response.status === 404) notFound();
  if (!response.ok) {
    throw new Error('The order could not be loaded.');
  }
  const body = (await response.json()) as { data?: OrderReadModel };
  const order = body.data;
  if (!order) notFound();

  const money = (amount: string): string =>
    Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <main className="page checkout-page" id="main-content">
      <div className="checkout-shell">
        <span className="eyebrow">Order received</span>
        <h1 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Thank you — your order is with the atelier.</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Order <strong>{order.order_number}</strong> · correspondence to {order.email}
        </p>

        <section aria-labelledby="confirm-items-title" className="lx-account-card">
          <h2 className="lx-account-card__title" id="confirm-items-title">Pieces</h2>
          <ul className="lx-order-items">
            {order.items.map((item, index) => (
              <li key={index}>
                <span className="lx-order-items__title">{item.title_snapshot}</span>
                <span className="lx-order-items__sku">{item.sku_snapshot}</span>
                <span className="lx-order-items__qty">×{item.quantity}</span>
                <span className="lx-order-items__total">{money(item.line_total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="confirm-totals-title" className="lx-account-card">
          <h2 className="lx-account-card__title" id="confirm-totals-title">Totals ({order.currency})</h2>
          <dl className="lx-account-rows">
            <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div><dt>Discounts</dt><dd>{money(order.discount_total)}</dd></div>
            <div><dt>Shipping</dt><dd>{money(order.shipping_total)}</dd></div>
            <div><dt>Tax</dt><dd>{money(order.tax_total)}</dd></div>
            <div className="is-total"><dt>Total</dt><dd>{money(order.grand_total)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="confirm-state-title" className="lx-account-card">
          <h2 className="lx-account-card__title" id="confirm-state-title">Status</h2>
          <p className="lx-account-note">
            Order state: <strong>{order.state.replace(/_/g, ' ')}</strong>. Settlement is confirmed by the payment
            provider&apos;s webhook — until then the order remains pending payment, and you will receive
            correspondence at {order.email}.
          </p>
        </section>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <Link href="/account/orders" className="btn-primary">View order history</Link>
          <Link href="/browse" className="btn-secondary">Continue browsing</Link>
          <Link href="/contact" className="btn-secondary">Contact the advisory desk</Link>
        </div>
      </div>
    </main>
  );
}
