/**
 * apps/web/src/api/security-mode.ts
 *
 * R1-1: the fail-closed security-mode authority now lives in
 * `@maihan/config` (the only package permitted to read process.env —
 * technical_design/01 line 56). This module re-exports it so existing
 * web-layer imports keep working. See packages/config/src/security-mode.ts
 * for the full rationale.
 */
export {
  SPOOFABLE_IDENTITY_HEADERS,
  isDevSeamEnabled,
  isFailClosedMode,
} from '@maihan/config';
