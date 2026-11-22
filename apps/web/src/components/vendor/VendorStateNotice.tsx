/**
 * apps/web/src/components/vendor/VendorStateNotice.tsx
 *
 * The portal explains a blocked vendor instead of pretending it does not
 * exist. No data is read while the vendor is not APPROVED: the gate that
 * protects the API also protects every server component.
 */
import type { VendorState } from '@maihan/domain';
import { pageLead, pageTitle, notice } from './styles.js';

const EXPLANATION: Readonly<Record<VendorState, string>> = Object.freeze({
  PENDING:
    'Your application is waiting for platform approval. You can sign in, but stock, orders and statements stay closed until the vendor is approved.',
  SUSPENDED:
    'This vendor is suspended. Stock, orders and statements are closed while the suspension is in force. Contact the platform to resolve it.',
  TERMINATED:
    'This vendor is terminated. The portal is read-only history held by the platform; it cannot list stock or open new orders.',
  APPROVED: '',
});

export function VendorStateNotice({
  vendorName,
  state,
}: {
  readonly vendorName: string;
  readonly state: VendorState;
}): React.JSX.Element {
  return (
    <>
      <h2 style={pageTitle}>{vendorName}</h2>
      <p style={pageLead}>{EXPLANATION[state]}</p>
      <p style={notice} role="status">
        Vendor state: <strong>{state}</strong>
      </p>
    </>
  );
}
