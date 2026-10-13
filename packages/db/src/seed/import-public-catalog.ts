/**
 * Import public catalog listings into the storefront schema.
 *
 * Respects robots.txt, honours Crawl-delay, never copies marketing copy,
 * and stores source_url + source_vendor on every media row.
 *
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/maihan_dev \
 *     ./node_modules/.bin/tsx src/seed/import-public-catalog.ts
 */
import { Pool } from 'pg';

import {
  classifyUrl,
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
const TARGET = Number(process.env['IMPORT_LIMIT'] ?? '220');
const DEFAULT_DELAY_MS = 2100;

type SourceMode = 'html' | 'shopify-json' | 'skip';

interface Source {
  slug: string;
  displayName: string;
  country: string;
  origin: string;
  sitemapIndex: string;
  mode: SourceMode;
  cap: number;
}

const SOURCES: Source[] = [
  {
    slug: 'natural-gemstone-company',
    displayName: 'The Natural Gemstone Company',
    country: 'US',
    origin: 'https://naturalgemstones.com',
    sitemapIndex: 'https://naturalgemstones.com/sitemap-index.xml',
    mode: 'html',
    cap: 90,
  },
  {
    slug: 'natural-sapphire-company',
    displayName: 'The Natural Sapphire Company',
    country: 'US',
    origin: 'https://www.thenaturalsapphirecompany.com',
    sitemapIndex: 'https://www.thenaturalsapphirecompany.com/sitemap-index.xml',
    mode: 'html',
    cap: 32,
  },
  {
    slug: 'natural-ruby-company',
    displayName: 'The Natural Ruby Company',
    country: 'US',
    origin: 'https://www.thenaturalrubycompany.com',
    sitemapIndex: 'https://www.thenaturalrubycompany.com/sitemap-index.xml',
    mode: 'html',
    cap: 24,
  },
  {
    slug: 'emeralds-com',
    displayName: 'Emeralds.com',
    country: 'US',
    origin: 'https://www.emeralds.com',
    sitemapIndex: 'https://www.emeralds.com/sitemap-index.xml',
    mode: 'html',
    cap: 24,
  },
  {
    slug: 'glorious-diamonds',
    displayName: 'Glorious Diamonds',
    country: 'TH',
    origin: 'https://www.gloriousdiamonds.net',
    sitemapIndex: 'https://www.gloriousdiamonds.net/sitemap.xml',
    mode: 'skip',
    cap: 0,
  },
  {
    slug: 'thai-gem-centre',
    displayName: 'Thai Gem Centre',
    country: 'TH',
    origin: 'https://www.thaigemcentregroup.com',
    sitemapIndex: 'https://www.thaigemcentregroup.com/sitemap.xml',
    mode: 'skip',
    cap: 0,
  },
  {
    slug: 'gems-pavilion',
    displayName: 'Gems Pavilion',
    country: 'TH',
    origin: 'https://gemspavilion.com',
    sitemapIndex: 'https://gemspavilion.com/wp-sitemap.xml',
    mode: 'skip',
    cap: 0,
  },
  {
    slug: 'kavant-sharart',
    displayName: 'Kavant & Sharart',
    country: 'TH',
    origin: 'https://www.kavantandsharart.com',
    sitemapIndex: 'https://www.kavantandsharart.com/sitemap.xml',
    mode: 'shopify-json',
    cap: 12,
  },
  {
    slug: 'pattaraphan',
    displayName: 'PATTARAPHAN',
    country: 'TH',
    origin: 'https://www.pattaraphan.com',
    sitemapIndex: 'https://www.pattaraphan.com/sitemap_index.xml',
    mode: 'html',
    cap: 12,
  },
  {
    slug: 'nineteen-atelier',
    displayName: 'Nineteen Atelier',
    country: 'TH',
    origin: 'https://nineteenatelier.com',
    sitemapIndex: 'https://nineteenatelier.com/sitemap.xml',
    mode: 'shopify-json',
    cap: 10,
  },
  {
    slug: 'temple-and-grace',
    displayName: 'Temple and Grace',
    country: 'TH',
    origin: 'https://www.templeandgrace.co.th',
    sitemapIndex: 'https://www.templeandgrace.co.th/sitemap.xml',
    mode: 'skip',
    cap: 0,
  },
  {
    slug: 'above-diamond',
    displayName: 'Above Diamond',
    country: 'TH',
    origin: 'https://abovediamond.com',
    sitemapIndex: 'https://abovediamond.com/sitemap.xml',
    mode: 'skip',
    cap: 0,
  },
  {
    slug: 'ananta-jewelry',
    displayName: 'ANANTA Jewelry',
    country: 'TH',
    origin: 'https://anantajewelry.com',
    sitemapIndex: 'https://anantajewelry.com/sitemap.xml',
    mode: 'skip',
    cap: 0,
  },
];

const BUCKETS: Array<{ name: string; test: (url: string) => boolean; take: number }> = [
  { name: 'sapphire-loose', test: (u) => /sapphire/i.test(u) && /k\d+/i.test(u) && !/pair|ring|earring|pendant|setting/i.test(u), take: 28 },
  { name: 'ruby-loose', test: (u) => /ruby/i.test(u) && /k\d+/i.test(u) && !/pair|ring|earring|pendant/i.test(u), take: 22 },
  { name: 'emerald-loose', test: (u) => /emerald/i.test(u) && /k\d+/i.test(u) && !/pair|ring|earring|pendant/i.test(u), take: 20 },
  { name: 'spinel-loose', test: (u) => /spinel/i.test(u) && /k\d+/i.test(u) && !/pair|ring/i.test(u), take: 18 },
  { name: 'tourmaline-loose', test: (u) => /tourmaline|paraiba|rubellite/i.test(u) && /k\d+/i.test(u) && !/pair|ring/i.test(u), take: 22 },
  { name: 'pairs', test: (u) => /pair|[-/]pr\d+/i.test(u) && Boolean(skuFromUrl(u)), take: 18 },
  { name: 'rings', test: (u) => /ring/i.test(u) && /[-/]j\d+/i.test(u) && !/js\d+/i.test(u), take: 24 },
  { name: 'earrings', test: (u) => /earring/i.test(u) && /[-/]j\d+/i.test(u), take: 14 },
  { name: 'pendants', test: (u) => /pendant|necklace/i.test(u) && /[-/]j\d+/i.test(u), take: 14 },
  { name: 'settings', test: (u) => /setting/i.test(u) || /[-/]js\d+/i.test(u), take: 20 },
  { name: 'shop-pages', test: (u) => /\/(product|products|shop)\//i.test(u) && !isSkippableUrl(u), take: 16 },
  { name: 'other-sku', test: (u) => Boolean(skuFromUrl(u)), take: 24 },
];

interface RobotsRules {
  delayMs: number;
  disallows: string[];
  fetchable: boolean;
}

interface Counts {
  fetched: number;
  inserted: number;
  skipped: number;
  byVendor: Map<string, number>;
  byKind: Map<string, number>;
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
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => decodeXmlLoc(m[1]!.trim()));
}

function decodeXmlLoc(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function sampleUrls(urls: string[]): string[] {
  const picked: string[] = [];
  const used = new Set<string>();
  for (const bucket of BUCKETS) {
    const matches = urls.filter((u) => bucket.test(u) && !used.has(u) && !isSkippableUrl(u));
    const step = Math.max(1, Math.floor(matches.length / Math.max(bucket.take, 1)));
    let taken = 0;
    for (let i = 0; i < matches.length && taken < bucket.take; i += step) {
      const url = matches[i]!;
      used.add(url);
      picked.push(url);
      taken += 1;
    }
  }
  return picked;
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
    return [...new Set([
      pickAt(0.15),
      pickAt(0.28),
      pickAt(0.42),
      pickAt(0.52),
      pickAt(0.55),
      pickAt(0.80),
      pickAt(0.92),
    ])];
  }
  const productish = sitemapFiles.filter((u) => /product/i.test(u) && !/category|tag|cat/i.test(u));
  if (productish.length > 0) return productish.slice(0, 6);
  return sitemapFiles.slice(0, 6);
}

async function collectSourceUrls(source: Source, rules: RobotsRules): Promise<string[]> {
  const index = await fetchText(source.sitemapIndex, Math.min(rules.delayMs, 800));
  if (!index || !index.includes('<loc')) return [];
  const locs = locTags(index);
  const files = pickSitemapFiles(locs, source.sitemapIndex);
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
    extraText: html.slice(0, 8000),
    productType: typeof json['category'] === 'string' ? json['category'] : null,
  });
  if (isSkippableUrl(url)) return null;
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

function shopifyKind(product: ShopifyProduct): CatalogKind {
  const blob = `${product.title ?? ''} ${product.product_type ?? ''} ${Array.isArray(product.tags) ? product.tags.join(' ') : product.tags ?? ''}`;
  if (/setting|mount/i.test(blob)) return 'setting';
  if (/earring|pendant|necklace|ring|bracelet|brooch/i.test(blob)) return 'jewelry';
  return classifyUrl(product.handle ? `https://example.com/products/${product.handle}` : 'https://example.com/x');
}

async function importShopify(
  pool: Pool,
  source: Source,
  vendorId: string,
  rules: RobotsRules,
  fx: { AED: number; THB: number },
  counts: Counts,
): Promise<void> {
  const feedUrl = `${source.origin}/products.json?limit=250`;
  if (!allowed(feedUrl, rules) && !allowed(`${source.origin}/products/`, rules)) {
    console.log(`  robots blocks shopify feed`);
    return;
  }
  const body = await fetchText(feedUrl, Math.min(rules.delayMs, 800));
  if (!body) return;
  let payload: { products?: ShopifyProduct[] };
  try {
    payload = JSON.parse(body) as { products?: ShopifyProduct[] };
  } catch {
    console.warn(`  shopify json parse failed`);
    return;
  }
  const products = payload.products ?? [];
  let insertedHere = 0;
  for (const product of products) {
    if (counts.inserted >= TARGET || insertedHere >= source.cap) break;
    const handle = product.handle ?? '';
    const url = `${source.origin}/products/${handle}`;
    const imageUrl = pickPrimaryImage((product.images ?? []).map((i) => i.src ?? '').filter(Boolean));
    const price = Number(product.variants?.[0]?.price ?? 0);
    if (!handle || !imageUrl || !(price > 0) || /gift/i.test(product.title ?? '')) continue;
    const extra = [
      product.product_type,
      Array.isArray(product.tags) ? product.tags.join(' ') : product.tags,
    ].filter(Boolean).join(' ');
    const parsed = parseListing({
      url,
      jsonName: product.title,
      jsonSku: product.variants?.[0]?.sku || `SH-${handle}`.slice(0, 40),
      imageUrl,
      extraText: extra,
      productType: product.product_type,
    });
    parsed.kind = shopifyKind(product);
    if (parsed.kind === 'jewelry') {
      const jt = /earring/i.test(extra + product.title) ? 'earrings'
        : /pendant/i.test(extra + product.title) ? 'pendant'
          : /necklace/i.test(extra + product.title) ? 'necklace'
            : /bracelet/i.test(extra + product.title) ? 'bracelet'
              : 'ring';
      parsed.jewelryType = jt;
    }
    const usd = toUsd(price, 'USD', fx);
    const ok = await insertProduct(pool, vendorId, source, url, parsed, usd, imageUrl, fx);
    counts.fetched += 1;
    if (ok) {
      counts.inserted += 1;
      insertedHere += 1;
      counts.byVendor.set(source.displayName, (counts.byVendor.get(source.displayName) ?? 0) + 1);
      counts.byKind.set(parsed.kind, (counts.byKind.get(parsed.kind) ?? 0) + 1);
      process.stdout.write(`  + ${parsed.sku} ${parsed.kind} ${parsed.title.slice(0, 48)}\n`);
    } else {
      counts.skipped += 1;
    }
  }
}

async function importHtmlSource(
  pool: Pool,
  source: Source,
  vendorId: string,
  rules: RobotsRules,
  fx: { AED: number; THB: number },
  counts: Counts,
): Promise<void> {
  let urls: string[] = [];
  try {
    urls = await collectSourceUrls(source, rules);
  } catch (error) {
    console.warn(`sitemap failed:`, (error as Error).message);
  }
  const selected = sampleUrls(urls).slice(0, source.cap * 3);
  console.log(`  urls ${urls.length}, sampled ${selected.length}, delay ${rules.delayMs}ms`);
  let insertedHere = 0;
  for (const url of selected) {
    if (counts.inserted >= TARGET || insertedHere >= source.cap) break;
    if (!allowed(url, rules)) {
      counts.skipped += 1;
      continue;
    }
    const html = await fetchText(url, rules.delayMs);
    counts.fetched += 1;
    if (!html) {
      counts.skipped += 1;
      continue;
    }
    const listing = listingFromPage(url, html);
    if (!listing) {
      counts.skipped += 1;
      continue;
    }
    const usd = toUsd(listing.money.amount, listing.money.currency, fx);
    const ok = await insertProduct(pool, vendorId, source, url, listing.parsed, usd, listing.imageUrl, fx);
    if (ok) {
      counts.inserted += 1;
      insertedHere += 1;
      counts.byVendor.set(source.displayName, (counts.byVendor.get(source.displayName) ?? 0) + 1);
      counts.byKind.set(listing.parsed.kind, (counts.byKind.get(listing.parsed.kind) ?? 0) + 1);
      process.stdout.write(`  + ${listing.parsed.sku} ${listing.parsed.kind} ${listing.parsed.title.slice(0, 48)}\n`);
    } else {
      counts.skipped += 1;
    }
  }
}

async function importSource(
  pool: Pool,
  source: Source,
  fx: { AED: number; THB: number },
  counts: Counts,
): Promise<void> {
  console.log(`\n→ ${source.displayName}`);
  const vendorId = await ensureVendor(pool, source);
  if (source.mode === 'skip') {
    console.log('  vendor recorded, crawl skipped (robots/challenge/no public catalog feed)');
    return;
  }
  const robotsRes = await fetch(`${source.origin}/robots.txt`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  }).catch(() => null);
  let rules: RobotsRules = { delayMs: DEFAULT_DELAY_MS, disallows: [], fetchable: true };
  if (robotsRes && robotsRes.status === 403) {
    console.log('  robots.txt 403 — skip crawl, vendor recorded');
    return;
  }
  if (robotsRes && robotsRes.ok) {
    const body = await robotsRes.text();
    rules = parseRobots(body);
  }
  if (source.mode === 'shopify-json') {
    await importShopify(pool, source, vendorId, rules, fx, counts);
    return;
  }
  await importHtmlSource(pool, source, vendorId, rules, fx, counts);
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'] ?? '';
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: databaseUrl, max: 8 });
  await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS source_url TEXT`);
  await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS source_vendor TEXT`);

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

  const counts: Counts = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    byVendor: new Map<string, number>(),
    byKind: new Map<string, number>(),
  };

  // Serial per host (politeDelay already serialises a host); run sources sequentially
  // so crawl-delay on the NGC family is never overlapped with itself.
  for (const source of SOURCES) {
    if (counts.inserted >= TARGET) {
      await ensureVendor(pool, source);
      continue;
    }
    await importSource(pool, source, fx, counts);
  }

  await pool.end();
  console.log('\nImport complete');
  console.log(JSON.stringify({
    fetched: counts.fetched,
    inserted: counts.inserted,
    skipped: counts.skipped,
    byVendor: Object.fromEntries(counts.byVendor),
    byKind: Object.fromEntries(counts.byKind),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
