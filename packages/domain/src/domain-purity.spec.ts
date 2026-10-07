import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Domain purity gate (doc 03 "Validation rules" rule 3; doc 05 "Dependencies").
 *
 * `packages/domain` depends on no runtime package: it imports nothing from
 * I/O, the database, the model, the framework or configuration. Tests read the
 * package.json rather than scanning imports — the lint boundary rules cover
 * imports statically; this makes the DECLARED dependency surface explicit and
 * enforced.
 */
describe('packages/domain purity', () => {
  const manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  it('declares ZERO runtime dependencies (doc 03 validation rule 3)', () => {
    expect(manifest.dependencies === undefined || Object.keys(manifest.dependencies).length === 0).toBe(true);
  });

  it('its only devDependency is the accepted test runner (ADR-021: Vitest)', () => {
    const dev = manifest.devDependencies ?? {};
    expect(Object.keys(dev).sort()).toEqual(['vitest']);
  });

  it('may declare only Zod as a runtime dependency, per doc 02 rule 2', () => {
    const deps = Object.keys(manifest.dependencies ?? {});
    expect(deps.every((d) => d === 'zod')).toBe(true);
  });
});
