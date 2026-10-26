import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getOrderById, formatUsd } from '@/lib/storefront-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;
  const order = getOrderById(decodeURIComponent(orderId));
  if (!order) {
    return {
      title: 'Order Not Found',
      description: 'The requested order ID does not exist in our vault ledger.',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Order ${order.orderId} (${order.paymentStatus})`,
    description: `Server-authoritative order status for ${order.orderId}: ${order.paymentStatus}.`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = getOrderById(decodeURIComponent(orderId));

  // Server-authoritative: 404 for unknown order IDs — never render a fabricated success
  if (!order) {
    notFound();
  }

  const isPending = order.paymentStatus === 'PENDING_PAYMENT';

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DFD5] pb-6">
          <div>
            <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-[#9A7B2C]">
              AUTHORITATIVE ORDER LEDGER · {order.orderId}
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
            {order.paymentStatus}
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
                  : 'Treasury Settlement Verified: Payment is RECONCILED_PAID'}
              </p>
              <p className="text-[#C8C3B8] mt-1">{order.paymentProviderNote}</p>
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
                    {item.sku}
                  </span>
                  <span className="font-semibold text-[#121211]">{item.title}</span>
                  <p className="text-[#4E4C47] mt-0.5">{item.subtitle}</p>
                </div>
                <span className="font-[family-name:var(--font-mono)] tabular-nums font-semibold text-[#121211]">
                  {formatUsd(item.price * item.quantity)}
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
            <p className="font-semibold text-[#121211]">{order.shippingAddress.recipient}</p>
            <p className="text-[#4E4C47]">{order.shippingAddress.line1}</p>
            <p className="text-[#4E4C47]">
              {order.shippingAddress.postalCode} {order.shippingAddress.city},{' '}
              {order.shippingAddress.country}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Fulfillment State</span>
              <span className="font-[family-name:var(--font-mono)] text-[#121211]">
                {order.fulfillmentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Insured Courier</span>
              <span className="font-[family-name:var(--font-mono)] text-[#166534]">Included</span>
            </div>
            <div className="flex justify-between border-t border-[#E4DFD5] pt-2 text-sm font-semibold text-[#121211]">
              <span>Order Total</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">
                {formatUsd(order.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E4DFD5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
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
          </div>

          <Link
            href="/checkout/confirmation/ORD-2026-8410"
            className="text-xs font-[family-name:var(--font-mono)] text-[#9A7B2C] underline"
          >
            Reconciled Example (ORD-2026-8410) →
          </Link>
        </div>
      </div>
    </div>
  );
}
