import React from 'react';
import { StorefrontHeader } from '@/components/shell/StorefrontHeader';
import { StorefrontFooter } from '@/components/shell/StorefrontFooter';

export default function AccountCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] scroll-auto">
      <StorefrontHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <StorefrontFooter />
    </div>
  );
}
