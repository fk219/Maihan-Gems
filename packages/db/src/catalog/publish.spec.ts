/**
 * packages/db/src/catalog/publish.spec.ts
 *
 * P3.1 publication rules, without a database:
 *   - gate V15 refuses an UNKNOWN-evidence row before anything else;
 *   - DRAFT -> ACTIVE without VERIFIED price evidence requires a second
 *     approver (plan task 3), and the refusal happens BEFORE any write;
 *   - when no editor is recorded the rule is satisfied and the audit snapshot
 *     says so;
 *   - a VERIFIED-evidence publication and an unpublish do not read an editor;
 *   - every transition records before/after plus the two actors.
 */
import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import { publishProduct, unpublishProduct } from './publish.js';

const PRODUCT_ID = '99999999-9999-4999-8999-999999999999';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_ACTOR = '55555555-5555-4555-8555-555555555555';

function productRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PRODUCT_ID,
    slug: 'ceylon-sapphire-ring',
    title: 'Ceylon Sapphire Ring',
    kind: 'CONFIGURED',
    state: 'DRAFT',
    price_amount: '2450.00',
    currency: 'USD',
    price_evidence: 'OBSERVED',
    published_at: null,
    ...overrides,
  };
}

/** Every string parameter, joined: JSON payloads are bound as strings. */
function paramText(values: readonly unknown[] | undefined): string {
  return (values ?? []).filter((value): value is string => typeof value === 'string').join('\n');
}

describe('gate V15', () => {
  it('refuses UNKNOWN price evidence before reading an editor', async () => {
    const db = createScriptedExecutor([[productRow({ price_evidence: 'UNKNOWN' })]]);

    await expect(
      publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'UNVERIFIED_PRICE' });

    expect(db.queries).toHaveLength(1);
  });
});

describe('two-person approval on publication', () => {
  it('refuses self-approval and writes nothing', async () => {
    const db = createScriptedExecutor([[productRow()], [{ actor_id: ACTOR_ID }]]);

    await expect(
      publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({
      name: 'TwoPersonError',
      code: 'TWO_PERSON_REQUIRED',
      entityKind: 'PRODUCT_PUBLISH_UNVERIFIED_PRICE',
    });

    // Read, last-editor read: no UPDATE and no audit INSERT ran.
    expect(db.queries).toHaveLength(2);
    expect(db.queries[1]?.text).toContain("a.entity_type = 'products'");
    expect(db.queries.every((query) => !/\bINSERT\b/.test(query.text))).toBe(true);
    expect(db.queries.every((query) => !query.text.includes('SET state ='))).toBe(true);
  });

  it('accepts a different approver and records both actors', async () => {
    const db = createScriptedExecutor([
      [productRow()],
      [{ actor_id: OTHER_ACTOR }],
      [productRow({ state: 'ACTIVE', published_at: '2026-11-23T12:00:00.000Z' })],
      [],
    ]);

    const result = await publishProduct(db as never, {
      productId: PRODUCT_ID,
      actorId: ACTOR_ID,
      requestId: 'req_publish',
    });

    expect(result.state).toBe('ACTIVE');

    const update = db.queries[2];
    expect(update?.text).toContain('UPDATE products');
    const audit = db.queries[3];
    expect(audit?.text).toContain('INSERT INTO audit_logs');
    expect(audit?.text).toContain('diff');
    const auditParameters = paramText(audit?.values);
    expect(auditParameters).toContain(OTHER_ACTOR);
    expect(auditParameters).toContain(ACTOR_ID);
    expect(auditParameters).toContain('"second_approver_id"');
    expect(audit?.values).toContain('PUBLISH');
  });

  it('satisfies the rule when no editor is recorded and marks the audit row', async () => {
    const db = createScriptedExecutor([
      [productRow()],
      [],
      [productRow({ state: 'ACTIVE' })],
      [],
    ]);

    await publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID });

    expect(paramText(db.queries[3]?.values)).toContain('"editor_unrecorded":true');
  });

  it('does not require a second approver when the price evidence is VERIFIED', async () => {
    const db = createScriptedExecutor([
      [productRow({ price_evidence: 'VERIFIED' })],
      [productRow({ state: 'ACTIVE', price_evidence: 'VERIFIED' })],
      [],
    ]);

    await publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID });

    // No last-editor read: the second statement is the UPDATE.
    expect(db.queries).toHaveLength(3);
    expect(db.queries[1]?.text).toContain('UPDATE products');
    expect(paramText(db.queries[2]?.values)).toContain('"required":false');
  });

  it('does not require a second approver to unpublish', async () => {
    const db = createScriptedExecutor([
      [productRow({ state: 'ACTIVE' })],
      [productRow({ state: 'DRAFT' })],
      [],
    ]);

    await unpublishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID });

    expect(db.queries).toHaveLength(3);
    expect(db.queries[1]?.text).toContain('UPDATE products');
    expect(paramText(db.queries[2]?.values)).toContain('"required":false');
  });
});

describe('idempotency and terminal states', () => {
  it('returns the row unchanged for ACTIVE -> ACTIVE without an audit row', async () => {
    const db = createScriptedExecutor([[productRow({ state: 'ACTIVE' })]]);

    const result = await publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID });

    expect(result.state).toBe('ACTIVE');
    expect(db.queries).toHaveLength(1);
  });

  it('refuses to resurrect an archived product', async () => {
    const db = createScriptedExecutor([[productRow({ state: 'ARCHIVED' })]]);

    await expect(
      publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  it('refuses an unknown product', async () => {
    const db = createScriptedExecutor([[]]);

    await expect(
      publishProduct(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
