import React from 'react';
import { StorefrontHeader } from '@/components/shell/StorefrontHeader';
import { StorefrontFooter } from '@/components/shell/StorefrontFooter';
import { StorefrontMotionWrapper } from '@/components/shell/StorefrontMotionWrapper';
import { ScrollToTopButton } from '@/components/shell/ScrollToTopButton';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col golden-cloud-gallery">
      <StorefrontHeader />
      <StorefrontMotionWrapper />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <ScrollToTopButton />
      <StorefrontFooter />
    </div>
  );
}
