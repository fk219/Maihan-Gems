'use client';

/**
 * The red Agentation "Issue" overlay is disabled for this storefront.
 * It must not appear in screenshots or production. Opt-in is the
 * NEXT_PUBLIC_AGENTATION=1 webpack alias plus an explicit html[data-agentation]
 * attribute — neither is set here.
 */
export function AgentationOverlay() {
  return null;
}
