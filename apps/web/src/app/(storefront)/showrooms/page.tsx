import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllShowrooms } from '@/lib/mgh/storefront-data';
import { listCmsPages, type CmsPage } from '@/lib/cms-pages';
import { CmsBlockList } from '@/components/cms/CmsBlockView';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: salon index. The repo documents showrooms as CMS
// content (doc 22 / cms-pages.ts "policy, education, blog, showrooms"), so the
// index tries the locked `pages` table first (SHOWROOM kind, published head
// revision only) rendered in the reference applet's salon cards; with no
// published SHOWROOM rows the applet's ported salon dossiers render verbatim
// (client-approved copy, no fabricated CMS metadata).
const LEDE =
  'Private daylight salons in Geneva, New York, and London.';

export const metadata: Metadata = {
  title: 'Private Viewing Salons — Geneva · New York · London',
  description: LEDE,
  alternates: { canonical: `${SITE_URL}/showrooms` },
};

/** Real booking href from a stored SHOWROOM_CTA/CTA block, else /contact. */
function ctaHref(page: CmsPage): string {
  for (const block of page.blocks) {
    const href = block.props['href'];
    if (typeof href === 'string' && href.startsWith('/')) return href;
  }
  return '/contact';
}

export default async function ShowroomsIndexPage() {
  const showrooms = getAllShowrooms();
  const salons = await listCmsPages('SHOWROOM');

  return (
    <div className="golden-cloud-gallery text-[#181613] font-[family-name:var(--font-eb-garamond)] min-h-[80vh]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.22em] text-[#7A7060]">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-[#181613]">Home</Link></li>
            <li aria-hidden="true">·</li>
            <li aria-current="page" className="text-[#8B6B23] font-semibold">Salons</li>
          </ol>
        </nav>

        <div className="border-b border-[#E5D4B3] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              BY APPOINTMENT ONLY
            </p>
            <h1 className="mt-1 text-4xl sm:text-5xl font-normal text-[#181613] tracking-tight">
              Private Salons &amp; Vaults
            </h1>
          </div>
          <p className="text-sm text-[#5C5346] max-w-xs">{LEDE}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(salons.length > 0 ? salons : showrooms).map((entry) => {
            if (!('pageKind' in entry)) {
              const salon = entry;
              return (
                <article
                  key={salon.slug}
                  className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 shadow-[0_14px_38px_rgba(185,150,75,0.1)] flex flex-col justify-between space-y-8"
                >
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.26em] text-[#8B6B23] font-semibold">
                      {salon.city.toUpperCase()} SALON
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-normal text-[#181613]">
                      <Link href={`/showrooms/${salon.slug}`} className="hover:text-[#9A7B2C] transition-colors">
                        {salon.name}
                      </Link>
                    </h2>
                    <div className="text-sm text-[#5C5346] space-y-1.5 pt-3 border-t border-[#EFE6D4]">
                      <p className="text-[#181613] font-medium">{salon.address}</p>
                      <p>{salon.hours}</p>
                      <p className="text-[#8B6B23] font-semibold">{salon.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#EFE6D4] text-xs uppercase tracking-[0.18em]">
                    <Link href={`/showrooms/${salon.slug}`} className="text-[#6E6250] hover:text-[#181613] underline underline-offset-4">
                      Salon Dossier
                    </Link>
                    <Link
                      href={`/contact?salon=${encodeURIComponent(salon.city)}`}
                      className="px-5 py-2.5 rounded-full font-bold gold-gradient-cta transition-all"
                    >
                      Reserve
                    </Link>
                  </div>
                </article>
              );
            }
            // CMS row: the applet's salon card chrome driven by real stored
            // values only (title, blocks, block CTA href).
            const page = entry;
            return (
              <article
                key={page.slug}
                className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 shadow-[0_14px_38px_rgba(185,150,75,0.1)] flex flex-col justify-between space-y-8"
              >
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-[#8B6B23] font-semibold">
                    PUBLISHED SALON DOSSIER
                    {page.updatedAt ? ` · ${page.updatedAt.slice(0, 10)}` : ''}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#181613]">
                    <Link href={`/showrooms/${page.slug}`} className="hover:text-[#9A7B2C] transition-colors">
                      {page.title}
                    </Link>
                  </h2>
                  <div className="text-sm text-[#5C5346] space-y-1.5 pt-3 border-t border-[#EFE6D4]">
                    <CmsBlockList blocks={page.blocks} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#EFE6D4] text-xs uppercase tracking-[0.18em]">
                  <Link href={`/showrooms/${page.slug}`} className="text-[#6E6250] hover:text-[#181613] underline underline-offset-4">
                    Salon Dossier
                  </Link>
                  <Link
                    href={ctaHref(page)}
                    className="px-5 py-2.5 rounded-full font-bold gold-gradient-cta transition-all"
                  >
                    Reserve
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
