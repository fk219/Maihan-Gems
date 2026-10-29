'use client';

import dynamic from 'next/dynamic';

const AdminConsoleFresh = dynamic(() => import('./AdminConsoleFresh'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0A0A0B]" />,
});

export default function AdminShellMount() {
  return <AdminConsoleFresh />;
}
