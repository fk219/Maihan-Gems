/**
 * apps/web/src/components/seo/JsonLd.tsx
 *
 * Server component emitting one JSON-LD <script> block (Task 8).
 *
 * - Server-only: no 'use client', no hydration, zero client JS.
 * - The payload is serialised by lib/jsonld.ts, which escapes < > & and
 *   U+2028/9, so the block cannot break out of the script element.
 * - Rendering exactly one block per call keeps duplicate-output risk visible
 *   at the call site: a page that needs N entities composes one graph.
 */
export function JsonLd({ payload }: { readonly payload: string }) {
  return (
    <script
      type="application/ld+json"
      // The payload is escaped at serialisation time (lib/jsonld.ts).
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}
