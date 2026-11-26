/**
 * Fixture ledger exports.
 *
 * `DEMO_CONTENT` is the single switch that says the storefront is rendering
 * develop's fixture rows because main's catalogue cannot evidence them (no
 * DATABASE_URL, an empty table, or a zero-row query). It is TRUE for this
 * integration: the design must render exactly as develop does while the
 * locked catalogue is still empty. Every surface that renders fixture rows
 * shows the "Demo content" badge (components/mgh/ui/DemoContentBadge).
 *
 * It is deliberately a constant, not a runtime probe, so it cannot flip
 * silently: changing it is a reviewed edit.
 */
export const DEMO_CONTENT = true;

export * from './types';
export * from './catalog';
export * from './content';
export * from './operations';
