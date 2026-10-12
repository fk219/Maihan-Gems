/**
 * packages/contracts/src/dto/cms/blocks.ts
 *
 * Phase 12 — Stage B / Global Task B1 (E12.1).
 *
 * The typed block registry: one validated `props` schema per
 * `content_block_type` (0002_enums.sql, doc 22 §2). `pages.blocks` holds
 * `[{ id, type, props, visibility? }]`; validation on every write (doc 22
 * §6 rule 1) and unknown types fail validation (doc 22 §1 rule 3).
 *
 * Media references resolve through approved metadata (`assets.id`) — never
 * a raw client URL (doc 22 §5; doc 09 uploads).
 *
 * Purity: Zod only (the contracts dependency rule).
 */
import { z } from 'zod';

/** The 20 enum values, verbatim from 0002_enums.sql. */
export const CONTENT_BLOCK_TYPES = Object.freeze([
  'HERO', 'RICH_TEXT', 'IMAGE', 'IMAGE_GALLERY', 'PRODUCT_COLLECTION',
  'GEMSTONE_COLLECTION', 'CATEGORY_GRID', 'FAQ', 'BUYING_GUIDE',
  'CERTIFICATE_GUIDE', 'COMPARISON_TABLE', 'VIDEO', 'CTA', 'BANNER',
  'TESTIMONIAL', 'SHOWROOM_CTA', 'VEDIC_CTA', 'ASTROLOGY_CONTENT',
  'CUSTOM_DESIGN_CTA', 'CONTACT_CTA',
] as const);

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export const ContentBlockTypeSchema = z.enum(CONTENT_BLOCK_TYPES);

/** Shared primitives. */
const StableId = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'stable id');
const AssetRef = z.string().uuid(); // an assets.id, never a URL
const ExternalHref = z.string().url().refine(
  (u) => u.startsWith('https://'),
  { message: 'external hrefs must be https' },
);
const InternalHref = z.string().regex(/^\/[^\s]*$/, 'internal path starting with /');
const Href = z.union([InternalHref, ExternalHref]);

const VisibleTo = z.enum(['ALL', 'MEMBERS']).default('ALL');
const Visibility = z.object({ visibleTo: VisibleTo }).default({ visibleTo: 'ALL' });

/* ── Per-type props schemas ──────────────────────────────────────────── */

export const HERO_PROPS = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(140),
  subtitle: z.string().max(400).optional(),
  assetId: AssetRef.optional(),
  primaryHref: Href.optional(),
  primaryLabel: z.string().max(40).optional(),
  secondaryHref: Href.optional(),
  secondaryLabel: z.string().max(40).optional(),
});

export const RICH_TEXT_PROPS = z.object({
  /** Sanitised at render against the doc-09 allow-list; stored verbatim. */
  markdown: z.string().min(1).max(50_000),
});

export const IMAGE_PROPS = z.object({
  assetId: AssetRef,
  alt: z.string().min(1).max(300),
  caption: z.string().max(400).optional(),
});

export const IMAGE_GALLERY_PROPS = z.object({
  items: z.array(IMAGE_PROPS).min(1).max(24),
});

export const PRODUCT_COLLECTION_PROPS = z.object({
  title: z.string().max(140).optional(),
  /** Source URLs (migration spine), resolved server-side to slugs. */
  sourceUrls: z.array(z.string().url()).min(1).max(24),
});

export const GEMSTONE_COLLECTION_PROPS = z.object({
  title: z.string().max(140).optional(),
  gemRefs: z.array(z.string().regex(/^(K|PR)\d+$/)).min(1).max(24),
});

export const CATEGORY_GRID_PROPS = z.object({
  title: z.string().max(140).optional(),
  items: z.array(z.object({ label: z.string().min(1).max(60), href: Href })).min(2).max(48),
});

export const FAQ_PROPS = z.object({
  items: z.array(z.object({ question: z.string().min(1).max(300), answer: z.string().min(1).max(2_000) })).min(1).max(60),
});

export const BUYING_GUIDE_PROPS = z.object({
  sections: z.array(z.object({ heading: z.string().min(1).max(140), markdown: z.string().min(1).max(10_000) })).min(1).max(40),
});

export const CERTIFICATE_GUIDE_PROPS = z.object({
  sections: z.array(z.object({ heading: z.string().min(1).max(140), markdown: z.string().min(1).max(10_000) })).min(1).max(40),
});

export const COMPARISON_TABLE_PROPS = z.object({
  title: z.string().max(140).optional(),
  columns: z.array(z.string().min(1).max(60)).min(2).max(8),
  rows: z.array(z.array(z.string().max(120))).min(1).max(40),
});

export const VIDEO_PROPS = z.object({
  assetId: AssetRef.optional(),
  externalUrl: z.string().url().optional(),
  posterAssetId: AssetRef.optional(),
  title: z.string().max(140).optional(),
});

export const CTA_PROPS = z.object({
  label: z.string().min(1).max(60),
  href: Href,
  tone: z.enum(['PRIMARY', 'SECONDARY']).default('PRIMARY'),
});

export const BANNER_PROPS = z.object({
  message: z.string().min(1).max(300),
  href: Href.optional(),
});

/** TESTIMONIAL — doc 22 §2: source `[UNKNOWN]`; never presented as reconstructed. */
export const TESTIMONIAL_PROPS = z.object({
  quote: z.string().min(1).max(600),
  attribution: z.string().max(80).optional(),
});

export const SHOWROOM_CTA_PROPS = z.object({
  heading: z.string().min(1).max(140),
  body: z.string().max(600).optional(),
  href: InternalHref,
});

export const VEDIC_CTA_PROPS = z.object({
  heading: z.string().min(1).max(140),
  href: Href,
});

export const ASTROLOGY_CONTENT_PROPS = z.object({
  markdown: z.string().min(1).max(20_000),
  sign: z.string().max(40).optional(),
});

export const CUSTOM_DESIGN_CTA_PROPS = z.object({
  heading: z.string().min(1).max(140),
  href: Href.default('/design-your-own'),
});

export const CONTACT_CTA_PROPS = z.object({
  heading: z.string().min(1).max(140),
  city: z.string().max(60).optional(),
  href: Href.default('/contact'),
});

export const BLOCK_PROPS_BY_TYPE = Object.freeze({
  HERO: HERO_PROPS,
  RICH_TEXT: RICH_TEXT_PROPS,
  IMAGE: IMAGE_PROPS,
  IMAGE_GALLERY: IMAGE_GALLERY_PROPS,
  PRODUCT_COLLECTION: PRODUCT_COLLECTION_PROPS,
  GEMSTONE_COLLECTION: GEMSTONE_COLLECTION_PROPS,
  CATEGORY_GRID: CATEGORY_GRID_PROPS,
  FAQ: FAQ_PROPS,
  BUYING_GUIDE: BUYING_GUIDE_PROPS,
  CERTIFICATE_GUIDE: CERTIFICATE_GUIDE_PROPS,
  COMPARISON_TABLE: COMPARISON_TABLE_PROPS,
  VIDEO: VIDEO_PROPS,
  CTA: CTA_PROPS,
  BANNER: BANNER_PROPS,
  TESTIMONIAL: TESTIMONIAL_PROPS,
  SHOWROOM_CTA: SHOWROOM_CTA_PROPS,
  VEDIC_CTA: VEDIC_CTA_PROPS,
  ASTROLOGY_CONTENT: ASTROLOGY_CONTENT_PROPS,
  CUSTOM_DESIGN_CTA: CUSTOM_DESIGN_CTA_PROPS,
  CONTACT_CTA: CONTACT_CTA_PROPS,
} as const satisfies Record<ContentBlockType, z.ZodTypeAny>);

/* ── The page-block envelope (doc 22 §2) ─────────────────────────────── */

export const ContentBlockSchema = z.intersection(
  z.object({
    id: StableId,
    type: ContentBlockTypeSchema,
    visibility: Visibility,
  }),
  z.object({ props: z.record(z.string(), z.unknown()) }),
);

export const PageBlocksSchema = z.array(ContentBlockSchema).max(120);

/**
 * Validate a full blocks array: every `id` unique, every `props` conforms to
 * its registry schema. Returns the typed blocks or throws a single error
 * carrying the failing block id.
 */
export function parsePageBlocks(input: unknown): Array<{
  id: string;
  type: ContentBlockType;
  props: Record<string, unknown>;
  visibility: { visibleTo: 'ALL' | 'MEMBERS' };
}> {
  const blocks = PageBlocksSchema.parse(input);
  const seen = new Set<string>();
  for (const block of blocks) {
    if (seen.has(block.id)) {
      throw new Error(`CONTENT_BLOCK: duplicate block id '${block.id}'`);
    }
    seen.add(block.id);
    const parsed = BLOCK_PROPS_BY_TYPE[block.type].safeParse(block.props);
    if (!parsed.success) {
      throw new Error(`CONTENT_BLOCK: invalid props for '${block.id}' (${block.type}): ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
  }
  return blocks as Array<{
    id: string;
    type: ContentBlockType;
    props: Record<string, unknown>;
    visibility: { visibleTo: 'ALL' | 'MEMBERS' };
  }>;
}
