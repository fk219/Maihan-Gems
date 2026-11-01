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
import { cookies } from 'next/headers';

import { SITE_URL } from '@/lib/mgh/site-url';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

const statusLabel = (status: string) => status.replaceAll('_', ' ').toLowerCase();

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string }>;
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

async function readOrder(orderNumber: string, accessToken?: string | null): Promise<FreshOrder | null> {
  try {
    const session = (await cookies()).get('maihan_customer_session')?.value;
    const qs = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const res = await fetch(`${FRESH_API_URL}/api/v1/orders/${encodeURIComponent(orderNumber)}${qs}`, {
      cache: 'no-store',
      headers: session ? { authorization: `Bearer ${session}` } : {},
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('order read failed');
    return (await res.json()) as FreshOrder;
  } catch {
    throw new Error('The order could not be loaded.');
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { orderId } = await params;
  const token = (await searchParams)?.token ?? null;
  try {
    const order = await readOrder(decodeURIComponent(orderId), token);
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

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const token = (await searchParams)?.token ?? null;
  const order = await readOrder(decodeURIComponent(orderId), token);
  if (!order) notFound();

  const isPending = order.status === 'PENDING_PAYMENT';
  const money = (amount: string): string =>
    Number(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: order.currency,
      maximumFractionDigits: 2,
    });

  return (
    <div className="portal-section" style={{ maxWidth: 980, margin: '0 auto' }}>
      <div className="portal-top__where">
        <span>Order ledger</span>
        <span aria-hidden="true">/</span>
        <b>{order.order_number}</b>
      </div>

      <div className="portal-card portal-card--pad">
        <div className="portal-detail__head">
          <div>
            <p className="portal-kicker">Order ledger · {order.order_number}</p>
            <h1 className="portal-page-title">{isPending ? 'Order recorded — pending payment' : 'Order confirmed'}</h1>
            <p className="portal-page-sub">
              Placed {new Date(order.placed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {order.email ? ` · correspondence to ${order.email}` : ''}
            </p>
          </div>
          <span
            data-testid="order-payment-status"
            className={isPending ? 'portal-badge portal-badge--pending' : 'portal-badge portal-badge--active'}
          >
            {isPending ? <Clock style={{ width: 12, height: 12 }} /> : <CheckCircle2 style={{ width: 12, height: 12 }} />}
            {statusLabel(order.status)}
          </span>
        </div>

        <div className="checkout-security" style={{ marginTop: 16 }}>
          <ShieldAlert />
          <span>
            <b>{isPending ? 'Payment is pending — this is the live ledger state.' : `Payment is ${statusLabel(order.status)}.`}</b>{' '}
            {isPending
              ? 'The order is recorded and your items are reserved. Settlement is confirmed by the payment provider; this page always shows what the ledger records.'
              : 'This order has been settled in the ledger. Keep this reference for correspondence with the atelier.'}
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          <p className="portal-label">Reserved vault specimens</p>
          <div className="checkout-stack">
            {order.items.map((item, index) => (
              <div key={`${item.code_snapshot}-${index}`} className="checkout-item">
                <div>
                  <p className="checkout-item__name">{item.description}</p>
                  <p className="checkout-item__sub">{item.code_snapshot} · qty {item.quantity}</p>
                </div>
                <p className="checkout-item__amount">{money(item.line_total)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="client-split" style={{ marginTop: 18 }}>
          <div>
            <p className="portal-label">Delivery destination</p>
            {order.shipping_address ? (
              <div className="client-list__item" style={{ display: 'block' }}>
                <span className="client-list__title">{order.shipping_address['recipient'] ?? '—'}</span>
                <span className="client-list__sub">{order.shipping_address['line1']}</span>
                {order.shipping_address['line2'] ? <span className="client-list__sub">{order.shipping_address['line2']}</span> : null}
                <span className="client-list__sub">{order.shipping_address['postal_code']} {order.shipping_address['city']}, {order.shipping_address['country']}</span>
              </div>
            ) : (
              <p className="portal-note">Not recorded.</p>
            )}
            {order.customer_note ? <p className="portal-note" style={{ marginTop: 10 }}>“{order.customer_note}”</p> : null}
          </div>

          <div className="checkout-totals">
            <div className="checkout-total-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            {Number(order.discount) > 0 ? <div className="checkout-total-row"><span>Discount</span><span>−{money(order.discount)}</span></div> : null}
            <div className="checkout-total-row"><span>Insured courier</span><span>{money(order.shipping)}</span></div>
            <div className="checkout-total-row"><span>Tax</span><span>{money(order.tax)}</span></div>
            <div className="checkout-total-row checkout-total-row--grand"><span>Order total</span><span>{money(order.grand_total)}</span></div>
          </div>
        </div>

        {order.events.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <p className="portal-label">Ledger events</p>
            <div className="client-list">
              {order.events.map((event, index) => (
                <div key={`${event.event}-${index}`} className="client-list__item" style={{ padding: '9px 12px' }}>
                  <span className="client-list__title">{event.event}</span>
                  <span className="client-list__sub">{new Date(event.created_at).toLocaleString('en-GB')}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="portal-inline" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--p-line)' }}>
          <Link href="/browse" className="portal-btn portal-btn--gold">Continue exploring</Link>
          <Link href="/contact" className="portal-btn portal-btn--ghost">Contact the atelier</Link>
        </div>
      </div>
    </div>
  );
}
