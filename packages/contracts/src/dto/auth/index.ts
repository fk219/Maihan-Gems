/**
 * packages/contracts/src/dto/auth/index.ts
 *
 * ADR-027 — the authentication wire contract.
 *
 * These schemas are the single definition used by the API handlers, the OpenAPI
 * generator and the admin/vendor clients. A password never appears in a
 * response, and a session token never appears in a JSON body: it travels only
 * as an HttpOnly cookie.
 */
import { z } from 'zod';

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
