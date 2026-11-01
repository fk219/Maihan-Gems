'use client';

import dynamic from 'next/dynamic';

const VendorPortalApp = dynamic(() => import('./VendorPortalApp'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#F4F2EE]" />,
});

export default function VendorShellMount() {
  return <VendorPortalApp />;
}
