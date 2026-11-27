/**
 * apps/web/src/lib/demo-login.ts
 *
 * Server-side demo-access contract.
 *
 * The flag is read on the server only. When it is not exactly "true", the
 * demo route answers 404 and no surface renders the affordance. The seeded
 * identities are the ones created by packages/db/seed-demo.mjs; no password is
 * stored here because the demo route mints a session directly for the seeded
 * user instead of replaying credentials in client code.
 */
import 'server-only';

export type DemoSurface = 'admin' | 'vendor' | 'customer';

export interface DemoIdentity {
  readonly email: string;
  readonly displayName: string;
  readonly redirectTo: string;
}

export const DEMO_IDENTITIES: Readonly<Record<DemoSurface, DemoIdentity>> = Object.freeze({
  admin: {
    email: 'admin@maihan.local',
    displayName: 'Maihan Admin',
    redirectTo: '/admin',
  },
  vendor: {
    email: 'vendor@maihan.local',
    displayName: 'Atelier North',
    redirectTo: '/vendor',
  },
  customer: {
    email: 'customer@maihan.local',
    displayName: 'Demo Client',
    redirectTo: '/account',
  },
});

export function isDemoLoginEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env['DEMO_LOGIN_ENABLED'] === 'true';
}

export function isDemoSurface(value: unknown): value is DemoSurface {
  return value === 'admin' || value === 'vendor' || value === 'customer';
}
