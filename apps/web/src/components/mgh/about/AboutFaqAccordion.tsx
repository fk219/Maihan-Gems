'use client';

import React, { useState } from 'react';
import { ChevronDown, ShieldCheck, Truck, FileCheck, Gem } from 'lucide-react';

interface FaqItem {
  id: string;
  category: string;
  icon: React.ElementType;
  question: string;
  answer: string;
  detailPoints?: string[];
}

const FAQS: FaqItem[] = [
  {
    id: 'provenance',
    category: 'Provenance & Chain of Custody',
    icon: Gem,
    question: 'How does Maihan verify the geographical origin and ethical provenance of each gemstone?',
    answer:
      'Every gemstone in our vault originates from documented primary deposits—including Merelani (Tanzania), Mogok (Myanmar), Ceylon (Sri Lanka), and Muzo (Colombia). We maintain an unbroken chain-of-custody ledger from rough acquisition at the source directly to our Geneva vault, prohibiting unverified secondary brokers and conflict-zone extraction.',
    detailPoints: [
      'Documented mine-to-vault chain of custody',
      'Zero synthetic or unverified laboratory material',
      'Strict adherence to OECD Responsible Supply Chains guidelines',
    ],
  },
  {
    id: 'shipping',
    category: 'Vault Shipping & Transit Insurance',
    icon: Truck,
    question: 'How are high-value gemstones and bespoke commissions shipped and insured?',
    answer:
      'All acquisitions are dispatched from our Geneva vault via specialized armoured courier (Malca-Amit or Brink’s Express) or priority FedEx International Insured. Shipments travel in discreet, tamper-evident sealed strongboxes with full 100% door-to-door transit insurance underwritten by Lloyd’s syndicates, requiring signature upon delivery.',
    detailPoints: [
      'Discreet unmarked exterior with triple-sealed tamper proofing',
      'Full transit insurance up to final client handover included',
      'Direct customs clearance coordination through Geneva freeport',
    ],
  },
  {
    id: 'certification',
    category: 'Gemological Certifications & Lab Reports',
    icon: FileCheck,
    question: 'What laboratory certificates and dossiers accompany each acquisition?',
    answer:
      'Each loose specimen and finished creation is accompanied by independent master laboratory reports from tier-one institutes—primarily SSEF (Swiss Gemmological Institute), Gübelin Gem Lab, or GIA. Reports substantiate chemical species, optical absorption, origin determination, and fully disclose any thermal or clarity enhancements.',
    detailPoints: [
      'Independent reports from SSEF, Gübelin, or GIA',
      'Full disclosure of treatments (unheated vs traditional heat)',
      'Digital verification QR and serial archiving',
    ],
  },
  {
    id: 'atelier',
    category: 'Bespoke Atelier & Private Salons',
    icon: ShieldCheck,
    question: 'Can stones be mounted into bespoke settings or viewed privately prior to acquisition?',
    answer:
      'Yes. Clients may pair any loose specimen with our Geneva master-crafted settings using our DYOJ Custom Studio. In addition, private viewing appointments can be arranged with our gemological directors at our salons in Geneva, New York, or London.',
    detailPoints: [
      'Hand-fabricated settings in 950 Platinum and 18K Fairmined Gold',
      'Private viewing salons in Geneva, New York & London',
      'Direct consultation with high-jewelry bench masters',
    ],
  },
];

export function AboutFaqAccordion() {
  const [openItems, setOpenItems] = useState<string[]>(['provenance', 'shipping', 'certification']);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAll = () => setOpenItems(FAQS.map((f) => f.id));
  const collapseAll = () => setOpenItems([]);

  return (
    <section
      data-testid="about-faq-section"
      aria-labelledby="faq-heading"
      className="rounded-[26px] border border-[#E5D4B3] bg-gradient-to-br from-[#FFFDF9] via-[#FAF4E6] to-[#F5E8C7]/60 text-[#181613] p-6 sm:p-10 shadow-[0_18px_50px_rgba(185,150,75,0.12)] space-y-8 font-[family-name:var(--font-eb-garamond)]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5D4B3] pb-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
            CLIENT INQUIRIES &amp; STANDARDS
          </p>
          <h2
            id="faq-heading"
            className="text-3xl sm:text-4xl font-normal text-[#181613] tracking-tight"
          >
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-[#5C5346] max-w-2xl leading-relaxed">
            Essential disclosures regarding ethical single-origin provenance, insured logistics, and independent laboratory certifications.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="px-4 py-2 text-[#181613] bg-white hover:bg-[#FAF3E3] border border-[#C5A059] rounded-full transition-colors font-semibold cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-4 py-2 text-[#5C5346] bg-white/80 hover:bg-[#FAF3E3] border border-[#E5D4B3] rounded-full transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3.5">
        {FAQS.map((faq) => {
          const isOpen = openItems.includes(faq.id);
          const Icon = faq.icon;

          return (
            <div
              key={faq.id}
              data-testid={`faq-item-${faq.id}`}
              className={`border transition-all duration-200 rounded-[20px] overflow-hidden ${
                isOpen
                  ? 'border-[#C5A059] bg-white shadow-[0_10px_28px_rgba(185,150,75,0.1)]'
                  : 'border-[#E5D4B3] bg-white/85 hover:border-[#C5A059]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleItem(faq.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-content-${faq.id}`}
                className="w-full flex items-start sm:items-center justify-between gap-4 p-5 sm:p-6 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <span className="p-2.5 rounded-full bg-[#FAF4E6] text-[#9A7B2C] shrink-0 border border-[#E5D4B3]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.2em] text-[#8B6B23] font-semibold mb-1">
                      {faq.category}
                    </span>
                    <h3 className="text-lg sm:text-xl font-medium text-[#181613]">
                      {faq.question}
                    </h3>
                  </div>
                </div>

                <div
                  className={`p-2 rounded-full border border-[#E5D4B3] bg-[#FAF8F4] text-[#8B6B23] transition-transform duration-300 shrink-0 ${
                    isOpen ? 'rotate-180 bg-[#FAF3E3] border-[#C5A059]' : ''
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {isOpen && (
                <div
                  id={`faq-content-${faq.id}`}
                  role="region"
                  aria-labelledby={faq.id}
                  className="px-6 pb-6 pt-2 text-sm text-[#4E463A] leading-relaxed border-t border-[#EFE6D4] space-y-4"
                >
                  <p className="max-w-3xl text-base text-[#2C261E]">{faq.answer}</p>

                  {faq.detailPoints && (
                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-[#5C5346]">
                      {faq.detailPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-3.5 py-2 text-[#181613]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
