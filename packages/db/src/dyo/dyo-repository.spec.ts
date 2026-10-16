/**
 * packages/db/src/dyo/dyo-repository.spec.ts
 *
 * DB repository tests for DYO configurations, rule loading, and price quotes.
 */
import { describe, expect, it } from 'vitest';
import {
  addDyoConfigurationToCart,
  createDyoConfiguration,
  createDyoPriceQuote,
  getDyoConfigurationByShortCode,
  loadSettingCompatibilityRules,
  findCompatibleSettingsForStone,
} from './dyo-repository.js';

function queryText(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks ?? [];
  return chunks.map((chunk) => {
    if (typeof chunk === 'string') return chunk;
    if (chunk === null || typeof chunk !== 'object') return '';
    const value = (chunk as { value?: unknown }).value;
    return Array.isArray(value) ? value.join('') : typeof value === 'string' ? value : '';
  }).join(' ');
}

describe('DYO Database Repository (Phase 7 Task 2 & 5)', () => {
  it('creates and retrieves a DYO configuration in mock/unit environment', async () => {
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('INSERT INTO dyo_configurations')) {
          return {
            rows: [
              {
                id: 'dyo-cfg-1',
                configuration_hash: 'sha256:abc',
                short_code: 'short123',
                jewellery_type: 'RING',
                setting_id: 'setting-1',
                state: 'DRAFT',
                compatibility_status: 'UNKNOWN',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        if (query.includes('SELECT * FROM dyo_configurations')) {
          return {
            rows: [
              {
                id: 'dyo-cfg-1',
                configuration_hash: 'sha256:abc',
                short_code: 'short123',
                jewellery_type: 'RING',
                setting_id: 'setting-1',
                state: 'DRAFT',
                compatibility_status: 'UNKNOWN',
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const created = await createDyoConfiguration(mockDb, {
      configurationHash: 'sha256:abc',
      shortCode: 'short123',
      jewelleryType: 'RING',
      settingId: 'setting-1',
    });

    expect(created.id).toBe('dyo-cfg-1');
    expect(created.short_code).toBe('short123');

    const fetched = await getDyoConfigurationByShortCode(mockDb, 'short123');
    expect(fetched).not.toBeNull();
    expect(fetched?.short_code).toBe('short123');
  });

  it('queries setting compatibility rules ordered by priority', async () => {
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM setting_compatibility_rules')) {
          expect(query).toContain('ORDER BY priority DESC');
          return {
            rows: [
              {
                id: 'rule-1',
                settingId: 'setting-1',
                jewelleryType: 'RING',
                stoneKind: 'SINGLE',
                ruleKind: 'ALLOW',
                priority: 100,
                explanation: 'Valid single stone solitaire',
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const rules = await loadSettingCompatibilityRules(mockDb, 'setting-1');
    expect(rules).toHaveLength(1);
    expect(rules[0]?.ruleKind).toBe('ALLOW');
  });

  it('finds compatible settings for single stone (filtering out EARRINGS)', async () => {
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM gemstones')) {
          return {
            rows: [
              {
                kind: 'SINGLE',
                jewellery_type: 'RING',
                weight: 1.5,
              },
            ],
          };
        }
        if (query.includes('FROM settings s')) {
          expect(query).toContain("s.jewellery_type <> 'EARRINGS'");
          return {
            rows: [
              { id: 's1', design_code: '1150', name: 'Solitaire Ring', jewellery_type: 'RING' },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const compatibleSettings = await findCompatibleSettingsForStone(mockDb, 'gem-single-1');
    expect(compatibleSettings).toHaveLength(1);
    expect(compatibleSettings[0]?.jewellery_type).toBe('RING');
  });

  it('allows a valid re-quote while already PRICED and issues a new snapshot', async () => {
    const executed: string[] = [];
    let createdSnapshot = 0;
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        executed.push(query);
        if (query.includes('FROM dyo_configurations')) return { rows: [{ id: 'dyo-cfg-1', state: 'PRICED', setting_variant_id: 'variant-1', gemstone_id: 'gem-1' }] };
        if (query.includes('FROM gemstones')) return { rows: [{ price: '3500.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        if (query.includes('FROM setting_variants')) return { rows: [{ price: '1200.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        if (query.includes('INSERT INTO dyo_price_snapshots')) {
          createdSnapshot += 1;
          return { rows: [{ id: `snapshot-${createdSnapshot}`, total: '4700.00' }] };
        }
        if (query.includes('INSERT INTO dyo_quotes')) return { rows: [] };
        if (query.includes('UPDATE dyo_configurations')) return { rows: [{ id: 'dyo-cfg-1' }] };
        return { rows: [] };
      },
    };

    const quote = await createDyoPriceQuote(mockDb, 'short123');

    expect(quote.snapshot.id).toBe('snapshot-1');
    expect(executed.some((query) => query.includes("state IN ('VALID'::dyo_state, 'PRICED'::dyo_state)"))).toBe(true);
  });

  it('quotes a DYO only from active, evidenced catalogue prices and persists the snapshot', async () => {
    const executed: string[] = [];
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        executed.push(query);
        if (query.includes('FROM dyo_configurations')) {
          return {
            rows: [{
              id: 'dyo-cfg-1',
              short_code: 'short123',
              state: 'VALID',
              setting_variant_id: 'variant-1',
              gemstone_id: 'gem-1',
              gemstone_pair_id: null,
            }],
          };
        }
        if (query.includes('FROM gemstones')) {
          return { rows: [{ price: '3500.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        }
        if (query.includes('FROM setting_variants')) {
          return { rows: [{ price: '1200.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        }
        if (query.includes('INSERT INTO dyo_price_snapshots')) {
          return { rows: [{ id: 'snapshot-1', total: '4700.00' }] };
        }
        if (query.includes('INSERT INTO dyo_quotes')) return { rows: [] };
        if (query.includes('UPDATE dyo_configurations')) return { rows: [{ id: 'dyo-cfg-1' }] };
        return { rows: [] };
      },
    };

    const quote = await createDyoPriceQuote(mockDb, 'short123');
    expect(quote.snapshot.id).toBe('snapshot-1');
    expect(quote.snapshot.total).toBe('4700.00');
    expect(quote.quoteToken).toMatch(/^quote_/);
    expect(executed.some((query) => query.includes("state = 'ACTIVE'") && query.includes('availability = true'))).toBe(true);
    expect(executed.some((query) => query.includes('price_evidence'))).toBe(true);
    expect(executed.some((query) => query.includes('INSERT INTO dyo_quotes'))).toBe(true);
    expect(executed.some((query) => query.includes("state IN ('VALID'::dyo_state, 'PRICED'::dyo_state)"))).toBe(true);
  });

  it('rejects different-currency component prices', async () => {
    const db: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM dyo_configurations')) {
          return { rows: [{ id: 'config-1', state: 'VALID', setting_variant_id: 'variant-1', gemstone_id: 'gem-1' }] };
        }
        if (query.includes('FROM gemstones')) return { rows: [{ price: '3500.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        if (query.includes('FROM setting_variants')) return { rows: [{ price: '1200.00', currency: 'EUR', price_evidence: 'OBSERVED' }] };
        return { rows: [] };
      },
    };

    await expect(createDyoPriceQuote(db, 'short123')).rejects.toThrow('DYO_CURRENCY_MISMATCH');
  });

  it('refuses a missing or unverified component price rather than quoting zero', async () => {
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM dyo_configurations')) {
          return { rows: [{ id: 'dyo-cfg-1', state: 'VALID', setting_variant_id: 'variant-1', gemstone_id: 'gem-1' }] };
        }
        if (query.includes('FROM gemstones')) {
          return { rows: [{ price: '0.00', currency: 'USD', price_evidence: 'INFERRED' }] };
        }
        return { rows: [] };
      },
    };

    await expect(createDyoPriceQuote(mockDb, 'short123')).rejects.toThrow('DYO_PRICE_UNVERIFIED');
  });

  it('rejects a configuration transition race after quote snapshot creation', async () => {
    const mockDb: any = {
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM dyo_configurations')) {
          return { rows: [{ id: 'dyo-cfg-1', state: 'VALID', setting_variant_id: 'variant-1', gemstone_id: 'gem-1' }] };
        }
        if (query.includes('FROM gemstones')) {
          return { rows: [{ price: '3500.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        }
        if (query.includes('FROM setting_variants')) {
          return { rows: [{ price: '1200.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        }
        if (query.includes('INSERT INTO dyo_price_snapshots')) return { rows: [{ id: 'snapshot-1' }] };
        if (query.includes('INSERT INTO dyo_quotes')) return { rows: [] };
        if (query.includes('UPDATE dyo_configurations')) return { rows: [] };
        return { rows: [] };
      },
    };

    await expect(createDyoPriceQuote(mockDb, 'short123')).rejects.toThrow('DYO_STATE_CHANGED_DURING_QUOTE');
  });

  it('converts a configuration using its exact quote and consumes it atomically', async () => {
    const executed: string[] = [];
    const snapshotId = 'snapshot-quote-bound';
    const quoteToken = 'quote-one-shot';
    const db: any = {
      transaction: (callback: (tx: any) => Promise<unknown>) => callback(db),
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        executed.push(query);
        if (query.includes('FROM dyo_configurations')) {
          if (query.includes('FOR UPDATE')) {
            return { rows: [{ id: 'config-1', short_code: 'short123', state: 'PRICED', compatibility_status: 'COMPATIBLE', setting_id: 'setting-1', setting_variant_id: 'variant-1', gemstone_id: 'gem-1', gemstone_pair_id: null, jewellery_type: 'RING' }] };
          }
          return { rows: [{ id: 'config-1', short_code: 'short123', state: 'PRICED', compatibility_status: 'COMPATIBLE', setting_id: 'setting-1', setting_variant_id: 'variant-1', gemstone_id: 'gem-1', gemstone_pair_id: null, jewellery_type: 'RING' }] };
        }
        if (query.includes('FROM setting_compatibility_rules')) return { rows: [{ id: 'allow-1', settingId: 'setting-1', jewelleryType: 'RING', stoneKind: 'SINGLE', ruleKind: 'ALLOW', priority: 1 }] };
        if (query.includes('FROM gemstones') && query.includes('price_evidence')) return { rows: [{ price: '3500.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        if (query.includes('FROM gemstones')) return { rows: [{ variety_id: 'variety-1', colour_id: 'colour-1', shape: 'OVAL', weight: 2.5, kind: 'SINGLE' }] };
        if (query.includes('UPDATE dyo_configurations') && query.includes('compatibility_status')) return { rows: [{ id: 'config-1', compatibility_status: 'COMPATIBLE' }] };
        if (query.includes('FROM dyo_quotes')) return { rows: [{ id: 'quote-row-1', price_snapshot_id: snapshotId }] };
        if (query.includes('FROM dyo_price_snapshots')) return { rows: [{ id: snapshotId, total: '4700.00', currency: 'USD' }] };
        if (query.includes('FROM gemstones')) return { rows: [{ variety_id: 'variety-1', colour_id: 'colour-1', shape: 'OVAL', weight: 2.5, kind: 'SINGLE' }] };
        if (query.includes('FROM setting_variants')) return { rows: [{ price: '1200.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        if (query.includes('FROM carts')) return { rows: [{ id: 'cart-1', state: 'ACTIVE', expires_at: new Date(Date.now() + 60_000) }] };
        if (query.includes('FROM products')) return { rows: [{ id: 'product-1', slug: 'dyo-short123', title: 'Configured', state: 'ACTIVE', product_price_amount: '1.00', price_entry_amount: null }] };
        if (query.includes('FROM cart_items')) return { rows: [] };
        if (query.includes('INSERT INTO products')) return { rows: [{ id: 'product-1' }] };
        if (query.includes('UPDATE dyo_quotes')) return { rows: [{ id: 'quote-row-1' }] };
        if (query.includes("state = 'ADDED_TO_CART'::dyo_state")) return { rows: [{ id: 'config-1' }] };
        if (query.includes('INSERT INTO domain_events')) return { rows: [] };
        return { rows: [] };
      },
    };

    const converted = await addDyoConfigurationToCart(db, { shortCode: 'short123', cartToken: 'cart-token', quoteToken });

    expect(converted.configurationId).toBe('config-1');
    expect(executed.some((query) => query.includes('quote_token ='))).toBe(true);
    expect(executed.some((query) => query.includes('WHERE id =') && query.includes('dyo_price_snapshots'))).toBe(true);
    expect(executed.some((query) => query.includes('price_snapshot_id'))).toBe(true);
    expect(executed.some((query) => query.includes('UPDATE dyo_quotes'))).toBe(true);
    expect(executed.some((query) => query.includes('FROM gemstones') && query.includes('price_evidence'))).toBe(true);
    expect(executed.some((query) => query.includes('FROM setting_variants') && query.includes('price_evidence'))).toBe(true);
  });

  it('refuses conversion when catalogue price has changed since the quote', async () => {
    const db: any = {
      transaction: (callback: (tx: any) => Promise<unknown>) => callback(db),
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM dyo_configurations')) {
          return { rows: [{ id: 'config-1', short_code: 'short123', state: 'PRICED', setting_id: 'setting-1', setting_variant_id: 'variant-1', gemstone_id: 'gem-1', gemstone_pair_id: null, jewellery_type: 'RING' }] };
        }
        if (query.includes('FROM setting_compatibility_rules')) return { rows: [{ id: 'allow-1', settingId: 'setting-1', jewelleryType: 'RING', stoneKind: 'SINGLE', ruleKind: 'ALLOW', priority: 1 }] };
        if (query.includes('FROM gemstones')) return { rows: [{ variety_id: 'variety-1', colour_id: 'colour-1', shape: 'OVAL', weight: 2.5, kind: 'SINGLE' }] };
        if (query.includes('UPDATE dyo_configurations') && query.includes('compatibility_status')) return { rows: [{ id: 'config-1', compatibility_status: 'COMPATIBLE' }] };
        if (query.includes('FROM dyo_quotes')) return { rows: [{ id: 'quote-1', price_snapshot_id: 'snapshot-1' }] };
        if (query.includes('FROM dyo_price_snapshots')) return { rows: [{ id: 'snapshot-1', total: '4700.00', currency: 'USD' }] };
        if (query.includes('price_evidence') && query.includes('FROM gemstones')) return { rows: [{ price: '3700.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        if (query.includes('price_evidence') && query.includes('FROM setting_variants')) return { rows: [{ price: '1200.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        return { rows: [] };
      },
    };

    await expect(addDyoConfigurationToCart(db, { shortCode: 'short123', cartToken: 'cart-token', quoteToken: 'quote-one-shot' }))
      .rejects.toThrow('DYO_PRICE_CHANGED');
  });

  it('rejects replay after the configuration has already been added to a cart', async () => {
    const db: any = {
      transaction: (callback: (tx: any) => Promise<unknown>) => callback(db),
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('FROM dyo_configurations')) {
          return { rows: [{ id: 'config-1', short_code: 'short123', state: 'ADDED_TO_CART' }] };
        }
        return { rows: [] };
      },
    };

    await expect(addDyoConfigurationToCart(db, { shortCode: 'short123', cartToken: 'cart-token', quoteToken: 'quote-one-shot' }))
      .rejects.toThrow('DYO_CONFIGURATION_NOT_PRICED');
  });
});
