import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  FileCheck,
  Gem,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getAboutPageContent, getAllShowrooms } from '@/lib/storefront-data';
import { SITE_URL } from '@/app/layout';
import { AboutFaqAccordion } from '@/components/about/AboutFaqAccordion';
import { HeroBackgroundVideo } from '@/components/catalog/HeroBackgroundVideo';

export function generateMetadata(): Metadata {
  const content = getAboutPageContent('index')!;
  return {
    title: `${content.title} — Direct-Mine Gemstones & Geneva Craftsmanship`,
    description: content.lede,
    alternates: { canonical: `${SITE_URL}/about` },
  };
}

const HERITAGE_METRICS = [
  { value: '40+ Years', label: 'Family Gemstone Sourcing' },
  { value: '100% Natural', label: 'Earth-Mined Stones Only' },
  { value: 'GIA · SSEF · Gübelin', label: 'Independent Lab Reports' },
  { value: 'Geneva · NY · London', label: 'Private Viewing Salons' },
];

const THREE_PILLARS = [
  {
    step: 'PILLAR 01',
    title: 'Direct-at-Mine Selection',
    subtitle: 'CEYLON · MOGOK · MUZO · MERELANI',
    description:
      'We acquire rough and faceted stones directly at primary deposits—bypassing secondary trade brokers so every stone carries an unbroken, documented chain of custody.',
    icon: Gem,
    href: '/about/provenance',
    linkLabel: 'Read Provenance Protocol',
  },
  {
    step: 'PILLAR 02',
    title: 'Plain-English Lab Reports',
    subtitle: 'SSEF · GÜBELIN · GIA CERTIFIED',
    description:
      'Every loose stone and finished jewel is accompanied by an independent laboratory certificate confirming natural origin and disclosing any thermal history in clear, honest language.',
    icon: FileCheck,
    href: '/varieties',
    linkLabel: 'Explore Certified Stones',
  },
  {
    step: 'PILLAR 03',
    title: 'The Geneva Master Bench',
    subtitle: 'PLATINUM 950 & 18K FAIRMINED GOLD',
    description:
      'At our Rue du Rhône atelier in Geneva, master goldsmiths hand-fabricate each ring, pendant, and earring setting to the exact millimeter proportions of your stone.',
    icon: Compass,
    href: '/about/atelier',
    linkLabel: 'Explore the Geneva Atelier',
  },
];

export default function AboutIndexPage() {
  const content = getAboutPageContent('index')!;
  const showrooms = getAllShowrooms();

  return (
    <div className="golden-cloud-gallery text-[#181613] font-[family-name:var(--font-eb-garamond)]">
      {/* =========================================================================
          1. DEDICATED ABOUT US EDITORIAL SPLIT HERO WITH STOCK VIDEO
         ========================================================================= */}
      <section
        data-testid="about-landing-hero"
        className="relative border-b border-[#D4AF37]/30 bg-[#0A0A0C] text-[#F7F5F0] pt-44 sm:pt-48 pb-16 sm:pb-24 overflow-hidden"
      >
        <HeroBackgroundVideo />

        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Editorial Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <nav
                aria-label="Breadcrumb"
                className="text-xs uppercase tracking-[0.22em] text-white/70"
              >
                <ol className="flex items-center gap-2">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">·</li>
                  <li aria-current="page" className="text-[#E6C97A] font-semibold">
                    About Us
                  </li>
                </ol>
              </nav>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                  HOUSE OF MAIHAN GEMS · GENEVA · NEW YORK · LONDON
                </p>
                <div className="w-10 h-[1.5px] bg-[#D4AF37]" />
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08]">
                  {content.title}: Three Generations of Direct-Mine Provenance.
                </h1>
              </div>

              <p className="max-w-2xl text-base sm:text-lg text-white/85 leading-relaxed">
                {content.lede} We believe buying a rare sapphire, ruby, emerald, or custom ring should feel transparent and unhurried—backed by independent Swiss and American lab reports and clear pricing.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/varieties"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-xs sm:text-sm uppercase tracking-[0.22em] font-bold gold-gradient-cta shadow-[0_12px_28px_rgba(212,175,55,0.32)] transition-transform hover:scale-[1.02]"
                >
                  <span>Explore Our Gemstones</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/about/provenance"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-[#D4AF37]/60 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  <span>Provenance Protocol</span>
                </Link>

                <Link
                  href="/about/atelier"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-white/25 bg-white/5 hover:border-[#D4AF37] text-white text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  <span>Geneva Atelier</span>
                </Link>
              </div>
            </div>

            {/* Right Visual & Stock Video Collage */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="col-span-2 relative overflow-hidden rounded-[24px] border border-white/20 bg-[#141418] aspect-[16/10] shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/images/verdant-drop.jpg"
                  className="h-full w-full object-cover object-center"
                >
                  <source src="/videos/hero-gemstone.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#E6C97A] font-semibold">
                      MINE-TO-SALON CUSTODY
                    </p>
                    <p className="text-2xl text-white">
                      Hand-Selected at the Source
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                    Since 1984
                  </span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[20px] border border-white/20 bg-[#141418] aspect-[4/3] shadow-md">
                <img
                  src="/images/elysian-ring.jpg"
                  alt="Geneva Master Bench Setting"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3.5 text-base font-medium text-white">
                  Geneva Master Bench
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[20px] border border-white/20 bg-[#141418] aspect-[4/3] shadow-md">
                <img
                  src="/images/gems/emerald-gem.jpg"
                  alt="Independent Lab Certification"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3.5 text-base font-medium text-white">
                  GIA &amp; SSEF Certified
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. HERITAGE METRICS STRIP
         ========================================================================= */}
      <section className="border-b border-[#EADBC0]/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 lg:divide-x divide-[#EADBC0]/60">
            {HERITAGE_METRICS.map((item, idx) => (
              <div
                key={item.label}
                className={`text-center px-4 ${idx > 0 ? 'pt-4 sm:pt-0' : ''}`}
              >
                <p className="text-2xl sm:text-3xl font-normal text-[#181613]">
                  {item.value}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8B6B23] font-semibold mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. THE MAIHAN STANDARD — THREE PILLARS
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
            THE MAIHAN STANDARD
          </p>
          <h2 className="text-4xl sm:text-5xl font-normal text-[#181613] leading-tight">
            How we bring rare stones from the mine to your hand.
          </h2>
          <p className="text-base text-[#5C5346] leading-relaxed">
            Every stone in our vault passes through three strict stages before it is ever offered online or in our salons.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {THREE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 sm:p-8 shadow-[0_14px_38px_rgba(185,150,75,0.1)] hover:border-[#C5A059] transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
                      {pillar.step}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF4E6] border border-[#E5D4B3] text-[#9A7B2C]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-normal text-[#181613]">
                      {pillar.title}
                    </h3>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8B6B23] font-semibold mt-1">
                      {pillar.subtitle}
                    </p>
                  </div>

                  <p className="text-sm sm:text-base text-[#4E463A] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#EFE6D4]">
                  <Link
                    href={pillar.href}
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] font-semibold"
                  >
                    <span>{pillar.linkLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          4. MAISON DOSSIER SECTIONS (OPEN, READABLE GOLDEN-CLOUD CARDS)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-[#EADBC0]/70 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              MAISON ARCHIVE &amp; GOVERNANCE
            </p>
            <h2 className="text-3xl sm:text-4xl font-normal text-[#181613]">
              Provenance &amp; Craftsmanship Dossiers
            </h2>
          </div>

          <Link
            href="/concierge?q=Explain+Maihan+Gems+provenance+and+lab+certifications"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#C5A059] bg-white hover:bg-[#FAF3E3] text-xs uppercase tracking-[0.18em] text-[#181613] font-semibold transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Ask AI Gemologist About Our Standards</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {content.sections.map((sec) => (
            <section
              key={sec.heading}
              className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 sm:p-8 shadow-[0_12px_34px_rgba(185,150,75,0.09)] flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="w-8 h-[1.5px] bg-[#C5A059]" />
                <h3 className="text-2xl sm:text-3xl font-normal text-[#181613]">
                  {sec.heading}
                </h3>
                <p className="text-sm sm:text-base text-[#4E463A] leading-relaxed">
                  {sec.body}
                </p>
              </div>

              {sec.facts && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-[#EFE6D4]">
                  {sec.facts.map((f) => (
                    <div
                      key={f.label}
                      className="rounded-[16px] bg-[#FAF8F4] border border-[#EFE6D4] p-3.5"
                    >
                      <dt className="text-[11px] uppercase tracking-[0.18em] text-[#8B6B23] font-semibold">
                        {f.label}
                      </dt>
                      <dd className="text-sm font-medium text-[#181613] mt-1">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. GLOBAL PRIVATE VIEWING SALONS (GENEVA · NEW YORK · LONDON)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-[#EADBC0]/70 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              VISIT US IN PERSON
            </p>
            <h2 className="text-3xl sm:text-4xl font-normal text-[#181613]">
              Our Private Daylight Salons
            </h2>
            <p className="text-base text-[#5C5346] max-w-xl">
              Inspect loose gemstones under calibrated 5500K north-daylight lamps or consult with our jewelers in Geneva, New York, or London.
            </p>
          </div>

          <Link
            href="/showrooms"
            className="text-xs uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] inline-flex items-center gap-1.5 font-semibold"
          >
            <span>View All Salons</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {showrooms.map((salon) => (
            <article
              key={salon.slug}
              className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 shadow-[0_12px_34px_rgba(185,150,75,0.09)] flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] text-[#8B6B23] font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>{salon.city} Salon</span>
                </div>
                <h3 className="text-2xl font-normal text-[#181613]">
                  <Link href={`/showrooms/${salon.slug}`} className="hover:text-[#8B6B23] transition-colors">
                    {salon.name}
                  </Link>
                </h3>
                <div className="text-sm text-[#5C5346] space-y-1 pt-2 border-t border-[#EFE6D4]">
                  <p className="text-[#181613] font-medium">{salon.address}</p>
                  <p>{salon.hours}</p>
                  <p className="text-[#8B6B23] font-semibold">{salon.phone}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#EFE6D4]">
                <Link
                  href={`/showrooms/${salon.slug}`}
                  className="text-xs uppercase tracking-[0.18em] text-[#6E6250] hover:text-[#181613] underline underline-offset-4"
                >
                  Salon Details
                </Link>
                <Link
                  href={`/contact?salon=${encodeURIComponent(salon.city)}`}
                  className="px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-bold gold-gradient-cta transition-transform hover:scale-[1.02]"
                >
                  Book Visit
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. FREQUENTLY ASKED QUESTIONS
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <AboutFaqAccordion />
      </section>
    </div>
  );
}
