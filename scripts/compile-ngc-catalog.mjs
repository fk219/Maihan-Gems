#!/usr/bin/env node
/**
 * Compile docs/research/ngc/products.json + taxonomy.json into slim runtime files.
 * Strips raw HTML, Nuxt state, and 360 frame lists. Keeps titles, specs, media.
 * Attaches Cloudinary o1zwhvbi public_id + f_auto,q_auto delivery URLs.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const CLOUD = 'o1zwhvbi';
const CLOUD_PREFIX = `https://res.cloudinary.com/${CLOUD}`;
const MAP_URL = `${CLOUD_PREFIX}/raw/upload/v1791916341/maihan/research/products.cloudinary.json.gz`;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'docs/research/ngc');
const OUT = path.join(ROOT, 'apps/web/src/data');

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pathFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return String(url).startsWith('/') ? url : null;
  }
}

function basename(filePath, url) {
  const raw = filePath || url || '';
  const clean = raw.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || '';
}

function deriveTitle(product) {
  if (product.title) return product.title;
  if (product.page?.h1_title) return product.page.h1_title;
  const d = product.api_detail ?? {};
  if (product.kind === 'setting') {
    const style = (d.styleNames ?? [])[0] ?? 'Setting';
    return [d.metalName, style, d.category ?? product.subcategory, product.id].filter(Boolean).join(' ');
  }
  if (product.kind === 'jewelry' || product.kind === 'dyo_composite') {
    const center = (d.centerStones ?? [])[0] ?? d.stone ?? {};
    const metal = d.metal?.value ?? d.metalName ?? d.setting?.metalName;
    const bits = [];
    const wt = center.totalWeight ?? center.weight;
    if (wt) bits.push(`${Number(wt).toFixed(2)} Ct.`);
    if (center.color) bits.push(center.color);
    if (center.stoneType) bits.push(center.stoneType);
    bits.push(d.category ?? product.subcategory ?? 'Jewellery');
    if (metal) bits.push(metal);
    bits.push(product.id);
    return bits.filter(Boolean).join(' ');
  }
  return product.id;
}

function mapMediaKind(type) {
  switch (type) {
    case 'image':
      return 'image';
    case 'lifestyle_image':
      return 'lifestyle_image';
    case 'video':
      return 'video';
    case 'video_thumbnail':
      return 'video_thumbnail';
    case 'certificate_report':
      return 'certificate';
    case 'appraisal':
      return 'appraisal';
    case 'sarin_3d_scan_report':
      return 'scan_report';
    case 'sarin_3d_model_srn':
      return 'scan_3d_srn';
    case 'spin360_frames':
      return 'spin360';
    default:
      return type || 'image';
  }
}

function resourceTypeFor(kind, fileName) {
  const name = String(fileName ?? '').toLowerCase();
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

function relativeCloudinaryFile(productId, fileName, localPath) {
  const fallback = fileName && String(fileName).length > 0 ? fileName : 'spin360.mp4';
  const raw = String(localPath ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
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

function deliveryUrl(publicId, resource) {
  if (resource === 'raw') return `${CLOUD_PREFIX}/raw/upload/${publicId}`;
  return `${CLOUD_PREFIX}/${resource}/upload/f_auto,q_auto/${publicId}`;
}

function withAutoTransform(secureUrl, resource) {
  if (!secureUrl) return secureUrl;
  if (resource === 'raw') return secureUrl;
  if (secureUrl.includes('/upload/f_auto,q_auto/')) return secureUrl;
  return secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
}

function cloudinaryFor(productId, kind, fileName, mapped, localPath) {
  if (mapped?.cloudinary_public_id) {
    const resource = mapped.cloudinary_resource_type || resourceTypeFor(kind, fileName);
    const publicId = mapped.cloudinary_public_id;
    return {
      cloudinaryPublicId: publicId,
      cloudinaryResourceType: resource,
      secureUrl: withAutoTransform(mapped.secure_url, resource) || deliveryUrl(publicId, resource),
    };
  }
  const rel = relativeCloudinaryFile(productId, kind === 'spin360' ? fileName || 'spin360.mp4' : fileName, localPath);
  if (kind === 'spin360') {
    const publicId = `maihan/products/${productId}/${rel}`;
    return {
      cloudinaryPublicId: publicId,
      cloudinaryResourceType: 'video',
      secureUrl: deliveryUrl(publicId, 'video'),
    };
  }
  if (!fileName && !rel) return {};
  const resource = resourceTypeFor(kind, fileName || rel);
  const publicId = `maihan/products/${productId}/${rel}`;
  return {
    cloudinaryPublicId: publicId,
    cloudinaryResourceType: resource,
    secureUrl: deliveryUrl(publicId, resource),
  };
}

async function loadCloudinaryMap() {
  const local = path.join(SRC, 'products.cloudinary.json');
  if (fs.existsSync(local)) {
    return JSON.parse(fs.readFileSync(local, 'utf8'));
  }
  try {
    const res = await fetch(MAP_URL);
    if (!res.ok) {
      console.warn(`cloudinary map ${res.status} ${res.statusText} — deriving public_ids from maihan/products/<id>/<file>`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const json = zlib.gunzipSync(buf).toString('utf8');
    const parsed = JSON.parse(json);
    fs.writeFileSync(local, JSON.stringify(parsed));
    return parsed;
  } catch (error) {
    console.warn(`cloudinary map fetch failed (${error.message}) — deriving public_ids`);
    return null;
  }
}

function mediaLookup(productMap, item) {
  if (!productMap) return null;
  const items = Array.isArray(productMap.media)
    ? productMap.media
    : Object.values(productMap.media ?? {});
  const file = basename(item.local_path, item.url);
  return (
    items.find((row) => row.cloudinary_public_id && (row.local_path === item.local_path || basename(row.local_path, row.url) === file)) ??
    items.find((row) => row.order === item.order && (row.type === item.type || row.kind === item.type)) ??
    null
  );
}

function compileMedia(product, mappedProduct) {
  const items = Object.values(product.media ?? {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const media = [];
  let spin = null;
  let sarinPath = null;
  for (const item of items) {
    if (item.type === 'spin360_frames') {
      spin = {
        framesCount: item.frames_count ?? 0,
        urlPattern: item.url_pattern ?? null,
      };
      const mapped = mediaLookup(mappedProduct, item);
      media.push({
        kind: 'spin360',
        order: item.order ?? media.length,
        title: '360°',
        url: item.url_pattern ?? null,
        urlPattern: item.url_pattern ?? null,
        framesCount: item.frames_count ?? 0,
        localPath: item.local_dir ?? null,
        fileName: 'spin360.mp4',
        ...cloudinaryFor(product.id, 'spin360', 'spin360.mp4', mapped, item.local_dir ?? item.local_path),
      });
      continue;
    }
    if (item.type === 'sarin_3d_model_srn') sarinPath = item.url ?? null;
    const fileName = basename(item.local_path, item.url);
    const kind = mapMediaKind(item.type);
    const mapped = mediaLookup(mappedProduct, item);
    media.push({
      kind,
      order: item.order ?? media.length,
      url: item.url ?? item.variants?.full ?? null,
      title: item.title ?? null,
      description: item.description ?? null,
      sourceType: item.source_type_code ?? null,
      pastCreation: Boolean(item.past_creation),
      localPath: item.local_path ?? null,
      fileName,
      thumbnail: item.thumbnailUrl ?? null,
      variants: item.variants ?? null,
      ...cloudinaryFor(product.id, kind, fileName, mapped, item.local_path ?? item.local_dir),
    });
  }
  return { media, spin, sarinPath };
}

function stoneFromDetail(d = {}, fallback = {}) {
  return {
    stoneType: d.stoneType ?? fallback.stoneType ?? null,
    stoneSubType: d.stoneSubType ?? null,
    weightCt: d.weight ?? d.totalWeight ?? d.maxWeightStone ?? null,
    lengthMm: d.length ?? null,
    widthMm: d.width ?? null,
    depthMm: d.height ?? null,
    shape: d.shape ?? null,
    cut: d.cut ?? null,
    cuttingStyle: d.cuttingStyle ?? null,
    color: d.color ?? null,
    colorIntensity: d.colorIntensity ?? null,
    clarity: d.clarity ?? null,
    enhancement: d.enhancement ?? null,
    origin: d.origin ?? null,
    lab: d.labType ?? null,
    labColor: d.labColor ?? null,
    isStar: Boolean(d.isStar),
    starAppearance: d.starAppearance || null,
    pricePerCt: d.pricePerCt ?? null,
  };
}

function compileProduct(product, mappedProduct) {
  const d = product.api_detail ?? {};
  const title = deriveTitle(product);
  const sourcePath = pathFromUrl(product.source_url) ?? pathFromUrl(product.page?.url);
  const listingPath = pathFromUrl(product.listing_url);
  const { media, spin, sarinPath } = compileMedia(product, mappedProduct);
  const primary = stoneFromDetail(d, { stoneType: product.subcategory });
  const pairStones = Array.isArray(d.stones)
    ? d.stones.map((s) => stoneFromDetail(s))
    : [];
  const centerStones = Array.isArray(d.centerStones) ? d.centerStones.map((s) => stoneFromDetail(s, s)) : [];
  const sideStones = Array.isArray(d.sideStones) ? d.sideStones.map((s) => stoneFromDetail(s, s)) : [];
  const slug = (sourcePath ? sourcePath.split('/').filter(Boolean).pop() : null) ?? `${slugify(title)}-${product.id}`.toLowerCase();

  let kind = product.kind;
  if (kind === 'stone') kind = 'loose_stone';
  if (kind === 'pair') kind = 'stone_pair';

  const settingType = (() => {
    const sub = String(product.subcategory ?? '').toLowerCase();
    if (sub.includes("men")) return 'mens_ring';
    if (sub.includes('earring')) return 'earring';
    if (sub.includes('bracelet')) return 'bracelet';
    if (sub.includes('necklace') || sub.includes('pendant')) return 'pendant_necklace';
    if (sub.includes('ring') || product.kind === 'setting') return 'ring';
    return null;
  })();

  const jewelryType = (() => {
    const cat = String(d.category ?? product.subcategory ?? '').toLowerCase();
    if (cat.includes('earring')) return 'earring';
    if (cat.includes('bracelet') || cat.includes('bangle')) return 'bracelet';
    if (cat.includes('necklace')) return 'necklace';
    if (cat.includes('pendant')) return 'pendant';
    if (cat.includes('brooch')) return 'brooch';
    if (cat.includes('cuff')) return 'cufflink';
    if (cat.includes('ring') || product.kind === 'jewelry') return 'ring';
    return null;
  })();

  return {
    id: product.id,
    kind,
    category: product.category,
    subcategory: product.subcategory,
    parentSubcategory: product.parent_subcategory,
    title,
    slug,
    path: sourcePath ?? `/${slug}`,
    listingPath,
    sourceUrl: product.source_url,
    priceUsd: product.price_usd ?? d.price ?? 0,
    discountPriceUsd: product.discount_price_usd ?? d.discountPrice ?? null,
    bankWirePriceUsd: product.bank_wire_price_usd ?? d.bankWirePrice ?? null,
    pricePerCt: d.pricePerCt ?? primary.pricePerCt,
    availability: d.itemStatus?.description ?? product.availability ?? 'This item is available',
    availabilityCode: d.itemStatus?.status ?? 0,
    descriptionHtml: d.productDescription ?? product.description_html ?? '',
    seoTitle: product.page?.html_title ?? null,
    breadcrumbs: (product.page?.breadcrumbs ?? []).map((b) => ({ name: b.name, path: b.path ?? null })),
    detailsTable: product.page?.details_table ?? [],
    colorCategories: d.colorCategories ?? [],
    styles: d.styleNames ?? [],
    metals: Array.isArray(d.metalTypes)
      ? d.metalTypes.map((m) => ({
          code: m.metalTypeCode ?? m.code ?? m.key,
          name: m.metalName ?? m.value ?? m.name,
        }))
      : [],
    metalName: d.metalName ?? d.metal?.value ?? null,
    metalCode: d.metalTypeCode ?? d.metal?.key ?? null,
    ...primary,
    pairStones,
    centerStones,
    sideStones,
    dyoEnabled: Boolean(d.dyoProcess ?? d.customDesigns),
    gemologistSuggestions: Boolean(d.gemologistSuggestions),
    interestCount: d.interestCount ?? 0,
    shipDaysMin: d.productionTimeFrom ?? null,
    shipDaysMax: d.productionTimeTo ?? null,
    estimatedShipDate: d.estimatedShipDate ?? null,
    settingType,
    jewelryType,
    ringSizes: d.sizes ?? null,
    chainLength: d.chainLength ?? null,
    chainIncluded: d.chainIncluded ?? null,
    engravingMax: d.engravingLength ?? null,
    vedicSetting: Boolean(d.vedicSetting),
    containsVideo360: Boolean(d.containsVideo360),
    containsSarin: Boolean(d.containsSarin),
    contains3D: Boolean(d.contains3D),
    threeDFilePath: d.threeDFilePath || null,
    sarinPath: d.sarinPath || sarinPath,
    media,
    spin,
    settingRef: d.setting?.id ?? (product.kind === 'dyo_composite' ? String(product.id).split('-')[0] : null),
    stoneRef: d.stone?.id ?? null,
  };
}

function compileTaxonomy(raw) {
  const gems = raw.top_level.Gemstones;
  const settings = raw.top_level.Settings;
  const jewelry = raw.top_level.Jewelry;

  function flattenTypes(types, acc = []) {
    for (const t of types ?? []) {
      acc.push({
        name: t.name,
        slug: t.slug,
        parent: t.parent,
        urls: t.urls ?? { loose: t.url },
        children: (t.children ?? []).map((c) => c.slug),
      });
      if (t.children?.length) flattenTypes(t.children, acc);
    }
    return acc;
  }

  return {
    roots: [
      { id: 'gemstones', name: 'Gemstones', slug: 'natural-gemstones', all: 'all-natural-gemstones', pairs: 'natural-gemstone-pairs' },
      { id: 'settings', name: 'Settings', slug: 'settings' },
      { id: 'jewellery', name: 'Jewellery', slug: 'jewellery' },
    ],
    gemstones: flattenTypes(gems.types),
    colors: (gems.color_categories ?? []).map((c) => ({
      name: c.name,
      slug: slugify(c.name),
      loose: pathFromUrl(c.loose),
      pairs: pathFromUrl(c.pairs),
      rings: pathFromUrl(c.rings),
    })),
    settings: (settings.types ?? []).map((t) => ({
      name: t.name,
      path: pathFromUrl(t.url),
      styles: (t.styles ?? []).map((s) => ({ name: s.name, query: s.query ?? null })),
    })),
    jewellery: (jewelry.types ?? []).map((t) => ({
      name: t.name,
      path: pathFromUrl(t.url),
      styles: (t.styles ?? []).map((s) => ({ name: s.name, query: s.query ?? null })),
    })),
    jewelleryLandings: {
      rings: pathFromUrl(jewelry.landing_rings),
      allRings: pathFromUrl(jewelry.all_rings),
    },
  };
}

const products = JSON.parse(fs.readFileSync(path.join(SRC, 'products.json'), 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync(path.join(SRC, 'taxonomy.json'), 'utf8'));
const cloudinaryMap = await loadCloudinaryMap();
const mappedList = Array.isArray(cloudinaryMap)
  ? cloudinaryMap
  : Array.isArray(cloudinaryMap?.products)
    ? cloudinaryMap.products
    : [];
const mappedById = new Map(mappedList.map((row) => [row.id, row]));
const compiled = products.map((product) => compileProduct(product, mappedById.get(product.id)));
const tax = compileTaxonomy(taxonomy);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'ngc-catalog.json'), JSON.stringify(compiled));
fs.writeFileSync(path.join(OUT, 'ngc-taxonomy.json'), JSON.stringify(tax, null, 2));

const kinds = {};
let withCloud = 0;
for (const p of compiled) {
  kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
  withCloud += p.media.filter((m) => m.cloudinaryPublicId).length;
}
const catalogBytes = fs.statSync(path.join(OUT, 'ngc-catalog.json')).size;
console.log(`compiled ${compiled.length} products`, kinds);
console.log(`cloudinary media ${withCloud} (map ${mappedList.length ? 'loaded' : 'derived'})`);
console.log(`ngc-catalog.json ${(catalogBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`gem types ${tax.gemstones.length}, colours ${tax.colors.length}`);
