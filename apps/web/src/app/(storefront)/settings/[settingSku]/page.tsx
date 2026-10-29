import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFreshSettingBySkuOrSlug as getSettingBySkuOrSlug } from '@/lib/mgh/adapters/catalog';
import {
  SettingDetailGallery,
  SettingDetailClient,
  SettingDetailBelowFoldSections,
} from '@/components/mgh/catalog/SettingDetailClient';
import { SITE_URL } from '@/lib/mgh/site-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ settingSku: string }>;
}): Promise<Metadata> {
  const { settingSku } = await params;
  const setting = await getSettingBySkuOrSlug(settingSku);
  if (!setting) {
    return {
      title: 'Setting Not Found',
      description: 'The requested setting SKU does not exist in the Maihan Gems ledger.',
    };
  }
  return {
    title: `${setting.name} (${setting.sku})`,
    description: setting.lede,
    alternates: {
      canonical: `${SITE_URL}/settings/${setting.sku}`,
    },
  };
}

export default async function SettingDetailPage({
  params,
}: {
  params: Promise<{ settingSku: string }>;
}) {
  const { settingSku } = await params;
  const setting = await getSettingBySkuOrSlug(settingSku);
  if (!setting) {
    notFound();
  }

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]"
        >
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-[#1A1612]">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/settings" className="hover:text-[#1A1612]">
                Settings
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-[#1A1612]">
              {setting.name}
            </li>
          </ol>
        </nav>

        {/* Above-the-Fold 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Vertical Thumbnail Rail + Main Stage Image */}
          <div className="lg:col-span-7">
            <SettingDetailGallery setting={setting} />
          </div>

          {/* Right: Kicker, Title, Description, Price, Metal/Size Selectors & Actions */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-[#9A7432] font-semibold">
                <span className="h-px w-6 bg-[#C5A059]" />
                <span>SETTING</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-normal text-[#1A1612] leading-[1.12]">
                {setting.name}
              </h1>
              <p className="text-base text-[#5C4E3C] leading-relaxed">
                {setting.lede}
              </p>
            </div>

            <SettingDetailClient setting={setting} />
          </div>
        </div>

        {/* Below-the-Fold Interactive Tabs, Specifications, Craftsmanship Banner & Gemstone Pairings */}
        <SettingDetailBelowFoldSections setting={setting} />
      </div>
    </div>
  );
}
