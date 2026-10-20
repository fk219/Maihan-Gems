/**
 * R1-1 — fail-closed security mode unit tests.
 *
 * Verifies the AGENTS.md §10 guarantee: a deployment that FORGETS to set
 * MAIHAN_ENV must behave as production (headers untrusted, tokens hidden,
 * cookies Secure), and the developer seam only exists by explicit opt-in.
 */
import { describe, expect, it } from 'vitest';
import {
  SPOOFABLE_IDENTITY_HEADERS,
  isDevSeamEnabled,
  isFailClosedMode,
} from './security-mode.js';

describe('security-mode (R1-1 fail-closed)', () => {
  it('fails closed when NO environment variables are set', () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(isDevSeamEnabled(env)).toBe(false);
    expect(isFailClosedMode(env)).toBe(true);
  });

  it('MAIHAN_ENV=production forces fail-closed even with seam opt-in present', () => {
    const env = { MAIHAN_ENV: 'production', MAIHAN_DEV_SEAM: '1', NODE_ENV: 'test' } as NodeJS.ProcessEnv;
    expect(isDevSeamEnabled(env)).toBe(false);
  });

  it('explicit MAIHAN_DEV_SEAM=1 opens the seam outside production', () => {
    const env = { MAIHAN_DEV_SEAM: '1', NODE_ENV: 'productionish' } as unknown as NodeJS.ProcessEnv;
    expect(isDevSeamEnabled(env)).toBe(true);
    expect(isFailClosedMode(env)).toBe(false);
  });

  it('NODE_ENV=test enables the seam (vitest integration suites rely on it)', () => {
    expect(isDevSeamEnabled({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('NODE_ENV=development enables the seam (next dev)', () => {
    expect(isDevSeamEnabled({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('NODE_ENV=production alone still fails closed', () => {
    expect(isDevSeamEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('a non-"1" MAIHAN_DEV_SEAM value does NOT open the seam (no truthiness slop)', () => {
    expect(isDevSeamEnabled({ MAIHAN_DEV_SEAM: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isDevSeamEnabled({ MAIHAN_DEV_SEAM: '0' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('the spoofable header set covers every identity header the handlers read', () => {
    for (const h of ['x-admin-sub', 'x-admin-role', 'x-admin-session', 'x-customer-id']) {
      expect(SPOOFABLE_IDENTITY_HEADERS.has(h)).toBe(true);
    }
    expect(SPOOFABLE_IDENTITY_HEADERS.has('cookie')).toBe(false);
    expect(SPOOFABLE_IDENTITY_HEADERS.has('authorization')).toBe(false);
  });
});
