/**
 * apps/web/src/app/(storefront)/checkout/confirmation/[orderId]/page.tsx
 *
 * `/checkout/confirmation/<orderId>` — the REAL order confirmation, rendered
 * strictly from the authoritative order read model (`GET /api/v1/orders/{id}`
 * served by the API process). The RENDERED payload is the reference applet's
 * confirmation page (its markup is honest by construction: the payment state
 * shows what the backend recorded — a freshly placed order is
 * PENDING_PAYMENT until the provider webhook reconciles it, never fabricated
 * as settled, and no surrogate order id is ever invented here).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  shipping_address: Record<string, string | null> | null;
  items: {
    id: string;
    sku_snapshot: string;
    title_snapshot: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
}

async function readOrder(orderId: string): Promise<OrderReadModel | null> {
  const response = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('The order could not be loaded.');
  }
  const body = (await response.json()) as { data?: OrderReadModel };
  return body.data ?? null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { orderId } = await params;
  try {
    const order = await readOrder(decodeURIComponent(orderId));
    if (!order) {
      return {
        title: 'Order Not Found',
        description: 'The requested order ID does not exist in our vault ledger.',
        robots: { index: false, follow: false },
      };
    }
    return {
      title: `Order ${order.order_number} (${order.state})`,
      description: `Server-authoritative order status for ${order.order_number}: ${order.state}.`,
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: 'Order confirmation | Maihan Gems',
      robots: { index: false, follow: false },
    };
  }
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;
  const order = await readOrder(decodeURIComponent(orderId));

  // Server-authoritative: 404 for unknown order IDs — never render a fabricated success
  if (!order) {
    notFound();
  }

  const isPending = order.state === 'PENDING_PAYMENT';

  // USD-envelope formatter for the order's own currency; the order snapshot
  // is the authority, nothing is derived here.
  const money = (amount: string): string =>
    Number(amount).toLocaleString('en-US', { style: 'currency', currency: order.currency, maximumFractionDigits: 2 });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DFD5] pb-6">
          <div>
            <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-[#9A7B2C]">
              AUTHORITATIVE ORDER LEDGER · {order.order_number}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#121211]">
              {isPending
                ? 'Order Recorded — Pending Payment Reconciliation'
                : 'Order Reconciled & Confirmed'}
            </h1>
          </div>

          <div
            data-testid="order-payment-status"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm border text-xs font-[family-name:var(--font-mono)] font-semibold ${
              isPending
                ? 'border-[#9A3412] bg-[#9A3412]/10 text-[#9A3412]'
                : 'border-[#166534] bg-[#166534]/10 text-[#166534]'
            }`}
          >
            {isPending ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {order.state}
          </div>
        </div>

        {/* Honest Status Banner */}
        <div className="rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-4 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[#D4AF37]" />
            <div>
              <p className="font-semibold text-[#E6C97A]">
                {isPending
                  ? 'Honest Reconciliation Notice: Payment is PENDING_PAYMENT'
                  : `Treasury Settlement Status: Payment is ${order.state}`}
              </p>
              <p className="text-[#C8C3B8] mt-1">
                Settlement is confirmed by the payment provider&apos;s webhook — until reconciliation this order
                stays {order.state.replace(/_/g, ' ').toLowerCase()} ; correspondence goes to {order.email}.
              </p>
            </div>
          </div>
        </div>

        {/* Order Line Items */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7B2C]">
            Reserved Vault Specimens
          </h2>
          <ul className="divide-y divide-[#E4DFD5] border-t border-b border-[#E4DFD5] text-xs">
            {order.items.map((item) => (
              <li key={item.id} className="py-3.5 flex justify-between items-center gap-4">
                <div>
                  <span className="font-[family-name:var(--font-mono)] text-[#9A7B2C] mr-2">
                    {item.sku_snapshot}
                  </span>
                  <span className="font-semibold text-[#121211]">{item.title_snapshot}</span>
                </div>
                <span className="font-[family-name:var(--font-mono)] tabular-nums font-semibold text-[#121211]">
                  {money(item.line_total)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Delivery & Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pt-2">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C] mb-1">
              DELIVERY DESTINATION
            </p>
            {order.shipping_address ? (
              <>
                <p className="font-semibold text-[#121211]">{order.shipping_address['full_name']}</p>
                <p className="text-[#4E4C47]">{order.shipping_address['line1']}</p>
                <p className="text-[#4E4C47]">
                  {order.shipping_address['postal_code']} {order.shipping_address['city']},{' '}
                  {order.shipping_address['country_code']}
                </p>
              </>
            ) : (
              <p className="text-[#4E4C47]">Not recorded.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Order State</span>
              <span className="font-[family-name:var(--font-mono)] text-[#121211]">
                {order.state}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Insured Courier</span>
              <span className="font-[family-name:var(--font-mono)] text-[#166534]">
                {money(order.shipping_total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Tax</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {money(order.tax_total)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E4DFD5] pt-2 text-sm font-semibold text-[#121211]">
              <span>Order Total</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">
                {money(order.grand_total)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E4DFD5] flex flex-wrap items-center gap-3">
          <Link
            href="/account/orders"
            className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Client Orders
          </Link>
          <Link
            href="/browse"
            className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-[#F7F5F0] text-[#121211] rounded-sm hover:bg-[#EFECE6]"
          >
            Explore Vault
          </Link>
          {/*
            The applet page had a third link pointing at a hard-coded
            reconciled fixture order (ORD-2026-8410). That order does not
            exist here, so the link is omitted rather than fabricated.
          */}
        </div>
      </div>
    </div>
  );
}
