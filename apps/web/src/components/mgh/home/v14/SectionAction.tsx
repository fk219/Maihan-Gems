import Link from 'next/link';

/**
 * The page's action shape. One per section: 14 px label, a rule that draws
 * from the left, an arrow that travels 4 px. It is always a link, never a
 * filled control, because the closing invitation is the page's only filled
 * button and the hero search is its only field.
 *
 * `tone` only changes the ink; the geometry is the same on paper and on navy.
 */
export function SectionAction({
  href,
  children,
  tone = 'light',
}: {
  href: string;
  children: React.ReactNode;
  tone?: 'light' | 'dark';
}) {
  return (
    <Link href={href} className={`mh14-action mh14-action--${tone}`}>
      <span className="mh14-action__label">{children}</span>
      <span aria-hidden="true" className="mh14-action__arrow">
        &rarr;
      </span>
    </Link>
  );
}
