/**
 * Shopping Cart Page
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shopping Cart | Maihan Gems',
  description: 'Review your selected items',
};

const PLACEHOLDER_CART_ITEMS = [
  {
    id: '1',
    productId: 'sap-001',
    title: '3.42 Carat Vivid Royal Blue Ceylon Sapphire',
    variant: 'Natural Unheated',
    price: 48500,
    quantity: 1,
    image: '/assets/gemstones/sapphire.svg',
  },
];

export default function CartPage() {
  const subtotal = PLACEHOLDER_CART_ITEMS.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% VAT
  const total = subtotal + tax;

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <h1 className="font-serif text-4xl font-medium text-[#1A1A18] mb-8">
          Shopping <span className="text-[#C9A84C]">Cart</span>
        </h1>

        {PLACEHOLDER_CART_ITEMS.length === 0 ? (
          <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-12 text-center">
            <p className="text-[15px] text-[#4A4740] mb-6">Your cart is empty</p>
            <Link
              href="/browse"
              className="inline-flex items-center px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {PLACEHOLDER_CART_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 flex gap-6"
                  >
                    <div className="w-32 h-32 bg-[#F7F7F5] rounded-[8px] flex items-center justify-center p-4 flex-shrink-0">
                      <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-serif text-xl font-medium text-[#1A1A18] mb-2">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-[#8A867E] mb-4">{item.variant}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <label className="text-[13px] text-[#4A4740]">Qty:</label>
                          <select className="px-3 py-1.5 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px]">
                            <option>{item.quantity}</option>
                          </select>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-mono text-lg font-semibold text-[#1A1A18] tabular-nums">
                            USD {item.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button className="text-[#8A867E] hover:text-[#DC2626] transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 sticky top-24">
                <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-6">
                  Order Summary
                </h2>
                
                <dl className="space-y-3 mb-6">
                  <div className="flex justify-between text-[14px]">
                    <dt className="text-[#4A4740]">Subtotal</dt>
                    <dd className="font-mono font-medium text-[#1A1A18] tabular-nums">
                      USD {subtotal.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <dt className="text-[#4A4740]">VAT (5%)</dt>
                    <dd className="font-mono font-medium text-[#1A1A18] tabular-nums">
                      USD {tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <dt className="text-[#4A4740]">Shipping</dt>
                    <dd className="font-medium text-[#10B981]">Free</dd>
                  </div>
                  <div className="pt-3 border-t border-[rgba(0,0,0,0.05)] flex justify-between">
                    <dt className="font-semibold text-[15px] text-[#1A1A18]">Total</dt>
                    <dd className="font-mono font-bold text-xl text-[#1A1A18] tabular-nums">
                      USD {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                </dl>
                
                <button className="w-full px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 hover:-translate-y-0.5 transition-all mb-3">
                  Proceed to Checkout
                </button>
                
                <Link
                  href="/browse"
                  className="block w-full px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1A1A18] bg-white border border-[rgba(201,168,76,0.3)] rounded-[12px] hover:bg-[rgba(201,168,76,0.04)] hover:border-[#C9A84C] transition-all text-center"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
