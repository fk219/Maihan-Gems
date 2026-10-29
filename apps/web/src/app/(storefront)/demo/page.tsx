import Link from 'next/link';
import GeminiStudioDemoClient from '@/components/mgh/demo/GeminiStudioDemoClient';
import { getHeroAnchorGemstone } from '@/lib/mgh/storefront-data';

export default function DemoShowcasePage() {
  const anchor = getHeroAnchorGemstone();

  const verificationMatrix = [
    {
      category: 'Storefront & Evidence-First PDPs',
      links: [
        { label: `Anchor Stone: ${anchor.name} (${anchor.sku})`, href: `/product/${anchor.slug}` },
        { label: 'API-Shaped PDP (/products/[productSlug])', href: `/products/${anchor.slug}` },
        { label: 'Variety-Scoped PDP (/tanzanite/...)', href: `/${anchor.varietySlug}/${anchor.slug}` },
        { label: 'Branded 404 Catch-All (/unknown-variety-slug)', href: '/unknown-variety-slug' },
      ],
    },
    {
      category: 'Catalogue, Pairs & Bespoke Configurator (DYO)',
      links: [
        { label: 'Full Vault Catalogue (/browse)', href: '/browse' },
        { label: 'Matched Pairs — Earrings Only (/pairs)', href: '/pairs' },
        { label: 'Architectural Settings (/settings)', href: '/settings' },
        { label: 'Design Your Own Configurator (/design-your-own)', href: '/design-your-own' },
        { label: 'Saved DYO Review (DYO-MG-8841)', href: '/design-your-own/review/DYO-MG-8841' },
        { label: 'Honest Missing DYO Code (BOGUS-CODE)', href: '/design-your-own/review/BOGUS-CODE' },
      ],
    },
    {
      category: '3D Optical Chamber, WebAR & Checkout Honesty',
      links: [
        { label: 'Interactive 3D & WebAR Viewer (webar-tz-0131)', href: '/ar/webar-tz-0131' },
        { label: 'Honest Missing WebAR Asset (/ar/missing-asset)', href: '/ar/missing-asset' },
        { label: 'Desktop-to-Mobile AR Handoff (HANDOFF-TZ-0131)', href: '/ar/handoff/HANDOFF-TZ-0131' },
        { label: 'Checkout Confirmation — PENDING_PAYMENT (ORD-2026-9012)', href: '/checkout/confirmation/ORD-2026-9012' },
        { label: 'Checkout Confirmation — Reconciled (ORD-2026-8410)', href: '/checkout/confirmation/ORD-2026-8410' },
      ],
    },
    {
      category: 'Back-Office Operator Consoles (Auth-Gated)',
      links: [
        { label: 'Admin Console — Overview & KPIs (/admin)', href: '/admin' },
        { label: 'Admin SEO & Redirect Manager (/admin/seo)', href: '/admin/seo' },
        { label: 'Admin Navigation Editor (/admin/navigation)', href: '/admin/navigation' },
        { label: 'Admin AI-Ops Queue & Dead-Letter Requeue (/admin/ai-ops)', href: '/admin/ai-ops' },
        { label: 'Vendor Portal — Consignment & Orders (/vendor)', href: '/vendor' },
      ],
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 space-y-12">
      <header className="border-b border-[#E4E0D8] pb-8 space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#1E3A5F]">
          Interactive Architecture &amp; AI Workbench
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#141413]">
          Maihan Gems — Showcase &amp; Verification Index
        </h1>
        <p className="text-base text-[#575551] max-w-3xl leading-relaxed">
          Inspect every surface of the Maihan Gems storefront, test server-side
          Gemini gemological reasoning and macro studio image synthesis, or jump
          directly to verified vs. honest-missing states across the application.
        </p>
      </header>

      <GeminiStudioDemoClient />

      <section className="space-y-6">
        <div className="border-b border-[#E4E0D8] pb-3">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]">
            Complete Surface Matrix
          </p>
          <h2 className="font-serif text-3xl text-[#141413] mt-1">
            Direct Flow &amp; State Inspection Links
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {verificationMatrix.map((group) => (
            <div
              key={group.category}
              className="bg-[#F1EFEA] border border-[#E4E0D8] p-6 space-y-4"
            >
              <h3 className="font-serif text-xl text-[#141413] border-b border-[#E4E0D8] pb-2">
                {group.category}
              </h3>
              <ul className="space-y-2.5">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between text-sm text-[#141413] hover:text-[#1E3A5F] group py-1"
                    >
                      <span>{item.label}</span>
                      <span className="font-mono text-xs text-[#575551] group-hover:text-[#1E3A5F]">
                        {item.href} →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
