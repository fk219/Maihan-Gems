/**
 * Route-level loading state for the order confirmation: one aria-busy
 * announcement, no spinners.
 */
export default function Loading() {
  return (
    <main className="page checkout-page" aria-busy="true">
      <p className="page-subtitle">Confirming your order with the atelier&hellip;</p>
    </main>
  );
}
