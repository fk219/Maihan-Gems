/**
 * apps/web/src/lib/dyo-server.ts
 *
 * Storefront server seam for Phase 7 Design Your Own (DYO) configurations.
 * Allows Server Components to retrieve canonical DYO configuration state,
 * verified invariants, and price snapshots directly without HTTP loopback.
 *
 * Features test override seam for isolated test environments.
 */
import 'server-only';
import { loadRuntimeConfig } from '@maihan/config';
import {
  createPool,
  getDyoConfigurationByShortCode,
  type DyoConfigurationRow,
} from '@maihan/db';

export interface DyoServerConfig {
  loadConfiguration: (shortCode: string) => Promise<DyoConfigurationRow | null>;
}

const globalStore = globalThis as unknown as {
  __maihanDyoOverride?: (shortCode: string) => Promise<DyoConfigurationRow | null>;
};

export function setDyoServiceForTest(
  override?: (shortCode: string) => Promise<DyoConfigurationRow | null>,
): void {
  if (override === undefined) delete globalStore.__maihanDyoOverride;
  else globalStore.__maihanDyoOverride = override;
}

export async function loadDyoConfiguration(
  shortCode: string,
): Promise<DyoConfigurationRow | null> {
  const override = globalStore.__maihanDyoOverride;
  if (override !== undefined) {
    return override(shortCode);
  }

  try {
    const config = loadRuntimeConfig();
    const pool = createPool(config.databaseUrl);
    return await getDyoConfigurationByShortCode(pool, shortCode);
  } catch {
    // If DB is unavailable during testing or static generation, return null
    return null;
  }
}
