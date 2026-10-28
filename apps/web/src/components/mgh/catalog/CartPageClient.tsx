'use client';

import Link from 'next/link';
import { Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { useMergedBag, type MghBagItem } from '@/lib/mgh/adapters/commerce';

/**
 * M4 — the reference cart page over the repo's REAL commerce seam.
 *
 * Markup is the reference applet's own (M1 copy). DATA SEAM only: the tray
 * renders the MERGED bag — the applet provider's localStorage bag merged
 * into the authoritative real server cart (`useMergedBag`) — and its
 * "Empty Bag"/remove actions mutate the real cart API exactly the replaced
 * BagView did.
 */
export function CartPageClient() {
  const bag = useMergedBag();
  const { formatPrice } = useStorefront();
  const cart = bag.items;
  const cartTotal = bag.subtotal;

  if (bag.loading && cart.length === 0) {
    return <p aria-busy="true" className="text-xs text-[#4E4C47] font-[family-name:var(--font-mono)]">Loading your vault tray…</p>;
  }

  if (cart.length === 0) {
    return (
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-12 text-center space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
          Your vault tray is empty.
        </h2>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/browse"
            className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Browse Gemstones
          </Link>
          <Link
            href="/design-your-own"
            className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
          >
            Atelier DYO
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 rounded-sm border border-[#E4DFD5] bg-white divide-y divide-[#E4DFD5]">
        {cart.map((item: MghBagItem) => (
          <div key={item.serverItemId ?? item.id} className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={item.image || '/mgh/images/gems/tanzanite-gem.jpg'}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="h-20 w-24 rounded-sm border border-[#E4DFD5] bg-[#EFECE6] object-cover shrink-0"
              />
              <div>
                <p className="text-[11px] font-[family-name:var(--font-mono)] text-[#9A7B2C]">
                  {item.sku} · {item.kind.toUpperCase()}
                </p>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#121211]">
                  {item.name}
                </h3>
                {item.subtitle ? <p className="text-xs text-[#4E4C47] mt-0.5">{item.subtitle}</p> : null}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-base font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {formatPrice(item.price * item.quantity)}
              </span>
              <button
                type="button"
                onClick={() => void bag.removeItem(item)}
                aria-label={`Remove ${item.name} from cart`}
                className="p-2 text-[#76726A] hover:text-[#991B1B]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <div className="p-4 bg-[#F7F5F0] flex justify-between items-center text-xs">
          <span className="text-[#4E4C47] font-[family-name:var(--font-mono)]">
            Fixed specimen pricing · Geneva Vault
          </span>
          <button
            type="button"
            onClick={() => void bag.clearTray()}
            className="text-[#991B1B] underline font-[family-name:var(--font-mono)] uppercase tracking-wider text-[11px]"
          >
            Empty Bag
          </button>
        </div>
      </div>

      <aside className="lg:col-span-4 rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-6 space-y-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white border-b border-white/10 pb-3">
          Dispatch Summary
        </h2>

        <dl className="space-y-2.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-[#C8C3B8]">Specimens Subtotal</dt>
            <dd className="font-[family-name:var(--font-mono)] tabular-nums text-white">
              {formatPrice(cartTotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#C8C3B8]">Armoured Malca-Amit Courier</dt>
            <dd className="font-[family-name:var(--font-mono)] text-[#E6C97A]">Included</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-sm font-semibold text-[#E6C97A]">
            <dt>Settlement Total</dt>
            <dd className="font-[family-name:var(--font-mono)] tabular-nums">
              {formatPrice(cartTotal)}
            </dd>
          </div>
        </dl>

        <Link
          href="/checkout/order-summary"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm transition-all"
        >
          Proceed to Checkout
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="flex items-start gap-2 text-xs text-[#C8C3B8] pt-2 border-t border-white/10">
          <ShieldCheck className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <span>14-day sealed return privilege.</span>
        </div>
      </aside>
    </div>
  );
}
