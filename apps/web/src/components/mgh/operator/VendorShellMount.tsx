'use client';

import dynamic from 'next/dynamic';

const VendorConsoleFresh = dynamic(() => import('./VendorConsoleFresh'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0A0A0B]" />,
});

export default function VendorShellMount() {
  return <VendorConsoleFresh />;
}
