/**
 * packages/contracts/src/openapi/cli.ts
 *
 * Task 8 — the generation CLI: writes `src/generated/openapi.json`, the
 * COMMITTED artifact diffed in CI (technical_design/03 layout:
 * `src/generated/ openapi.json (committed, diffed in CI)`).
 *
 * Run: `pnpm --filter @maihan/contracts run openapi:generate`
 * (builds first, then executes the compiled output — never hand-edits dist).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenApiDocument } from './generate.js';

/** dist/openapi/cli.js -> package root -> src/generated/openapi.json */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputPath = resolve(packageRoot, 'src', 'generated', 'openapi.json');

const document = generateOpenApiDocument();
const serialized = `${JSON.stringify(document, null, 2)}\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, serialized, 'utf8');

process.stdout.write(`openapi: wrote ${outputPath} (${serialized.length} bytes)\n`);
