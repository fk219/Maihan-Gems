import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getPolicyPageContent, getAllPolicyPages } from '@/lib/mgh/storefront-data';
import type { SubpageContent } from '@/lib/mgh/fixtures/types';
import { getCmsPageBySlug } from '@/lib/cms-pages';
import { CmsBlockList } from '@/components/cms/CmsBlockView';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: institutional policy dossier. CMS-first (doc 22 —
// the repo's locked `pages` table, POLICY kind, published head revision only;
// the kind gate stops showroom/blog rows cross-rendering as policy) rendered
// in the reference applet's legal chrome. When the CMS has no published row
// the applet's ported policy copy renders verbatim (alias-resolved with the
// repo's existing storefront-data helper). Unknown slugs 404 honestly — the
// prior repository page's filler-for-any-slug fallback was not carried over.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ policySlug: string }>;
}): Promise<Metadata> {
  const { policySlug } = await params;
  const cmsPage = await getCmsPageBySlug(policySlug.toLowerCase());
  if (cmsPage && cmsPage.pageKind === 'POLICY') {
    return {
      title: `${cmsPage.title} | Maihan Gems`,
      description: `Maihan Gems institutional policy dossier (${cmsPage.slug}).`,
      alternates: { canonical: `${SITE_URL}/policy/${cmsPage.slug}` },
    };
  }
  const policy = getPolicyPageContent(policySlug);
  if (!policy) {
    return {
      title: 'Policy Not Found',
      description: 'The requested policy document does not exist.',
    };
  }
  return {
    title: `${policy.title} | Maihan Gems`,
    description: policy.lede,
    alternates: { canonical: `${SITE_URL}/policy/${policy.slug}` },
  };
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policySlug: string }>;
}) {
  const { policySlug } = await params;
  const cmsPage = await getCmsPageBySlug(policySlug.toLowerCase());
  const usesCms = Boolean(cmsPage && cmsPage.pageKind === 'POLICY');
  const policy: SubpageContent | null = usesCms ? null : getPolicyPageContent(policySlug);
  if (!policy) {
    notFound();
  }

  const allPolicies = getAllPolicyPages();
  // Real per-record facts only. The CMS branch drives the same chrome from
  // the stored page title + blocks; the fixture branch is the applet's own
  // verbatim copy (kicker/lede/sections).
  const chromeTitle = usesCms ? cmsPage!.title : policy.title;
  const chromeKicker = usesCms
    ? `POLICY DOSSIER · ${cmsPage!.slug.toUpperCase()}`
    : policy.kicker;
  const chromeLede = usesCms
    ? undefined
    : policy.lede;

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-[#6B5A45] flex flex-wrap items-center justify-between gap-4">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-[#1A1612] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/policy" className="hover:text-[#1A1612] transition-colors">
                Legal &amp; Compliance Hub
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-[#1A1612]">
              {chromeTitle}
            </li>
          </ol>
          <Link
            href="/policy"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-[#8C6D2F] hover:text-[#1A1612]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Legal Dossiers
          </Link>
        </nav>

        {/* Header Banner */}
        <header className="rounded-[28px] border border-[#E5D4B3] bg-gradient-to-br from-[#231B12] via-[#1C1610] to-[#120E0A] p-8 sm:p-12 text-[#FAF3E3] shadow-[0_24px_60px_rgba(26,20,14,0.16)] space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/15 px-3.5 py-1 text-xs uppercase tracking-[0.2em] text-[#E6C97A]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {chromeKicker}
          </div>
          <h1 className="text-3xl sm:text-5xl font-normal text-white leading-[1.12]">
            {chromeTitle}
          </h1>
          {chromeLede && (
            <p className="max-w-3xl text-base sm:text-lg text-[#D8CEBE] leading-relaxed">
              {chromeLede}
            </p>
          )}
        </header>

        {/* Main 12-Col Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-5">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8C6D2F] font-semibold">
                Legal &amp; Compliance Dossiers
              </p>
              <p className="text-sm text-[#6B5A45] mt-1">
                Switch between official Maihan Gems statutory policies.
              </p>
            </div>
            <nav aria-label="Policy navigation" className="space-y-1.5">
              {allPolicies.map((doc) => {
                const active = !usesCms && doc.slug === policy.slug;
                return (
                  <Link
                    key={doc.slug}
                    href={`/policy/${doc.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2 rounded-[14px] px-4 py-3 text-sm transition-all ${
                      active
                        ? 'bg-[#1C1610] text-[#FAF3E3] border border-[#C5A059]/50 shadow-sm'
                        : 'text-[#3D3225] hover:bg-[#FAF3E3] border border-transparent'
                    }`}
                  >
                    <span className="font-medium">{doc.title}</span>
                    <FileText className={`h-4 w-4 shrink-0 ${active ? 'text-[#E6C97A]' : 'text-[#8C6D2F]'}`} />
                  </Link>
                );
              })}
              {usesCms && (
                <Link
                  href={`/policy/${cmsPage!.slug}`}
                  aria-current="page"
                  className="flex items-center justify-between gap-2 rounded-[14px] px-4 py-3 text-sm transition-all bg-[#1C1610] text-[#FAF3E3] border border-[#C5A059]/50 shadow-sm"
                >
                  <span className="font-medium">{cmsPage!.title}</span>
                  <FileText className="h-4 w-4 shrink-0 text-[#E6C97A]" />
                </Link>
              )}
            </nav>

            <div className="rounded-[16px] border border-[#E5D4B3] bg-[#FAF3E3]/70 p-4 space-y-2 text-sm">
              <p className="font-semibold text-[#1A1612] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#8C6D2F]" />
                Geneva Compliance Desk
              </p>
              <p className="text-[#5C4E3C] leading-relaxed">
                For bespoke escrow agreements, ATA Carnet customs documentation, or GDPR/FADP data requests, contact our compliance officers or consult the AI Gemologist.
              </p>
              <div className="pt-1 flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em] font-semibold text-[#8C6D2F]">
                <Link href="/showrooms/geneva" className="underline hover:text-[#1A1612]">
                  Geneva Vault →
                </Link>
                <Link href="/concierge" className="underline hover:text-[#1A1612]">
                  AI Gemologist →
                </Link>
              </div>
            </div>
          </aside>

          {/* Policy Clauses */}
          <div className="lg:col-span-8 space-y-6">
            {usesCms ? (
              <section
                className="rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-7 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-4"
              >
                <CmsBlockList blocks={cmsPage!.blocks} />
              </section>
            ) : (
              policy.sections.map((sec) => (
                <section
                  key={sec.heading}
                  className="rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-7 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-4"
                >
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1612]">
                    {sec.heading}
                  </h2>
                  <p className="text-base sm:text-lg text-[#4A3E2E] leading-relaxed">
                    {sec.body}
                  </p>

                  {sec.facts && sec.facts.length > 0 && (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#EFE5D1]">
                      {sec.facts.map((f) => (
                        <div
                          key={f.label}
                          className="rounded-[14px] border border-[#E5D4B3]/80 bg-[#FAF3E3]/60 px-4 py-3"
                        >
                          <dt className="text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                            {f.label}
                          </dt>
                          <dd className="mt-1 text-base font-semibold text-[#1A1612]">
                            {f.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
