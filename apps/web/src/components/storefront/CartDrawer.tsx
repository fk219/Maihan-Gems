'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getBag, subscribeAtelier, type AtelierItem } from '../../lib/atelier-store.js';
import { convertAmount } from '../../lib/currency.js';
import SmoothDrawer from '../ui/smooth-drawer.js';
import { useStorefront } from './StorefrontProvider.js';

export function CartDrawer() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { currency, rates } = useStorefront();
  const [items, setItems] = useState<AtelierItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setItems(getBag());
    sync();
    const off = subscribeAtelier(sync);
    const openBag = () => setOpen(true);
    window.addEventListener('maihan-open-bag', openBag);
    return () => {
      off();
      window.removeEventListener('maihan-open-bag', openBag);
    };
  }, []);

  if (pathname.startsWith('/checkout') || pathname.startsWith('/cart')) return null;

  return (
    <div className="cloth-bag-host">
      <SmoothDrawer
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        title="The bag"
        description={items.length === 0 ? 'Nothing is held yet.' : undefined}
        currency={currency}
        taxRate={0}
        confirmLabel="Review the bag"
        items={items.map((item) => ({
          id: item.id,
          name: item.title,
          detail: `${item.quantity ?? 1} held`,
          price: convertAmount(item.priceUsd, currency, rates),
          quantity: item.quantity ?? 1,
        }))}
        onConfirm={() => router.push('/cart')}
      />
    </div>
  );
}
