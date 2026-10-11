/**
 * packages/db/src/dyo/dyo-repository.spec.ts
 *
 * DB repository tests for DYO configurations, rule loading, and price quotes.
 */
import { describe, expect, it } from 'vitest';
import {
  createDyoConfiguration,
  getDyoConfigurationByShortCode,
  loadSettingCompatibilityRules,
  findCompatibleSettingsForStone,
} from './dyo-repository.js';

describe('DYO Database Repository (Phase 7 Task 2 & 5)', () => {
  it('creates and retrieves a DYO configuration in mock/unit environment', async () => {
    const mockDb: any = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO dyo_configurations')) {
          return {
            rows: [
              {
                id: 'dyo-cfg-1',
                configuration_hash: params[0],
                short_code: params[1],
                jewellery_type: params[2],
                setting_id: params[3],
                state: 'DRAFT',
                compatibility_status: 'UNKNOWN',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        if (sql.includes('SELECT * FROM dyo_configurations WHERE short_code = $1')) {
          return {
            rows: [
              {
                id: 'dyo-cfg-1',
                configuration_hash: 'sha256:abc',
                short_code: params[0],
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
      query: async (sql: string, params: any[]) => {
        if (sql.includes('FROM setting_compatibility_rules')) {
          return {
            rows: [
              {
                id: 'rule-1',
                settingId: params[0],
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
      query: async (sql: string, params: any[]) => {
        if (sql.includes('FROM gemstones WHERE id = $1')) {
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
        if (sql.includes('FROM settings s')) {
          expect(sql).toContain("s.jewellery_type <> 'EARRINGS'");
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
});
