'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Heart,
  Scale,
  ShoppingBag,
  User,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  Globe,
  Gem,
  Crown,
  Compass,
  Building2,
  Check,
  Sliders,
} from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { DirhamLogo } from '@/components/mgh/ui/DirhamLogo';
import { AuthPopupModal } from '@/components/mgh/account/AuthPopupModal';

const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'USD ($)', desc: 'US Dollar' },
  { code: 'AED', label: 'UAE Dirham', desc: 'UAE Dirham' },
  { code: 'BHAT', label: 'BHAT (฿)', desc: 'Thai Baht' },
] as const;

const LANGUAGE_OPTIONS = [
  { code: 'EN', label: 'English', short: 'EN' },
  { code: 'FR', label: 'Français', short: 'FR' },
  { code: 'AR', label: 'العربية', short: 'AR' },
] as const;

export function StorefrontHeader() {
  const pathname = usePathname();
  const isHeroOverlayPage =
    pathname === '/' ||
    pathname === '/varieties' ||
    pathname === '/jewellery' ||
    pathname === '/settings' ||
    pathname === '/design-your-own' ||
    pathname === '/about';

  const { cart, favorites, compareList, currency, setCurrency, setCartOpen, setSearchOpen } =
    useStorefront();

  const [language, setLanguage] = useState<'EN' | 'FR' | 'AR'>('EN');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 90);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setCurrencyDropdownOpen(false);
        setLanguageDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setCurrencyDropdownOpen(false);
        setLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setActiveDropdown(null);
    setCurrencyDropdownOpen(false);
    setLanguageDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Verified actual links only with dedicated thumbnail images for every item and featured card
  const menuData = {
    gemstones: {
      title: 'Gemstones',
      icon: Gem,
      href: '/varieties',
      summary: 'Explore our dedicated Gemstones landing page featuring all natural gemstone families.',
      columns: [
        {
          heading: 'Popular Gemstones',
          items: [
            {
              label: 'Blue Sapphire',
              href: '/varieties/sapphire',
              desc: 'Royal & cornflower blue sapphires',
              image: '/mgh/images/gems/sapphire-gem.jpg',
            },
            {
              label: 'Red Ruby',
              href: '/varieties/ruby',
              desc: 'Vibrant natural rubies with lab certificates',
              image: '/mgh/images/gems/ruby-gem.jpg',
            },
            {
              label: 'Green Emerald',
              href: '/varieties/emerald',
              desc: 'Rich green emeralds from Colombia & Zambia',
              image: '/mgh/images/gems/emerald-gem.jpg',
            },
            {
              label: 'Tanzanite',
              href: '/varieties/tanzanite',
              desc: 'Deep blue-violet stones from Merelani',
              image: '/mgh/images/gems/tanzanite-gem.jpg',
            },
          ],
        },
        {
          heading: 'Rare & Collector Stones',
          items: [
            {
              label: 'Pink & Red Spinel',
              href: '/varieties/spinel',
              desc: 'Bright, natural untreated spinels',
              image: '/mgh/images/gems/spinel-gem.jpg',
            },
            {
              label: 'Lagoon Tourmaline',
              href: '/varieties/tourmaline',
              desc: 'Ocean-colored blue-green tourmalines',
              image: '/mgh/images/gems/tourmaline-gem.jpg',
            },
            {
              label: 'Color-Change Alexandrite',
              href: '/varieties/alexandrite',
              desc: 'Daylight green to evening crimson',
              image: '/mgh/images/gems/emerald-gem.jpg',
            },
            {
              label: 'Tsavorite Garnet',
              href: '/varieties/tsavorite',
              desc: 'Vivid untreated green grossular garnet',
              image: '/mgh/images/gems/tourmaline-gem.jpg',
            },
          ],
        },
      ],
      featured: {
        title: 'Gemstones Landing Page',
        desc: 'View all gemstone families we offer or browse the complete certified loose stone catalog.',
        linkText: 'Explore Gemstones',
        href: '/varieties',
        image: '/mgh/images/gems/sapphire-gem.jpg',
      },
    },
    jewelry: {
      title: 'Fine Jewelry',
      icon: Crown,
      href: '/jewellery',
      summary: 'Finished rings, necklaces, matched earring pairs, and handcrafted Geneva creations.',
      columns: [
        {
          heading: 'Jewelry Categories',
          items: [
            {
              label: 'Rings',
              href: '/jewellery#rings',
              desc: 'Engagement, solitaire & signet rings',
              image: '/mgh/images/elysian-ring.jpg',
            },
            {
              label: 'Necklaces & Pendants',
              href: '/jewellery#necklaces',
              desc: 'Emerald drops & solitaire gemstone pendants',
              image: '/mgh/images/verdant-drop.jpg',
            },
            {
              label: 'Earrings',
              href: '/jewellery#earrings',
              desc: 'Gemstone studs & articulated drop earrings',
              image: '/mgh/images/gems/earrings-pair.jpg',
            },
            {
              label: 'Matched Gemstone Pairs',
              href: '/pairs',
              desc: 'Calibrated natural gemstone pairs for earrings',
              image: '/mgh/images/gems/spinel-gem.jpg',
            },
          ],
        },
        {
          heading: 'Signature Creations',
          items: [
            {
              label: 'Elysian Diamond Ring',
              href: '/products/elysian-ring',
              desc: '2.15 carat natural diamond ring in Platinum 950',
              image: '/mgh/images/elysian-ring.jpg',
            },
            {
              label: 'Verdant Emerald Necklace',
              href: '/products/verdant-drop',
              desc: '4.32 carat green emerald drop pendant',
              image: '/mgh/images/verdant-drop.jpg',
            },
            {
              label: 'Shop All Fine Jewelry',
              href: '/jewellery#shop-all-jewelry',
              desc: 'Browse every finished jewel in our collection',
              image: '/mgh/images/gems/setting-ring.jpg',
            },
          ],
        },
      ],
      featured: {
        title: 'Fine Jewelry Landing Page',
        desc: 'Browse Rings, Necklaces, and Earrings crafted in solid 18k gold or 950 platinum.',
        linkText: 'Explore Fine Jewelry',
        href: '/jewellery',
        image: '/mgh/images/elysian-ring.jpg',
      },
    },
    settings: {
      title: 'Settings',
      icon: Sliders,
      href: '/settings',
      summary: 'Handcrafted ring settings, necklace settings, and earring mounts in Platinum 950 & 18k Gold.',
      columns: [
        {
          heading: 'Setting Categories',
          items: [
            {
              label: 'Ring Settings',
              href: '/settings#ring-settings',
              desc: 'Solitaire, cathedral, bezel & three-stone mounts',
              image: '/mgh/images/gems/setting-ring.jpg',
            },
            {
              label: 'Necklace Settings',
              href: '/settings#necklace-settings',
              desc: 'Compass-claw pendant baskets & fine chains',
              image: '/mgh/images/verdant-drop.jpg',
            },
            {
              label: 'Earring Settings',
              href: '/settings#earring-settings',
              desc: 'Martini studs & leverback drop mounts',
              image: '/mgh/images/gems/earrings-pair.jpg',
            },
            {
              label: 'Three-Stone & Baguette Mounts',
              href: '/settings#three-stone-settings',
              desc: 'Diamond-flanked settings crafted in Geneva',
              image: '/mgh/images/elysian-ring.jpg',
            },
          ],
        },
        {
          heading: 'Atelier Mountings',
          items: [
            {
              label: 'Cathedral Solitaire Ring',
              href: '/settings/SET-ARCH-SOL-01',
              desc: 'Low-profile gallery solitaire setting',
              image: '/mgh/images/gems/setting-ring.jpg',
            },
            {
              label: 'Monolith Bezel Signet Ring',
              href: '/settings/SET-BEZEL-SIGNET-02',
              desc: 'Protective flushed architectural bezel',
              image: '/mgh/images/elysian-ring.jpg',
            },
            {
              label: 'Tapered Baguette Atelier Ring',
              href: '/settings/SET-TRILOGY-TAPER-03',
              desc: 'Flanked by matched step-cut diamond baguettes',
              image: '/mgh/images/gems/setting-ring.jpg',
            },
            {
              label: 'Four-Claw Martini Studs',
              href: '/settings/SET-EAR-STUD-05',
              desc: 'Low-profile earring mounts for matched pairs',
              image: '/mgh/images/gems/earrings-pair.jpg',
            },
          ],
        },
      ],
      featured: {
        title: 'Settings Landing Page',
        desc: 'Explore ring settings, necklace settings, and earring mounts calibrated to your stone.',
        linkText: 'Explore Settings',
        href: '/settings',
        image: '/mgh/images/gems/setting-ring.jpg',
      },
    },
    dyoj: {
      title: 'DYOJ',
      icon: Compass,
      href: '/design-your-own',
      summary: 'Design Your Own Jewelry (DYOJ) — pick a loose stone, pair it with a setting, and customize your metal.',
      columns: [
        {
          heading: 'How DYOJ Works',
          items: [
            {
              label: 'DYOJ Overview & Guide',
              href: '/design-your-own',
              desc: 'Learn how to create custom jewelry step by step',
              image: '/mgh/images/elysian-ring.jpg',
            },
            {
              label: 'Step 1: Pick a Gemstone',
              href: '/design-your-own?step=stone#dyoj-studio',
              desc: 'Choose your certified natural loose stone',
              image: '/mgh/images/gems/tanzanite-gem.jpg',
            },
            {
              label: 'Step 2: Pick a Setting',
              href: '/design-your-own?step=setting#dyoj-studio',
              desc: 'Select a compatible ring, necklace, or earring mount',
              image: '/mgh/images/gems/setting-ring.jpg',
            },
            {
              label: 'Step 3: Metal & Ring Size',
              href: '/design-your-own?step=review#dyoj-studio',
              desc: 'Choose Platinum 950 or 18k Gold + free engraving',
              image: '/mgh/images/verdant-drop.jpg',
            },
          ],
        },
        {
          heading: 'Completed Commissions & 3D',
          items: [
            {
              label: 'Sample Tanzanite Solitaire',
              href: '/design-your-own/review/DYO-MG-8841',
              desc: 'Completed DYOJ Commission #DYO-MG-8841',
              image: '/mgh/images/gems/tanzanite-gem.jpg',
            },
            {
              label: 'Sample Sapphire Trilogy',
              href: '/design-your-own/review/DYO-MG-2049',
              desc: 'Completed DYOJ Commission #DYO-MG-2049',
              image: '/mgh/images/gems/sapphire-gem.jpg',
            },
            {
              label: '3D Virtual Try-On Studio',
              href: '/ar/webar-tz-0131',
              desc: 'Inspect true-scale 3D gemstone geometry',
              image: '/mgh/images/gems/emerald-gem.jpg',
            },
          ],
        },
      ],
      featured: {
        title: 'DYOJ Custom Studio',
        desc: 'Pick your stone and metal, and our Geneva jewelers will handcraft it for you in 14 days.',
        linkText: 'Open DYOJ Page',
        href: '/design-your-own',
        image: '/mgh/images/gems/tanzanite-gem.jpg',
      },
    },
    about: {
      title: 'About Us',
      icon: Building2,
      href: '/about',
      summary: 'Learn how we source honest, natural gemstones and handcraft fine jewelry in Geneva.',
      columns: [
        {
          heading: 'Our Maison',
          items: [
            {
              label: 'Our Story & Heritage',
              href: '/about',
              desc: 'Over 40 years of family gemstone sourcing',
              image: '/mgh/images/gems/sapphire-gem.jpg',
            },
            {
              label: 'Mine-to-Vault Provenance',
              href: '/about/provenance',
              desc: 'Documented chain of custody & lab verification',
              image: '/mgh/images/gems/emerald-gem.jpg',
            },
            {
              label: 'The Geneva Atelier',
              href: '/about/atelier',
              desc: 'Inside our Rue du Rhône goldsmithing workshop',
              image: '/mgh/images/gems/setting-ring.jpg',
            },
            {
              label: 'Gem Buying Guide',
              href: '/education',
              desc: 'Clear guides on carat, color, cuts & lab reports',
              image: '/mgh/images/gems/ruby-gem.jpg',
            },
          ],
        },
        {
          heading: 'Client Care & Salons',
          items: [
            {
              label: 'Our Showrooms',
              href: '/showrooms',
              desc: 'Private viewing salons in Geneva, New York & London',
              image: '/mgh/images/elysian-ring.jpg',
            },
            {
              label: 'Honest Stone Disclosures',
              href: '/policy/treatment-disclosure',
              desc: 'Plain-English treatment & origin transparency',
              image: '/mgh/images/gems/tanzanite-gem.jpg',
            },
            {
              label: 'Free Insured Shipping',
              href: '/policy/shipping-and-returns',
              desc: 'Armoured delivery & 14-day inspection returns',
              image: '/mgh/images/verdant-drop.jpg',
            },
            {
              label: 'Contact & Appointments',
              href: '/contact',
              desc: 'Book a private salon viewing or consultation',
              image: '/mgh/images/gems/earrings-pair.jpg',
            },
          ],
        },
      ],
      featured: {
        title: 'Visit a Showroom',
        desc: 'Inspect our gemstones in person with a relaxed, private appointment.',
        linkText: 'Book a Visit',
        href: '/contact',
        image: '/mgh/images/verdant-drop.jpg',
      },
    },
  };

  return (
    <header
      ref={navRef}
      className={`${
        isHeroOverlayPage
          ? 'absolute top-0 left-0 right-0 z-50 bg-transparent'
          : 'relative z-50 bg-[#0A0A0C]'
      } w-full text-[#F7F5F0] border-none`}
    >
      {/* =========================================================================
          ROW 1 (TOP): TALL, TRANSPARENT, NO BORDER
          CENTERED BRAND NAME (Scrolls away naturally when scrolling down)
         ========================================================================= */}
      <div className="w-full bg-transparent border-none py-8 sm:py-11 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl relative flex items-center justify-between">
          {/* Left subtle locations (desktop) */}
          <div className="hidden md:flex items-center gap-2.5 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-white/75">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            <span>Geneva · New York · London</span>
          </div>

          {/* CENTER: BRAND NAME */}
          <div className="w-full md:w-auto text-center md:absolute md:left-1/2 md:-translate-x-1/2">
            <Link
              href="/"
              className="group inline-flex flex-col items-center justify-center transition-transform duration-300 hover:scale-[1.01]"
            >
              <span className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-5xl lg:text-[48px] font-normal tracking-[0.2em] text-white group-hover:text-[#E6C97A] transition-colors leading-none drop-shadow-sm">
                MAIHAN GEMS
              </span>
              <span className="text-[11px] sm:text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.34em] text-[#D4AF37] mt-2.5">
                Natural Gemstones &amp; Fine Jewelry
              </span>
            </Link>
          </div>

          {/* Right appointment link (desktop) */}
          <div className="hidden md:flex items-center gap-3 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-white/80">
            <Link
              href="/contact"
              className="text-[#E6C97A] hover:text-white transition-colors"
            >
              Book a Visit →
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden absolute right-0 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
              className="p-2 text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2 (BOTTOM): STICKY ON SCROLL, TRANSPARENT, NO BORDER
          LEFT: Currency & Language Dropdowns
          MIDDLE: Main Navigation Links with Collapsible Mega Dropdowns
          RIGHT: Search, Account Login, Wishlist, Compare, Cart
         ========================================================================= */}
      {scrolled && !isHeroOverlayPage && <div className="h-[56px] w-full" aria-hidden="true" />}
      <div
        className={`z-50 w-full border-none transition-all duration-300 py-3.5 px-3.5 sm:px-10 lg:px-16 ${
          scrolled
            ? 'fixed top-0 left-0 right-0 bg-[#0A0A0C]/90 backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.75)]'
            : 'relative bg-transparent'
        }`}
      >
        <div className="w-full flex items-center justify-between gap-2 sm:gap-6">
          {/* ---------------------------------------------------------------------
              ZONE 1 (LEFT): CURRENCY & LANGUAGE DROPDOWNS
             --------------------------------------------------------------------- */}
          <div className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
            {/* Currency Dropdown */}
            <div className="relative" data-testid="currency-switcher">
              <button
                type="button"
                onClick={() => {
                  setCurrencyDropdownOpen((prev) => !prev);
                  setLanguageDropdownOpen(false);
                }}
                aria-expanded={currencyDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Select currency"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-[family-name:var(--font-eb-garamond)] tracking-[0.14em] text-white transition-colors cursor-pointer"
              >
                <span className="text-[#D4AF37] font-semibold inline-flex items-center">
                  {currency === 'AED' ? (
                    <DirhamLogo className="h-3.5 w-3.5 text-[#D4AF37]" />
                  ) : (
                    currency
                  )}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/70 transition-transform duration-200 ${
                    currencyDropdownOpen ? 'rotate-180 text-[#D4AF37]' : ''
                  }`}
                />
              </button>

              {currencyDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Currency options"
                  className="absolute left-0 top-full mt-2 w-44 rounded-xl bg-[#0E0E11]/95 backdrop-blur-xl border border-white/15 py-1.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                >
                  {CURRENCY_OPTIONS.map((opt) => {
                    const isActive = currency === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-testid={`currency-btn-${opt.code.toLowerCase()}`}
                        onClick={() => {
                          setCurrency(opt.code);
                          setCurrencyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-[family-name:var(--font-eb-garamond)] transition-colors ${
                          isActive
                            ? 'bg-[#D4AF37]/20 text-[#E6C97A] font-semibold'
                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div>
                          <span className="flex items-center gap-1.5 tracking-wider">
                            {opt.code === 'AED' ? (
                              <>
                                <DirhamLogo className="h-3.5 w-3.5 text-[#D4AF37]" />
                                <span>Dirham</span>
                              </>
                            ) : (
                              opt.label
                            )}
                          </span>
                          <span className="block text-[10px] text-white/50">{opt.desc}</span>
                        </div>
                        {isActive && <Check className="h-3.5 w-3.5 text-[#D4AF37]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Language Dropdown */}
            <div className="relative" data-testid="language-switcher">
              <button
                type="button"
                onClick={() => {
                  setLanguageDropdownOpen((prev) => !prev);
                  setCurrencyDropdownOpen(false);
                }}
                aria-expanded={languageDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Select language"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-[family-name:var(--font-eb-garamond)] tracking-[0.14em] text-white transition-colors cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>{LANGUAGE_OPTIONS.find((l) => l.code === language)?.label || language}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/70 transition-transform duration-200 ${
                    languageDropdownOpen ? 'rotate-180 text-[#D4AF37]' : ''
                  }`}
                />
              </button>

              {languageDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Language options"
                  className="absolute left-0 top-full mt-2 w-40 rounded-xl bg-[#0E0E11]/95 backdrop-blur-xl border border-white/15 py-1.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                >
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const isActive = language === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-testid={`language-btn-${opt.code.toLowerCase()}`}
                        onClick={() => {
                          setLanguage(opt.code);
                          setLanguageDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-[family-name:var(--font-eb-garamond)] transition-colors ${
                          isActive
                            ? 'bg-[#D4AF37]/20 text-[#E6C97A] font-semibold'
                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isActive && <Check className="h-3.5 w-3.5 text-[#D4AF37]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              ZONE 2 (MIDDLE): MAIN NAVIGATION LINKS (GEMSTONES, FINE JEWELRY, SETTINGS, DYOJ, ABOUT US, AI HELPER)
             --------------------------------------------------------------------- */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-5 lg:gap-7 text-[13px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.17em] font-normal text-white/90 whitespace-nowrap"
          >
            {/* 1. GEMSTONES */}
            <div
              className="relative flex items-center gap-1"
              onMouseEnter={() => setActiveDropdown('gemstones')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                href="/varieties"
                className={`py-1.5 transition-colors ${
                  pathname.startsWith('/varieties') ||
                  pathname.startsWith('/gemstones') ||
                  pathname.startsWith('/browse') ||
                  activeDropdown === 'gemstones'
                    ? 'text-[#E6C97A]'
                    : 'hover:text-white'
                }`}
              >
                Gemstones
              </Link>
              <button
                type="button"
                aria-label="Toggle Gemstones menu"
                aria-expanded={activeDropdown === 'gemstones'}
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'gemstones' ? null : 'gemstones')
                }
                className="p-0.5 cursor-pointer"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    activeDropdown === 'gemstones' ? 'rotate-180 text-[#D4AF37]' : 'text-white/60'
                  }`}
                />
              </button>
            </div>

            {/* 2. FINE JEWELRY */}
            <div
              className="relative flex items-center gap-1"
              onMouseEnter={() => setActiveDropdown('jewelry')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                href="/jewellery"
                className={`py-1.5 transition-colors ${
                  pathname.startsWith('/jewellery') ||
                  pathname.startsWith('/products') ||
                  pathname.startsWith('/pairs') ||
                  activeDropdown === 'jewelry'
                    ? 'text-[#E6C97A]'
                    : 'hover:text-white'
                }`}
              >
                Fine Jewelry
              </Link>
              <button
                type="button"
                aria-label="Toggle Fine Jewelry menu"
                aria-expanded={activeDropdown === 'jewelry'}
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'jewelry' ? null : 'jewelry')
                }
                className="p-0.5 cursor-pointer"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    activeDropdown === 'jewelry' ? 'rotate-180 text-[#D4AF37]' : 'text-white/60'
                  }`}
                />
              </button>
            </div>

            {/* 3. SETTINGS */}
            <div
              className="relative flex items-center gap-1"
              onMouseEnter={() => setActiveDropdown('settings')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                href="/settings"
                className={`py-1.5 transition-colors ${
                  pathname.startsWith('/settings') || activeDropdown === 'settings'
                    ? 'text-[#E6C97A]'
                    : 'hover:text-white'
                }`}
              >
                Settings
              </Link>
              <button
                type="button"
                aria-label="Toggle Settings menu"
                aria-expanded={activeDropdown === 'settings'}
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')
                }
                className="p-0.5 cursor-pointer"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    activeDropdown === 'settings' ? 'rotate-180 text-[#D4AF37]' : 'text-white/60'
                  }`}
                />
              </button>
            </div>

            {/* 4. DYOJ (Design Your Own Jewelry) */}
            <div
              className="relative flex items-center gap-1"
              onMouseEnter={() => setActiveDropdown('dyoj')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                href="/design-your-own"
                className={`py-1.5 transition-colors ${
                  pathname.startsWith('/design-your-own') || activeDropdown === 'dyoj'
                    ? 'text-[#E6C97A]'
                    : 'hover:text-white'
                }`}
              >
                DYOJ
              </Link>
              <button
                type="button"
                aria-label="Toggle DYOJ menu"
                aria-expanded={activeDropdown === 'dyoj'}
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'dyoj' ? null : 'dyoj')
                }
                className="p-0.5 cursor-pointer"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    activeDropdown === 'dyoj' ? 'rotate-180 text-[#D4AF37]' : 'text-white/60'
                  }`}
                />
              </button>
            </div>

            {/* 5. ABOUT US */}
            <div
              className="relative flex items-center gap-1"
              onMouseEnter={() => setActiveDropdown('about')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                href="/about"
                className={`py-1.5 transition-colors ${
                  pathname.startsWith('/about') ||
                  pathname.startsWith('/policy') ||
                  activeDropdown === 'about'
                    ? 'text-[#E6C97A]'
                    : 'hover:text-white'
                }`}
              >
                About Us
              </Link>
              <button
                type="button"
                aria-label="Toggle About Us menu"
                aria-expanded={activeDropdown === 'about'}
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'about' ? null : 'about')
                }
                className="p-0.5 cursor-pointer"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    activeDropdown === 'about' ? 'rotate-180 text-[#D4AF37]' : 'text-white/60'
                  }`}
                />
              </button>
            </div>

            {/* 6. AI GEMOLOGIST */}
            <Link
              href="/concierge"
              data-testid="nav-ai-gemologist"
              className={`inline-flex items-center gap-1.5 py-1.5 transition-colors ${
                pathname.startsWith('/concierge') || pathname.startsWith('/ai-gemologist')
                  ? 'text-[#E6C97A]'
                  : 'text-[#D4AF37] hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Gemologist</span>
            </Link>
          </nav>

          {/* ---------------------------------------------------------------------
              ZONE 3 (RIGHT): SEARCH, ACCOUNT LOGIN, WISHLIST, COMPARE, CART
             --------------------------------------------------------------------- */}
          <div className="flex items-center gap-0.5 sm:gap-2.5 shrink-0">
            {/* Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search gemstones and jewelry"
              title="Search"
              className="p-2 text-white/85 hover:text-[#E6C97A] rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Account Login Popup Trigger */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              aria-label="Account Login"
              title="Account Login & Sign Up"
              data-testid="header-account-popup-trigger"
              className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
                pathname.startsWith('/account') || authModalOpen
                  ? 'text-[#E6C97A] bg-white/10'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
            </button>

            {/* Wishlist / Favorites */}
            <Link
              href="/favorites"
              aria-label={`Saved items (${favorites.length})`}
              title="Wishlist"
              className={`relative inline-flex items-center p-2 rounded-full hover:bg-white/10 transition-colors ${
                pathname === '/favorites' ? 'text-[#E6C97A]' : 'text-white/85 hover:text-[#E6C97A]'
              }`}
            >
              <Heart className="h-4 w-4" />
              {favorites.length > 0 && (
                <span
                  data-testid="header-favorites-count"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#D4AF37] text-[#0A0A0B] text-[9px] font-[family-name:var(--font-mono)] font-bold flex items-center justify-center tabular-nums"
                >
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Compare */}
            <Link
              href="/compare"
              aria-label={`Compare items (${compareList.length})`}
              title="Compare"
              className={`relative inline-flex items-center p-2 rounded-full hover:bg-white/10 transition-colors ${
                pathname === '/compare' ? 'text-[#E6C97A]' : 'text-white/85 hover:text-[#E6C97A]'
              }`}
            >
              <Scale className="h-4 w-4" />
              {compareList.length > 0 && (
                <span
                  data-testid="header-compare-count"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#D4AF37] text-[#0A0A0B] text-[9px] font-[family-name:var(--font-mono)] font-bold flex items-center justify-center tabular-nums"
                >
                  {compareList.length}
                </span>
              )}
            </Link>

            {/* Cart / Shopping Bag */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open shopping bag (${cartCount} items)`}
              title="Shopping Bag"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white hover:text-[#E6C97A] transition-all ml-1 active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 text-[#D4AF37]" />
              <span
                data-testid="header-cart-count"
                className="text-xs font-[family-name:var(--font-mono)] tabular-nums font-semibold text-white"
              >
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          COLLAPSIBLE MEGA-MENU DROPDOWN (DESKTOP)
         ========================================================================= */}
      {activeDropdown && menuData[activeDropdown as keyof typeof menuData] && (
        <div
          data-testid="navbar-mega-dropdown"
          onMouseEnter={() => setActiveDropdown(activeDropdown)}
          onMouseLeave={() => setActiveDropdown(null)}
          className={`hidden md:block fixed inset-x-0 ${
            scrolled ? 'top-[56px]' : 'top-[158px]'
          } bg-[#0A0A0C]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.9)] animate-in fade-in-0 slide-in-from-top-2 duration-200 z-50`}
        >
          <div className="mx-auto max-w-7xl px-8 py-8">
            {(() => {
              const currentMenu = menuData[activeDropdown as keyof typeof menuData];
              const IconComp = currentMenu.icon;
              return (
                <div className="grid grid-cols-12 gap-8 items-start">
                  {/* Category Overview Column */}
                  <div className="col-span-3 space-y-3 border-r border-white/10 pr-6">
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                      <IconComp className="h-5 w-5" />
                      <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] font-semibold">
                        Collection
                      </span>
                    </div>
                    <h4 className="font-[family-name:var(--font-eb-garamond)] text-2xl text-white font-normal">
                      {currentMenu.title}
                    </h4>
                    <p className="text-sm text-neutral-300 leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                      {currentMenu.summary}
                    </p>
                    <Link
                      href={currentMenu.href}
                      className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#E6C97A] hover:text-white pt-2 group"
                    >
                      <span>View Landing Page</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>

                  {/* Menu Sub-Columns with Thumbnail Images */}
                  <div className="col-span-6 grid grid-cols-2 gap-6 px-2">
                    {currentMenu.columns.map((col, idx) => (
                      <div key={idx} className="space-y-3.5">
                        <h5 className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#D4AF37] font-semibold">
                          {col.heading}
                        </h5>
                        <ul className="space-y-2.5">
                          {col.items.map((item, itemIdx) => (
                            <li key={itemIdx}>
                              <Link
                                href={item.href}
                                className="group flex items-center gap-3.5 rounded-xl p-2 -mx-2 hover:bg-white/[0.06] transition-all"
                              >
                                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-white/15 bg-[#141418] shrink-0 shadow-sm group-hover:border-[#D4AF37]/60 transition-colors">
                                  <img
                                    src={item.image}
                                    alt={item.label}
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-[family-name:var(--font-eb-garamond)] text-base font-medium text-white group-hover:text-[#E6C97A] transition-colors block truncate">
                                    {item.label}
                                  </span>
                                  <span className="text-xs text-neutral-400 line-clamp-1 block mt-0.5 font-[family-name:var(--font-eb-garamond)]">
                                    {item.desc}
                                  </span>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Featured Card with Image Banner */}
                  <div className="col-span-3 bg-white/[0.04] p-4 rounded-2xl border border-white/10 space-y-3">
                    <Link
                      href={currentMenu.featured.href}
                      className="group block relative h-36 w-full rounded-xl overflow-hidden border border-white/15 bg-[#141418]"
                    >
                      <img
                        src={currentMenu.featured.image}
                        alt={currentMenu.featured.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      <span className="absolute top-2.5 left-3 text-[10px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#E6C97A] font-semibold">
                        Featured
                      </span>
                    </Link>
                    <h5 className="font-[family-name:var(--font-eb-garamond)] text-lg text-white font-medium">
                      {currentMenu.featured.title}
                    </h5>
                    <p className="text-xs text-neutral-300 leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                      {currentMenu.featured.desc}
                    </p>
                    <Link
                      href={currentMenu.featured.href}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37] hover:bg-[#E6C97A] text-neutral-950 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider font-bold transition-all shadow-md mt-1"
                    >
                      <span>{currentMenu.featured.linkText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE NAVIGATION DRAWER
         ========================================================================= */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden bg-[#0A0A0C]/98 backdrop-blur-xl px-5 py-6 space-y-6 max-h-[82vh] overflow-y-auto"
        >
          {/* Quick Actions Bar (Search & Account) */}
          <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex items-center justify-center gap-2 p-2.5 rounded-full bg-neutral-900 border border-white/15 text-xs text-white uppercase tracking-wider font-[family-name:var(--font-eb-garamond)]"
            >
              <Search className="h-4 w-4 text-[#D4AF37]" />
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setAuthModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 p-2.5 rounded-full bg-neutral-900 border border-white/15 text-xs text-white uppercase tracking-wider font-[family-name:var(--font-eb-garamond)] cursor-pointer"
            >
              <User className="h-4 w-4 text-[#D4AF37]" />
              Sign In / Sign Up
            </button>
          </div>

          {/* Collapsible Mobile Sections */}
          <div className="space-y-3 font-[family-name:var(--font-eb-garamond)]">
            {Object.entries(menuData).map(([key, data]) => {
              const isOpen = mobileExpandedSection === key;
              return (
                <div key={key} className="border-b border-white/10 pb-3">
                  <div className="flex items-center justify-between py-2">
                    <Link
                      href={data.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base uppercase tracking-[0.16em] font-medium text-white hover:text-[#E6C97A]"
                    >
                      {data.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMobileExpandedSection(isOpen ? null : key)}
                      className="p-1 text-white"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isOpen ? 'rotate-180 text-[#D4AF37]' : 'text-neutral-400'
                        }`}
                      />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-4 pl-2 animate-in fade-in-0 duration-150">
                      {data.columns.map((col, idx) => (
                        <div key={idx} className="space-y-2.5">
                          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                            {col.heading}
                          </p>
                          <ul className="space-y-2">
                            {col.items.map((item, itemIdx) => (
                              <li key={itemIdx}>
                                <Link
                                  href={item.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center gap-3 py-1 text-sm text-neutral-200 hover:text-white"
                                >
                                  <img
                                    src={item.image}
                                    alt={item.label}
                                    referrerPolicy="no-referrer"
                                    className="h-9 w-9 rounded-lg object-cover border border-white/15 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="block font-medium text-white truncate">
                                      {item.label}
                                    </span>
                                    <span className="block text-xs text-neutral-400 truncate">
                                      {item.desc}
                                    </span>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Link
              href="/concierge"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-3 text-base uppercase tracking-[0.18em] font-semibold text-[#E6C97A]"
            >
              <Sparkles className="h-4 w-4" />
              AI Gemologist
            </Link>
          </div>
        </nav>
      )}

      <AuthPopupModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
}

export default StorefrontHeader;
