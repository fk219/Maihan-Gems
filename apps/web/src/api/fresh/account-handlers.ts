/**
 * apps/web/src/api/fresh/account-handlers.ts
 *
 * The customer account surface develop's `CustomerAccountApp` calls.
 *
 * There is NO second auth model here. `/api/fresh-auth/login`,
 * `/register`, `/request-reset` and `/logout` are thin adapters over main's
 * existing handlers (`src/api/auth-handlers.ts`): the same `users` row, the
 * same scrypt hash, the same `sessions` table and the same `maihan_session`
 * cookie. The `/api/fresh/auth/**` reads and profile/address writes ride on
 * main's `packages/db` account repositories with the resolved customer's id.
 *
 * Field names are develop's (`me`, `orders`, `addresses`, `favourites`) and the
 * mapping is a rename only. A value main does not store is `null` or an empty
 * collection, never invented.
 */
import { ContractError } from '@maihan/contracts';
import {
  addCustomerFavorite,
  createCustomerAddress,
  createSession,
  createVerificationToken,
  deleteCustomerAddress,
  findUserById,
  getCustomerAddresses,
  getCustomerFavorites,
  listCustomerOrderSummaries,
  removeCustomerFavorite,
  resolvePurchasableProductRef,
  updateCustomerAddress,
  updateCustomerProfile,
  updatePasswordHash,
  revokeAllSessions,
} from '@maihan/db';
import type { CustomerAddressDto } from '@maihan/contracts';
import {
  EMAIL_VERIFICATION_TTL_MS,
  generateOpaqueToken,
  generateSessionToken,
  hashOpaqueToken,
  hashPassword,
  hashSessionToken,
  sessionExpiry,
  tokenExpiry,
  validatePasswordPolicy,
  verifyPassword,
} from '@maihan/domain';

import type { HandlerOutcome, RouteContext } from '../handlers.js';
import {
  authLoginHandler,
  authLogoutHandler,
  authRegisterHandler,
  authRequestPasswordResetHandler,
  authResetPasswordHandler,
  authVerifyEmailHandler,
  sessionCookie,
} from '../auth-handlers.js';
import type { FreshContext } from './handlers.js';
import {
  ensureShopperActor,
  isDevelopmentEnvironment,
  optionalString,
  readJsonObject,
  requireShopperSession,
  requireString,
} from './session.js';

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

function ok(body: unknown, status = 200): HandlerOutcome {
  return { status, body, headers: NO_STORE };
}

/**
 * The auth handlers take the catalogue `RouteContext` but only read
 * `db`/`request`/`environment`. This adapter satisfies the type without
 * inventing a catalogue service; no code path touches `service`.
 */
function asRouteContext(ctx: FreshContext): RouteContext {
  return {
    db: ctx.db,
    request: ctx.request,
    url: ctx.url,
    ids: ctx.ids,
    params: ctx.params,
    ...(ctx.environment === undefined ? {} : { environment: ctx.environment }),
  } as unknown as RouteContext;
}

/* ---------------------------------------------------------------- account */

/** GET /api/fresh/auth/me */
export async function authMeHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  return ok({
    customer: {
      id: actor.customer.id,
      email: actor.customer.email,
      first_name: actor.customer.first_name,
      last_name: actor.customer.last_name,
      phone: actor.customer.phone,
      // Verification is an identity fact, not a commerce one.
      email_verified_at: actor.session.emailVerifiedAt,
    },
  });
}

/** PATCH /api/fresh/auth/me */
export async function authUpdateMeHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const body = await readJsonObject(ctx);
  const profile = await updateCustomerProfile(ctx.db, actor.customer.id, {
    ...(optionalString(body, 'first_name', { max: 80 }) === undefined
      ? {}
      : { first_name: optionalString(body, 'first_name', { max: 80 }) }),
    ...(optionalString(body, 'last_name', { max: 80 }) === undefined
      ? {}
      : { last_name: optionalString(body, 'last_name', { max: 80 }) }),
    ...(optionalString(body, 'phone', { max: 40 }) === undefined
      ? {}
      : { phone: optionalString(body, 'phone', { max: 40 }) }),
  });
  return ok({
    customer: {
      id: profile.customer_id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      email_verified_at: actor.session.emailVerifiedAt,
    },
  });
}

/** GET /api/fresh/auth/orders — bare array, develop's fields. */
export async function authOrdersHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const orders = await listCustomerOrderSummaries(ctx.db, actor.customer.id);
  return ok(
    orders.map((order) => ({
      order_number: order.order_number,
      status: order.status,
      currency: order.currency,
      grand_total: order.grand_total,
      placed_at: order.placed_at,
      item_count: order.item_count,
    })),
  );
}

/* ------------------------------------------------------------- favourites */

interface SavedPieces {
  readonly gemstones: ReadonlyArray<{ ref: string; slug: string; name: string; variety: string }>;
  readonly settings: ReadonlyArray<{ ref: string; name: string; jewellery_type: string }>;
}

async function readFavourites(ctx: FreshContext, customerId: string): Promise<SavedPieces> {
  const items = await getCustomerFavorites(ctx.db, customerId);
  return {
    gemstones: items.map((item) => ({
      ref: item.sku,
      slug: item.sku,
      name: item.title,
      variety: item.variety ?? '',
    })),
    // Main's favourites store products only; a setting favourite has no row to
    // read, so this is an honest empty collection.
    settings: [],
  };
}

/** GET /api/fresh/auth/favourites */
export async function authFavouritesHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  return ok(await readFavourites(ctx, actor.customer.id));
}

/** PUT /api/fresh/auth/favourites — replace the saved tray by reference. */
export async function authReplaceFavouritesHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const body = await readJsonObject(ctx);
  const raw = body['refs'];
  if (!Array.isArray(raw) || raw.some((value) => typeof value !== 'string')) {
    throw new ContractError('VALIDATION_FAILED', 'refs must be an array of strings.', [
      { field: 'refs', code: 'INVALID_TYPE', message: 'refs must be an array of strings.' },
    ]);
  }
  const refs = [...new Set((raw as string[]).map((value) => value.trim()).filter(Boolean))].slice(0, 200);

  const existing = await getCustomerFavorites(ctx.db, actor.customer.id);
  for (const item of existing) {
    await removeCustomerFavorite(ctx.db, actor.customer.id, item.id);
  }
  for (const ref of refs) {
    const product = await resolvePurchasableProductRef(ctx.db, ref);
    if (product !== null && product.state !== 'DRAFT') {
      try {
        await addCustomerFavorite(ctx.db, actor.customer.id, product.id);
      } catch {
        // A ref that no longer resolves is skipped; the tray stays honest.
      }
    }
  }
  return ok(await readFavourites(ctx, actor.customer.id));
}

/* --------------------------------------------------------------- addresses */

function toDevelopAddress(address: CustomerAddressDto): Record<string, unknown> {
  const label =
    address.kind === 'SHIPPING'
      ? 'Shipping'
      : address.kind === 'BILLING'
        ? 'Billing'
        : address.kind === 'SHOWROOM'
          ? 'Showroom'
          : 'Pickup';
  return {
    id: address.id,
    label,
    recipient: address.recipient ?? address.full_name,
    line1: address.line1 ?? '',
    line2: address.line2,
    city: address.city,
    region: address.region,
    postal_code: address.postal_code ?? '',
    country: address.country_code,
    phone: address.phone,
    is_default: address.is_default,
  };
}

function addressInput(body: Record<string, unknown>): {
  kind: 'SHIPPING';
  full_name: string;
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal_code: string;
  country_code: string;
  phone?: string;
  is_default: boolean;
} {
  const recipient = requireString(body, 'recipient', { max: 120 });
  const line1 = requireString(body, 'line1', { max: 200 });
  const city = requireString(body, 'city', { max: 100 });
  const postalCode = requireString(body, 'postal_code', { max: 20 });
  const country = (optionalString(body, 'country', { max: 2 }) ?? 'US').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new ContractError('VALIDATION_FAILED', 'country must be an ISO-2 code.', [
      { field: 'country', code: 'INVALID_VALUE', message: 'country must be an ISO-2 code.' },
    ]);
  }
  const line2 = optionalString(body, 'line2', { max: 200 });
  const region = optionalString(body, 'region', { max: 100 });
  const phone = optionalString(body, 'phone', { max: 40 });
  return {
    kind: 'SHIPPING',
    full_name: recipient,
    recipient,
    line1,
    ...(line2 === undefined ? {} : { line2 }),
    city,
    ...(region === undefined ? {} : { region }),
    postal_code: postalCode,
    country_code: country,
    ...(phone === undefined ? {} : { phone }),
    is_default: body['is_default'] === true,
  };
}

/** GET /api/fresh/auth/addresses */
export async function authAddressesHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const addresses = await getCustomerAddresses(ctx.db, actor.customer.id);
  return ok(addresses.map(toDevelopAddress));
}

/** POST /api/fresh/auth/addresses */
export async function authCreateAddressHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const body = await readJsonObject(ctx);
  const address = await createCustomerAddress(ctx.db, actor.customer.id, addressInput(body));
  return ok(toDevelopAddress(address), 201);
}

function requireAddressId(ctx: FreshContext): string {
  const id = ctx.params['addressId'];
  if (id === undefined || id.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No address was named in the path.');
  }
  return id;
}

/** PATCH /api/fresh/auth/addresses/{addressId} */
export async function authUpdateAddressHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const body = await readJsonObject(ctx);
  const country = optionalString(body, 'country', { max: 2 });
  if (country !== undefined && !/^[A-Za-z]{2}$/.test(country)) {
    throw new ContractError('VALIDATION_FAILED', 'country must be an ISO-2 code.', [
      { field: 'country', code: 'INVALID_VALUE', message: 'country must be an ISO-2 code.' },
    ]);
  }
  const address = await updateCustomerAddress(ctx.db, actor.customer.id, requireAddressId(ctx), {
    ...(optionalString(body, 'recipient', { max: 120 }) === undefined
      ? {}
      : { recipient: optionalString(body, 'recipient', { max: 120 }) }),
    ...(optionalString(body, 'line1', { max: 200 }) === undefined
      ? {}
      : { line1: optionalString(body, 'line1', { max: 200 }) }),
    ...(optionalString(body, 'line2', { max: 200 }) === undefined
      ? {}
      : { line2: optionalString(body, 'line2', { max: 200 }) }),
    ...(optionalString(body, 'city', { max: 100 }) === undefined
      ? {}
      : { city: optionalString(body, 'city', { max: 100 }) }),
    ...(optionalString(body, 'region', { max: 100 }) === undefined
      ? {}
      : { region: optionalString(body, 'region', { max: 100 }) }),
    ...(optionalString(body, 'postal_code', { max: 20 }) === undefined
      ? {}
      : { postal_code: optionalString(body, 'postal_code', { max: 20 }) }),
    ...(country === undefined ? {} : { country_code: country.toUpperCase() }),
    ...(optionalString(body, 'phone', { max: 40 }) === undefined
      ? {}
      : { phone: optionalString(body, 'phone', { max: 40 }) }),
    ...(typeof body['is_default'] === 'boolean' ? { is_default: body['is_default'] } : {}),
  });
  return ok(toDevelopAddress(address));
}

/** DELETE /api/fresh/auth/addresses/{addressId} */
export async function authDeleteAddressHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  await deleteCustomerAddress(ctx.db, actor.customer.id, requireAddressId(ctx));
  return ok({ ok: true });
}

/** POST /api/fresh/auth/addresses/{addressId}/default */
export async function authDefaultAddressHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const address = await updateCustomerAddress(ctx.db, actor.customer.id, requireAddressId(ctx), {
    is_default: true,
  });
  return ok(toDevelopAddress(address));
}

/* ---------------------------------------------------------------- security */

/** POST /api/fresh/auth/reset — main's reset handler, unchanged. */
export async function authResetHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  return authResetPasswordHandler(asRouteContext(ctx));
}

/** POST /api/fresh/auth/verify-email — main's verify handler, unchanged. */
export async function authVerifyEmailHandlerCompat(ctx: FreshContext): Promise<HandlerOutcome> {
  return authVerifyEmailHandler(asRouteContext(ctx));
}

/**
 * POST /api/fresh/auth/resend-verification
 *
 * Main has contracts and renderers for the verification email but no provider.
 * The token is minted here; it is returned only in the four local environments,
 * exactly like registration, and never in an unconfigured/staging deployment.
 */
export async function authResendVerificationHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const session = await requireShopperSession(ctx);
  if (session.emailVerified) {
    return ok({ ok: true, already_verified: true });
  }
  const token = generateOpaqueToken();
  const expiresAt = tokenExpiry(Date.now(), EMAIL_VERIFICATION_TTL_MS);
  await createVerificationToken(ctx.db, {
    userId: session.userId,
    tokenHash: hashOpaqueToken(token),
    expiresAt,
  });
  return ok({
    ok: true,
    expires_at: expiresAt,
    ...(isDevelopmentEnvironment(ctx.environment) ? { dev_token: token } : {}),
  });
}

/**
 * POST /api/fresh/auth/change-password
 *
 * Verify the current password, enforce the same policy main's registration
 * uses, write the new hash, then rotate the session: every existing token is
 * revoked and a fresh one is issued to this browser. The response therefore
 * carries a new `maihan_session` cookie.
 */
export async function authChangePasswordHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const session = await requireShopperSession(ctx);
  const body = await readJsonObject(ctx);
  const current = requireString(body, 'current_password', { max: 200 });
  const next = requireString(body, 'new_password', { max: 200 });

  const user = await findUserById(ctx.db, session.userId);
  if (user === null) {
    throw new ContractError('UNAUTHORIZED', 'Sign in to continue.');
  }
  const matches = await verifyPassword(current, user.password_hash);
  if (!matches) {
    throw new ContractError('UNAUTHORIZED', 'The current password is incorrect.');
  }
  const violation = validatePasswordPolicy(next);
  if (violation !== null) {
    throw new ContractError('VALIDATION_FAILED', violation.message, [
      { field: 'new_password', code: violation.code, message: violation.message },
    ]);
  }

  await updatePasswordHash(ctx.db, session.userId, await hashPassword(next));
  await revokeAllSessions(ctx.db, session.userId);

  const token = generateSessionToken();
  const expiresAt = sessionExpiry(Date.now());
  await createSession(ctx.db, {
    userId: session.userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
    userAgent: ctx.request.headers.get('user-agent'),
  });

  return {
    status: 200,
    body: { ok: true },
    headers: { ...NO_STORE, 'set-cookie': sessionCookie(token, ctx.request) },
  };
}

/* --------------------------------------------------- develop sign-in family */

/** POST /api/fresh-auth/login — main's login, same session cookie. */
export async function freshAuthLoginHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  return authLoginHandler(asRouteContext(ctx));
}

/** POST /api/fresh-auth/register — main's registration, token aliased. */
export async function freshAuthRegisterHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  // develop's form posts `{email, password, first_name?, last_name?}`; main's
  // contract (strict) wants `displayName`. Build the name from the parts the
  // customer actually typed, and fall back to the email address — never a name
  // invented from the local part.
  const body = await readJsonObject(ctx);
  const email = requireString(body, 'email', { max: 320 });
  const password = requireString(body, 'password', { max: 200 });
  const first = optionalString(body, 'first_name', { max: 80 });
  const last = optionalString(body, 'last_name', { max: 80 });
  const displayName = [first, last].filter((part): part is string => part !== undefined).join(' ') || email;

  const forwardedHeaders = new Headers(ctx.request.headers);
  forwardedHeaders.delete('content-length');
  const forwarded = new Request(ctx.request.url, {
    method: 'POST',
    headers: forwardedHeaders,
    body: JSON.stringify({ email, password, displayName }),
  });
  const outcome = await authRegisterHandler(asRouteContext({ ...ctx, request: forwarded }));
  const responseBody = outcome.body as Record<string, unknown> | null;
  if (
    responseBody !== null &&
    typeof responseBody === 'object' &&
    typeof responseBody['devVerificationToken'] === 'string'
  ) {
    return {
      ...outcome,
      body: { ...responseBody, dev_verification_token: responseBody['devVerificationToken'] },
    };
  }
  return outcome;
}

/** POST /api/fresh-auth/request-reset — main's non-enumerating handler. */
export async function freshAuthRequestResetHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  return authRequestPasswordResetHandler(asRouteContext(ctx));
}

/** POST /api/fresh-auth/logout — main's logout, same cookie cleared. */
export async function freshAuthLogoutHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  return authLogoutHandler(asRouteContext(ctx));
}
