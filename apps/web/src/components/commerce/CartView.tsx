'use client';

/**
 * apps/web/src/components/commerce/CartView.tsx
 *
 * Storefront shopping bag interface.
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 6
 *   - Design.md (Silk & Stone Haute Couture luxury design system)
 */
import { useEffect, useState } from 'react';

interface CartItem {
  id: string;
  productId: string;
  title: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCart = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('maihan_cart_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/cart', {
          headers: { 'x-cart-token': token },
        });
        if (res.ok) {
          const data = await res.json();
          const cartItems = data?.data?.cart?.items || [];
          setItems(cartItems);
        }
      } catch {
        // Test/offline environment default
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);

  if (loading) {
    return (
      <div className="cart-container text-center py-16" aria-busy="true">
        <div className="font-mono text-xs uppercase tracking-widest text-[#8A867E]">
          Loading Atelier Bag...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-container text-center py-20">
        <span className="eyebrow block mb-3">Atelier Shopping Bag</span>
        <h2 className="font-serif text-3xl font-medium text-[#1A1A18] mb-4">
          Your Shopping Bag is Empty
        </h2>
        <p className="text-sm text-[#4A4740] max-w-md mx-auto mb-8 leading-relaxed">
          Explore our vault of certified unheated natural gemstones or commission a bespoke mounting in the configurator.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="/design-your-own"
            className="px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 transition-all"
          >
            Design Your Own Piece
          </a>
          <a
            href="/"
            className="px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1A1A18] bg-white border border-[rgba(201,168,76,0.3)] rounded-[12px] hover:border-[#C9A84C] transition-all"
          >
            Explore Gemstones
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <header className="dyo-header mb-8">
        <span className="eyebrow block mb-2">Acquisition Bag</span>
        <h1 className="font-serif text-3xl font-medium text-[#1A1A18]">Your Atelier Bag</h1>
      </header>

      <div className="bg-white border border-[rgba(201,168,76,0.15)] rounded-[12px] p-6 shadow-sm mb-8">
        <table className="cart-items-table">
          <thead>
            <tr>
              <th scope="col">Piece Description</th>
              <th scope="col" className="text-center">Qty</th>
              <th scope="col" className="text-right">Investment</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="font-serif text-lg font-medium text-[#1A1A18]">{item.title}</div>
                  <div className="text-xs font-mono text-[#8A867E]">SKU: {item.sku}</div>
                </td>
                <td className="text-center font-mono text-sm text-[#1A1A18]">{item.quantity}</td>
                <td className="text-right font-mono text-sm font-semibold text-[#1A1A18]">
                  {formatPrice(item.unitPriceCents * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-[rgba(0,0,0,0.06)] pt-6 space-y-3">
          <div className="flex justify-between text-sm text-[#4A4740]">
            <span>Armored Global Delivery (Brinks / Malca-Amit)</span>
            <span className="font-mono text-[#1A1A18]">Complimentary</span>
          </div>
          <div className="flex justify-between text-sm text-[#4A4740]">
            <span>Laboratory Documentation &amp; Appraisal Certificate</span>
            <span className="font-mono text-[#1A1A18]">Included</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.06)]">
            <span className="font-serif text-xl font-medium text-[#1A1A18]">Total Investment</span>
            <span className="font-mono text-2xl font-semibold text-[#8B6914]">{formatPrice(subtotalCents)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <a
          href="/design-your-own"
          className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#8A867E] hover:text-[#C9A84C] transition-colors"
        >
          ← Continue Designing
        </a>

        <a
          href="/checkout/payment-order"
          className="px-8 py-4 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 transition-all text-center"
        >
          Proceed to Secure Checkout →
        </a>
      </div>
    </div>
  );
}
