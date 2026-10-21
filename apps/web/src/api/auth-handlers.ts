/**
 * apps/web/src/api/auth-handlers.ts
 *
 * Authentication, Session Lifecycle, Email Verification, Password Recovery,
 * and Server-Side Actor Resolution Handlers.
 */
import { z } from 'zod';
import { ContractError } from '@maihan/contracts';
import {
  authenticateAccount,
  listCustomerNotifications,
  mergeGuestCart,
  registerAccount,
  requestPasswordReset,
  resetPasswordWithToken,
  revokeSession,
  verifyEmailWithToken,
  verifySession,
  type AuthenticatedActor,
  type CatalogDatabase,
} from '@maihan/db';
import type { RouteContext, RouteHandler } from './handlers.js';
import { isDevSeamEnabled } from '@maihan/config';
import { assertCsrfForCookieSession } from './csrf.js';

export const SESSION_COOKIE_NAME = 'maihan_session';

const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  first_name: z.string().max(80).optional(),
  last_name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  role: z.enum(['CUSTOMER', 'VENDOR']).optional(),
  vendor_name: z.string().max(120).optional(),
  vendor_country: z.string().max(2).optional(),
  vendor_city: z.string().max(80).optional(),
  guest_cart_token: z.string().optional(),
  customer_cart_token: z.string().optional(),
});

const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  guest_cart_token: z.string().optional(),
  customer_cart_token: z.string().optional(),
});

const VerifyEmailSchema = z.object({
  token: z.string().min(16).max(256),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(16).max(256),
  new_password: z.string().min(8).max(128),
});

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available for authentication.');
}

async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in request body.');
  }
}

export function extractSessionToken(request?: Request): string | null {
  if (!request) return null;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) return token;
  }
  const directHeader = request.headers.get('x-session-token')?.trim();
  if (directHeader) return directHeader;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)maihan_session=([^;]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }
  return null;
}

export async function resolveRequestActor(ctx: RouteContext): Promise<AuthenticatedActor | null> {
  const token = extractSessionToken(ctx.request);
  if (!token) return null;
  const db = getDb(ctx);
  return verifySession(db, token);
}

/**
 * P1-21: resolve the actor AND enforce the cookie-CSRF double-submit rule
 * for state-changing requests. Every customer/vendor session surface calls
 * this instead of raw resolveRequestActor.
 */
export async function resolveRequestActorWithCsrf(ctx: RouteContext): Promise<AuthenticatedActor | null> {
  const actor = await resolveRequestActor(ctx);
  if (actor) {
    assertCsrfForCookieSession(ctx, actor);
  }
  return actor;
}

function buildSessionSetCookie(sessionToken: string, maxAgeSeconds = 7 * 24 * 3600): string {
  // R1-1 fail-closed: Secure flag on by default; dropped only in dev seam.
  const secure = isDevSeamEnabled() ? '' : '; Secure';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export const AUTH_HANDLERS: Record<string, RouteHandler> = {
  async registerHandler(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = RegisterInputSchema.parse(body);
    const result = await registerAccount(db, input);

    if (input.guest_cart_token && input.customer_cart_token) {
      await mergeGuestCart(db, input.customer_cart_token, input.guest_cart_token).catch(() => undefined);
    }

    return {
      status: 201,
      body: {
        data: {
          actor: result.actor,
          session_token: result.session_token,
          csrf_token: result.csrf_token,
          verification_token:
            isDevSeamEnabled() ? result.verification_token : undefined, // R1-1 fail-closed
        },
      },
      headers: {
        'Set-Cookie': buildSessionSetCookie(result.session_token),
      },
    };
  },

  async loginHandler(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = LoginInputSchema.parse(body);
    const result = await authenticateAccount(db, {
      email: input.email,
      password: input.password,
      ip_address: ctx.request?.headers.get('x-client-ip') ?? undefined,
      user_agent: ctx.request?.headers.get('user-agent') ?? undefined,
    });

    if (input.guest_cart_token && input.customer_cart_token) {
      await mergeGuestCart(db, input.customer_cart_token, input.guest_cart_token).catch(() => undefined);
    }

    return {
      status: 200,
      body: {
        data: {
          actor: result.actor,
          session_token: result.session_token,
          csrf_token: result.csrf_token,
        },
      },
      headers: {
        'Set-Cookie': buildSessionSetCookie(result.session_token),
      },
    };
  },

  async logoutHandler(ctx) {
    const db = getDb(ctx);
    const token = extractSessionToken(ctx.request);
    await revokeSession(db, token);
    return {
      status: 200,
      body: { data: { logged_out: true } },
      headers: {
        'Set-Cookie': buildSessionSetCookie('', 0),
      },
    };
  },

  async sessionHandler(ctx) {
    const actor = await resolveRequestActor(ctx);
    if (!actor) {
      throw new ContractError('UNAUTHORIZED', 'No active authenticated session.');
    }
    return {
      status: 200,
      body: { data: { actor } },
    };
  },

  async verifyEmailHandler(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = VerifyEmailSchema.parse(body);
    const verified = await verifyEmailWithToken(db, input.token);
    return {
      status: 200,
      body: {
        data: {
          verified: true,
          customer_id: verified.customer_id,
          email: verified.email,
        },
      },
    };
  },

  async forgotPasswordHandler(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = ForgotPasswordSchema.parse(body);
    const res = await requestPasswordReset(db, input.email);
    return {
      status: 200,
      body: {
        data: {
          accepted: true,
          message: 'If an account exists for that email, a password reset link has been issued.',
          ...(res.reset_token_for_sandbox ? { reset_token_for_sandbox: res.reset_token_for_sandbox } : {}),
        },
      },
    };
  },

  async resetPasswordHandler(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = ResetPasswordSchema.parse(body);
    const res = await resetPasswordWithToken(db, input.token, input.new_password);
    return {
      status: 200,
      body: {
        data: {
          password_reset: true,
          customer_id: res.customer_id,
        },
      },
      headers: {
        'Set-Cookie': buildSessionSetCookie('', 0),
      },
    };
  },

  async listNotificationsHandler(ctx) {
    const db = getDb(ctx);
    const actor = await resolveRequestActor(ctx);
    // P1-4 identity contract: session identity only. The x-customer-id header
    // is honoured solely under the developer seam (test harnesses), and the
    // former `?customer_id=` query fallback is removed entirely — it made
    // this endpoint readable by anyone holding (or guessing) a customer id.
    const fallbackCustomerId =
      ctx.request?.headers.get('x-customer-id')?.trim() && isDevSeamEnabled()
        ? ctx.request?.headers.get('x-customer-id')?.trim()
        : null;
    const customerId = actor?.customer_id ?? fallbackCustomerId;
    if (!customerId) {
      throw new ContractError('UNAUTHORIZED', 'Authentication required to view notifications.');
    }
    if (actor && fallbackCustomerId && fallbackCustomerId !== actor.customer_id) {
      throw new ContractError('FORBIDDEN', 'You do not have permission to view another customer’s notifications.');
    }
    const items = await listCustomerNotifications(db, customerId);
    return {
      status: 200,
      body: { data: { notifications: items } },
    };
  },
};
