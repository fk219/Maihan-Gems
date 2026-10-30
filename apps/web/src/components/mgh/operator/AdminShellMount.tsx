'use client';

import dynamic from 'next/dynamic';

const AdminConsoleApp = dynamic(() => import('./AdminConsoleApp'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#FAF8F4]" />,
});

export default function AdminShellMount() {
  return <AdminConsoleApp />;
}
