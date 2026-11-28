import Link from 'next/link';

/**
 * The page's action shape: 14 px text, a rule that draws on hover and an
 * arrow that travels 4 px. It is a link, never a pill; the closing invitation
 * is the page's only filled control.
 */
export function ArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className === undefined ? 'mh12-action' : `mh12-action ${className}`}>
      <span className="mh12-u">{children}</span>
      <span aria-hidden="true" className="mh12-action__arrow">
        &rarr;
      </span>
    </Link>
  );
}
