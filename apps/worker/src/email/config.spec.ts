/**
 * apps/worker/src/email/config.spec.ts
 *
 * The email configuration gate. These assertions are the difference between a
 * misconfigured deployment failing at startup and failing on the first order.
 *
 * `loadRuntimeConfig` accepts an environment object, so nothing here reads or
 * mutates process.env and no secret appears in a fixture.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError, loadRuntimeConfig } from '@maihan/config';

const BASE = { DATABASE_URL: 'postgres://user:pass@localhost:5432/maihan_dev' };

describe('EMAIL_TRANSPORT', () => {
  it('defaults to sink, which sends nothing', () => {
    const config = loadRuntimeConfig({ ...BASE });
    expect(config.email.transport).toBe('sink');
    if (config.email.transport === 'sink') {
      expect(config.email.from).toBe('no-reply@maihan-gems.invalid');
      expect(config.email.capacity).toBe(100);
      expect(config.email.mailboxDir).toBe('.mail');
      // Local development may write the mailbox to disk.
      expect(config.email.writeToDisk).toBe(true);
    }
  });

  it('accepts none, sink and smtp', () => {
    expect(loadRuntimeConfig({ ...BASE, EMAIL_TRANSPORT: 'none' }).email.transport).toBe('none');
    expect(loadRuntimeConfig({ ...BASE, EMAIL_TRANSPORT: 'sink' }).email.transport).toBe('sink');
    expect(
      loadRuntimeConfig({
        ...BASE,
        EMAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
      }).email.transport,
    ).toBe('smtp');
  });

  it('rejects an unknown transport', () => {
    expect(() => loadRuntimeConfig({ ...BASE, EMAIL_TRANSPORT: 'sendgrid' })).toThrow(ConfigError);
  });

  it('refuses to write the mailbox to disk in production', () => {
    expect(() =>
      loadRuntimeConfig({
        ...BASE,
        ENVIRONMENT: 'production',
        APP_BASE_URL: 'https://maihangems.com',
        EMAIL_SINK_WRITE_TO_DISK: 'true',
      }),
    ).toThrow(/EMAIL_SINK_WRITE_TO_DISK/);
  });

  it('defaults the sink to memory-only in production', () => {
    const config = loadRuntimeConfig({
      ...BASE,
      ENVIRONMENT: 'production',
      APP_BASE_URL: 'https://maihangems.com',
    });
    expect(config.email.transport).toBe('sink');
    if (config.email.transport === 'sink') expect(config.email.writeToDisk).toBe(false);
  });
});

describe('SMTP configuration', () => {
  it('fails closed when the host is missing', () => {
    expect(() => loadRuntimeConfig({ ...BASE, EMAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_HOST/);
  });

  it('defaults to STARTTLS on 587', () => {
    const config = loadRuntimeConfig({
      ...BASE,
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.com',
    });
    if (config.email.transport !== 'smtp') throw new Error('expected smtp');
    expect(config.email.port).toBe(587);
    expect(config.email.security).toBe('starttls');
    expect(config.email.user).toBeNull();
  });

  it('uses implicit TLS on 465', () => {
    const config = loadRuntimeConfig({
      ...BASE,
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
    });
    if (config.email.transport !== 'smtp') throw new Error('expected smtp');
    expect(config.email.security).toBe('tls');
  });

  it('refuses credentials over plaintext without an explicit override', () => {
    expect(() =>
      loadRuntimeConfig({
        ...BASE,
        EMAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_SECURITY: 'plain',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
      }),
    ).toThrow(/plaintext/);
  });

  it('refuses a user without a password', () => {
    expect(() =>
      loadRuntimeConfig({
        ...BASE,
        EMAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
      }),
    ).toThrow(/SMTP_USER and SMTP_PASS/);
  });

  it('refuses an insecure override in production', () => {
    expect(() =>
      loadRuntimeConfig({
        ...BASE,
        ENVIRONMENT: 'production',
        APP_BASE_URL: 'https://maihangems.com',
        EMAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_SECURITY: 'plain',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        SMTP_ALLOW_INSECURE: 'true',
      }),
    ).toThrow(/SMTP_ALLOW_INSECURE/);
  });
});

describe('APP_BASE_URL', () => {
  it('defaults to localhost outside production and strips a trailing slash', () => {
    expect(loadRuntimeConfig({ ...BASE }).appBaseUrl).toBe('http://localhost:3000');
    expect(
      loadRuntimeConfig({ ...BASE, APP_BASE_URL: 'https://maihangems.com/' }).appBaseUrl,
    ).toBe('https://maihangems.com');
  });

  it('rejects a non-http origin', () => {
    expect(() => loadRuntimeConfig({ ...BASE, APP_BASE_URL: 'javascript:alert(1)' })).toThrow(
      ConfigError,
    );
  });

  it('is enforced by the WORKER in production, not by the shared config', async () => {
    const { assertUsableAppBaseUrl } = await import('../main.js');
    const localhost = loadRuntimeConfig({ ...BASE, ENVIRONMENT: 'production' });
    expect(() => assertUsableAppBaseUrl(localhost)).toThrow(/APP_BASE_URL/);

    const real = loadRuntimeConfig({
      ...BASE,
      ENVIRONMENT: 'production',
      APP_BASE_URL: 'https://maihangems.com',
    });
    expect(() => assertUsableAppBaseUrl(real)).not.toThrow();
  });
});
