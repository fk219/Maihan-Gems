/**
 * packages/contracts/src/dto/auth/index.ts
 *
 * ADR-027 — the authentication wire contract.
 *
 * These schemas are the single definition used by the API handlers, the OpenAPI
 * generator and the admin/vendor clients. A password never appears in a
 * response, and a session token never appears in a JSON body: it travels only
 * as an HttpOnly cookie.
 *
 * Verification and reset tokens are NOT part of any success body in
 * production. The one exception is `devVerificationToken` on registration,
 * which exists because no email provider is wired yet and is emitted only when
 * the runtime environment is explicitly non-production (see
 * `auth-handlers.ts`). Its name says what it is so it cannot be mistaken for a
 * production field.
 */
import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@maihan/domain';

import { AdminRoleSchema } from '../admin/actor.js';

export const LoginRequestSchema = z.object({
  email: z.string().email().max(320),
  // Length only. Composition rules belong to registration, not login: applying
  // them here would tell an attacker which passwords are structurally invalid.
  password: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** Authenticated principal as the API reports it. Never carries a secret. */
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  /** NULL for a customer; one of the ten roles for an administrative actor. */
  role: AdminRoleSchema.nullable(),
  emailVerified: z.boolean(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  expiresAt: z.string().datetime(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const AUTH_COOKIE = 'maihan_session' as const;

/** The password length bounds are the domain policy's, imported not copied. */
const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`);

/**
 * Customer registration. `displayName` is the customer's own name for us; it
 * is not a natural key and is never used for authorisation.
 */
export const RegisterRequestSchema = z
  .object({
    email: z.string().trim().email().max(320),
    displayName: z.string().trim().min(1).max(120),
    password: passwordField,
  })
  .strict();
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RegisterResponseSchema = z.object({
  user: AuthUserSchema,
  verification: z.object({
    /** Always true today: registration never yields a verified address. */
    required: z.literal(true),
    expiresAt: z.string().datetime(),
  }),
  /**
   * Development/test only. Absent in production, where the token leaves the
   * process through the email adapter instead (none is wired yet).
   */
  devVerificationToken: z.string().optional(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

/** Redeems an email-verification token. The token never appears in a response. */
export const VerifyEmailRequestSchema = z
  .object({ token: z.string().min(20).max(200) })
  .strict();
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

/**
 * Requests a reset link. The response is identical whether or not the address
 * exists, so this request must not be used to infer account existence.
 */
export const RequestPasswordResetRequestSchema = z
  .object({ email: z.string().trim().email().max(320) })
  .strict();
export type RequestPasswordResetRequest = z.infer<typeof RequestPasswordResetRequestSchema>;

export const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordField,
  })
  .strict();
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
