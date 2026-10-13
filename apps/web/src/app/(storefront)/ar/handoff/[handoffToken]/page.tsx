import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createPool, redeemArHandoffToken } from '@maihan/db';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const metadata: Metadata = {
  title: 'AR Handoff | Maihan Gems',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ handoffToken: string }>;
}

function getDatabaseUrl(): string | undefined {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const envPath = resolve(process.cwd(), '../../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

export default async function ArHandoffPage({ params }: PageProps) {
  const { handoffToken } = await params;

  let targetAssetId: string | null = null;
  let redemptionError: string | null = null;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    try {
      const pool = createPool(dbUrl, { max: 1 });
      const session = await redeemArHandoffToken(pool, handoffToken);
      targetAssetId = session.webarAssetId;
    } catch (err: any) {
      redemptionError = err?.message || 'Token redemption failed.';
    }
  } else {
    redemptionError = 'Database unavailable.';
  }

  if (targetAssetId) {
    redirect(`/ar/${targetAssetId}`);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#08121E',
        color: '#FAFAF8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '440px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱⚡</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          AR Handoff Expired
        </h1>
        <p style={{ color: '#8A867E', lineHeight: 1.6, marginBottom: '2rem' }}>
          {redemptionError?.includes('AR_HANDOFF_REPLAYED')
            ? 'This QR handoff code has already been redeemed. Each mobile transfer code is single-use for your security.'
            : 'This transfer link is invalid or has expired (handoff codes expire in 10 minutes).'}
        </p>
        <a
          href="/"
          style={{
            backgroundColor: '#C9A84C',
            color: '#FFFFFF',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Return to Atelier
        </a>
      </div>
    </main>
  );
}
