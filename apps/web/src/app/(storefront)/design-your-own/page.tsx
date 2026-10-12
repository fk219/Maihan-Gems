/**
 * Design Your Own (DYO) Page
 * Custom jewelry configurator: choose setting + gemstone with compatibility checking
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Design Your Own Jewelry | Maihan Gems',
  description: 'Create your custom piece by pairing a setting with a gemstone',
};

const PLACEHOLDER_SETTINGS = [
  {
    id: 'set-001',
    title: 'Classic 4-Prong Solitaire',
    type: 'ring',
    price: 1200,
    image: '/assets/settings/solitaire_ring.svg',
    accepts: { shapes: ['round', 'cushion', 'oval'], minCarat: 0.5, maxCarat: 5.0 },
  },
  {
    id: 'set-003',
    title: 'Halo Engagement Ring',
    type: 'ring',
    price: 2800,
    image: '/assets/settings/halo_ring.svg',
    accepts: { shapes: ['round', 'cushion', 'oval', 'pear'], minCarat: 0.5, maxCarat: 3.0 },
  },
];

const PLACEHOLDER_GEMSTONES = [
  {
    id: 'sap-001',
    title: '3.42 ct Royal Blue Sapphire',
    carat: 3.42,
    shape: 'cushion',
    price: 48500,
    image: '/assets/gemstones/sapphire.svg',
  },
  {
    id: 'rub-001',
    title: '2.94 ct Pigeon Blood Ruby',
    carat: 2.94,
    shape: 'oval',
    price: 87000,
    image: '/assets/gemstones/ruby.svg',
  },
];

export default function DesignYourOwnPage() {
  const selectedSetting = PLACEHOLDER_SETTINGS[0];
  const selectedGemstone = PLACEHOLDER_GEMSTONES[0];
  const totalPrice = selectedSetting.price + selectedGemstone.price;

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-white border-b border-[rgba(201,168,76,0.15)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A867E] block mb-2">
            Bespoke Atelier
          </span>
          <h1 className="font-serif text-4xl font-medium text-[#1A1A18] mb-4">
            Design Your <span className="text-[#C9A84C]">Own</span>
          </h1>
          <p className="text-[15px] text-[#4A4740] max-w-2xl">
            Create your custom piece in three steps: choose a setting, select a compatible gemstone, and customize the details.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C] text-white flex items-center justify-center font-semibold text-[14px]">
              1
            </div>
            <span className="text-[13px] font-semibold text-[#1A1A18]">Choose Setting</span>
          </div>
          <div className="w-12 h-[2px] bg-[rgba(201,168,76,0.25)]"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[rgba(201,168,76,0.25)] text-[#8A867E] flex items-center justify-center font-semibold text-[14px]">
              2
            </div>
            <span className="text-[13px] text-[#8A867E]">Select Gemstone</span>
          </div>
          <div className="w-12 h-[2px] bg-[rgba(201,168,76,0.25)]"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[rgba(201,168,76,0.25)] text-[#8A867E] flex items-center justify-center font-semibold text-[14px]">
              3
            </div>
            <span className="text-[13px] text-[#8A867E]">Customize</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 mb-6">
              <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-6">
                Step 1: Choose Your Setting
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLACEHOLDER_SETTINGS.map((setting) => (
                  <div
                    key={setting.id}
                    className="border border-[rgba(201,168,76,0.12)] rounded-[12px] p-4 cursor-pointer hover:border-[#C9A84C] transition-colors"
                  >
                    <div className="aspect-square bg-[#F7F7F5] rounded-[8px] flex items-center justify-center p-6 mb-3">
                      <img
                        src={setting.image}
                        alt={setting.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <h3 className="font-serif text-lg font-medium text-[#1A1A18] mb-1">
                      {setting.title}
                    </h3>
                    <p className="text-[13px] text-[#8A867E] mb-2">
                      Accepts: {setting.accepts.shapes.join(', ')} · {setting.accepts.minCarat}-{setting.accepts.maxCarat}ct
                    </p>
                    <p className="font-mono text-[14px] font-semibold text-[#1A1A18]">
                      USD {setting.price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gemstones Selection */}
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6">
              <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-6">
                Step 2: Select Compatible Gemstone
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLACEHOLDER_GEMSTONES.map((gemstone) => (
                  <div
                    key={gemstone.id}
                    className="border border-[rgba(201,168,76,0.12)] rounded-[12px] p-4 cursor-pointer hover:border-[#C9A84C] transition-colors"
                  >
                    <div className="aspect-square bg-[#F7F7F5] rounded-[8px] flex items-center justify-center p-6 mb-3">
                      <img
                        src={gemstone.image}
                        alt={gemstone.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <h3 className="font-serif text-lg font-medium text-[#1A1A18] mb-1">
                      {gemstone.title}
                    </h3>
                    <p className="text-[13px] text-[#8A867E] mb-2">
                      {gemstone.carat} ct · {gemstone.shape}
                    </p>
                    <p className="font-mono text-[14px] font-semibold text-[#1A1A18]">
                      USD {gemstone.price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview & Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 sticky top-24">
              <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-6">
                Your Design
              </h2>

              {/* Preview */}
              <div className="aspect-square bg-[#F7F7F5] rounded-[12px] flex items-center justify-center p-8 mb-6">
                <div className="relative w-full h-full">
                  <img
                    src={selectedSetting.image}
                    alt="Setting"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <img
                    src={selectedGemstone.image}
                    alt="Gemstone"
                    className="absolute inset-0 w-full h-full object-contain scale-50"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4 mb-6">
                <div className="pb-3 border-b border-[rgba(0,0,0,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A867E] mb-1">Setting</p>
                  <p className="text-[14px] font-medium text-[#1A1A18] mb-1">{selectedSetting.title}</p>
                  <p className="font-mono text-[13px] text-[#4A4740]">
                    USD {selectedSetting.price.toLocaleString()}
                  </p>
                </div>

                <div className="pb-3 border-b border-[rgba(0,0,0,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A867E] mb-1">Gemstone</p>
                  <p className="text-[14px] font-medium text-[#1A1A18] mb-1">{selectedGemstone.title}</p>
                  <p className="font-mono text-[13px] text-[#4A4740]">
                    USD {selectedGemstone.price.toLocaleString()}
                  </p>
                </div>

                <div className="pt-3">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#8A867E]">Total Price</span>
                    <span className="font-mono text-2xl font-bold text-[#1A1A18] tabular-nums">
                      USD {totalPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Ring Size Selection */}
                  <div className="mb-4">
                    <label className="text-[13px] font-medium text-[#1A1A18] block mb-2">
                      Ring Size (US)
                    </label>
                    <select className="w-full px-3 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] outline-none">
                      <option>5</option>
                      <option>5.5</option>
                      <option>6</option>
                      <option>6.5</option>
                      <option>7</option>
                      <option>7.5</option>
                      <option>8</option>
                    </select>
                  </div>

                  {/* Metal Selection */}
                  <div className="mb-6">
                    <label className="text-[13px] font-medium text-[#1A1A18] block mb-2">
                      Metal Type
                    </label>
                    <select className="w-full px-3 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] outline-none">
                      <option>18K White Gold</option>
                      <option>18K Yellow Gold</option>
                      <option>18K Rose Gold</option>
                      <option>Platinum</option>
                    </select>
                  </div>

                  <button className="w-full px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 hover:-translate-y-0.5 transition-all mb-3">
                    Add to Cart
                  </button>

                  <Link
                    href="/browse"
                    className="block w-full px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1A1A18] bg-white border border-[rgba(201,168,76,0.3)] rounded-[12px] hover:bg-[rgba(201,168,76,0.04)] hover:border-[#C9A84C] transition-all text-center"
                  >
                    Start Over
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
