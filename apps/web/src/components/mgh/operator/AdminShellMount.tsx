'use client';

import dynamic from 'next/dynamic';

const AdminConsoleApp = dynamic(() => import('./AdminConsoleApp'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#F4F2EE]" />,
});

export default function AdminShellMount() {
  return <AdminConsoleApp />;
}
