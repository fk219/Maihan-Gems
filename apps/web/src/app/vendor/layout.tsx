/**
 * apps/web/src/app/vendor/layout.tsx
 *
 * Vendor portal route group layout — operational workspace sharing Maihan Gems
 * brand identity (near-black, gold, ivory) with dedicated authorization.
 */
import '../../styles/admin.css';
import '../../styles/maison.css';
import '../../styles/operator.css';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="maison-skip" href="#main-content">
        Skip to content
      </a>
      <div className="admin-shell operator">{children}</div>
    </>
  );
}
