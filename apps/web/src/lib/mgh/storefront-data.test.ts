// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHeroAnchorGemstone,
  getGemstoneBySlugOrId,
  filterAndSortGemstones,
  getVarietyBySlug,
  getDyoConfigurationByCode,
  getOrderById,
  getWebArAssetById,
  validateRedirectUpsert,
  getRealtimeGemologicalSuggestions,
  formatCurrencyAmount,
  INITIAL_REDIRECT_RULES,
} from './storefront-data';
import {
  evaluateConciergeAgentTurn,
  buildConciergeDyoProposal,
} from './ai-concierge-agent';

test('Hero anchor gemstone matches 1.31 ct violetish blue tanzanite specification', () => {
  const hero = getHeroAnchorGemstone();
  assert.equal(hero.id, 'MG-TZ-0131');
  assert.equal(hero.carat, 1.31);
  assert.equal(hero.shape, 'Round');
  assert.equal(hero.clarity, 'VSI');
  assert.equal(hero.origin, 'Tanzania');
  assert.ok(hero.treatmentDisclosed.toLowerCase().includes('heat-treated'));
});

test('Honesty rules: unknown slugs, bogus DYO codes, unknown order IDs, and missing AR assets return null', () => {
  assert.equal(getGemstoneBySlugOrId('non-existent-stone-999'), null);
  assert.equal(getVarietyBySlug('kryptonite-variety'), null);
  assert.equal(getDyoConfigurationByCode('BOGUS-CONFIG-9999'), null);
  assert.equal(getOrderById('ORD-UNKNOWN-404'), null);
  assert.equal(getWebArAssetById('missing-webar-asset'), null);
});

test('Saved DYO configuration DYO-MG-8841 resolves and preserves null fields for NotEvidenced rendering', () => {
  const result = getDyoConfigurationByCode('DYO-MG-8841');
  assert.ok(result);
  assert.equal(result.stone.id, 'MG-TZ-0131');
  assert.equal(result.setting.sku, 'SET-ARCH-SOL-01');
  assert.equal(result.config.bespokeBenchNote, null);
  assert.equal(result.config.benchMasterAssigned, null);
  assert.equal(result.totalPrice, 2480 + 1650 + 350);
});

test('Order confirmation state is PENDING_PAYMENT for fresh orders and never fabricates settlement', () => {
  const freshOrder = getOrderById('ORD-2026-9012');
  assert.ok(freshOrder);
  assert.equal(freshOrder.paymentStatus, 'PENDING_PAYMENT');

  const liveOrder = getOrderById('ORD-LIVE-4480');
  assert.ok(liveOrder);
  assert.equal(liveOrder.paymentStatus, 'PENDING_PAYMENT');
  assert.equal(liveOrder.total, 4480);
});

test('Admin redirect manager returns 409 Conflict on duplicate sourcePath', () => {
  const conflict = validateRedirectUpsert(INITIAL_REDIRECT_RULES, {
    sourcePath: '/earring-pairs',
    destinationPath: '/shop',
    statusCode: 301,
  });
  assert.equal(conflict.ok, false);
  if (!conflict.ok) {
    assert.equal(conflict.status, 409);
    assert.ok(conflict.message.includes('409 Conflict'));
  }

  const valid = validateRedirectUpsert(INITIAL_REDIRECT_RULES, {
    sourcePath: '/old-gem-index',
    destinationPath: '/browse',
    statusCode: 308,
  });
  assert.equal(valid.ok, true);
});

test('Catalogue filter engine filters by variety, treatment, and price sorting accurately', () => {
  const tanzanites = filterAndSortGemstones({ variety: 'tanzanite', sort: 'price-asc' });
  assert.ok(tanzanites.total >= 4);
  assert.ok(tanzanites.items[0].price <= tanzanites.items[1].price);

  const unheated = filterAndSortGemstones({ treatment: 'unheated' });
  assert.ok(unheated.total >= 5);

  const under5k = filterAndSortGemstones({ maxPrice: 5000 });
  assert.ok(under5k.total > 0);
  assert.ok(under5k.items.every((g) => g.price <= 5000));
});

test('Real-time gemological suggestions match varieties, origins, and specimens deterministically', () => {
  const tanzQuery = getRealtimeGemologicalSuggestions('tanz');
  assert.ok(tanzQuery.varieties.some((v) => v.label === 'Tanzanite'));
  assert.ok(tanzQuery.origins.some((o) => o.label === 'Tanzania'));
  assert.ok(tanzQuery.specimens.some((s) => s.id === 'spec-MG-TZ-0131'));

  const originQuery = getRealtimeGemologicalSuggestions('Sri Lanka');
  assert.ok(originQuery.origins.some((o) => o.label.includes('Sri Lanka')));
  assert.ok(originQuery.varieties.some((v) => v.label === 'Sapphire'));

  const emptyQuery = getRealtimeGemologicalSuggestions('unobtainium-xyz-999');
  assert.equal(emptyQuery.totalMatches, 0);
});

test('AI Concierge Agent executes product search, comparison, DYO bespoke ring design, wishlist, and cart actions', () => {
  // 1. Show product cards
  const showTurn = evaluateConciergeAgentTurn('1.31 ct Tanzanite');
  assert.equal(showTurn.intent, 'show_products');
  assert.ok(showTurn.products.some((p) => p.id === 'MG-TZ-0131'));

  // 2. Compare products side by side
  const compareTurn = evaluateConciergeAgentTurn('Compare Tanzanite & Sapphire');
  assert.equal(compareTurn.intent, 'compare_products');
  assert.ok(compareTurn.comparedProducts.length >= 2);
  assert.ok(compareTurn.clientActions.some((a) => a.type === 'SYNC_COMPARE'));

  // 3. Design Your Own Jewellery (DYO)
  const dyoTurn = evaluateConciergeAgentTurn('Design a Platinum Ring with MG-TZ-0131');
  assert.equal(dyoTurn.intent, 'design_jewelry');
  assert.ok(dyoTurn.dyoProposal);
  assert.equal(dyoTurn.dyoProposal.stone.id, 'MG-TZ-0131');
  assert.equal(dyoTurn.dyoProposal.metalCode, 'PT950');
  assert.equal(dyoTurn.dyoProposal.totalPrice, 4480);

  // 4. Add to Wishlist
  const wishlistTurn = evaluateConciergeAgentTurn('Add MG-TZ-0131 to Wishlist');
  assert.equal(wishlistTurn.intent, 'add_to_wishlist');
  assert.ok(
    wishlistTurn.clientActions.some(
      (a) => a.type === 'ADD_TO_WISHLIST' && a.stoneId === 'MG-TZ-0131'
    )
  );

  // 5. Add to Cart / Bag
  const cartTurn = evaluateConciergeAgentTurn('Add 1.31 ct Tanzanite to Bag');
  assert.equal(cartTurn.intent, 'add_to_cart');
  assert.ok(
    cartTurn.clientActions.some(
      (a) => a.type === 'ADD_TO_CART' && a.item.id === 'MG-TZ-0131'
    )
  );

  // 6. Helper buildConciergeDyoProposal
  const customDyo = buildConciergeDyoProposal('MG-TZ-0131', 'SET-ARCH-SOL-01', '18K_YG', '6.5');
  assert.equal(customDyo.stone.id, 'MG-TZ-0131');
  assert.equal(customDyo.metalCode, '18K_YG');
});

test('Currency conversion handles USD, AED, and BHAT with accurate rates and prefixes', () => {
  const baseUsd = 1000;
  assert.equal(formatCurrencyAmount(baseUsd, 'USD'), '$1,000');
  // AED: 1000 * 3.6725 = 3673
  assert.equal(formatCurrencyAmount(baseUsd, 'AED'), 'AED 3,673');
  // BHAT: 1000 * 36.50 = 36500
  assert.equal(formatCurrencyAmount(baseUsd, 'BHAT'), '฿36,500');

  // Verify higher specimen values
  const highTierUsd = 28400;
  assert.equal(formatCurrencyAmount(highTierUsd, 'USD'), '$28,400');
  assert.ok(formatCurrencyAmount(highTierUsd, 'AED').startsWith('AED '));
  assert.ok(formatCurrencyAmount(highTierUsd, 'BHAT').startsWith('฿'));
});
