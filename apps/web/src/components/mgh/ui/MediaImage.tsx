import Image from 'next/image';

/**
 * Locally stored media goes through Next's image optimiser (cached variants);
 * external HTTPS images keep the plain <img> path (their hosts are not
 * allow-listed for optimisation).
 */
export function MediaImage({
  src,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, 25vw',
  priority,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onError?: () => void;
}) {
  if (src.startsWith('/media/')) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} onError={onError} />;
  }
  return <img src={src} alt={alt} className={className} onError={onError} referrerPolicy="no-referrer" />;
}
