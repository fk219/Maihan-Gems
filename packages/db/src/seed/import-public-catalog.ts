/**
 * Showcase catalog import — a few high-quality public listings per category.
 *
 * Respects robots.txt, honours Crawl-delay, never copies marketing copy,
 * and stores source_url + source_vendor on every media row.
 *
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/maihan_dev \
 *     ./node_modules/.bin/tsx src/seed/import-public-catalog.ts
 */
import { Pool } from 'pg';

import {
  SHOWCASE_TARGETS,
  assignShowcaseCategory,
  extractJsonLdProducts,
  fallbackImages,
  fallbackMoney,
  isSkippableUrl,
  offerFromJsonLd,
  parseListing,
  pickPrimaryImage,
  rewriteDescription,
  skuFromUrl,
  toUsd,
  type ParsedListing,
} from './public-catalog-parse.js';

const UA = 'MaihanGemsImporter/1.0 (+https://github.com/fk219/Maihan-Gems; catalog-import)';
const DEFAULT_DELAY_MS = 2100;
const MAIHAN_VENDOR = '00000000-0000-0000-0000-000000000001';
const CANDIDATES_PER_SLOT = 14;
const SKIP_WIPE = process.env['IMPORT_SKIP_WIPE'] === '1' || process.env['IMPORT_GAPS_ONLY'] === '1';
const GAPS_ONLY = process.env['IMPORT_GAPS_ONLY'] === '1';

/** Known live product URLs used only to finish empty showcase slots. */
const GAP_URLS: Array<{ slug: string; urls: string[] }> = [
  {
    slug: 'natural-gemstone-company',
    urls: [
      'https://naturalgemstones.com/tourmaline/0.67ct-mozambique-fancy-pink-tourmaline-k1953/',
      'https://naturalgemstones.com/tourmaline/3.05ct-mozambique-emerald-cut-multi-color-tourmaline-k1964/',
      'https://naturalgemstones.com/tanzanite/4.42ct-tanzanian-oval-violet-tanzanite-k4487/',
      'https://naturalgemstones.com/tanzanite/3.51ct-tanzanian-round-violetish-blue-tanzanite-k5113/',
      'https://naturalgemstones.com/tanzanite/7.44ct-tanzanian-cushion-violet-tanzanite-k20243/',
      'https://naturalgemstones.com/alexandrite/4.03ct-ceylon-sri-lankan-oval-alexandrite-k4774/',
      'https://naturalgemstones.com/alexandrite/10.43ct-ceylon-sri-lankan-cushion-alexandrite-k4775/',
      'https://naturalgemstones.com/alexandrite/10.66ct-madagascar-oval-alexandrite-k4776/',
      'https://naturalgemstones.com/topaz/17.70ct-brazilian-trillion-blue-topaz-k2854/',
      'https://naturalgemstones.com/topaz/9.48ct-brazilian-oval-blue-topaz-k2856/',
      'https://naturalgemstones.com/topaz/32.44ct-brazilian-round-blue-topaz-k2857/',
      'https://naturalgemstones.com/black-opal-dark-opal/3.93ct-australian-oval-multi-color-black-opal-dark-opal-k547/',
    ],
  },
  {
    slug: 'natural-sapphire-company',
    urls: [
      'https://www.thenaturalsapphirecompany.com/padparadscha-sapphires/1.51ct-ceylon-sri-lankan-pear-padparadscha-sapphire-s19556/',
      'https://www.thenaturalsapphirecompany.com/padparadscha-sapphires/1.33ct-tanzanian-oval-padparadscha-sapphire-s19583/',
      'https://www.thenaturalsapphirecompany.com/padparadscha-sapphires/4.08ct-ceylon-sri-lankan-cushion-padparadscha-sapphire-s19778/',
      'https://www.thenaturalsapphirecompany.com/yellow-sapphires/1.01ct-ceylon-sri-lankan-fancy-yellow-sapphire-s20604/',
      'https://www.thenaturalsapphirecompany.com/yellow-sapphires/1.22ct-tanzanian-fancy-yellow-sapphire-s17573/',
      'https://www.thenaturalsapphirecompany.com/yellow-sapphires/0.70ct-australian-fancy-yellowish-green-sapphire-s20432/',
    ],
  },
];

type SourceMode = 'html' | 'shopify-json' | 'skip';

interface Source {
  slug: string;
  displayName: string;
  country: string;
  origin: string;
  sitemapIndex: string;
  mode: SourceMode;
}

const SOURCES: Source[] = [
  {
    slug: 'natural-gemstone-company',
    displayName: 'The Natural Gemstone Company',
    country: 'US',
    origin: 'https://naturalgemstones.com',
    sitemapIndex: 'https://naturalgemstones.com/sitemap-index.xml',
    mode: 'html',
  },
  {
    slug: 'natural-sapphire-company',
    displayName: 'The Natural Sapphire Company',
    country: 'US',
    origin: 'https://www.thenaturalsapphirecompany.com',
    sitemapIndex: 'https://www.thenaturalsapphirecompany.com/sitemap-index.xml',
    mode: 'html',
  },
  {
    slug: 'natural-ruby-company',
    displayName: 'The Natural Ruby Company',
    country: 'US',
    origin: 'https://www.thenaturalrubycompany.com',
    sitemapIndex: 'https://www.thenaturalrubycompany.com/sitemap-index.xml',
    mode: 'html',
  },
  {
    slug: 'emeralds-com',
    displayName: 'Emeralds.com',
    country: 'US',
    origin: 'https://www.emeralds.com',
    sitemapIndex: 'https://www.emeralds.com/sitemap-index.xml',
    mode: 'html',
  },
  {
    slug: 'glorious-diamonds',
    displayName: 'Glorious Diamonds',
    country: 'TH',
    origin: 'https://www.gloriousdiamonds.net',
    sitemapIndex: 'https://www.gloriousdiamonds.net/sitemap.xml',
    mode: 'skip',
  },
  {
    slug: 'thai-gem-centre',
    displayName: 'Thai Gem Centre',
    country: 'TH',
    origin: 'https://www.thaigemcentregroup.com',
    sitemapIndex: 'https://www.thaigemcentregroup.com/sitemap.xml',
    mode: 'skip',
  },
  {
    slug: 'gems-pavilion',
    displayName: 'Gems Pavilion',
    country: 'TH',
    origin: 'https://gemspavilion.com',
    sitemapIndex: 'https://gemspavilion.com/wp-sitemap.xml',
    mode: 'skip',
  },
  {
    slug: 'kavant-sharart',
    displayName: 'Kavant & Sharart',
    country: 'TH',
    origin: 'https://www.kavantandsharart.com',
    sitemapIndex: 'https://www.kavantandsharart.com/sitemap.xml',
    mode: 'shopify-json',
  },
  {
    slug: 'pattaraphan',
    displayName: 'PATTARAPHAN',
    country: 'TH',
    origin: 'https://www.pattaraphan.com',
    sitemapIndex: 'https://www.pattaraphan.com/sitemap_index.xml',
    mode: 'html',
  },
  {
    slug: 'nineteen-atelier',
    displayName: 'Nineteen Atelier',
    country: 'TH',
    origin: 'https://nineteenatelier.com',
    sitemapIndex: 'https://nineteenatelier.com/sitemap.xml',
    mode: 'shopify-json',
  },
  {
    slug: 'temple-and-grace',
    displayName: 'Temple and Grace',
    country: 'TH',
    origin: 'https://www.templeandgrace.co.th',
    sitemapIndex: 'https://www.templeandgrace.co.th/sitemap.xml',
    mode: 'skip',
  },
  {
    slug: 'above-diamond',
    displayName: 'Above Diamond',
    country: 'TH',
    origin: 'https://abovediamond.com',
    sitemapIndex: 'https://abovediamond.com/sitemap.xml',
    mode: 'skip',
  },
  {
    slug: 'ananta-jewelry',
    displayName: 'ANANTA Jewelry',
    country: 'TH',
    origin: 'https://anantajewelry.com',
    sitemapIndex: 'https://anantajewelry.com/sitemap.xml',
    mode: 'skip',
  },
];

interface RobotsRules {
  delayMs: number;
  disallows: string[];
  fetchable: boolean;
}

const delayState = new Map<string, Promise<void>>();

function hostOf(url: string): string {
  return new URL(url).host;
}

async function politeDelay(url: string, delayMs: number): Promise<void> {
  const host = hostOf(url);
  const prev = delayState.get(host) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  delayState.set(host, prev.then(() => next));
  await prev;
  setTimeout(release, delayMs);
}

async function fetchText(url: string, delayMs: number): Promise<string | null> {
  await politeDelay(url, delayMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xml,text/xml,application/json;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
    });
    if (!res.ok) {
      console.warn(`skip ${res.status} ${url}`);
      return null;
    }
    return res.text();
  } catch (error) {
    console.warn(`skip fetch ${url}:`, (error as Error).message);
    return null;
  }
}

function parseRobots(body: string, userAgent = '*'): RobotsRules {
  const lines = body.split(/\r?\n/);
  let applies = false;
  const disallows: string[] = [];
  let delayMs = DEFAULT_DELAY_MS;
  for (const raw of lines) {
    const line = raw.split('#')[0]?.trim() ?? '';
    if (!line) continue;
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (/^user-agent$/i.test(key ?? '')) {
      applies = value === '*' || value.toLowerCase() === userAgent.toLowerCase();
    } else if (applies && /^disallow$/i.test(key ?? '') && value) {
      disallows.push(value);
    } else if (applies && /^crawl-delay$/i.test(key ?? '')) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) delayMs = Math.max(delayMs, n * 1000);
    }
  }
  return { delayMs, disallows, fetchable: true };
}

function allowed(url: string, rules: RobotsRules): boolean {
  if (!rules.fetchable) return false;
  const path = new URL(url).pathname;
  return !rules.disallows.some((d) => d === '/' || path.startsWith(d));
}

function locTags(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) =>
    m[1]!.trim().replace(/&amp;/g, '&'),
  );
}

function pickSitemapFiles(indexLocs: string[], indexUrl: string): string[] {
  const sitemapFiles = indexLocs.filter((u) => /sitemap/i.test(u));
  if (sitemapFiles.length === 0) return [indexUrl];
  const numbered = sitemapFiles
    .map((u) => ({ url: u, n: Number((u.match(/sitemap-products-(\d+)/i) ?? [])[1] ?? NaN) }))
    .filter((x) => Number.isFinite(x.n))
    .sort((a, b) => a.n - b.n);
  if (numbered.length >= 6) {
    const pickAt = (ratio: number) => numbered[Math.min(numbered.length - 1, Math.floor(numbered.length * ratio))]!.url;
    const extras = numbered
      .filter((x) => [2, 3, 4, 12, 15, 20].includes(x.n))
      .map((x) => x.url);
    return [...new Set([
      pickAt(0.08),
      pickAt(0.12),
      pickAt(0.22),
      pickAt(0.35),
      pickAt(0.52),
      pickAt(0.55),
      pickAt(0.82),
      ...extras,
    ])];
  }
  const productish = sitemapFiles.filter((u) => /product/i.test(u) && !/tag|cat/i.test(u));
  return (productish.length > 0 ? productish : sitemapFiles).slice(0, 4);
}

async function loadRobots(source: Source): Promise<RobotsRules> {
  const robotsRes = await fetch(`${source.origin}/robots.txt`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  }).catch(() => null);
  if (robotsRes && robotsRes.status === 403) {
    return { delayMs: DEFAULT_DELAY_MS, disallows: ['/'], fetchable: false };
  }
  if (robotsRes && robotsRes.ok) return parseRobots(await robotsRes.text());
  return { delayMs: DEFAULT_DELAY_MS, disallows: [], fetchable: true };
}

async function collectSourceUrls(source: Source, rules: RobotsRules): Promise<string[]> {
  const index = await fetchText(source.sitemapIndex, Math.min(rules.delayMs, 800));
  if (!index || !index.includes('<loc')) return [];
  const files = pickSitemapFiles(locTags(index), source.sitemapIndex);
  const urls: string[] = [];
  for (const file of files) {
    if (!allowed(file, rules)) continue;
    const xml = await fetchText(file, Math.min(rules.delayMs, 800));
    if (!xml || !xml.includes('<loc')) continue;
    for (const loc of locTags(xml)) {
      if (!allowed(loc, rules) || isSkippableUrl(loc)) continue;
      if (skuFromUrl(loc) || /\/(product|products|shop)\//i.test(loc)) urls.push(loc);
    }
  }
  return urls;
}

async function ensureVendor(pool: Pool, source: Source): Promise<string> {
  const existing = await pool.query<{ id: string }>(`SELECT id FROM vendors WHERE slug = $1`, [source.slug]);
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO vendors (slug, display_name, country, base_currency, status, about)
     VALUES ($1, $2, $3, 'USD', 'active', $4)
     RETURNING id`,
    [source.slug, source.displayName, source.country, `Public catalog imported from ${source.origin}`],
  );
  return inserted.rows[0]!.id;
}

async function wipeImportedCatalog(pool: Pool): Promise<void> {
  await pool.query('BEGIN');
  try {
    await pool.query(`
      DELETE FROM media_links
      WHERE entity_type = 'product'
        AND entity_id IN (SELECT id FROM products WHERE vendor_id <> $1)
    `, [MAIHAN_VENDOR]);
    await pool.query(`DELETE FROM media WHERE vendor_id <> $1`, [MAIHAN_VENDOR]);
    await pool.query(`
      DELETE FROM designs
      WHERE setting_product_id IN (SELECT id FROM products WHERE vendor_id <> $1)
         OR gemstone_product_id IN (SELECT id FROM products WHERE vendor_id <> $1)
    `, [MAIHAN_VENDOR]);
    await pool.query(`DELETE FROM certificates WHERE vendor_id <> $1`, [MAIHAN_VENDOR]);
    await pool.query(`DELETE FROM products WHERE vendor_id <> $1`, [MAIHAN_VENDOR]);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function existingSlotCounts(pool: Pool): Promise<Map<string, number>> {
  const counts = new Map<string, number>(Object.keys(SHOWCASE_TARGETS).map((k) => [k, 0]));
  const rows = await pool.query<{
    url: string | null;
    kind: string;
    stone_type: string | null;
    color_hue: string | null;
    variety: string | null;
    quantity_type: string | null;
    jewelry_type: string | null;
    setting_for: string | null;
  }>(`
    SELECT p.slug AS url, p.kind::text AS kind,
           gd.stone_type, gd.color_hue, gd.variety, gd.quantity_type,
           jd.jewelry_type, sd.setting_for
    FROM products p
    LEFT JOIN gemstone_details gd ON gd.product_id = p.id
    LEFT JOIN jewelry_details jd ON jd.product_id = p.id
    LEFT JOIN setting_details sd ON sd.product_id = p.id
    WHERE p.status = 'active'
  `);
  for (const row of rows.rows) {
    const cat = assignShowcaseCategory({
      url: row.url ?? '',
      kind: row.kind as ParsedListing['kind'],
      stoneType: row.stone_type,
      colorHue: row.color_hue,
      variety: row.variety,
      quantityType: row.quantity_type,
      jewelryType: row.jewelry_type,
      settingFor: row.setting_for,
    });
    if (cat && counts.has(cat)) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return counts;
}

async function insertProduct(
  pool: Pool,
  vendorId: string,
  source: Source,
  url: string,
  parsed: ParsedListing,
  priceUsd: number,
  imageUrl: string,
  fx: { AED: number; THB: number },
): Promise<boolean> {
  const description = rewriteDescription(parsed, source.displayName);
  const slug = `${source.slug}-${parsed.slug}`.replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
  const variantSku = `${source.slug}-${parsed.sku}-DEF`.slice(0, 80);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dup = await client.query(`SELECT 1 FROM products WHERE sku = $1 OR slug = $2`, [parsed.sku, slug]);
    if (dup.rowCount && dup.rowCount > 0) {
      await client.query('ROLLBACK');
      return false;
    }
    const product = await client.query<{ id: string }>(
      `INSERT INTO products (
         vendor_id, sku, slug, title, kind, description, brand,
         pricing_mode, base_currency, status, visibility, tags
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'fixed','USD','active','public',$8)
       RETURNING id`,
      [vendorId, parsed.sku, slug, parsed.title, parsed.kind, description, source.displayName, [url]],
    );
    const productId = product.rows[0]!.id;
    if (parsed.kind === 'gemstone') {
      await client.query(
        `INSERT INTO gemstone_details (
           product_id, quantity_type, piece_count, stone_type, variety,
           origin_type, carat_total, shape, color_hue, treatment_status, origin_country
         ) VALUES ($1,$2,$3,$4,$5,'natural',$6,$7,$8,$9,$10)`,
        [
          productId,
          parsed.quantityType ?? 'single',
          parsed.quantityType === 'pair' ? 2 : 1,
          parsed.stoneType ?? 'unknown',
          parsed.stoneType,
          parsed.caratTotal,
          parsed.shape,
          parsed.colorHue,
          parsed.treatment,
          parsed.originCountry,
        ],
      );
    } else if (parsed.kind === 'jewelry') {
      await client.query(
        `INSERT INTO jewelry_details (
           product_id, jewelry_type, metal_type, metal_purity, metal_color, total_carat_weight
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [productId, parsed.jewelryType ?? 'ring', parsed.metalType, parsed.metalPurity, parsed.metalColor, parsed.caratTotal],
      );
    } else {
      await client.query(
        `INSERT INTO setting_details (product_id, setting_for, style, price_excludes_center)
         VALUES ($1,$2,$3,true)`,
        [productId, parsed.settingFor ?? 'ring', ['imported']],
      );
      await client.query(
        `INSERT INTO setting_accepts (setting_product_id, shape, min_carat, max_carat)
         VALUES ($1,'round',0.3,5), ($1,'oval',0.3,5), ($1,'cushion',0.3,5)`,
        [productId],
      );
    }
    const variant = await client.query<{ id: string }>(
      `INSERT INTO product_variants (product_id, sku, is_default, status) VALUES ($1,$2,true,'active') RETURNING id`,
      [productId, variantSku],
    );
    const variantId = variant.rows[0]!.id;
    const usd = Math.round(priceUsd * 100) / 100;
    await client.query(
      `INSERT INTO product_prices (variant_id, currency, amount, region_code) VALUES ($1,'USD',$2,NULL)`,
      [variantId, usd],
    );
    await client.query(
      `INSERT INTO product_prices (variant_id, currency, amount, region_code) VALUES ($1,'AED',$2,'AE')`,
      [variantId, Math.round(usd * fx.AED * 100) / 100],
    );
    await client.query(
      `INSERT INTO product_prices (variant_id, currency, amount, region_code) VALUES ($1,'THB',$2,'TH')`,
      [variantId, Math.round(usd * fx.THB * 100) / 100],
    );
    await client.query(`INSERT INTO inventory (variant_id, on_hand, reserved) VALUES ($1,1,0)`, [variantId]);
    const media = await client.query<{ id: string }>(
      `INSERT INTO media (vendor_id, kind, storage_key, url, alt, source_url, source_vendor)
       VALUES ($1,'image',$2,$3,$4,$5,$6) RETURNING id`,
      [vendorId, imageUrl, imageUrl, parsed.title, url, source.displayName],
    );
    await client.query(
      `INSERT INTO media_links (media_id, entity_type, entity_id, role, position)
       VALUES ($1,'product',$2,'primary',0)`,
      [media.rows[0]!.id, productId],
    );
    if (parsed.certificateLab) {
      const cert = await client.query<{ id: string }>(
        `INSERT INTO certificates (vendor_id, lab, report_number, verified_status)
         VALUES ($1,$2,$3,'unverified')
         ON CONFLICT (lab, report_number) DO UPDATE SET lab = EXCLUDED.lab
         RETURNING id`,
        [vendorId, parsed.certificateLab, `${parsed.sku}-OBS`],
      );
      await client.query(
        `INSERT INTO certificate_links (certificate_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [cert.rows[0]!.id, productId],
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.warn(`insert failed ${parsed.sku}:`, (error as Error).message);
    return false;
  } finally {
    client.release();
  }
}

function listingFromPage(url: string, html: string): { parsed: ParsedListing; money: { amount: number; currency: string }; imageUrl: string } | null {
  const products = extractJsonLdProducts(html);
  const json = products[0] ?? {};
  const fromLd = products[0] ? offerFromJsonLd(products[0]) : { money: null, images: [] };
  const money = fromLd.money ?? fallbackMoney(html);
  const imageUrl = pickPrimaryImage([...fromLd.images, ...fallbackImages(html)]);
  if (!imageUrl || !money) return null;
  const parsed = parseListing({
    url,
    jsonName: typeof json['name'] === 'string' ? json['name'] : null,
    jsonSku: typeof json['sku'] === 'string' ? json['sku'] : skuFromUrl(url),
    imageUrl,
    extraText: typeof json['description'] === 'string' ? json['description'].slice(0, 400) : null,
    productType: typeof json['category'] === 'string' ? json['category'] : null,
  });
  return { parsed, money, imageUrl };
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  product_type?: string;
  tags?: string[] | string;
  variants?: Array<{ sku?: string; price?: string }>;
  images?: Array<{ src?: string }>;
}

function neededRemaining(filled: Map<string, number>): Set<string> {
  const needed = new Set<string>();
  for (const [cat, target] of Object.entries(SHOWCASE_TARGETS)) {
    if ((filled.get(cat) ?? 0) < target) needed.add(cat);
  }
  return needed;
}

function takeCandidates(urls: string[], needed: Set<string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const url of urls) {
    const cat = assignShowcaseCategory({ url });
    if (!cat || !needed.has(cat)) continue;
    const list = out.get(cat) ?? [];
    if (list.length >= CANDIDATES_PER_SLOT) continue;
    list.push(url);
    out.set(cat, list);
  }
  return out;
}

async function importCandidates(
  pool: Pool,
  source: Source,
  vendorId: string,
  rules: RobotsRules,
  fx: { AED: number; THB: number },
  filled: Map<string, number>,
  candidates: Map<string, string[]>,
): Promise<number> {
  let inserted = 0;
  for (const [cat, urls] of candidates) {
    const target = SHOWCASE_TARGETS[cat] ?? 0;
    for (const url of urls) {
      if ((filled.get(cat) ?? 0) >= target) break;
      if (!allowed(url, rules)) continue;
      const html = await fetchText(url, rules.delayMs);
      if (!html) continue;
      const listing = listingFromPage(url, html);
      if (!listing) continue;
      const liveCat = assignShowcaseCategory({
        url,
        kind: listing.parsed.kind,
        stoneType: listing.parsed.stoneType,
        colorHue: listing.parsed.colorHue,
        quantityType: listing.parsed.quantityType,
        jewelryType: listing.parsed.jewelryType,
        settingFor: listing.parsed.settingFor,
      }) ?? cat;
      if ((filled.get(liveCat) ?? 0) >= (SHOWCASE_TARGETS[liveCat] ?? 0)) continue;
      const usd = toUsd(listing.money.amount, listing.money.currency, fx);
      const ok = await insertProduct(pool, vendorId, source, url, listing.parsed, usd, listing.imageUrl, fx);
      if (ok) {
        filled.set(liveCat, (filled.get(liveCat) ?? 0) + 1);
        inserted += 1;
        process.stdout.write(`  + ${liveCat} ${listing.parsed.sku} ${listing.parsed.title.slice(0, 42)}\n`);
      }
    }
  }
  return inserted;
}

async function importShopify(
  pool: Pool,
  source: Source,
  vendorId: string,
  rules: RobotsRules,
  fx: { AED: number; THB: number },
  filled: Map<string, number>,
): Promise<number> {
  const feedUrl = `${source.origin}/products.json?limit=250`;
  if (!allowed(feedUrl, rules) && !allowed(`${source.origin}/products/`, rules)) return 0;
  const body = await fetchText(feedUrl, Math.min(rules.delayMs, 800));
  if (!body) return 0;
  let payload: { products?: ShopifyProduct[] };
  try {
    payload = JSON.parse(body) as { products?: ShopifyProduct[] };
  } catch {
    return 0;
  }
  let inserted = 0;
  for (const product of payload.products ?? []) {
    const needed = neededRemaining(filled);
    if (needed.size === 0) break;
    const handle = product.handle ?? '';
    const url = `${source.origin}/products/${handle}`;
    const imageUrl = pickPrimaryImage((product.images ?? []).map((i) => i.src ?? '').filter(Boolean));
    const price = Number(product.variants?.[0]?.price ?? 0);
    if (!handle || !imageUrl || !(price > 0) || /gift/i.test(product.title ?? '')) continue;
    const extra = [product.product_type, Array.isArray(product.tags) ? product.tags.join(' ') : product.tags]
      .filter(Boolean)
      .join(' ');
    const parsed = parseListing({
      url,
      jsonName: product.title,
      jsonSku: product.variants?.[0]?.sku || `SH-${handle}`.slice(0, 40),
      imageUrl,
      extraText: extra,
      productType: product.product_type,
    });
    parsed.kind = /setting|mount/i.test(extra) ? 'setting' : 'jewelry';
    const jt = /earring/i.test(`${extra} ${product.title}`) ? 'earrings'
      : /pendant/i.test(`${extra} ${product.title}`) ? 'pendant'
        : /necklace/i.test(`${extra} ${product.title}`) ? 'necklace'
          : /bracelet/i.test(`${extra} ${product.title}`) ? 'bracelet'
            : 'ring';
    if (parsed.kind === 'jewelry') parsed.jewelryType = jt;
    const cat = assignShowcaseCategory({
      url,
      kind: parsed.kind,
      stoneType: parsed.stoneType,
      jewelryType: parsed.jewelryType,
      settingFor: parsed.settingFor,
    });
    if (!cat || !needed.has(cat)) continue;
    const ok = await insertProduct(pool, vendorId, source, url, parsed, toUsd(price, 'USD', fx), imageUrl, fx);
    if (ok) {
      filled.set(cat, (filled.get(cat) ?? 0) + 1);
      inserted += 1;
      process.stdout.write(`  + ${cat} ${parsed.sku} ${parsed.title.slice(0, 42)}\n`);
    }
  }
  return inserted;
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'] ?? '';
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: databaseUrl, max: 8 });
  await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS source_url TEXT`);
  await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS source_vendor TEXT`);

  if (!SKIP_WIPE) {
    console.log('Resetting previous dealer imports (Maihan house seed kept)...');
    await wipeImportedCatalog(pool);
  } else {
    console.log('Keeping existing dealer rows (IMPORT_SKIP_WIPE=1)');
  }

  for (const source of SOURCES) {
    await ensureVendor(pool, source);
  }

  const fxRows = await pool.query<{ quote: string; rate: string }>(`
    SELECT DISTINCT ON (quote) quote, rate
    FROM fx_rates
    WHERE base = 'USD' AND quote IN ('AED', 'THB')
    ORDER BY quote, fetched_at DESC
  `);
  const fx = { AED: 3.6725, THB: 34.5 };
  for (const row of fxRows.rows) {
    const quote = row.quote.trim();
    const rate = Number(row.rate);
    if (quote === 'AED' && rate > 0) fx.AED = rate;
    if (quote === 'THB' && rate > 0) fx.THB = rate;
  }

  const filled = await existingSlotCounts(pool);
  console.log('Slots after house seed:', Object.fromEntries(filled));
  let inserted = 0;

  for (const source of SOURCES) {
    if (GAPS_ONLY) break;
    const needed = neededRemaining(filled);
    if (needed.size === 0) break;
    console.log(`\n→ ${source.displayName} (need ${[...needed].join(', ')})`);
    const vendorId = await ensureVendor(pool, source);
    if (source.mode === 'skip') {
      console.log('  vendor recorded, no public catalog crawl');
      continue;
    }
    const rules = await loadRobots(source);
    if (!rules.fetchable) {
      console.log('  robots.txt blocks crawl');
      continue;
    }
    if (source.mode === 'shopify-json') {
      inserted += await importShopify(pool, source, vendorId, rules, fx, filled);
      continue;
    }
    const urls = await collectSourceUrls(source, rules);
    const candidates = takeCandidates(urls, neededRemaining(filled));
    const queued = [...candidates.values()].reduce((n, list) => n + list.length, 0);
    console.log(`  urls ${urls.length}, queued ${queued} across ${candidates.size} categories`);
    inserted += await importCandidates(pool, source, vendorId, rules, fx, filled, candidates);
  }

  for (const gap of GAP_URLS) {
    const needed = neededRemaining(filled);
    if (needed.size === 0) break;
    const source = SOURCES.find((s) => s.slug === gap.slug);
    if (!source) continue;
    console.log(`\n→ gap fill ${source.displayName}`);
    const vendorId = await ensureVendor(pool, source);
    const rules = await loadRobots(source);
    const candidates = takeCandidates(gap.urls, needed);
    inserted += await importCandidates(pool, source, vendorId, rules, fx, filled, candidates);
  }

  await pool.end();
  console.log('\nShowcase import complete');
  console.log(JSON.stringify({ inserted, slots: Object.fromEntries(filled) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
