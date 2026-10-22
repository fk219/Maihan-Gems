/**
 * Trust column for checkout. Copy states what the server actually does:
 * a priced session, a stock hold, and papers that travel with the piece.
 * It does not claim a payment has succeeded.
 */
export function CheckoutTrust({ step }: { step: 1 | 2 | 3 }) {
  return (
    <aside className="checkout-trust" aria-label="How this checkout is held">
      <p className="page-eyebrow">Held by the house</p>
      <h2>What this step commits</h2>
      <ol>
        <li>Prices are re-read on the server. The bag total on the previous screen is indicative until that snapshot exists.</li>
        <li>One-of-one stock is reserved for 30 minutes once the session opens. It is released if the clock runs out.</li>
        <li>Loose stones and ready pieces may be returned within 14 days. Made-to-order work follows the same window unless the piece is commissioned.</li>
        <li>Laboratory papers, when the record has them, travel with the piece. A missing certificate is not invented at checkout.</li>
      </ol>
      <p className="page-subtitle">You are on step {step} of 3. Skipping a checkpoint is rejected by the atelier.</p>
    </aside>
  );
}
