'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { useMergedBag, type MghBagItem } from '@/lib/mgh/adapters/commerce';

export function CartPageClient() {
  const bag = useMergedBag();
  const { formatPrice } = useStorefront();
  const cart = bag.items;
  const cartTotal = bag.subtotal;

  if (bag.loading && cart.length === 0) {
    return (
      <div className="portal-card portal-card--pad" style={{ minHeight: 220 }}>
        <div className="portal-empty">
          <div className="portal-empty__mark"><ShieldCheck /></div>
          <p className="portal-empty__title">Opening your tray</p>
          <p className="portal-empty__sub">The vault is gathering your selection.</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="portal-card portal-empty">
        <div className="portal-empty__mark"><ShieldCheck /></div>
        <p className="portal-empty__title">Your vault tray is empty</p>
        <p className="portal-empty__sub">Browse the vault or begin a design of your own.</p>
        <div className="portal-inline" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link href="/browse" className="portal-btn portal-btn--gold">Browse gemstones</Link>
          <Link href="/design-your-own" className="portal-btn portal-btn--ghost">Atelier DYO</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <section className="portal-card portal-card--pad">
        <header className="portal-card__head">
          <div>
            <h2 className="portal-card__title">Your selection</h2>
            <p className="portal-card__sub">{cart.length} piece(s) held in the tray</p>
          </div>
          <button
            type="button"
            onClick={() => void bag.clearTray()}
            className="portal-btn portal-btn--ghost portal-btn--sm"
          >
            Empty tray
          </button>
        </header>

        <div className="checkout-stack">
          {cart.map((item: MghBagItem) => (
            <div key={item.serverItemId ?? item.id} className="checkout-item" style={{ alignItems: 'flex-start' }}>
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={item.image || '/mgh/images/gems/tanzanite-gem.jpg'}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="h-20 w-24 rounded-xl object-cover shrink-0"
                  style={{ background: 'var(--p-well-solid)', border: '1px solid var(--p-line)' }}
                />
                <div className="min-w-0">
                  <p className="checkout-item__sub">{item.sku} · {item.kind.toUpperCase()}</p>
                  <p className="checkout-item__name" style={{ marginTop: 2 }}>{item.name}</p>
                  {item.subtitle ? <p className="checkout-item__sub">{item.subtitle}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="checkout-item__amount">{formatPrice(item.price * item.quantity)}</p>
                <button
                  type="button"
                  onClick={() => void bag.removeItem(item)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="portal-btn portal-btn--danger portal-btn--icon portal-btn--sm"
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="client-note" style={{ marginTop: 14 }}>
          Fixed specimen pricing · insured dispatch arranged by the atelier.
        </p>
      </section>

      <aside className="portal-card portal-card--pad checkout-summary">
        <header className="portal-card__head">
          <div>
            <h2 className="portal-card__title">Dispatch summary</h2>
            <p className="portal-card__sub">Before settlement and address</p>
          </div>
        </header>

        <div className="checkout-totals">
          <div className="checkout-total-row"><span>Specimens subtotal</span><span>{formatPrice(cartTotal)}</span></div>
          <div className="checkout-total-row"><span>Armoured courier</span><span>Included</span></div>
          <div className="checkout-total-row checkout-total-row--grand"><span>Settlement total</span><span>{formatPrice(cartTotal)}</span></div>
        </div>

        <Link href="/checkout/order-summary" className="portal-btn portal-btn--gold w-full" style={{ marginTop: 14 }}>
          Proceed to checkout <ArrowRight />
        </Link>

        <div className="checkout-security" style={{ marginTop: 12 }}>
          <ShieldCheck />
          <span>14-day sealed return privilege. Your stones are reserved only after the order is placed.</span>
        </div>
      </aside>
    </div>
  );
}
