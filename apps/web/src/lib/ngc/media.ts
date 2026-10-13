import type { NgcMediaItem, NgcProduct } from './types.js';

export const CLOUDINARY_CLOUD = 'o1zwhvbi';
export const CLOUDINARY_PREFIX = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}`;
export const CLOUDINARY_MAP_URL = `${CLOUDINARY_PREFIX}/raw/upload/v1791916341/maihan/research/products.cloudinary.json.gz`;

export type CloudinaryResource = 'image' | 'video' | 'raw';

function cloudName(): string {
  const url = process.env['CLOUDINARY_URL'] ?? process.env['NEXT_PUBLIC_CLOUDINARY_URL'] ?? '';
  const match = url.match(/@([^/]+)/);
  return match?.[1] ?? CLOUDINARY_CLOUD;
}

export function resourceTypeFor(kind: string | null | undefined, fileName: string | null | undefined): CloudinaryResource {
  const name = (fileName ?? '').toLowerCase();
  if (kind === 'spin360' || kind === 'video' || name.endsWith('.mp4') || name.endsWith('.webm')) return 'video';
  if (kind === 'scan_3d_srn' || name.endsWith('.srn') || name.endsWith('.glb') || name.endsWith('.usdz')) return 'raw';
  return 'image';
}

export function cloudinaryPublicId(productId: string, fileName: string): string {
  return `maihan/products/${productId}/${fileName}`;
}

/** Public delivery URL. Images/videos get f_auto,q_auto; raw scans do not. */
export function cloudinaryDeliveryUrl(publicId: string, resource: CloudinaryResource): string {
  const cloud = cloudName();
  if (resource === 'raw') return `https://res.cloudinary.com/${cloud}/raw/upload/${publicId}`;
  return `https://res.cloudinary.com/${cloud}/${resource}/upload/f_auto,q_auto/${publicId}`;
}

export function withAutoTransform(secureUrl: string, resource: CloudinaryResource): string {
  if (!secureUrl) return secureUrl;
  if (resource === 'raw') return secureUrl;
  if (secureUrl.includes('/upload/f_auto,q_auto/')) return secureUrl;
  return secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
}

export function attachCloudinary(productId: string, item: NgcMediaItem): NgcMediaItem {
  if (item.cloudinaryPublicId) {
    const resource = (item.cloudinaryResourceType as CloudinaryResource) ?? resourceTypeFor(item.kind, item.fileName);
    const secureUrl = item.secureUrl
      ? withAutoTransform(item.secureUrl, resource)
      : cloudinaryDeliveryUrl(item.cloudinaryPublicId, resource);
    return { ...item, cloudinaryResourceType: resource, secureUrl };
  }
  if (item.kind === 'spin360') {
    const publicId = cloudinaryPublicId(productId, 'spin360.mp4');
    return {
      ...item,
      fileName: item.fileName ?? 'spin360.mp4',
      cloudinaryPublicId: publicId,
      cloudinaryResourceType: 'video',
      secureUrl: cloudinaryDeliveryUrl(publicId, 'video'),
    };
  }
  const fileName = item.fileName && item.fileName.length > 3 ? item.fileName : null;
  if (!fileName) return item;
  const resource = resourceTypeFor(item.kind, fileName);
  const publicId = cloudinaryPublicId(productId, fileName);
  return {
    ...item,
    cloudinaryPublicId: publicId,
    cloudinaryResourceType: resource,
    secureUrl: cloudinaryDeliveryUrl(publicId, resource),
  };
}

export function cloudinaryUploadUrl(productId: string, fileName: string, kind: CloudinaryResource = 'image'): string {
  return cloudinaryDeliveryUrl(cloudinaryPublicId(productId, fileName), kind);
}

export function spinFrameUrl(pattern: string, index: number): string {
  const n = String(index).padStart(3, '0');
  return pattern.replace('{NNN}', n);
}

export function isVideoKind(kind: string): boolean {
  return kind === 'video' || kind === 'spin360';
}

export function displayMediaUrl(productId: string, item: NgcMediaItem): string {
  const attached = attachCloudinary(productId, item);
  if (attached.secureUrl) return attached.secureUrl;
  if (item.kind === 'spin360' && item.urlPattern) return spinFrameUrl(item.urlPattern, 1);
  return item.url ?? item.variants?.full ?? item.variants?.medium ?? '';
}

/** Original NGC/source URL, for onError fallback only. */
export function fallbackMediaUrl(item: NgcMediaItem): string {
  if (item.kind === 'spin360' && item.urlPattern) return spinFrameUrl(item.urlPattern, 1);
  return item.url ?? item.variants?.full ?? item.variants?.medium ?? item.thumbnail ?? '';
}

export function galleryImages(product: NgcProduct): NgcMediaItem[] {
  return product.media.filter((m) => m.kind === 'image' || m.kind === 'lifestyle_image').slice(0, 10);
}

export function galleryVideos(product: NgcProduct): NgcMediaItem[] {
  return product.media.filter((m) => m.kind === 'video');
}

export function galleryReports(product: NgcProduct): NgcMediaItem[] {
  return product.media.filter((m) =>
    ['certificate', 'appraisal', 'scan_report', 'scan_3d_srn'].includes(m.kind),
  );
}

export function spinMedia(product: NgcProduct): NgcMediaItem | undefined {
  return product.media.find((m) => m.kind === 'spin360');
}

export function primaryImage(product: NgcProduct): string {
  const photo = product.media.find((m) => m.kind === 'image') ?? product.media.find((m) => m.kind === 'lifestyle_image');
  if (!photo) return '';
  return displayMediaUrl(product.id, photo);
}

export function catalogImageSrc(product: NgcProduct, item?: NgcMediaItem): string {
  const media = item ?? product.media.find((m) => m.kind === 'image') ?? product.media.find((m) => m.kind === 'lifestyle_image') ?? product.media[0];
  if (!media) return '';
  return displayMediaUrl(product.id, media);
}

export const PREFIX = CLOUDINARY_PREFIX;
