'use client';

import { useState } from 'react';

export function CatalogImage({
  src,
  fallback,
  alt,
  className,
}: {
  src: string;
  fallback?: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState(src || fallback || '');
  if (!url) {
    return <div className={`lx-skel ${className ?? ''}`} aria-hidden="true" />;
  }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        if (fallback && fallback !== url) setUrl(fallback);
      }}
    />
  );
}
