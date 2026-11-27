#!/usr/bin/env node
/**
 * scripts/fetch-stock-stones.mjs
 *
 * Re-downloads the illustrative stone photography committed at
 * `public/media/stock/` from Wikimedia Commons and verifies every download.
 *
 * Why this script exists: the client verdict on the homepage proof captures was
 * that app screenshots look cheap. This pass replaces them with real open-
 * licence gemstone photography. The photographs are committed to the repo (no
 * hotlinking at runtime); this script documents provenance and lets a future
 * session re-download and re-verify them deterministically.
 *
 * Licence policy: Public domain, CC0 or CC BY only. CC BY-SA is excluded by
 * decision (the share-alike obligation does not suit this asset set), and every
 * CC BY / CC BY-SA file is attributed in docs/IMAGE_CREDITS.md.
 *
 * Quality gates per file (fails hard):
 *   - HTTP 200, Content-Type image/jpeg
 *   - JPEG magic bytes (ff d8 ff)
 *   - long edge >= 1200 px, parsed from the SOF marker, not trusted metadata
 *
 * Repo-weight policy: the original is downloaded when it is <= 5 MB. When the
 * original is larger, the 1600 px Special:FilePath render (Commons serves a
 * 1920 px bucket) is downloaded instead — still far above the 1200 px gate —
 * and the substitution is recorded in docs/IMAGE_CREDITS.md. The few 2026
 * originals that exceed 5 MB are kept out of the repository on purpose.
 *
 * Run: node scripts/fetch-stock-stones.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = { 'User-Agent': 'MaihanGemsStockFetch/1.0 (site build; contact: dev@maihangems.invalid)' };
const OUT_DIR = fileURLToPath(new URL('../public/media/stock/', import.meta.url));
const MAX_BYTES = 5_000_000;

const PICKS = [
  // file — the committed asset name; title — the Commons source file.
  { file: 'tanzanite.jpg', title: 'File:Tanzanite taillée.jpg' },
  { file: 'tanzanite-rough.jpg', title: 'File:Tanzanite (Tanzanie).jpg' },
  { file: 'sapphire.jpg', title: 'File:Saphir bicolore des joyaux de la Couronne de France.jpg' },
  { file: 'ruby.jpg', title: 'File:Rubis et pyrite sur gangue (Pakistan).jpg' },
  { file: 'emerald.jpg', title: 'File:Béryl var. émeraude sur gangue (Muzo Mine Boyaca - Colombie) 2.jpg' },
  { file: 'opal.jpg', title: 'File:Opalescence of the opal.jpg' },
  { file: 'amethyst.jpg', title: 'File:Amethyst Gems.jpg' },
  { file: 'spinel.jpg', title: 'File:Spinel (GeoDIL number - 563).jpg' },
  { file: 'diamond.jpg', title: 'File:The Hope Diamond - SIA.jpg' },
];

const stripTags = (value) => (value ?? '').replace(/<[^>]*>/g, '').trim();

/** Walk JPEG segments to the first SOF marker; dimensions live there. */
function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const credits = [];

  for (let index = 0; index < PICKS.length; index += 10) {
    const batch = PICKS.slice(index, index + 10);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: batch.map((pick) => pick.title).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '2048',
    });
    const response = await fetch('https://commons.wikimedia.org/w/api.php?' + params, { headers: UA });
    if (!response.ok) throw new Error(`imageinfo query failed: HTTP ${response.status}`);
    const data = await response.json();
    const pages = new Map(Object.values(data.query?.pages ?? {}).map((page) => [page.title, page]));

    for (const pick of batch) {
      const page = pages.get(pick.title);
      const info = page?.imageinfo?.[0];
      if (!info) throw new Error(`no imageinfo for ${pick.title}`);

      const meta = info.extmetadata ?? {};
      const originalTooHeavy = info.size > MAX_BYTES;
      const url = originalTooHeavy
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(pick.title.replace(/^File:/, '').replaceAll(' ', '_'))}?width=1600`
        : info.url;
      const variant = originalTooHeavy ? '1920 px Commons render' : 'original file';

      const download = await fetch(url, { headers: UA });
      if (!download.ok) throw new Error(`download failed for ${pick.title}: HTTP ${download.status}`);
      const contentType = download.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/jpeg')) {
        throw new Error(`${pick.title}: expected image/jpeg, got ${contentType}`);
      }
      const buffer = Buffer.from(await download.arrayBuffer());
      if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        throw new Error(`${pick.title}: not a JPEG (magic bytes ${buffer.subarray(0, 3).toString('hex')})`);
      }
      const dims = jpegDimensions(buffer);
      if (!dims) throw new Error(`${pick.title}: no SOF marker found`);
      const longEdge = Math.max(dims.width, dims.height);
      if (longEdge < 1200) {
        throw new Error(`${pick.title}: long edge ${longEdge} px is below the 1200 px gate`);
      }

      const target = join(OUT_DIR, pick.file);
      writeFileSync(target, buffer);
      console.log(`ok  ${pick.file}  ${dims.width}×${dims.height}  ${(buffer.length / 1024).toFixed(0)} KiB  (${variant})`);

      credits.push({
        file: pick.file,
        sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(pick.title.replaceAll(' ', '_'))}`,
        commonsTitle: pick.title,
        author: stripTags(meta.Artist?.value) || 'Unknown',
        licence: stripTags(meta.LicenseShortName?.value) || 'Unknown',
        licenceUrl: stripTags(meta.LicenseUrl?.value),
        downloaded: variant,
        dimensions: `${dims.width}×${dims.height}`,
      });
    }
  }

  console.log('\n--- paste into docs/IMAGE_CREDITS.md ---\n');
  for (const credit of credits) {
    console.log(JSON.stringify(credit));
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
