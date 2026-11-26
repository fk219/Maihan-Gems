import type {
  EducationArticle,
  BlogPost,
  SubpageContent,
  ShowroomRecord,
} from './types';

export const EDUCATION_ARTICLES: EducationArticle[] = [
  {
    path: ['gemology', 'tanzanite-trichroism'],
    slugKey: 'gemology/tanzanite-trichroism',
    title: 'Understanding Trichroism & Thermal Disclosure in Merelani Tanzanite',
    category: 'Gemological Science',
    readingMinutes: 6,
    updatedAt: '2026-09-18',
    lede: 'Why zoisite crystals absorb light differently along three crystallographic axes, and how lapidary orientation governs whether a stone reads sapphire-blue or royal violet.',
    sections: [
      {
        heading: '01. Pleochroic Axes in Vanadium Zoisite',
        body: 'Tanzanite is the blue-to-violet variety of the mineral zoisite, coloured by trace vanadium substituting for aluminium in the crystal lattice. Because zoisite crystallizes in the orthorhombic system, light travelling through the stone splits along three mutually perpendicular axes—each displaying a distinct spectral absorption band.',
      },
      {
        heading: '02. Natural vs. Furnace-Aligned Thermal Transition',
        body: 'In the ground, most rough crystals display a brownish-burgundy third axis along with blue and violet. Controlled heating around 550°C permanently removes the brown valence state. At Maihan Gems, every stone is disclosed as either naturally unheated or thermally aligned, accompanied by its laboratory dossier.',
      },
      {
        heading: '03. Protective Setting Architecture',
        body: 'With a Mohs hardness of 6.5 to 7.0 and one direction of perfect basal cleavage, tanzanite should be set by experienced coloured-stone setters using relieved claws or protective bezels.',
      },
    ],
  },
  {
    path: ['treatments', 'disclosure-protocol'],
    slugKey: 'treatments/disclosure-protocol',
    title: 'The Maihan Evidence Standard: Treatment & Origin Disclosure',
    category: 'Provenance & Ethics',
    readingMinutes: 5,
    updatedAt: '2026-10-02',
    lede: 'Our non-negotiable ledger rules for thermal enhancement, emerald fissure oiling, and when an attribute is marked Not Evidenced.',
    sections: [
      {
        heading: '01. Zero Unverified Claims',
        body: 'If a gemological report does not state a specific sub-district or specific gravity measurement, our digital dossier explicitly renders "Not evidenced" rather than extrapolating from typical regional values.',
      },
      {
        heading: '02. Emerald Clarity Enhancement Grades',
        body: 'Colombian and Zambian emeralds frequently contain surface-reaching jardines. We accept only untreated (No Oil) or traditional cedarwood oil (Insignificant to Minor, F1) stones, rejecting synthetic polymers and dyed resins.',
      },
    ],
  },
  {
    path: ['earrings', 'calibrating-matched-pairs'],
    slugKey: 'earrings/calibrating-matched-pairs',
    title: 'Why Matched Gemstone Pairs Attach Exclusively to Earrings',
    category: 'Bespoke Craft',
    readingMinutes: 4,
    updatedAt: '2026-08-24',
    lede: 'Matching two natural pleochroic gemstones for face-up dimension, pavilion depth, and fluorescence takes months of parcel sorting.',
    sections: [
      {
        heading: '01. Optical Symmetry Across Left and Right',
        body: 'Unlike calibrated melee diamonds, fine coloured gemstones above 1.00 carat each vary in colour zoning and extinction. Our matched pairs are sorted under north-daylight and incandescent lamps so they remain twins in every environment.',
      },
      {
        heading: '02. Dedicated Earring Architecture',
        body: 'Because each pair is balanced for weight and optical symmetry on the ear, our matched pairs are reserved strictly for earring mountings.',
      },
    ],
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'field-notes-merelani-block-d-2026',
    title: 'Field Notes from Merelani Block D: Sorting Deep-Axis Zoisite',
    publishedAt: '2026-10-10',
    author: 'Dr. Aria Rostami, FGA',
    authorRole: 'Chief Gemologist, Maihan Gems',
    category: 'Origin Dispatches',
    lede: 'Observations from our autumn intake of rough and pre-formed zoisite parcels from northern Tanzania, examining dichroscope techniques in natural daylight.',
    body: [
      'Sorting rough tanzanite at the mine gate requires two instruments before all others: a calcite dichroscope and a diffused 5500K daylight tray. When a crystal is rotated between thumb and forefinger, the transition from cobalt blue to saturated violet reveals how deep the finished pavilion must be cut.',
      'Many commercial cutters sacrifice pavilion angle to retain carat weight, leaving a pale window through the table. At Maihan Gems, we recut roughly forty percent of acquired parcels in our Geneva workshop so that light reflects internally off the pavilion mains.',
      'Every stone from this autumn parcel carries its full Evidence Plate on our product pages—never priced by simple carat multiplication, because saturation and cut geometry govern true rarity.',
    ],
  },
  {
    slug: 'why-step-cuts-demand-higher-diaphaneity',
    title: 'Why Step Cuts Demand Higher Crystal Diaphaneity Than Brilliant Cuts',
    publishedAt: '2026-09-22',
    author: 'Henri Vaucher',
    authorRole: 'Master Lapidary & Setter',
    category: 'Lapidary Craft',
    lede: 'Comparing octagonal emerald cuts and Asscher cuts against brilliant-cut pavilions in corundum and beryl.',
    body: [
      'A brilliant cut breaks light into dozens of kite- and star-shaped facets, camouflaging minor zoning or needle inclusions through scintillation. An octagonal step cut or Asscher cut acts instead like a clear architectural window into the heart of the crystal.',
      'When selecting a step-cut sapphire or emerald for our Design Your Own configurator, inspect the Evidence Plate for both clarity grade and dimensions in millimetres.',
    ],
  },
  {
    slug: 'unheated-ratnapura-corundum-silk-analysis',
    title: 'Microscopic Rutile Silk in Unheated Ratnapura Sapphires',
    publishedAt: '2026-08-30',
    author: 'Dr. Aria Rostami, FGA',
    authorRole: 'Chief Gemologist, Maihan Gems',
    category: 'Laboratory Notes',
    lede: 'How intact titanium dioxide needles scatter incident light to produce the famed velvety sheen of Ceylon cornflower sapphires.',
    body: [
      'Under darkfield illumination at 40x magnification, intersecting arrays of intact exsolved rutile needles intersect at 60- and 120-degree angles—confirming that the crystal has never been subjected to high-temperature furnace dissolution.',
      'This internal microstructure scatters light softly across the crown facets, preventing the dark inkiness often seen in basalt-hosted blue sapphires.',
    ],
  },
];

export const ABOUT_PAGES: Record<string, SubpageContent> = {
  index: {
    slug: 'index',
    title: 'The Maison & Evidence Philosophy',
    kicker: 'House of Maihan Gems · Established Geneva',
    lede: 'Maihan Gems is an independent gemological maison dedicated to provenance-evidenced coloured gemstones, calibrated earring pairs, and architectural precious-metal settings.',
    sections: [
      {
        heading: '01. Evidence Before Ornament',
        body: 'Every stone in our vault is catalogued as an individual specimen with a fixed price determined by optical merit, rarity, and provenance—never computed mechanically from carat weight.',
        facts: [
          { label: 'Primary Vault & Atelier', value: 'Rue du Rhône 42, 1204 Geneva' },
          { label: 'Independent Lab Partners', value: 'SSEF, Gübelin, GIA, GRS' },
          { label: 'Precious Metal Standard', value: 'PT950 & 18k Fairmined / Responsible Au750' },
          { label: 'Unverified Claims Policy', value: 'Strict "Not evidenced" disclosure' },
        ],
      },
      {
        heading: '02. Direct Alluvial & Primary Mine Intake',
        body: 'Our gemologists travel directly to trading hubs in Arusha, Ratnapura, Chivor, and Kunar, maintaining documented chain-of-custody records from rough parcel to finished cut.',
      },
    ],
  },
  provenance: {
    slug: 'provenance',
    title: 'Chain of Custody & Mine-to-Vault Provenance',
    kicker: 'About Maihan · Provenance',
    lede: 'How we document geological origin, export permits, and independent laboratory verification for every loose gemstone.',
    sections: [
      {
        heading: '01. Geological & Trace-Element Fingerprinting',
        body: 'Modern origin determination combines inclusion microscopy with LA-ICP-MS trace-element analysis and UV-Vis-NIR spectroscopy. When a mining sub-district cannot be proven with scientific certainty, we leave the sub-district field explicitly marked "Not evidenced".',
      },
      {
        heading: '02. Artisanal & Small-Scale Mining (ASM) Standards',
        body: 'Coloured gemstones are predominantly recovered by small-scale miners. We partner with registered cooperatives in Tanzania, Sri Lanka, and Colombia that adhere to documented safety and environmental rehabilitation protocols.',
      },
    ],
  },
  atelier: {
    slug: 'atelier',
    title: 'The Geneva Setting Atelier & Lapidary Bench',
    kicker: 'About Maihan · Atelier',
    lede: 'Inside our Rue du Rhône workshop where each setting is hand-fabricated to the exact millimetre profile of your chosen gemstone.',
    sections: [
      {
        heading: '01. Custom Seat Milling for Coloured Stones',
        body: 'Coloured gemstones have deeper, more varied pavilions than standardized diamonds. Our bench goldsmiths laser-scan the girdle and pavilion of your selected stone before forging the gallery.',
      },
      {
        heading: '02. Nickel-Free Alloys & Hallmarking',
        body: 'All white gold settings are alloyed with palladium rather than nickel, and every finished piece bears the Swiss Precious Metals Control hallmark.',
      },
    ],
  },
};

export const POLICY_PAGES: Record<string, SubpageContent> = {
  'shipping-and-returns': {
    slug: 'shipping-and-returns',
    title: 'Insured Vault Dispatch & 14-Day Inspection Returns',
    kicker: 'Maison Policy · Logistics, Customs & Returns',
    lede: 'Armoured air courier delivery via Malca-Amit, Brink’s Global Services, or FedEx Priority Insured, with a 14-day laboratory and private salon inspection window on loose stones and stock settings.',
    sections: [
      {
        heading: '01. 100% Insured Vault-to-Door Transit',
        body: 'Every gemstone, calibrated pair, and bespoke creation is underwritten by Lloyd’s of London specie insurance for 100% of its replacement valuation from the moment it leaves our Geneva, New York, or Bangkok vault until signed biometric or government-ID receipt by the client.',
        facts: [
          { label: 'Primary Armoured Carriers', value: 'Malca-Amit, Brink’s & FedEx Priority Alert' },
          { label: 'Transit Insurance Coverage', value: '100% Full Replacement Value (Lloyd’s Specie)' },
          { label: 'Loose Stone Dispatch SLA', value: '24–48 Hours Post Settlement Verification' },
          { label: 'Bespoke Setting Fabrication SLA', value: '14–21 Business Days (Geneva Atelier)' },
        ],
      },
      {
        heading: '02. 14-Day Laboratory & Salon Inspection Window',
        body: 'Loose gemstones and unset calibrated pairs may be inspected for 14 calendar days from delivery. Provided the tamper-evident Maihan security seal and original laboratory dossier (SSEF, Gübelin, GIA, or GRS) remain intact and unaltered, clients may initiate a complimentary insured return for a 100% refund via original settlement rail.',
      },
      {
        heading: '03. Bespoke Commissions & Custom Ring Sizing',
        body: 'Design Your Own (DYOJ) commissions forged to custom millimetre seat geometry or bearing personal laser engravings are eligible for full gemstone credit toward another vault specimen, or complimentary resizing within 60 days at our Geneva, London, or New York salons.',
      },
      {
        heading: '04. International Customs, Duties & ATA Carnet Viewing',
        body: 'All international dispatches include harmonized HS commodity codes, Kimberley Process / provenance declarations, and commercial invoices. Private clients may also arrange tax-suspended viewing at our Geneva Freeport or bonded salon suites prior to import.',
      },
    ],
  },
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Client Confidentiality & Data Privacy Policy',
    kicker: 'Maison Policy · Swiss FADP, GDPR & Vault Discretion',
    lede: 'How Maihan Gems protects client identities, KYC/AML compliance records, private viewing dossiers, and vault transaction ledgers under the Swiss Federal Act on Data Protection (FADP) and EU GDPR.',
    sections: [
      {
        heading: '01. Minimal Collection & Private Client Discretion',
        body: 'We collect only the personal identity, insured delivery address, and statutory financial compliance records strictly required to execute high-value gemstone transactions, issue laboratory ownership addenda, and satisfy Swiss Anti-Money Laundering (AMLA / GwG) regulations.',
        facts: [
          { label: 'Data Controller', value: 'Maihan Gems SA · Rue du Rhône 42, 1204 Geneva' },
          { label: 'Primary Jurisdiction', value: 'Swiss FADP (revDSG) & EU GDPR Art. 6(1)(b/c)' },
          { label: 'Vault Ledger Encryption', value: 'AES-256 At-Rest / TLS 1.3 In-Transit' },
          { label: 'Third-Party Ad Brokerage', value: 'Strictly Prohibited (Zero Data Sharing)' },
        ],
      },
      {
        heading: '02. Zero Third-Party Advertising or Behavioural Brokerage',
        body: 'Client viewing histories, AI Gemologist consultation transcripts, saved Design Your Own configuration codes, and acquisition ledgers are treated as confidential salon records. We never sell, rent, or syndicate client data to external marketing networks or data brokers.',
      },
      {
        heading: '03. Statutory KYC / AML Retention & Right to Erasure',
        body: 'For transactions exceeding statutory precious-metal and gemstone thresholds ($15,000 USD / CHF equivalent), identity verification records are held in an air-gapped compliance archive for the legally mandated 10-year retention period, after which they are cryptographically purged. Non-statutory profile preferences and saved searches may be erased immediately upon request.',
      },
      {
        heading: '04. Security Audits & Data Subject Rights',
        body: 'Clients, mine partners, and suppliers may request a portable cryptographic export of their dossier, rectify registered delivery addresses, or contact our Geneva Data Protection Officer at privacy@maihangems.com.',
      },
    ],
  },
  'terms-of-service': {
    slug: 'terms-of-service',
    title: 'Terms of Sale & Gemological Representation',
    kicker: 'Maison Policy · Contractual Governance & Escrow Terms',
    lede: 'Contractual terms governing loose gemstone reservations, bespoke setting commissions, vendor consignment memos, and server-authoritative payment reconciliation.',
    sections: [
      {
        heading: '01. Specimen Uniqueness & Server-Authoritative Pricing',
        body: 'Every natural gemstone and matched pair in the Maihan vault is a one-of-a-kind mineralogical specimen. Pricing is determined by fixed specimen valuation—never computed mechanically by carat multiplication—and is verified against our authoritative vault ledger at checkout.',
        facts: [
          { label: 'Governing Law & Venue', value: 'Substantive Laws of Switzerland · Canton of Geneva' },
          { label: 'Gemological Nomenclature', value: 'CIBJO Blue Book & GIA / SSEF Standards' },
          { label: 'Reservation Hold Window', value: '48 Hours for Private Bank Wire Settlement' },
          { label: 'Escrow Release Trigger', value: 'Laboratory Verification + Client Signed Receipt' },
        ],
      },
      {
        heading: '02. Laboratory Dossier Accompaniment & Provenance Evidence',
        body: 'Every shipped specimen includes its physical laboratory report (SSEF, Gübelin, GIA, or GRS) as cited on its digital Evidence Plate. Whenever a sub-district or trace measurement is not scientifically proven, Maihan Gems explicitly marks the field as "Not evidenced" rather than extrapolating.',
      },
      {
        heading: '03. Payment Settlement, Escrow & Wire Reconciliation',
        body: 'Orders paid via Stripe Treasury, Private Client Bank Wire, or Cryptographic Escrow remain in PENDING_PAYMENT or ESCROW_HOLD status until cleared funds are reconciled by our treasury desk and logged in the immutable Payment Audit Ledger.',
      },
      {
        heading: '04. Vendor Consignment & Supplier KYB Obligations',
        body: 'Approved mine partners and lapidary suppliers listing inventory through the Maihan Vendor Portal warrant full legal title, conflict-free provenance, and complete disclosure of any thermal or clarity enhancement prior to intake.',
      },
    ],
  },
  'treatment-disclosure': {
    slug: 'treatment-disclosure',
    title: 'Mandatory Gemological Treatment Disclosure Policy',
    kicker: 'Maison Policy · CIBJO Blue Book & FTC Compliance',
    lede: 'Full scientific transparency on thermal enhancement, emerald fissure oiling, and non-evidenced attributes across every loose gemstone and piece of fine jewellery.',
    sections: [
      {
        heading: '01. Explicit Treatment Labelling on Every Evidence Plate',
        body: 'In strict accordance with CIBJO Blue Book and U.S. FTC Jewelry Guides, every Maihan Gems listing prominently discloses whether a specimen is Untreated (No Heat / No Oil), Thermally Aligned (Standard Heat), or Clarity Enhanced (Insignificant to Minor Cedarwood Oil, F1).',
        facts: [
          { label: 'Corundum & Tanzanite Screening', value: 'FTIR, Raman & 80x Darkfield Silk Microscopy' },
          { label: 'Emerald Enhancement Policy', value: 'Untreated (No Oil) or Traditional Cedarwood Oil (F1) Only' },
          { label: 'Prohibited Treatments', value: 'Lead-Glass Filling, Beryllium Diffusion, Artificial Dyes' },
          { label: 'Undisclosed Treatment Penalty', value: 'Immediate Vendor Lot Rejection & Full Client Refund' },
        ],
      },
      {
        heading: '02. Zero Tolerance for Synthetic Polymers, Resins, or Lattice Diffusion',
        body: 'Maihan Gems categorically rejects beryllium-diffused corundum, lead-glass filled rubies, polymer-stabilized emeralds, and irradiated stones. Any vendor consignment parcel failing XRF or Raman intake screening is quarantined and rejected.',
      },
      {
        heading: '03. Lifetime Authenticity & Disclosure Guarantee',
        body: 'Should an accredited independent gemological laboratory (SSEF, Gübelin, or GIA) ever determine that a gemstone acquired from Maihan Gems possesses an undisclosed treatment inconsistent with its original Evidence Plate, the Maison guarantees a 100% lifetime refund including laboratory fees.',
      },
    ],
  },
  'ethical-sourcing': {
    slug: 'ethical-sourcing',
    title: 'Ethical Sourcing, Mine-to-Vault Provenance & ASM Charter',
    kicker: 'Maison Policy · Responsible Supply Chain & Fairmined Metals',
    lede: 'Our auditable chain-of-custody protocol for artisanal and small-scale mining (ASM) cooperatives, conflict-free mineral procurement, and 100% recycled or Fairmined precious metals.',
    sections: [
      {
        heading: '01. Direct Mine-Gate & Cooperative Intake Protocol',
        body: 'Over 80% of fine coloured gemstones are unearthed by artisanal and small-scale miners. Rather than purchasing anonymous mixed parcels on secondary bourses, Maihan gemologists source directly from registered cooperatives in Merelani (Tanzania), Ratnapura (Sri Lanka), Chivor (Colombia), and Jegdalek, maintaining export permits and parcel transfer logs.',
        facts: [
          { label: 'Supply Chain Framework', value: 'OECD Due Diligence Guidance & RJC Code of Practices' },
          { label: 'Precious Metal Standard', value: '100% Recycled PT950 & Fairmined / RJC-COC 18k Gold' },
          { label: 'Supplier KYB Verification', value: 'Mandatory Beneficial Ownership, Mining License & AML Audit' },
          { label: 'Community Reinvestment', value: '3% of Net Lapidary Margin Funded to Mining District Clinics' },
        ],
      },
      {
        heading: '02. Mandatory Supplier KYB & Tax Compliance Onboarding',
        body: 'Every mine partner and lapidary workshop onboarded to the Maihan Vendor Portal undergoes multi-stage verification—including corporate registration, mining export license inspection, FATF anti-money-laundering screening, and Kimberley Process / coloured-stone provenance attestation.',
      },
      {
        heading: '03. Fairmined & Swiss-Assayed Precious Metals',
        body: 'All bespoke rings, earrings, and pendants forged in our Geneva atelier utilize exclusively RJC Chain-of-Custody certified Platinum 950 and Fairmined 18k gold alloyed with palladium (100% nickel-free) and stamped by the Swiss Central Office for Precious Metals Control.',
      },
    ],
  },
};

export const SHOWROOMS: ShowroomRecord[] = [
  {
    slug: 'geneva',
    city: 'Geneva',
    name: 'Geneva Flagship Salon & Lapidary Vault',
    address: 'Rue du Rhône 42, 3rd Floor, 1204 Genève, Switzerland',
    hours: 'Monday – Saturday, 10:00 – 18:30 CET (By Appointment)',
    phone: '+41 22 819 04 10',
    vaultCapabilities: [
      'North-Daylight 5500K Grading Table',
      'Binocular Darkfield Microscope Inspection',
      'Bespoke Bench Master Consultation',
      'Same-Day Loose Stone Vault Release',
    ],
    securityProtocol: 'Government-issued photo ID required 24 hours prior to appointment.',
    lede: 'Our primary European vault and setting workshop overlooking the Rhône, equipped with full gemological microscopy for private stone comparisons.',
    description:
      'Clients may request up to four loose gemstones or matched pairs held on memo in our Geneva viewing room, comparing pleochroism under natural northern sky illumination and 2700K evening light.',
  },
  {
    slug: 'new-york',
    city: 'New York',
    name: 'Fifth Avenue Private Viewing Suite',
    address: '608 Fifth Avenue, Suite 904, New York, NY 10020, USA',
    hours: 'Tuesday – Saturday, 10:30 – 18:00 EST (By Appointment)',
    phone: '+1 (212) 555-0194',
    vaultCapabilities: [
      'Insured Inter-Vault Stone Transfer (48h)',
      'Custom Ring Sizing & Wax Prototype Fitting',
      'Matched Pair Earring Calibration Viewing',
    ],
    securityProtocol: 'Registered building security clearance upon confirmed booking.',
    lede: 'An intimate Art Deco salon in Midtown Manhattan for private loose-stone viewings and bespoke ring consultations.',
    description:
      'Stones held in our Geneva vault can be transferred via armoured courier to our Fifth Avenue salon within 48 hours of a confirmed viewing appointment.',
  },
  {
    slug: 'london',
    city: 'London',
    name: 'Mayfair Mount Street Salon',
    address: '94 Mount Street, Mayfair, London W1K 2SZ, United Kingdom',
    hours: 'Tuesday – Saturday, 10:00 – 18:00 GMT (By Appointment)',
    phone: '+44 20 7946 0821',
    vaultCapabilities: [
      'Private Coloured Stone Viewing Salon',
      'Hallmark & Assay Advisory',
      'Bespoke Commission Design Review',
    ],
    securityProtocol: 'Private entry via buzzer with appointment confirmation reference.',
    lede: 'Quiet daylight viewing rooms in the heart of Mayfair for evaluating loose sapphires, rubies, emeralds, and tanzanites.',
    description:
      'Designed as a serene library of mineralogy and high jewellery, offering unhurried one-on-one consultations with our London gemologists.',
  },
];
