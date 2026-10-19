/**
 * apps/web/src/components/cms/CmsBlockView.tsx
 *
 * Renders a stored CMS block for the storefront. RICH_TEXT renders its
 * markdown as plain paragraphs — never raw HTML, never
 * dangerouslySetInnerHTML (doc-09 allow-list enforcement: there is no HTML
 * path here at all). Unrecognised block types render nothing (registry
 * drift must not fabricate UI).
 */
import Link from 'next/link';

import type { CmsBlock } from '../../lib/cms-pages.js';

function RichText({ markdown }: { markdown: string }) {
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </>
  );
}

export function CmsBlockView({ block }: { block: CmsBlock }) {
  const props = block.props ?? {};
  switch (block.type) {
    case 'RICH_TEXT': {
      const markdown = typeof props['markdown'] === 'string' ? props['markdown'] : '';
      if (!markdown) return null;
      return <RichText markdown={markdown} />;
    }
    case 'SHOWROOM_CTA': {
      const heading = typeof props['heading'] === 'string' ? props['heading'] : null;
      const body = typeof props['body'] === 'string' ? props['body'] : null;
      const href = typeof props['href'] === 'string' ? props['href'] : null;
      if (heading === null) return null;
      return (
        <section className="showroom-cta">
          <h2>{heading}</h2>
          {body && <p>{body}</p>}
          {href && href.startsWith('/') && (
            <Link href={href} className="btn-primary">
              Request an appointment
            </Link>
          )}
        </section>
      );
    }
    case 'CTA': {
      const label = typeof props['label'] === 'string' ? props['label'] : null;
      const href = typeof props['href'] === 'string' ? props['href'] : null;
      if (label === null || href === null || !(href.startsWith('/') || href.startsWith('https://'))) return null;
      return (
        <p>
          {href.startsWith('/') ? (
            <Link href={href} className="btn-primary">{label}</Link>
          ) : (
            <a href={href} className="btn-primary" rel="noreferrer noopener">{label}</a>
          )}
        </p>
      );
    }
    default:
      return null;
  }
}

export function CmsBlockList({ blocks }: { blocks: readonly CmsBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <CmsBlockView key={`${block.type}-${i}`} block={block} />
      ))}
    </>
  );
}
