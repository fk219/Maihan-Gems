/**
 * POST /api/v1/auth/demo-login
 *
 * Gated demo sign-in for review environments.
 *
 * The route is invisible unless `DEMO_LOGIN_ENABLED=true` is set on the
 * server: the flag check runs before the body is read, and a disabled route
 * answers 404 exactly like a missing one. It never accepts credentials from
 * the client; it mints a normal first-party session for the seeded identity
 * that belongs to the requested surface (ADR-027's session model).
 */
import { createSession, findUserByEmail } from '@maihan/db';
import { generateSessionToken, hashSessionToken, sessionExpiry } from '@maihan/domain';

import { sessionCookie } from '../../../../../api/auth-handlers.js';
import { getServerDb } from '../../../../../api/next-adapter.js';
import { resolveVendorMembership } from '../../../../../api/vendor/session-authz.js';
import {
  DEMO_IDENTITIES,
  isDemoLoginEnabled,
  isDemoSurface,
  type DemoSurface,
} from '../../../../../lib/demo-login.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function notFound(): Response {
  return json(404, { error: { code: 'NOT_FOUND', message: 'Not found.' } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isDemoLoginEnabled()) return notFound();

  let surface: DemoSurface;
  try {
    const body = (await request.json()) as { surface?: unknown };
    if (!isDemoSurface(body.surface)) {
      return json(400, {
        error: { code: 'VALIDATION_FAILED', message: 'A demo surface is required.' },
      });
    }
    surface = body.surface;
  } catch {
    return json(400, {
      error: { code: 'VALIDATION_FAILED', message: 'Body must be JSON.' },
    });
  }

  const identity = DEMO_IDENTITIES[surface];

  try {
    const db = await getServerDb();
    const user = await findUserByEmail(db, identity.email);
    if (user === null) return notFound();
    if (user.state !== 'ACTIVE') {
      return json(403, {
        error: { code: 'FORBIDDEN', message: 'The demo account is suspended.' },
      });
    }

    if (surface === 'admin' && user.admin_role === null) return notFound();
    if (surface === 'customer' && user.admin_role !== null) return notFound();
    if (surface === 'vendor') {
      const membership = await resolveVendorMembership(db, user.id);
      if (membership === null) return notFound();
      if (membership.vendor.state !== 'APPROVED') {
        return json(403, {
          error: { code: 'VENDOR_NOT_APPROVED', message: 'The demo vendor is not approved.' },
        });
      }
    }

    const token = generateSessionToken();
    await createSession(db, {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: sessionExpiry(Date.now()),
      ip: request.headers.get('x-client-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return json(
      200,
      { ok: true, surface, redirectTo: identity.redirectTo },
      { 'set-cookie': sessionCookie(token, request) },
    );
  } catch {
    return json(503, {
      error: { code: 'INTERNAL', message: 'The demo account is not available in this environment.' },
    });
  }
}
