'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';

export default function CartDrawer() {
  const { cart, isCartOpen, setCartOpen, removeFromCart, cartTotal, formatPrice } = useStorefront();

  useEffect(() => {
    if (!isCartOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCartOpen, setCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Vault Selection Drawer"
    >
      <div className="fixed inset-0" onClick={() => setCartOpen(false)} aria-hidden="true" />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#F7F5F0] border-l border-[#D4AF37]/30 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E4DFD5] bg-[#0A0A0B] text-white px-6 py-5">
          <div>
            <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#D4AF37]">
              GENEVA VAULT TRAY
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Vault Selection ({cart.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close vault selection drawer"
            className="p-2 text-[#C8C3B8] hover:text-white rounded-sm"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <div className="py-14 text-center space-y-4">
              <p className="font-[family-name:var(--font-display)] text-2xl text-[#121211]">
                Your vault tray is empty.
              </p>
              <p className="text-xs text-[#4E4C47] max-w-xs mx-auto">
                Select a certified loose specimen or configure a bespoke setting.
              </p>
              <div className="pt-3 flex flex-col gap-2.5">
                <Link
                  href="/browse"
                  onClick={() => setCartOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold bg-[#0A0A0B] text-[#E6C97A] rounded-sm hover:bg-[#1A1A1D] transition-colors"
                >
                  Explore Gemstones
                </Link>
                <Link
                  href="/design-your-own"
                  onClick={() => setCartOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] text-[#121211] bg-white rounded-sm hover:bg-[#EFECE6] transition-colors"
                >
                  Atelier Configurator
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[#E4DFD5]">
              {cart.map((item) => (
                <li key={item.id} className="py-4 flex gap-4 items-start">
                  <img
                    src={item.image || '/mgh/images/gems/tanzanite-gem.jpg'}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="h-16 w-20 rounded-sm border border-[#E4DFD5] bg-[#EFECE6] object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-[family-name:var(--font-mono)] text-[#76726A]">
                      {item.sku}
                    </p>
                    <p className="text-sm font-medium text-[#121211] truncate">{item.name}</p>
                    <p className="text-xs text-[#4E4C47] mt-0.5">{item.subtitle}</p>
                    <p className="text-sm font-[family-name:var(--font-mono)] tabular-nums font-semibold text-[#121211] mt-1.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                    className="p-1.5 text-[#76726A] hover:text-[#991B1B] rounded-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[#E4DFD5] bg-white px-6 py-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#4E4C47]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#9A7B2C]" />
                Armoured Malca-Amit Dispatch
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[#121211]">Included</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-[#E4DFD5] pt-3">
              <span className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#4E4C47]">
                Vault Total
              </span>
              <span className="text-lg font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {formatPrice(cartTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/cart"
                onClick={() => setCartOpen(false)}
                className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] text-[#121211] bg-[#F7F5F0] rounded-sm hover:bg-[#EFECE6] transition-colors whitespace-nowrap"
              >
                View Bag
              </Link>
              <Link
                href="/checkout/order-summary"
                onClick={() => setCartOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm transition-all whitespace-nowrap"
              >
                Checkout
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
