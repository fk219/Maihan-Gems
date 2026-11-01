export default function Loading() {
  return (
    <div className="portal-section" aria-busy="true">
      <div className="portal-card portal-card--pad" style={{ minHeight: 260 }}>
        <div className="portal-empty">
          <p className="portal-empty__title">Confirming your order</p>
          <p className="portal-empty__sub">The atelier is reading the ledger…</p>
        </div>
      </div>
    </div>
  );
}
