/**
 * apps/web — storefront, admin surface, AI streaming, AR route, route handlers.
 *
 * Owns state: none. It is a rendering and HTTP surface.
 * Must never contain: SQL, business logic.
 *
 * A route handler reads a session, validates, calls exactly one service, and
 * serializes. Nothing else (technical_design/01 implementation constraint 1).
 * Business logic lives below the route handler.
 *
 * @maihan/ai is deliberately absent from this package's dependencies. The
 * architecture names packages/ai as a component (technical_design/01, 03), but
 * INITIAL_IMPLEMENTATION_PLAN.md section 5 — the authority for Task 1's
 * repository layout — omits it, and AI orchestration is Phase 9. Adding it now
 * would create a package the plan has not sequenced. Flagged for the plan owner.
 *
 * Phase 1 Task 1 scope: workspace skeleton only. Next.js and React are Phase 4
 * dependencies (SKILL_MATRIX_AND_TOOLING.md 14.2) and are deliberately NOT
 * installed. There is no route handler, no component and no rendering here.
 *
 * Layout per technical_design/03:
 *   src/app/             file-system routes (technical_design/08)
 *   src/modules/         the 14 domain modules (technical_design/07)
 *   src/integrations/    WhatsApp, payments, email, storage adapters
 *   src/components/      design system + feature components (technical_design/08)
 */
export {};
