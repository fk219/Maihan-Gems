/**
 * `/checkout/confirmation/<orderNumber>` — the authoritative order confirmation,
 * rendered strictly from the fresh-api order read model
 * (`GET /api/v1/orders/{order_number}`). Nothing is fabricated here: a freshly
 * placed order stays PENDING_PAYMENT until the payment step settles it.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

import { SITE_URL } from '@/lib/mgh/site-url';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

interface FreshOrder {
  order_number: string;
  email: string;
  status: string;
  currency: string;
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  grand_total: string;
  shipping_address: Record<string, string | null> | null;
  customer_note: string | null;
  placed_at: string;
  paid_at: string | null;
  items: Array<{
    description: string;
    code_snapshot: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }>;
  events: Array<{ event: string; created_at: string }>;
}

async function readOrder(orderNumber: string): Promise<FreshOrder | null> {
  try {
    const res = await fetch(`${FRESH_API_URL}/api/v1/orders/${encodeURIComponent(orderNumber)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('order read failed');
    return (await res.json()) as FreshOrder;
  } catch {
    throw new Error('The order could not be loaded.');
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params;
  try {
    const order = await readOrder(decodeURIComponent(orderId));
    if (!order) {
      return { title: 'Order Not Found', robots: { index: false, follow: false } };
    }
    return {
      title: `Order ${order.order_number} (${order.status})`,
      description: `Server-authoritative order status for ${order.order_number}: ${order.status}.`,
      robots: { index: false, follow: false },
      alternates: { canonical: `${SITE_URL}/checkout/confirmation/${order.order_number}` },
    };
  } catch {
    return { title: 'Order confirmation | Maihan Gems', robots: { index: false, follow: false } };
  }
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;
  const order = await readOrder(decodeURIComponent(orderId));
  if (!order) notFound();

  const isPending = order.status === 'PENDING_PAYMENT';
  const money = (amount: string): string =>
    Number(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: order.currency,
      maximumFractionDigits: 2,
    });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DFD5] pb-6">
          <div>
            <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-[#9A7B2C]">
              ORDER LEDGER · {order.order_number}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#121211]">
              {isPending ? 'Order Recorded — Pending Payment' : 'Order Confirmed'}
            </h1>
            <p className="mt-1 text-xs font-[family-name:var(--font-eb-garamond)] text-[#4E4C47]">
              Placed {new Date(order.placed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {order.email ? ` · correspondence to ${order.email}` : ''}
            </p>
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
            {order.status}
          </div>
        </div>

        <div className="rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-4 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[#D4AF37]" />
            <div>
              <p className="font-semibold text-[#E6C97A]">
                {isPending
                  ? 'Payment is pending — this is the live ledger state.'
                  : `Payment is ${order.status}.`}
              </p>
              <p className="text-[#C8C3B8] mt-1">
                {isPending
                  ? 'The order is recorded and your items are reserved. Settlement is confirmed by the payment provider; this page always shows what the ledger records.'
                  : 'This order has been settled in the ledger. Keep this reference for correspondence with the atelier.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7B2C]">
            Reserved Vault Specimens
          </h2>
          <ul className="divide-y divide-[#E4DFD5] border-t border-b border-[#E4DFD5] text-xs">
            {order.items.map((item, i) => (
              <li key={`${item.code_snapshot}-${i}`} className="py-3.5 flex justify-between items-center gap-4">
                <div>
                  <span className="font-[family-name:var(--font-mono)] text-[#9A7B2C] mr-2">
                    {item.code_snapshot}
                  </span>
                  <span className="font-semibold text-[#121211]">{item.description}</span>
                  <span className="text-[#76726A] ml-2">× {item.quantity}</span>
                </div>
                <span className="font-[family-name:var(--font-mono)] tabular-nums font-semibold text-[#121211]">
                  {money(item.line_total)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pt-2">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C] mb-1">
              DELIVERY DESTINATION
            </p>
            {order.shipping_address ? (
              <>
                <p className="font-semibold text-[#121211]">
                  {order.shipping_address['recipient'] ?? '—'}
                </p>
                <p className="text-[#4E4C47]">{order.shipping_address['line1']}</p>
                {order.shipping_address['line2'] ? (
                  <p className="text-[#4E4C47]">{order.shipping_address['line2']}</p>
                ) : null}
                <p className="text-[#4E4C47]">
                  {order.shipping_address['postal_code']} {order.shipping_address['city']},{' '}
                  {order.shipping_address['country']}
                </p>
              </>
            ) : (
              <p className="text-[#4E4C47]">Not recorded.</p>
            )}
            {order.customer_note ? (
              <p className="mt-3 text-[#4E4C47] italic">“{order.customer_note}”</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Subtotal</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">{money(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 ? (
              <div className="flex justify-between">
                <span className="text-[#4E4C47]">Discount</span>
                <span className="font-[family-name:var(--font-mono)] tabular-nums text-[#166534]">−{money(order.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Insured courier</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums text-[#166534]">{money(order.shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4E4C47]">Tax</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">{money(order.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-[#E4DFD5] pt-2 text-sm font-semibold text-[#121211]">
              <span>Order Total</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">{money(order.grand_total)}</span>
            </div>
          </div>
        </div>

        {order.events.length > 0 ? (
          <div className="pt-2">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C] mb-2">
              LEDGER EVENTS
            </p>
            <ul className="space-y-1 text-[11px] font-[family-name:var(--font-mono)] text-[#4E4C47]">
              {order.events.map((e, i) => (
                <li key={`${e.event}-${i}`}>
                  {e.event} · {new Date(e.created_at).toLocaleString('en-GB')}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="pt-4 border-t border-[#E4DFD5] flex flex-wrap items-center gap-3">
          <Link
            href="/browse"
            className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Continue Exploring
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-[#F7F5F0] text-[#121211] rounded-sm hover:bg-[#EFECE6]"
          >
            Contact the Atelier
          </Link>
        </div>
      </div>
    </div>
  );
}
