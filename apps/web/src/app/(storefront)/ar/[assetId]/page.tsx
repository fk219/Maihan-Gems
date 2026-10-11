import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WebAR Experience | Maihan Gems',
  robots: { index: false, follow: false },
};

import { ArClientView } from '../../../../components/webar/ArClientView.js';

interface PageProps {
  params: Promise<{ assetId: string }>;
}

export default async function ArViewerPage({ params }: PageProps) {
  const { assetId } = await params;

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#09090b',
        color: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ArClientView assetId={assetId} />
    </main>
  );
}
