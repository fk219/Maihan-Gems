/** Ask the media endpoint for a cached WebP variant of a locally stored image. */
export function mediaThumb(url: string | null | undefined, width = 480): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith('/media/')) return url;
  return `${url}?w=${width}`;
}
