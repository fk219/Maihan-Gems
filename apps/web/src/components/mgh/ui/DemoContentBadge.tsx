/**
 * components/mgh/ui/DemoContentBadge.tsx
 *
 * The visible marker for fixture-backed content. main's locked catalogue is
 * empty, so the storefront falls back to develop's fixture ledger to render
 * the design; that content is demo content, not live inventory, and must say
 * so wherever it appears.
 *
 * Server component: no state, no client bundle cost. It renders nothing when
 * the build is not serving fixture rows, so removing the fallback later
 * removes the badge with it.
 */
import { DEMO_CONTENT } from '../../../lib/mgh/fixtures/index.js';

export function DemoContentBadge(): React.JSX.Element | null {
  if (!DEMO_CONTENT) return null;
  return (
    <p className="demo-content-badge" role="note">
      <span className="demo-content-badge__dot" aria-hidden="true" />
      <strong>Demo content</strong>
      <span className="demo-content-badge__text">
        Fixture pieces shown because the live catalogue has no evidenced rows yet. Prices,
        references and availability are illustrative, not inventory.
      </span>
    </p>
  );
}
