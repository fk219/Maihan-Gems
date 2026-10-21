/**
 * Phase 1 Task 9 — reference-data evidence verification (corpus gate).
 *
 * The seed data is not trusted from its constants alone: this spec re-derives
 * the evidence-bound values from the REAL source archive, read-only, and
 * binds the artifacts by SHA-256 exactly like the Task 7 corpus gate binds
 * `products.jsonl` (MANIFEST entry 5):
 *
 *   - taxonomy.json (MANIFEST entry 7: color_intensity_help /
 *     enhancements_help / clarity_help) — proves the intensity, clarity and
 *     treatment value sets, their verbatim label strings and the D9 doubled
 *     forms;
 *   - urls.jsonl (MANIFEST entry 2) — proves the 14 observed metal slug
 *     phrases are 1:1 with the SKU metal codes (INV-04), and that the 22
 *     setting-style slugs reconcile exactly (15 base + 7 pendant variants =
 *     10,772 settings routes; SoT §4 counts).
 *
 * A drift between the seed and the artifact fails here — the seed is never
 * silently rewritten. The whole file skips when the archive is absent (the
 * documented fresh-clone state: MANIFEST section 5), exactly like the Task 7
 * corpus spec.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CLARITY_LABEL_SEED,
  CLARITY_SEED,
  COLOUR_INTENSITY_SEED,
  JEWELLERY_TYPE_SEED,
  METAL_SEED,
  SETTING_STYLE_SEED,
  TREATMENT_LABEL_SEED,
  TREATMENT_SEED,
} from './reference-data.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
/** Auto-detect the archive root: the sanctioned layout is `<root>/naturalgemstones`,
 * but restored environments may nest it one level deeper
 * (`naturalgemstones/naturalgemstones`). Never MOVE the archive — detect it. */
function detectArchiveRoot(): string {
  const override = process.env['NATURALGEMSTONES_ROOT'];
  if (override) return override;
  const shallow = path.join(repoRoot, 'naturalgemstones');
  if (existsSync(path.join(shallow, 'reverse_engineered'))) return shallow;
  const nested = path.join(shallow, 'naturalgemstones');
  if (existsSync(path.join(nested, 'reverse_engineered'))) return nested;
  return shallow;
}

const archiveRoot = detectArchiveRoot();
const MANIFEST_PATH = path.join(repoRoot, 'docs', 'evidence', 'MANIFEST.md');

function manifestDigest(relativePath: string): string | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  for (const line of readFileSync(MANIFEST_PATH, 'utf8').split('\n')) {
    if (line.includes(`\`${relativePath}\``)) {
      const match = /`([0-9a-f]{64})`/.exec(line);
      if (match !== null && match[1] !== undefined) return match[1];
    }
  }
  return null;
}

/** Refuses silently-incident substitutes: the artifact must hash to the manifest digest. */
function verifyArtifact(relativePath: string): string {
  const expected = manifestDigest(relativePath);
  expect(expected, `manifest digest for ${relativePath}`).not.toBeNull();
  const absolute = path.join(archiveRoot, relativePath.replace(/^naturalgemstones\//, ''));
  const actual = createHash('sha256').update(readFileSync(absolute)).digest('hex');
  expect(actual, `${relativePath} byte digest`).toBe(expected);
  return readFileSync(absolute, 'utf8');
}


/** Asserts the taxonomy field exists (never silently undefined under noUncheckedIndexedAccess). */
function fieldOf(
  taxonomy: { fields: Record<string, unknown> },
  name: string,
): { unique_values: number; observed_count: number; top_values: { value: string; count: number }[] } {
  const f = taxonomy.fields[name];
  expect(f, `taxonomy field ${name}`).toBeDefined();
  return f as { unique_values: number; observed_count: number; top_values: { value: string; count: number }[] };
}

/** D9 doubled form: two identical halves ('Eye Clean Eye Clean' -> ['Eye Clean', 'Eye Clean']). */
function isDoubledForm(value: string): boolean {
  const tokens = value.split(' ');
  if (tokens.length === 0 || tokens.length % 2 !== 0) return false;
  const half = tokens.length / 2;
  return tokens.slice(0, half).join(' ') === tokens.slice(half).join(' ');
}

const archivePresent = existsSync(path.join(archiveRoot, 'reverse_engineered', 'data', 'taxonomy.json'));
const d = describe.skipIf(!archivePresent);

d('taxonomy.json (MANIFEST entry 7, SHA-256-gated)', () => {
  const parsed = (): unknown => JSON.parse(verifyArtifact('naturalgemstones/reverse_engineered/data/taxonomy.json'));

  it('intensities: the 5 observed canonical values equal the seeded names', () => {
    const taxonomy = parsed() as unknown as { fields: Record<string, { unique_values: number; observed_count: number; top_values: { value: string; count: number }[] }> };
    expect(fieldOf(taxonomy, 'color_intensity_help').unique_values).toBe(8);
    expect(fieldOf(taxonomy, 'color_intensity_help').observed_count).toBe(1024);
    const canonical = fieldOf(taxonomy, 'color_intensity_help').top_values.filter((v) => !isDoubledForm(v.value)).map((v) => v.value);
    expect(new Set(canonical)).toEqual(new Set(COLOUR_INTENSITY_SEED.map((r) => r.name)));
    expect(canonical).toHaveLength(5);
  });

  it('intensities: the observed counts behind each seeded row (singles + D9 doubles)', () => {
    const taxonomy = parsed() as unknown as { fields: Record<string, { top_values: { value: string; count: number }[] }> };
    const values = new Map(fieldOf(taxonomy, 'color_intensity_help').top_values.map((v) => [v.value, v.count] as [string, number]));
    // The three D9 doubled forms repeat an intensity we seed.
    for (const [form] of values) {
      if (isDoubledForm(form)) {
        expect(COLOUR_INTENSITY_SEED.some((r) => r.name === form.split(' ')[0]), `${form} repeats a seeded intensity`).toBe(true);
      }
    }
    // The five canonical values each reconcile: single count + doubled count.
    for (const row of COLOUR_INTENSITY_SEED) {
      const single = values.get(row.name) ?? 0;
      const doubledCount = values.get(`${row.name} ${row.name}`) ?? 0;
      expect(row.observedCount, row.code).toBe(single + doubledCount);
    }
    // D9: Light 85+18, Medium 379+67, Vivid 64+28, Dark 3, Intense 380 — total 1,024.
    expect(COLOUR_INTENSITY_SEED.reduce((t, r) => t + r.observedCount, 0)).toBe(1024);
  });

  it('clarities: 7 unique values (5 canonical + 2 doubled) and every raw string is a seeded label', () => {
    const taxonomy = parsed() as unknown as { fields: Record<string, { unique_values: number; observed_count: number; top_values: { value: string; count: number }[] }> };
    expect(fieldOf(taxonomy, 'clarity_help').unique_values).toBe(7);
    expect(fieldOf(taxonomy, 'clarity_help').observed_count).toBe(1024);
    const seeded = new Set(CLARITY_LABEL_SEED.map((r) => r.rawLabel));
    for (const { value } of fieldOf(taxonomy, 'clarity_help').top_values) {
      expect(seeded.has(value), `${value} is a seeded clarity label`).toBe(true);
    }
    // 5 canonical + 2 doubled = the 7 clarity labels; doubled rows carry token_count 2.
    expect(CLARITY_LABEL_SEED.filter((r) => r.isDoubled)).toHaveLength(2);
    for (const doubled of CLARITY_LABEL_SEED.filter((r) => r.isDoubled)) {
      expect(doubled.tokenCount).toBe(2);
      expect(isDoubledForm(doubled.rawLabel)).toBe(true);
    }
  });

  it('clarities: the observed counts behind each seeded row (singles + D9 doubles)', () => {
    const taxonomy = parsed() as unknown as { fields: Record<string, { top_values: { value: string; count: number }[] }> };
    const values = new Map(fieldOf(taxonomy, 'clarity_help').top_values.map((v) => [v.value, v.count] as [string, number]));
    expect(values.get('Very Slightly Included')).toBe(577);
    expect(values.get('Very Slightly Included Very Slightly Included')).toBe(85);
    expect(values.get('Eye Clean')).toBe(154);
    expect(values.get('Eye Clean Eye Clean')).toBe(28);
    const sum = CLARITY_SEED.reduce((total, row) => total + row.observedCount, 0);
    expect(sum).toBe(182 + 53 + 662 + 101 + 26);
    expect(sum).toBe(1024);
  });

  it('treatments: 5 unique verbatim strings, all seeded; 3 observed treatments with SoT counts', () => {
    const taxonomy = parsed() as unknown as { fields: Record<string, { unique_values: number; observed_count: number; top_values: { value: string; count: number }[] }> };
    expect(fieldOf(taxonomy, 'enhancements_help').unique_values).toBe(5);
    expect(fieldOf(taxonomy, 'enhancements_help').observed_count).toBe(1024);
    const seeded = new Set(TREATMENT_LABEL_SEED.map((r) => r.rawLabel));
    for (const { value } of fieldOf(taxonomy, 'enhancements_help').top_values) {
      expect(seeded.has(value), `${value} is a seeded verbatim treatment label`).toBe(true);
    }
    const totals = new Map(TREATMENT_SEED.map((r) => [r.code, r.observedCount]));
    // No Enhancement 510 + 50 doubled; Heat Treated 401 + 22 doubled; Vapor-Infused Coating 41.
    expect(totals.get('NO_ENHANCEMENT')).toBe(560);
    expect(totals.get('HEAT_TREATED')).toBe(423);
    expect(totals.get('VAPOR_INFUSED_COATING')).toBe(41);
  });
});

d('urls.jsonl (MANIFEST entry 2, SHA-256-gated) — INV-04 metals', () => {
  it('each of the 14 observed metal codes maps to exactly one slug phrase; R10 is absent', () => {
    const record = verifyArtifact('naturalgemstones/reverse_engineered/data/urls.jsonl');
    const codePhraseCounts = new Map<string, Map<string, number>>();
    const skuRe = /js\d+(w10|y10|r10|w14|y14|r14|w18|y18|r18|pt|sl|yw14|yw18|wy14|wy18)(-(k|pr)\d+)?$/;
    const weightRe = /^\d+(\.\d+)?ct$/;
    let lines = 0;
    for (const line of record.split('\n')) {
      if (line.length === 0) continue;
      lines += 1;
      const url = (JSON.parse(line) as { url?: string }).url ?? '';
      const segment = url.split('naturalgemstones.com')[1] ?? '';
      const slug = (segment.split('?')[0] ?? '').split('/').filter(Boolean).pop() ?? '';
      const match = skuRe.exec(slug);
      if (match === null) continue;
      const code = (match[1] ?? '').toUpperCase();
      const toks = slug.split('-');
      const skuToken = (match[0] ?? '').split('-')[0] ?? '';
      const index = toks.indexOf(skuToken);
      if (index < 0) continue;
      const phrase: string[] = [];
      let k = index - 1;
      while (k >= 0 && !weightRe.test(toks[k] ?? '')) {
        phrase.unshift(toks[k] ?? '');
        k -= 1;
        if (phrase.length > 8) break;
      }
      // Bare phrase only when weight-anchored (stone/DYO routes).
      if (k >= 0 && weightRe.test(toks[k] ?? '')) {
        const joined = phrase.join('-');
        let inner = codePhraseCounts.get(code);
        if (inner === undefined) {
          inner = new Map();
          codePhraseCounts.set(code, inner);
        }
        inner.set(joined, (inner.get(joined) ?? 0) + 1);
      }
    }
    expect(lines).toBe(44218);
    expect(new Set(codePhraseCounts.keys())).toEqual(new Set(METAL_SEED.filter((m) => m.evidenceStatus === 'OBSERVED').map((m) => m.code)));
    expect(codePhraseCounts.has('R10')).toBe(false);
    for (const [code, phrases] of codePhraseCounts) {
      const phrasesList = [...phrases.keys()];
      expect(phrasesList, `${code} phrase set`).toHaveLength(1);
      expect(phrasesList[0]).toBe(METAL_SEED.find((m) => m.code === code)?.slugPhrase);
    }
  });
});

d('urls.jsonl (MANIFEST entry 2) — setting styles reconcile exactly', () => {
  it('22 style slugs: 15 base + 7 pendant variants; 10,772 settings routes', () => {
    const record = verifyArtifact('naturalgemstones/reverse_engineered/data/urls.jsonl');
    const styleCounts = new Map<string, number>();
    const skuRe = /js\d+(w10|y10|r10|w14|y14|r14|w18|y18|r18|pt|sl|yw14|yw18|wy14|wy18)$/;
    let routeTotal = 0;
    for (const line of record.split('\n')) {
      if (line.length === 0) continue;
      const url = (JSON.parse(line) as { url?: string }).url ?? '';
      const segment = url.split('naturalgemstones.com')[1] ?? '';
      const parts = (segment.split('?')[0] ?? '').split('/').filter(Boolean);
      const route = parts[0] ?? '';
      if (parts.length < 2 || !route.startsWith('gemstone-') || !route.endsWith('-settings')) continue;
      routeTotal += 1;
      const slug = parts[1] ?? '';
      const match = skuRe.exec(slug);
      if (match === null) continue;
      const skuToken = match[0] ?? '';
      const code = (match[1] ?? '').toUpperCase();
      let rest = slug;
      const phrase = METAL_SEED.find((m) => m.code === code)?.slugPhrase;
      if (phrase && rest.startsWith(phrase + '-')) rest = rest.slice(phrase.length + 1);
      rest = rest.slice(0, -(skuToken.length + 1));
      // The junction token is the route jewellery type; the SoT's seven
      // pendant-setting variants keep '-pendant': 'pave-ring-setting' ->
      // 'pave', but 'pave-pendant-setting' stays 'pave-pendant' (22 slugs).
      const junctionStripped = rest.replace(/-(ring|necklace|earrings?|bracelet)-setting$/, '-setting');
      const style = junctionStripped.replace(/-setting$/, '');
      styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
    }
    expect(routeTotal).toBe(10772);
    expect(new Set(styleCounts.keys())).toEqual(new Set(SETTING_STYLE_SEED.map((s) => s.slug)));
    expect(styleCounts.size).toBe(22);
    for (const s of SETTING_STYLE_SEED) {
      expect(styleCounts.get(s.slug), `route count for ${s.slug}`).toBe(s.observedRoutes);
    }
  });
});

describe('jewellery types — 8 enum members with mixed evidence', () => {
  it('5 evidenced + 3 enum-only INFERRED; flags per the SoT 8.5 seed comment', () => {
    expect([...JEWELLERY_TYPE_SEED].map((r) => r.code).sort()).toEqual(
      ['BRACELET', 'BROOCH', 'CHARM', 'CUFFLINKS', 'EARRINGS', 'NECKLACE', 'PENDANT', 'RING'].sort(),
    );
    expect(JEWELLERY_TYPE_SEED.filter((r) => r.evidenceStatus === 'INFERRED').map((r) => r.code).sort())
      .toEqual(['BROOCH', 'CHARM', 'CUFFLINKS']);
    expect(JEWELLERY_TYPE_SEED.filter((r) => r.usesPair).map((r) => r.code)).toEqual(['EARRINGS']);
    expect(JEWELLERY_TYPE_SEED.filter((r) => r.usesSingle).map((r) => r.code).sort())
      .toEqual(['BRACELET', 'NECKLACE', 'PENDANT', 'RING']);
  });
});
