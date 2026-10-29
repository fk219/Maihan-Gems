# ADR-036 — Sanity is the editorial CMS for the fresh storefront

- **Status:** Accepted by explicit owner authorization (2026-10-28, "We will integrate sanity").

- **Context:** The fresh clean database deliberately carries no CMS redirect/authoring machinery, and editorial content (about, education, blog, policy, showrooms) needs an authoring surface the platform does not want to build in-house for launch. The owner directed that **Sanity** be integrated as the CMS for editorial content on the fresh storefront.

- **Alternatives:** (a) reuse the locked schema's `pages`/`page_revisions` tables (rejected: locked schema retired; rebuilding authoring UI is launch cost); (b) author markdown in-repo (rejected: owner wants a managed authoring surface); (c) **chosen** — Sanity as the headless CMS with a thin adapter.

- **Decision:** Editorial pages read from Sanity via a single adapter behind one seam (`cms-source.ts`) in `apps/web`. Until the adapter lands, the affected routes render honest "coming soon" states. No editorial content is stored in the `fresh` schema; `fresh.pages`/`seo_metadata` remain for platform-owned surfaces (e.g. policy/legal the ops team writes directly), while author-driven content (blog/education/showrooms/about) comes from Sanity.

- **Reason:** A managed headless CMS gives non-developer authoring, image pipeline, previews and scheduled publishing without building tooling; the single-adapter seam keeps page components CMS-agnostic and swappable.

- **Consequences:** A new external dependency (Sanity client + project credentials as platform secrets — never in repo per AGENTS.md §6 #9). The integration itself is a later increment (credentials + adapter + schema design); this ADR records the direction. The temporary placeholders are honest UI, not fake content.

- **Evidence:** Owner statement in session, 2026-10-28.
