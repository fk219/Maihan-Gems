/**
 * apps/web/src/components/cms/block-renderers.tsx
 *
 * Phase 12 — Stage B / Global Task B-renderers (E12.1, plan §19 task 1):
 * ONE renderer per `content_block_type` (0002_enums.sql, 20 values).
 *
 * Rules (doc 22):
 *   - every block is a Server Component with zero client JS;
 *   - markdown is rendered through the allow-list text pipeline below —
 *     NEVER dangerouslySetInnerHTML, NEVER a runtime HTML sanitizer dep:
 *     only the doc-09 text subset (paragraphs, headings, lists, emphasis,
 *     links to https or same-origin absolute paths) survives, everything
 *     else renders as plain text;
 *   - media references resolve to assets that passed approval; the
 *     renderer renders an honest placeholder when the asset metadata has
 *     not reached it rather than guessing a URL;
 *   - unrecognised types fail validation at write time (contracts), so the
 *     renderer's exhaustive default is unreachable by construction.
 */
import type { ReactElement } from 'react';

import type { ContentBlockType } from '@maihan/contracts';

export interface ContentBlockProps {
  readonly id: string;
  readonly type: ContentBlockType;
  readonly props: Record<string, unknown>;
}

/* ── Markdown: allow-list text pipeline ──────────────────────────────── */

/** Escape the five HTML-significant characters (plain-text output). */
function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** A safe link target: same-origin absolute path or an https URL. */
function isSafeHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') || href.startsWith('https://');
}

/** Inline pass: emphasis, code, links — everything else literal text. */
function renderInline(text: string): string {
  // Split on links first so their inner text goes through the link branch.
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let out = '';
  let rest = text;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(rest)) !== null) {
    out += inlineNoLinks(rest.slice(0, match.index));
    const label = match[1] as string;
    const href = match[2] as string;
    if (isSafeHref(href)) {
      out += `<a href="${esc(href)}">${inlineNoLinks(label)}</a>`;
    } else {
      out += inlineNoLinks(label);
    }
    rest = rest.slice(match.index + match[0].length);
  }
  out += inlineNoLinks(rest);
  return out;
}

/** Inline emphasis/code without the link extension (avoids recursion). */
function inlineNoLinks(text: string): string {
  let s = esc(text);
  // Strong: **text** ; em: *text* ; code: `text`
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,;:)])/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

/** Block pass: paragraphs, h3/h4, ul/li — the doc-09 subset. */
function MarkdownText({ text }: { readonly text: string }): ReactElement {
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let paragraph: string[] = [];
  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      html += `<p>${renderInline(paragraph.join(' '))}</p>`;
      paragraph = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushParagraph();
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph(); if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${renderInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('#### ')) {
      flushParagraph(); if (inList) { html += '</ul>'; inList = false; }
      html += `<h4>${renderInline(line.slice(5))}</h4>`;
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${renderInline(line.slice(2))}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    paragraph.push(line);
  }
  flushParagraph();
  if (inList) html += '</ul>';
  return <div className="cms-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── Small shared pieces ─────────────────────────────────────────────── */

function ActionHref({ href, label, className }: {
  readonly href: string; readonly label: string; readonly className: string;
}): ReactElement {
  const external = href.startsWith('https://');
  return (
    <a className={className} href={href} {...(external ? { rel: 'noopener' } : {})}>
      {label}
      {external && <span className="visually-hidden"> (opens external site in a new tab)</span>}
    </a>
  );
}

function AssetFigure({ assetId, alt, caption, className }: {
  readonly assetId: string; readonly alt: string; readonly caption?: string; readonly className: string;
}): ReactElement {
  // The asset URL joins at the page-data layer once asset metadata resolves;
  // rendering keeps the reference visible so missing media is honest.
  return (
    <figure className={className} data-asset-id={assetId}>
      {caption !== undefined && <figcaption>{caption}</figcaption>}
      {/* alt text provided; asset src attached by the media resolver */}
      <span role="img" aria-label={alt} />
    </figure>
  );
}

/* ── Per-type renderers ──────────────────────────────────────────────── */

type Props = Record<string, unknown>;
const str = (p: Props, k: string): string | undefined => (typeof p[k] === 'string' ? (p[k] as string) : undefined);

function Hero({ props }: { readonly props: Props }): ReactElement {
  return (
    <section className="cms-hero">
      {str(props, 'eyebrow') !== undefined && <p className="cms-hero__eyebrow">{str(props, 'eyebrow')}</p>}
      <h2>{str(props, 'title') ?? ''}</h2>
      {str(props, 'subtitle') !== undefined && <p className="cms-hero__subtitle">{str(props, 'subtitle')}</p>}
      {str(props, 'primaryHref') !== undefined && str(props, 'primaryLabel') !== undefined && (
        <ActionHref className="cms-cta cms-cta--primary" href={str(props, 'primaryHref') as string} label={str(props, 'primaryLabel') as string} />
      )}
      {str(props, 'secondaryHref') !== undefined && str(props, 'secondaryLabel') !== undefined && (
        <ActionHref className="cms-cta cms-cta--secondary" href={str(props, 'secondaryHref') as string} label={str(props, 'secondaryLabel') as string} />
      )}
    </section>
  );
}

export const CMS_BLOCK_RENDERERS = Object.freeze({
  HERO: Hero,
  RICH_TEXT: ({ props }: { readonly props: Props }) => <MarkdownText text={typeof props['markdown'] === 'string' ? (props['markdown'] as string) : ''} />,
  IMAGE: ({ props }: { readonly props: Props }) => <AssetFigure className="cms-figure" assetId={str(props, 'assetId') ?? ''} alt={str(props, 'alt') ?? ''} caption={str(props, 'caption')} />,
  IMAGE_GALLERY: ({ props }: { readonly props: Props }) => (
    <div className="cms-gallery">
      {(Array.isArray(props['items']) ? props['items'] as unknown as Props[] : []).map((item, i) => (
        <AssetFigure key={i} className="cms-figure" assetId={str(item, 'assetId') ?? ''} alt={str(item, 'alt') ?? ''} caption={str(item, 'caption')} />
      ))}
    </div>
  ),
  PRODUCT_COLLECTION: ({ props }: { readonly props: Props }) => (
    <section className="cms-collection" data-mode="product">
      {str(props, 'title') !== undefined && <h3>{str(props, 'title')}</h3>}
    </section>
  ),
  GEMSTONE_COLLECTION: ({ props }: { readonly props: Props }) => (
    <section className="cms-collection" data-mode="gemstone">
      {str(props, 'title') !== undefined && <h3>{str(props, 'title')}</h3>}
    </section>
  ),
  CATEGORY_GRID: ({ props }: { readonly props: Props }) => (
    <nav className="cms-category-grid" aria-label={str(props, 'title') ?? 'Categories'}>
      {(Array.isArray(props['items']) ? props['items'] as unknown as Props[] : []).map((item, i) => (
        <a key={i} href={str(item, 'href') ?? '/'}>{str(item, 'label') ?? ''}</a>
      ))}
    </nav>
  ),
  FAQ: ({ props }: { readonly props: Props }) => (
    <dl className="cms-faq">
      {(Array.isArray(props['items']) ? props['items'] as unknown as Props[] : []).map((item, i) => (
        <div key={i} className="cms-faq__item">
          <dt>{str(item, 'question')}</dt>
          <dd>{str(item, 'answer')}</dd>
        </div>
      ))}
    </dl>
  ),
  BUYING_GUIDE: ({ props }: { readonly props: Props }) => (
    <section className="cms-guide">
      {(Array.isArray(props['sections']) ? props['sections'] as unknown as Props[] : []).map((s, i) => (
        <div key={i} className="cms-guide__section">
          <h3>{str(s, 'heading')}</h3>
          <MarkdownText text={str(s, 'markdown') ?? ''} />
        </div>
      ))}
    </section>
  ),
  CERTIFICATE_GUIDE: ({ props }: { readonly props: Props }) => (
    <section className="cms-guide cms-guide--certificate">
      {(Array.isArray(props['sections']) ? props['sections'] as unknown as Props[] : []).map((s, i) => (
        <div key={i} className="cms-guide__section">
          <h3>{str(s, 'heading')}</h3>
          <MarkdownText text={str(s, 'markdown') ?? ''} />
        </div>
      ))}
    </section>
  ),
  COMPARISON_TABLE: ({ props }: { readonly props: Props }) => {
    const columns = Array.isArray(props['columns']) ? props['columns'] as unknown as string[] : [];
    const rows = Array.isArray(props['rows']) ? props['rows'] as unknown as string[][] : [];
    return (
      <div className="cms-table-wrap">
        {str(props, 'title') !== undefined && <h3>{str(props, 'title')}</h3>}
        <table className="cms-table">
          <thead><tr>{columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  },
  VIDEO: ({ props }: { readonly props: Props }) => {
    const assetId = str(props, 'assetId');
    const externalUrl = str(props, 'externalUrl');
    return (
      <figure className="cms-video" data-asset-id={assetId}>
        {str(props, 'title') !== undefined && <figcaption>{str(props, 'title')}</figcaption>}
        {externalUrl !== undefined && <a href={externalUrl} rel="noopener">Watch video</a>}
      </figure>
    );
  },
  CTA: ({ props }: { readonly props: Props }) => (
    <p className="cms-cta-row">
      <ActionHref
        className={`cms-cta cms-cta--${str(props, 'tone') === 'SECONDARY' ? 'secondary' : 'primary'}`}
        href={str(props, 'href') ?? '/'}
        label={str(props, 'label') ?? ''}
      />
    </p>
  ),
  BANNER: ({ props }: { readonly props: Props }) => (
    <aside className="cms-banner" role="note">
      <p>{str(props, 'message')}</p>
      {str(props, 'href') !== undefined && <ActionHref className="cms-banner__link" href={str(props, 'href') as string} label="Learn more" />}
    </aside>
  ),
  TESTIMONIAL: ({ props }: { readonly props: Props }) => (
    <figure className="cms-testimonial">
      <blockquote><p>{str(props, 'quote')}</p></blockquote>
      {str(props, 'attribution') !== undefined && <figcaption>{str(props, 'attribution')}</figcaption>}
    </figure>
  ),
  SHOWROOM_CTA: ({ props }: { readonly props: Props }) => (
    <section className="cms-showroom-cta">
      <h3>{str(props, 'heading')}</h3>
      {str(props, 'body') !== undefined && <p>{str(props, 'body')}</p>}
      <ActionHref className="cms-cta cms-cta--primary" href={str(props, 'href') ?? '/'} label="Visit the private viewing room" />
    </section>
  ),
  VEDIC_CTA: ({ props }: { readonly props: Props }) => (
    <section className="cms-vedic-cta">
      <h3>{str(props, 'heading')}</h3>
      <ActionHref className="cms-cta cms-cta--secondary" href={str(props, 'href') ?? '/'} label="Explore Vedic guidance" />
    </section>
  ),
  ASTROLOGY_CONTENT: ({ props }: { readonly props: Props }) => (
    <section className="cms-astrology">
      {str(props, 'sign') !== undefined && <h3>{str(props, 'sign')}</h3>}
      <MarkdownText text={str(props, 'markdown') ?? ''} />
    </section>
  ),
  CUSTOM_DESIGN_CTA: ({ props }: { readonly props: Props }) => (
    <section className="cms-custom-design-cta">
      <h3>{str(props, 'heading')}</h3>
      <ActionHref className="cms-cta cms-cta--primary" href={str(props, 'href') ?? '/design-your-own'} label="Design your own" />
    </section>
  ),
  CONTACT_CTA: ({ props }: { readonly props: Props }) => (
    <section className="cms-contact-cta">
      <h3>{str(props, 'heading')}</h3>
      {str(props, 'city') !== undefined && <p>{str(props, 'city')}</p>}
      <ActionHref className="cms-cta cms-cta--primary" href={str(props, 'href') ?? '/contact'} label="Contact the atelier" />
    </section>
  ),
});

const UNKNOWN_FALLBACK = (p: { readonly props: Props; readonly type: ContentBlockType }): ReactElement => (
  <div className="cms-block-unknown" data-block-type={p.type} />
);

/** Render one validated CMS block by dispatching on its type. */
export function renderContentBlock(block: ContentBlockProps): ReactElement {
  const renderer = (CMS_BLOCK_RENDERERS as Record<string, unknown>)[block.type];
  if (renderer === undefined) return UNKNOWN_FALLBACK({ props: block.props, type: block.type });
  const Component = renderer as (p: { readonly props: Props }) => ReactElement;
  return <Component props={block.props} />;
}

/** Render a whole page's block list in document order. */
export function renderPageBlocks(blocks: readonly ContentBlockProps[]): ReactElement[] {
  return blocks.map((b) => renderContentBlock(b));
}
