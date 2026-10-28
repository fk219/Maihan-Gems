/**
 * apps/web/src/app/admin/layout.tsx
 *
 * Admin route group layout — separate chrome, separate authz (SoT 12.2).
 * The shell renders a professional back-office frame; every page inside
 * re-checks its own capability through requireAdminAccess.
 */
import '../../styles/admin.css';
import '../../styles/maison.css';
import '../../styles/operator.css';
import '../../styles/mgh-applet.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="maison-skip" href="#main-content">
        Skip to content
      </a>
      <div className="admin-shell operator">{children}</div>
    </>
  );
}
