'use client';

/**
 * apps/web/src/components/webar/ArClientView.tsx
 *
 * Full-screen isolated WebAR Try-On client view.
 * Dynamically fetches asset metadata and presents ThreeDViewer + WebAR modal.
 */

import { useEffect, useState } from 'react';
import type { WebarAssetReadModel } from '@maihan/contracts';
import { WebArLauncher } from './WebArLauncher.js';

export function ArClientView({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<WebarAssetReadModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAsset() {
      try {
        const res = await fetch(`/api/v1/webar/${assetId}`);
        if (!res.ok) {
          throw new Error('WebAR 3D Model not found or unavailable.');
        }
        const json = await res.json();
        if (active) {
          setAsset(json.data);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load AR asset.');
          setLoading(false);
        }
      }
    }

    loadAsset();

    return () => {
      active = false;
    };
  }, [assetId]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4af37',
        }}
      >
        <span>Retrieving 3D Model Specification...</span>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div
        style={{
          padding: '3rem 1.5rem',
          maxWidth: '540px',
          margin: 'auto',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#fafafa', marginBottom: '0.75rem' }}>3D Asset Unavailable</h2>
        <p style={{ color: '#a1a1aa', lineHeight: 1.6, marginBottom: '2rem' }}>
          {error || 'This gemstone or setting does not currently have an approved 3D model.'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#d4af37',
            color: '#09090b',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Return to Atelier
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '1.5rem',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#fafafa' }}>
            Maihan Atelier AR
          </h1>
          <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
            Interactive 3D &amp; Augmented Reality Try-On
          </span>
        </div>
        <a
          href="/"
          style={{
            color: '#a1a1aa',
            textDecoration: 'none',
            fontSize: '0.9rem',
            border: '1px solid #27272a',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
          }}
        >
          Exit
        </a>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <WebArLauncher
          assetId={asset.id}
          glbUrl={asset.cdnUrl}
          fitRule={asset.fitRule}
          jewelleryType={asset.jewelleryType}
          title={`Maihan Gems ${asset.jewelleryType}`}
        />
      </div>
    </div>
  );
}
