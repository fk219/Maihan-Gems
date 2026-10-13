import Link from 'next/link';

export function VaultEmpty({
  kicker,
  title,
  copy,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  kicker: string;
  title: string;
  copy: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="lx-empty">
      <span className="lx-kicker">{kicker}</span>
      <h2 className="lx-h2" style={{ fontSize: '2.2rem' }}>{title}</h2>
      <p className="lx-lede">{copy}</p>
      <div className="lx-empty__actions">
        <Link href={primaryHref} className="lx-btn lx-btn--solid">{primaryLabel}</Link>
        <Link href={secondaryHref} className="lx-btn lx-btn--ghost">{secondaryLabel}</Link>
      </div>
    </div>
  );
}
