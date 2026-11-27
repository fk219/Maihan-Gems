/**
 * The left half of both console sign-ins.
 *
 * One treatment for both surfaces: the same lit still, the same house line,
 * the same rules and spacing. Only the small surface label changes, so admin
 * and vendor read as two doors into one building rather than two products.
 */
export function AuthAside({ surface }: { surface: string }): React.JSX.Element {
  return (
    <aside className="mh-auth__aside" aria-label={`${surface} — Maihan Gems`}>
      <div className="mh-auth__media" aria-hidden="true">
        <img
          src="/mgh/images/gems/sapphire-gem.jpg"
          alt=""
          width={1200}
          height={1800}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="mh-auth__veil" aria-hidden="true" />
      <div className="mh-auth__light" aria-hidden="true" />

      <p className="mh-auth__brand">Maihan Gems</p>

      <div className="mh-auth__aside-body">
        <p className="mh-auth__quote">
          The stone comes first.
          <br />
          The record follows.
        </p>
        <p className="mh-auth__caption">
          {surface} · 608 Fifth Avenue, New York
        </p>
      </div>
    </aside>
  );
}
