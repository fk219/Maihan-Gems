/**
 * packages/db/src/test/sql-capture.ts
 *
 * Turns a Drizzle `sql` template into `{ text, values }` with `$1..$n`
 * placeholders preserved. The existing fakes flatten parameters away; this one
 * keeps them, because the point of the repository specs is to prove that every
 * value is BOUND and none is interpolated into the statement text.
 *
 * Drizzle's chunk shapes (verified against drizzle-orm 0.45.3):
 *   - static text       StringChunk { value: string[] }
 *   - interpolated raw  number | string | boolean | bigint | null
 *   - sql.param(value)  Param { value }
 *   - nested fragment   an object carrying queryChunks
 */

import { Param } from 'drizzle-orm';

export interface CapturedQuery {
  readonly text: string;
  readonly values: unknown[];
}

interface ChunkShape {
  readonly value?: unknown;
  readonly queryChunks?: unknown[];
}

/**
 * A `StringChunk` and a `Param` holding a string[] are structurally identical
 * (`value: string[]`), so the class is the only reliable discriminator. Getting
 * this wrong turns a bound array into interpolated text — which is exactly the
 * failure the capture helper exists to catch, so it must not have it itself.
 */
function isStringChunk(chunk: unknown): chunk is { value: string[] } {
  if (chunk instanceof Param) return false;
  const shape = chunk as ChunkShape;
  return (
    Array.isArray(shape.value) &&
    shape.value.length > 0 &&
    shape.value.every((part) => typeof part === 'string')
  );
}

export function captureQuery(query: unknown): CapturedQuery {
  const chunks = (query as ChunkShape | undefined)?.queryChunks ?? [];
  const parts: string[] = [];
  const values: unknown[] = [];

  const pushParam = (value: unknown): void => {
    values.push(value);
    parts.push(`$${values.length}`);
  };

  const walk = (items: readonly unknown[]): void => {
    for (const chunk of items) {
      if (chunk === null || chunk === undefined) {
        pushParam(null);
        continue;
      }
      if (isStringChunk(chunk)) {
        parts.push(chunk.value.join(''));
        continue;
      }
      const shape = chunk as ChunkShape;
      if (Array.isArray(shape.queryChunks)) {
        walk(shape.queryChunks);
        continue;
      }
      if (typeof chunk === 'object' && 'value' in shape) {
        pushParam(shape.value);
        continue;
      }
      pushParam(chunk);
    }
  };

  walk(chunks);
  return { text: parts.join('').replace(/\s+/g, ' ').trim(), values };
}

/** A scripted executor: one queue of canned results, recording every query. */
export interface ScriptedExecutor {
  readonly queries: CapturedQuery[];
  execute(query: unknown): Promise<{ rows: unknown[] }>;
}

export function createScriptedExecutor(
  results: readonly (readonly unknown[])[],
): ScriptedExecutor {
  const queue = [...results];
  const queries: CapturedQuery[] = [];
  return {
    queries,
    async execute(query: unknown): Promise<{ rows: unknown[] }> {
      queries.push(captureQuery(query));
      const rows = queue.shift();
      if (rows === undefined) {
        throw new Error(`scripted-executor: no canned result for query ${queries.length}`);
      }
      return { rows: [...rows] };
    },
  };
}
