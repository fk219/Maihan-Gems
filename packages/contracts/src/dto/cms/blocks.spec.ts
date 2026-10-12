import { describe, expect, it } from 'vitest';

import {
  BLOCK_PROPS_BY_TYPE,
  CONTENT_BLOCK_TYPES,
  PageBlocksSchema,
  parsePageBlocks,
} from '../../index.js';

/** One valid props sample per type. */
const SAMPLE_PROPS: Record<string, Record<string, unknown>> = {
  HERO: { title: 'Emeralds of the Vault', assetId: '0b8f6f40-5cc4-4c8f-9a37-1857be54ff0d' },
  RICH_TEXT: { markdown: '# Four Cs\nCarat, cut, colour, clarity.' },
  IMAGE: { assetId: '0b8f6f40-5cc4-4c8f-9a37-1857be54ff0d', alt: 'Loose emerald' },
  IMAGE_GALLERY: { items: [{ assetId: '0b8f6f40-5cc4-4c8f-9a37-1857be54ff0d', alt: 'a' }] },
  PRODUCT_COLLECTION: { sourceUrls: ['https://a.example/x'] },
  GEMSTONE_COLLECTION: { gemRefs: ['K1324', 'PR5681'] },
  CATEGORY_GRID: { items: [{ label: 'Rings', href: '/rings' }, { label: 'Pairs', href: '/pairs' }] },
  FAQ: { items: [{ question: 'Is it natural?', answer: 'Yes, 100% earth-mined.' }] },
  BUYING_GUIDE: { sections: [{ heading: 'Clarity', markdown: 'Loupe-clean…' }] },
  CERTIFICATE_GUIDE: { sections: [{ heading: 'Reading a GIA report', markdown: 'Framework…' }] },
  COMPARISON_TABLE: { columns: ['Ruby', 'Sapphire'], rows: [['9', '9']] },
  VIDEO: { externalUrl: 'https://cdn.example/v.mp4' },
  CTA: { label: 'Inquire', href: '/contact' },
  BANNER: { message: 'New arrivals weekly' },
  TESTIMONIAL: { quote: 'Every stone arrived exactly as described.' },
  SHOWROOM_CTA: { heading: 'Book a salon visit', href: '/showrooms' },
  VEDIC_CTA: { heading: 'Vedic selections', href: '/vedic' },
  ASTROLOGY_CONTENT: { markdown: 'Neelam and Saturn…' },
  CUSTOM_DESIGN_CTA: { heading: 'Design your own' },
  CONTACT_CTA: { heading: 'Speak to an advisor' },
};

describe('the 20-block registry (doc 22 §2)', () => {
  it('covers exactly the 20 enum values', () => {
    expect(CONTENT_BLOCK_TYPES).toHaveLength(20);
    for (const t of CONTENT_BLOCK_TYPES) {
      expect(BLOCK_PROPS_BY_TYPE[t], t).toBeDefined();
    }
  });

  for (const type of CONTENT_BLOCK_TYPES) {
    it(`parses a valid ${type} block`, () => {
      const blocks = [
        { id: `b_${type.toLowerCase()}`, type, props: SAMPLE_PROPS[type]!, visibility: undefined },
      ];
      const parsed = parsePageBlocks(blocks);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.type).toBe(type);
    });
  }

  it('rejects an unknown block type (never silently dropped)', () => {
    expect(() => PageBlocksSchema.parse([
      { id: 'b1', type: 'SPACER', props: {} },
    ])).toThrow();
  });

  it('rejects props that do not match the type registry', () => {
    expect(() => parsePageBlocks([
      { id: 'b1', type: 'HERO', props: { markdown: 'wrong shape' } },
    ])).toThrow(/invalid props for 'b1' \(HERO\)/);
  });

  it('rejects duplicate block ids (revisions diff by stable id)', () => {
    expect(() => parsePageBlocks([
      { id: 'dup', type: 'CTA', props: { label: 'a', href: '/x' } },
      { id: 'dup', type: 'BANNER', props: { message: 'b' } },
    ])).toThrow(/duplicate block id 'dup'/);
  });

  it('rejects a raw URL where an asset reference is required', () => {
    expect(() => parsePageBlocks([
      { id: 'img', type: 'IMAGE', props: { assetId: 'https://evil.example/x.png', alt: 'x' } },
    ])).toThrow();
  });
});
