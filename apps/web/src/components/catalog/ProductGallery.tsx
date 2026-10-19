'use client';

import { useState } from 'react';

/**
 * Product gallery client island for the catalogue PDP.
 * Receives the ProductDetail `media` array verbatim (no URL fabrication).
 * Empty media renders an honest, elegant placeholder — never a foreign image.
 */
export interface GalleryItem {
  readonly url: string;
  readonly kind: string;
  readonly role: string;
  readonly alt: string | null;
}

export function ProductGallery({ media, title }: { readonly media: readonly GalleryItem[]; readonly title: string }) {
  const [active, setActive] = useState(0);

  if (media.length === 0) {
    return (
      <div
        className="product-detail__media product-detail__media--empty"
        role="img"
        aria-label={`${title} — photography not yet available`}
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '320px',
          border: '1px solid var(--hairline-border, #d8d3c4)',
          background: 'var(--surface-raised, #faf9f5)',
        }}
      >
        <p style={{ color: 'var(--ink-muted, #6b6657)', fontStyle: 'italic' }}>
          Photography for this piece is not yet evidenced.
        </p>
      </div>
    );
  }

  const current = media[Math.min(active, media.length - 1)]!;
  const isVideo = current.kind === 'VIDEO' || current.kind === 'VIDEO_360';

  return (
    <div className="product-detail__media">
      <div className="product-detail__media-main" style={{ position: 'relative' }}>
        {isVideo ? (
          <video
            key={current.url}
            controls
            playsInline
            preload="metadata"
            poster={media.find((m) => m.kind === 'IMAGE')?.url}
            style={{ width: '100%', maxHeight: '560px', objectFit: 'contain', background: '#0A0A0B' }}
            aria-label={current.alt ?? title}
          >
            <source src={current.url} type="video/mp4" />
            Your browser does not support embedded video.
          </video>
        ) : (
          <img
            src={current.url}
            alt={current.alt ?? title}
            style={{ width: '100%', maxHeight: '560px', objectFit: 'contain', background: '#faf9f5' }}
          />
        )}
        {isVideo && (
          <span
            className="lx-badge"
            style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: '#0A0A0B', color: '#D4AF37', padding: '0.2rem 0.6rem', fontSize: '0.7rem', letterSpacing: '0.08em' }}
          >
            VIDEO
          </span>
        )}
      </div>
      {media.length > 1 && (
        <div className="product-detail__thumbs" role="listbox" aria-label="Product media" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', overflowX: 'auto' }}>
          {media.map((m, i) => (
            <button
              key={`${m.url}-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              aria-label={`View media ${i + 1} of ${media.length}`}
              onClick={() => setActive(i)}
              style={{
                flex: '0 0 auto',
                width: '64px',
                height: '64px',
                padding: 0,
                border: i === active ? '2px solid #D4AF37' : '1px solid var(--hairline-border, #d8d3c4)',
                background: '#fff',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {m.kind === 'VIDEO' || m.kind === 'VIDEO_360' ? (
                <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>▶</span>
              ) : (
                <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
