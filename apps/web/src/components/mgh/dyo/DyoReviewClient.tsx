'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { formatUsd } from '@/lib/mgh/storefront-data';

export function DyoReviewAddToCartButton({
  configurationCode,
  stoneName,
  settingName,
  metalLabel,
  ringSize,
  totalPrice,
  image,
}: {
  configurationCode: string;
  stoneName: string;
  settingName: string;
  metalLabel: string;
  ringSize: string;
  totalPrice: number;
  image: string;
}) {
  const { addToCart } = useStorefront();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() =>
          addToCart({
            id: `DYO-${configurationCode}`,
            sku: configurationCode,
            slug: `design-your-own/review/${configurationCode}`,
            name: `Bespoke Commission: ${stoneName} in ${settingName}`,
            subtitle: `${metalLabel} · Size ${ringSize} · Code ${configurationCode}`,
            price: totalPrice,
            image,
            kind: 'dyo',
            configurationCode,
          })
        }
        className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm transition-all"
      >
        <ShoppingBag className="h-4 w-4" />
        Acquire Commission ({formatUsd(totalPrice)})
      </button>

      <Link
        href="/design-your-own"
        className="inline-flex items-center gap-1.5 px-4 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#121211] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Modify
      </Link>
    </div>
  );
}
