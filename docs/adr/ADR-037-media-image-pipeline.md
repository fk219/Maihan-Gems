# ADR-037 — Media image handling (metadata stripping + Next derivatives)

**Status:** Accepted · 2026-11-01 · owner-authorized ("fix everything")

## Context

Vendor uploads were stored byte-for-byte, so EXIF/GPS metadata was served in
public photos and cards loaded full-resolution originals. Adding `sharp`
directly to `fresh-api` proved fragile under this workspace's pnpm peer
resolution; Next.js already owns an image optimiser for derivatives.

## Decision

1. **No new runtime dependency.** Uploads are sanitised in-house:
   - sniff the real format from magic bytes (JPEG/PNG/WebP);
   - reject a declared MIME that does not match the bytes;
   - strip metadata by dropping JPEG `APP1` (EXIF/XMP), `APP13` (IPTC) and
     comment segments, PNG `eXIf/tEXt/iTXt/zTXt/tIME` chunks, and WebP
     `EXIF`/`XMP ` chunks.
   - GIF/AVIF uploads are refused (metadata stripping is not guaranteed).
2. **Derivatives use Next's image optimiser** (`next/image`) for locally
   stored `/media/...` images; external HTTPS images keep the plain `<img>`
   path (their hosts are not allow-listed for optimisation).
3. The database stores one sanitised original per asset; derivatives live in
   Next's image cache and can be regenerated at any time.

## Consequences

- No EXIF/XMP/GPS in served images.
- Local media cards request an optimised, cached derivative.
- Uploads accept JPEG/PNG/WebP only; existing GIF/AVIF assets remain readable.
- An object-storage driver must preserve the same sanitise-before-store rule.
