import Link from 'next/link';

/**
 * The page's one action shape: a small label, a rule that draws on hover and
 * an arrow that travels 4 px. It is never a pill and never a filled surface —
 * the four reference houses all refuse the button on editorial ground.
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
      {children}
      <span aria-hidden="true" className="mh12-action__arrow">
        →
      </span>
    </Link>
  );
}
