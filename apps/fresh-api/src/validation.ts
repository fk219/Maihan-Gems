import { z } from 'zod';
import type { AnyClient } from './db.js';

export class StateError extends Error {
  constructor(message: string) { super(message); this.name = 'StateError'; }
}
export class ConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'ConflictError'; }
}

// ---------------------------------------------------------------------------
// payload schemas (vendors may only submit these fields; unknown → 422)
// ---------------------------------------------------------------------------

export const vendorOnboardingSchema = z.object({
  name: z.string().min(2).max(120),
  country: z.string().regex(/^[A-Za-z]{2}$/),
  legal_name: z.string().min(2).max(200),
  contact_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  website: z.string().url().max(200).optional(),
});

export const gemstoneSubmissionSchema = z.object({
  vendor_ref: z.string().min(1).max(60),
  kind: z.enum(['SINGLE', 'PAIR']).default('SINGLE'),
  variety: z.string().min(2),                       // variety slug or code (e.g. ruby / RUB)
  weight_ct: z.number().positive(),
  colour: z.string().optional(),
  origin: z.string().optional(),
  shape: z.string().optional(),
  clarity: z.string().optional(),
  treatments: z.array(z.string()).max(4).optional(),
  origin_type: z.enum(['NATURAL', 'LAB_CREATED', 'SIMULANT']).default('NATURAL'),
  price_amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(2000).optional(),
});

export const settingSubmissionSchema = z.object({
  vendor_ref: z.string().min(1).max(60),
  jewellery_type: z.enum(['RING', 'EARRING', 'PENDANT', 'NECKLACE', 'BRACELET', 'NOSE_RING']),
  style: z.string().optional(),
  metal: z.string().min(1),                         // metal code, e.g. W14
  min_ct: z.number().positive().optional(),
  max_ct: z.number().positive().optional(),
  price_amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(2000).optional(),
});

export const productSubmissionSchema = z.object({
  vendor_ref: z.string().min(1).max(60),
  jewellery_type: z.enum(['RING', 'EARRING', 'PENDANT', 'NECKLACE', 'BRACELET', 'NOSE_RING']),
  style: z.string().optional(),
  shape: z.string().optional(),
  variety: z.string().optional(),
  metal: z.string().min(1),
  price_amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(2000).optional(),
});

export type GemstoneSubmission = z.infer<typeof gemstoneSubmissionSchema>;
export type SettingSubmission = z.infer<typeof settingSubmissionSchema>;
export type ProductSubmission = z.infer<typeof productSubmissionSchema>;

// ---------------------------------------------------------------------------
// vocabulary resolution — ids come only from existing reference rows (never invented)
// ---------------------------------------------------------------------------

export class VocabError extends Error {
  constructor(message: string) { super(message); this.name = 'VocabError'; }
}

export async function resolveVariety(client: AnyClient, key: string): Promise<{ id: number; code: string; familyCode: string; slug: string }> {
  const { rows } = await client.query(
    `SELECT v.id, v.code, v.slug, f.code AS family_code
     FROM fresh.gemstone_varieties v JOIN fresh.gemstone_families f ON f.id = v.family_id
     WHERE v.slug = lower($1) OR v.code = upper($1)`,
    [key],
  );
  if (!rows[0]) throw new VocabError(`unknown variety '${key}'`);
  const r = rows[0]!;
  if (!r.code || !r.family_code) throw new VocabError(`variety '${key}' has no semantic code assigned`);
  return { id: Number(r.id), code: String(r.code), familyCode: String(r.family_code), slug: String(r.slug) };
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';

// small trade-code aliases for clarity short forms (VVS/VS/SI …) → vocabulary names
const CLARITY_ALIASES: Record<string, string> = {
  VVS: 'Very Slightly Included', VS: 'Slightly Included', SI: 'Slightly Included',
  EC: 'Eye Clean', VVSI: 'Very Very Slightly Included', I: 'Included', LC: 'Included',
};

async function firstId(client: AnyClient, sql: string, params: unknown[]): Promise<number | null> {
  const { rows } = await client.query(sql, params);
  return rows[0] ? Number(rows[0].id) : null;
}

export async function resolveId(client: AnyClient, table: string, keyCol: string, key: string, label: string): Promise<number> {
  const id = await firstId(client, `SELECT id FROM fresh.${table} WHERE ${keyCol} = $1`, [key]);
  if (id != null) return id;
  // name fallback — vocabulary values are human phrases (e.g. "Very Slightly Included");
  // accept both spaced and hyphenated spellings of the same phrase
  if (table === 'clarities' || table === 'treatments') {
    const byName = await firstId(
      client,
      `SELECT id FROM fresh.${table} WHERE lower(name) = replace(lower($1), '-', ' ')`,
      [key],
    );
    if (byName != null) return byName;
  }
  throw new VocabError(`unknown ${label} '${key}'`);
}

export async function resolveOptional(client: AnyClient, table: string, keyCol: string, value: string | undefined, label: string): Promise<number | null> {
  if (!value) return null;
  if (table === 'clarities' && CLARITY_ALIASES[norm(value).toUpperCase()]) {
    value = CLARITY_ALIASES[norm(value).toUpperCase()]!;
  }
  const lookupKey = table === 'clarities' || table === 'treatments' || table === 'metals' || table === 'jewellery_types' ? norm(value).toUpperCase() : norm(value);
  return resolveId(client, table, keyCol, lookupKey, label);
}

export async function resolveTreatmentIds(client: AnyClient, values: string[] | undefined): Promise<number[]> {
  if (!values || values.length === 0) return [];
  const ids: number[] = [];
  for (const v of values) ids.push(await resolveId(client, 'treatments', 'code', norm(v).toUpperCase(), `treatment '${v}'`));
  return ids;
}

export const JT_LETTER: Record<string, string> = { RING: 'R', EARRING: 'E', PENDANT: 'P', NECKLACE: 'N', BRACELET: 'B', NOSE_RING: 'X' };
