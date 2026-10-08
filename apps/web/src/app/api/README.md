# `apps/web/src/app/api`

**Reserved for Phase 4 Task 6+ / Phase 3 parity.**

The SoT 12.2 route tree pins an `api/` folder inside the Next.js app for route
handlers ("section 11" of the Source of Truth). The catalogue HTTP surface
already exists as a standalone `(Request)=>Response` handler in
`apps/web/src/api/` (NOT this folder), served by the node adapter in
`server.ts`.

This folder is intentionally **created-and-empty** in Task 1: Next.js's own
`app/api/**` for v1 route handlers will be SELF-CONTAINED here when a phase
needs it; mounting the existing handler into Next is a rendering-layer
decision, not a route-tree decision. UI route folders do NOT mount this
handler either: that is the scope of a later phase.

Do not place UI page files here. Do not implement handlers here before the
owning phase authorises it.
