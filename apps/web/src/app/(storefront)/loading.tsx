import '../../styles/portal-premium.css';

export default function StorefrontLoading() {
  return (
    <div className="portal-theme">
      <div className="client-frame">
        <div className="portal-card portal-card--pad" style={{ minHeight: 320 }} aria-busy="true">
          <div className="portal-empty">
            <div className="portal-empty__mark" />
            <p className="portal-empty__title">Opening the vault</p>
            <p className="portal-empty__sub">The atelier is gathering the record.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
