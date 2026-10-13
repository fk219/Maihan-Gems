import { describe, expect, it } from 'vitest';

import {
  classifyUrl,
  extractJsonLdProducts,
  offerFromJsonLd,
  parseListing,
  parseMoney,
  pickPrimaryImage,
  rewriteDescription,
  skuFromUrl,
  toUsd,
} from './public-catalog-parse.js';

describe('public catalog parse', () => {
  it('reads SKU and kind from a loose spinel URL', () => {
    const url = 'https://naturalgemstones.com/spinel/1.75ct-burma-myanmar-fancy-pink-spinel-k16466/';
    expect(skuFromUrl(url)).toBe('K16466');
    expect(classifyUrl(url)).toBe('gemstone');
    const parsed = parseListing({
      url,
      jsonName: '1.75 Ct. Pink Spinel from Burma (Myanmar)',
      jsonSku: 'K16466',
      imageUrl: 'https://images.example/stone/k16466/image/certified-natural-untreated-burma-cushion-pink-spinel-1.7500-cts.jpg',
    });
    expect(parsed.stoneType).toBe('spinel');
    expect(parsed.colorHue).toBe('pink');
    expect(parsed.originCountry).toBe('Myanmar');
    expect(parsed.caratTotal).toBe(1.75);
    expect(parsed.treatment).toBe('no_enhancement');
    expect(parsed.shape).toBe('cushion');
  });

  it('classifies jewellery SKUs separately from loose stones', () => {
    const url = 'https://naturalgemstones.com/tanzanite-rings/tanzanian-blue-tanzanite-halo-ring-cushion-6.59ct-18k-rose-gold-j10029/';
    expect(classifyUrl(url)).toBe('jewelry');
    const parsed = parseListing({ url, jsonName: '6.59 Ct. Blue Tanzanite Halo Ring, 18K Rose Gold', jsonSku: 'J10029' });
    expect(parsed.jewelryType).toBe('ring');
    expect(parsed.metalColor).toBe('rose');
  });

  it('reads setting SKUs with a metal suffix and pair SKUs', () => {
    expect(skuFromUrl('https://naturalgemstones.com/gemstone-ring-settings/18k-rose-gold-pave-ring-setting-js1618r18/')).toBe('JS1618R18');
    expect(classifyUrl('https://naturalgemstones.com/gemstone-ring-settings/18k-rose-gold-pave-ring-setting-js1618r18/')).toBe('setting');
    expect(skuFromUrl('https://naturalgemstones.com/kunzite-pairs/14.25ct-afghan-oval-kunzite-pair-pr12858/')).toBe('PR12858');
    const pair = parseListing({
      url: 'https://naturalgemstones.com/kunzite-pairs/14.25ct-afghan-oval-kunzite-pair-pr12858/',
      jsonName: '14.25 Ct. Matched Kunzite Pair',
    });
    expect(pair.quantityType).toBe('pair');
  });

  it('rewrites descriptions from fields instead of copying marketing copy', () => {
    const parsed = parseListing({
      url: 'https://naturalgemstones.com/ruby/2.94ct-burma-myanmar-oval-red-ruby-k1/',
      jsonName: '2.94 Ct. Red Ruby from Burma (Myanmar)',
      jsonSku: 'K1',
    });
    const copy = rewriteDescription(parsed, 'The Natural Gemstone Company');
    expect(copy.toLowerCase()).toContain('ruby');
    expect(copy).not.toMatch(/imagine holding/i);
  });

  it('prefers the actual stone photograph over lifestyle or lab scans', () => {
    expect(pickPrimaryImage([
      'https://cdn.example/stone/k1/lifestyleimage/x.jpg',
      'https://cdn.example/stone/k1/image/certified-natural-untreated-cushion-pink-spinel.jpg',
      'https://cdn.example/logo.png',
    ])).toContain('/image/');
  });

  it('parses comma-formatted JSON-LD prices and @graph products', () => {
    expect(parseMoney('20,860.00')).toBe(20860);
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [{
        '@type': 'Product',
        name: 'Mingle Earrings',
        offers: { price: '20,860.00', priceCurrency: 'USD' },
        image: 'https://cdn.example/earrings.jpg',
      }],
    })}</script>`;
    const products = extractJsonLdProducts(html);
    expect(products).toHaveLength(1);
    const offer = offerFromJsonLd(products[0]!);
    expect(offer.money).toEqual({ amount: 20860, currency: 'USD' });
  });

  it('converts AED and THB offers into USD via fx_rates', () => {
    expect(toUsd(367.25, 'AED', { AED: 3.6725, THB: 34.5 })).toBeCloseTo(100, 4);
    expect(toUsd(3450, 'THB', { AED: 3.6725, THB: 34.5 })).toBeCloseTo(100, 4);
    expect(toUsd(100, 'USD', { AED: 3.6725, THB: 34.5 })).toBe(100);
  });
});
