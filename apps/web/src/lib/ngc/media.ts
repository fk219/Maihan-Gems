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
  if (
    kind === 'scan_3d_srn' ||
    name.endsWith('.srn') ||
    name.endsWith('.glb') ||
    name.endsWith('.usdz') ||
    name.endsWith('.pdf')
  ) {
    return 'raw';
  }
  return 'image';
}

/** Path under maihan/products/<id>/, including setting_ and stone_ subfolders. */
export function relativeCloudinaryFile(
  productId: string,
  fileName: string | null | undefined,
  localPath?: string | null,
): string {
  const fallback = fileName && fileName.length > 0 ? fileName : 'spin360.mp4';
  const raw = (localPath ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
  const prefix = `media/${productId}/`;
  let rel = '';
  if (raw.startsWith(prefix)) rel = raw.slice(prefix.length);
  else if (raw) {
    const parts = raw.split('/').filter(Boolean);
    const idIndex = parts.indexOf(productId);
    if (idIndex >= 0) rel = parts.slice(idIndex + 1).join('/');
  }
  if (!rel) return fallback;
  if (rel === 'spin360' || rel.endsWith('/spin360')) return rel.replace(/spin360$/, 'spin360.mp4');
  if (!rel.includes('.')) return `${rel.replace(/\/$/, '')}/${fallback}`;
  return rel;
}

export function cloudinaryPublicId(
  productId: string,
  fileName: string,
  localPath?: string | null,
): string {
  return `maihan/products/${productId}/${relativeCloudinaryFile(productId, fileName, localPath)}`;
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
    const publicId = cloudinaryPublicId(productId, item.fileName ?? 'spin360.mp4', item.localPath);
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
  const publicId = cloudinaryPublicId(productId, fileName, item.localPath);
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
  return withStudioPad(displayMediaUrl(product.id, media), media.kind);
}

const STUDIO_PAD = 'c_pad,b_rgb:F7F7F5,w_900,h_900';
const STUDIO_CUTOUT = `e_background_removal,${STUDIO_PAD}`;

/** Neutral Design.md pad so black-studio and white-studio photos share one surface. */
export function withStudioPad(url: string, kind?: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('b_rgb:') || url.includes('e_background_removal')) return url;
  const playableVideo =
    (kind === 'video' || kind === 'spin360' || url.includes('/video/upload/')) && !url.includes('so_0');
  if (playableVideo) return url;
  const cutout = kind === 'image';
  const pad = cutout ? STUDIO_CUTOUT : STUDIO_PAD;
  if (url.includes('/upload/so_0,f_jpg,q_auto/')) {
    return url.replace('/upload/so_0,f_jpg,q_auto/', `/upload/so_0,f_jpg,q_auto,${STUDIO_PAD}/`);
  }
  if (url.includes('/upload/f_auto,q_auto/')) {
    return url.replace('/upload/f_auto,q_auto/', `/upload/${pad},f_auto,q_auto/`);
  }
  if (url.includes('/image/upload/')) {
    return url.replace('/image/upload/', `/image/upload/${pad}/`);
  }
  return url;
}

/** First-frame JPEG of a Cloudinary video (`so_0`). */
export function cloudinaryVideoPoster(url: string): string {
  if (!url.includes('/video/upload/')) return url;
  if (url.includes('so_0')) return url;
  if (url.includes('/upload/f_auto,q_auto/')) {
    return url.replace('/upload/f_auto,q_auto/', '/upload/so_0,f_jpg,q_auto/');
  }
  return url.replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto/');
}

function mediaToken(item: NgcMediaItem): string | null {
  const fromName = (item.fileName ?? item.localPath ?? '').match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  if (fromName) return fromName[0].toLowerCase();
  const fromUrl = (item.url ?? '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return fromUrl ? fromUrl[0].toLowerCase() : null;
}

/** Poster for a video or 360 item: uploaded thumbnail, else Cloudinary `so_0`. */
export function galleryPoster(product: NgcProduct, item: NgcMediaItem): string {
  if (item.kind === 'video') {
    const token = mediaToken(item);
    const thumbs = product.media.filter((row) => row.kind === 'video_thumbnail');
    const match =
      (token ? thumbs.find((row) => mediaToken(row) === token) : undefined) ??
      thumbs.find((row) => row.title && row.title === item.title);
    if (match) return withStudioPad(displayMediaUrl(product.id, match), match.kind);
    const videoUrl = displayMediaUrl(product.id, item);
    return withStudioPad(cloudinaryVideoPoster(videoUrl));
  }
  if (item.kind === 'spin360') {
    const videoUrl = displayMediaUrl(product.id, item);
    if (videoUrl.includes('/video/upload/')) return withStudioPad(cloudinaryVideoPoster(videoUrl));
    if (item.urlPattern) return spinFrameUrl(item.urlPattern, 1);
  }
  return withStudioPad(displayMediaUrl(product.id, item), item.kind);
}

export const PREFIX = CLOUDINARY_PREFIX;
