/**
 * packages/domain/src/configuration/dyo.spec.ts
 *
 * Tests for Phase 7 Task 1-5 Domain Implementation:
 *  - DYO state machine legal & illegal transitions
 *  - Deterministic compatibility engine (INV-01, INV-02, INV-03, ALLOW, DENY, REQUIRES_REVIEW, UNKNOWN)
 *  - Deterministic price calculation and snapshot reproducibility
 */
import { describe, expect, it } from 'vitest';
import { transitionDyoState, canTransition } from './state-machine.js';
import { evaluateCompatibility, type CompatibilityRuleInput } from './compatibility-engine.js';
import { calculateDyoPrice } from './pricing-calculator.js';

describe('DYO State Machine (technical_design/14 section 3)', () => {
  it('allows valid progressive lifecycle transitions', () => {
    // DRAFT -> VALIDATING -> VALID -> PRICED -> ADDED_TO_CART -> ORDERED
    expect(transitionDyoState('DRAFT', 'START_VALIDATION').nextState).toBe('VALIDATING');
    expect(transitionDyoState('VALIDATING', 'VALIDATION_PASSED').nextState).toBe('VALID');
    expect(transitionDyoState('VALID', 'PRICE_QUOTED').nextState).toBe('PRICED');
    expect(transitionDyoState('PRICED', 'ADD_TO_CART').nextState).toBe('ADDED_TO_CART');
    expect(transitionDyoState('ADDED_TO_CART', 'ORDER_PLACED').nextState).toBe('ORDERED');
  });

  it('resets to DRAFT and flags validation reset when selecting components from VALID or PRICED', () => {
    const fromValid = transitionDyoState('VALID', 'SELECT_COMPONENTS');
    expect(fromValid.nextState).toBe('DRAFT');
    expect(fromValid.resetValidation).toBe(true);

    const fromPriced = transitionDyoState('PRICED', 'SELECT_COMPONENTS');
    expect(fromPriced.nextState).toBe('DRAFT');
    expect(fromPriced.resetValidation).toBe(true);
  });

  it('handles validation failure by transitioning to INCOMPATIBLE', () => {
    const res = transitionDyoState('VALIDATING', 'VALIDATION_FAILED');
    expect(res.nextState).toBe('INCOMPATIBLE');
    expect(res.resetValidation).toBe(false);

    // Editing from INCOMPATIBLE transitions back to DRAFT
    const reEdit = transitionDyoState('INCOMPATIBLE', 'SELECT_COMPONENTS');
    expect(reEdit.nextState).toBe('DRAFT');
    expect(reEdit.resetValidation).toBe(true);
  });

  it('rejects illegal transitions and terminal state departures', () => {
    expect(() => transitionDyoState('DRAFT', 'ADD_TO_CART')).toThrowError(/Illegal DYO state transition/);
    expect(() => transitionDyoState('INCOMPATIBLE', 'PRICE_QUOTED')).toThrowError(/Illegal DYO state transition/);
    expect(() => transitionDyoState('ORDERED', 'SELECT_COMPONENTS')).toThrowError(/Illegal DYO state transition/);
    expect(() => transitionDyoState('EXPIRED', 'SELECT_COMPONENTS')).toThrowError(/Illegal DYO state transition/);
    expect(canTransition('ORDERED', 'EXPIRE')).toBe(false);
  });
});

describe('Compatibility Evaluator (INV-01, INV-02, INV-03, Rules)', () => {
  const dummyRules: CompatibilityRuleInput[] = [
    {
      id: 'rule-allow-ring-1',
      settingId: 'setting-ring-1',
      jewelleryType: 'RING',
      stoneKind: 'SINGLE',
      minWeightCt: 1.0,
      maxWeightCt: 5.0,
      ruleKind: 'ALLOW',
      priority: 100,
      explanation: 'Solitaire setting accepts single gems between 1.0ct and 5.0ct',
    },
    {
      id: 'rule-deny-ring-1',
      settingId: 'setting-ring-1',
      jewelleryType: 'RING',
      stoneKind: 'SINGLE',
      shape: 'HEART',
      ruleKind: 'DENY',
      priority: 200,
      explanation: 'Setting prong structure cannot accommodate Heart shape',
    },
    {
      id: 'rule-allow-earrings-1',
      settingId: 'setting-earrings-1',
      jewelleryType: 'EARRINGS',
      stoneKind: 'PAIR',
      ruleKind: 'ALLOW',
      priority: 100,
      explanation: 'Drop earring mount accepts matched gemstone pairs',
    },
  ];

  it('enforces INV-01: requires stone to be present', () => {
    const res = evaluateCompatibility({ settingId: 'setting-ring-1', jewelleryType: 'RING' }, null, dummyRules);
    expect(res.status).toBe('INCOMPATIBLE');
    expect(res.ruleDetails[0].rule).toBe('INV-01');
  });

  it('enforces INV-02: pair attached to non-EARRINGS is INCOMPATIBLE', () => {
    const res = evaluateCompatibility(
      { settingId: 'setting-ring-1', jewelleryType: 'RING' },
      { kind: 'PAIR', weightCt: 2.5 },
      dummyRules,
    );
    expect(res.status).toBe('INCOMPATIBLE');
    expect(res.ruleDetails[0].rule).toBe('INV-02');
  });

  it('enforces INV-03: single stone attached to EARRINGS is INCOMPATIBLE', () => {
    const res = evaluateCompatibility(
      { settingId: 'setting-earrings-1', jewelleryType: 'EARRINGS' },
      { kind: 'SINGLE', weightCt: 2.0 },
      dummyRules,
    );
    expect(res.status).toBe('INCOMPATIBLE');
    expect(res.ruleDetails[0].rule).toBe('INV-03');
  });

  it('returns COMPATIBLE when matching an ALLOW rule', () => {
    const res = evaluateCompatibility(
      { settingId: 'setting-ring-1', jewelleryType: 'RING' },
      { kind: 'SINGLE', weightCt: 2.5, shape: 'OVAL' },
      dummyRules,
    );
    expect(res.status).toBe('COMPATIBLE');
    expect(res.ruleDetails[0].outcome).toBe('PASS');
    expect(res.ruleDetails[0].message).toContain('Solitaire setting accepts');
  });

  it('returns INCOMPATIBLE when matching a DENY rule (DENY beats ALLOW)', () => {
    const res = evaluateCompatibility(
      { settingId: 'setting-ring-1', jewelleryType: 'RING' },
      { kind: 'SINGLE', weightCt: 2.5, shape: 'HEART' },
      dummyRules,
    );
    expect(res.status).toBe('INCOMPATIBLE');
    expect(res.ruleDetails[0].outcome).toBe('FAIL');
    expect(res.ruleDetails[0].message).toContain('cannot accommodate Heart shape');
  });

  it('returns UNKNOWN when no rule matches (never assumes false compatibility)', () => {
    const res = evaluateCompatibility(
      { settingId: 'setting-unregistered', jewelleryType: 'PENDANT' },
      { kind: 'SINGLE', weightCt: 1.5 },
      dummyRules,
    );
    expect(res.status).toBe('UNKNOWN');
    expect(res.ruleDetails[0].message).toContain('No empirical compatibility rule');
  });
});

describe('DYO Pricing Calculator (technical_design/14 section 7)', () => {
  it('calculates reproducible price snapshot with single stone', () => {
    const res = calculateDyoPrice({
      gemstoneBasePrice: 5000,
      settingBasePrice: 1200,
      sideStonePrice: 300,
      makingFee: 250,
      discountAmount: 150,
      taxAmount: 330,
      currency: 'USD',
    });

    expect(res.gemstoneComponent).toBe(5000);
    expect(res.settingComponent).toBe(1200);
    expect(res.sideStoneComponent).toBe(300);
    expect(res.makingComponent).toBe(250);
    expect(res.discountComponent).toBe(150);
    expect(res.taxComponent).toBe(330);
    // 5000 + 1200 + 300 + 250 - 150 + 330 = 6930
    expect(res.total).toBe(6930);
    expect(res.currency).toBe('USD');
  });

  it('calculates pair price based on sum of per-stone weights', () => {
    const res = calculateDyoPrice({
      isPair: true,
      gemstonePerCarat: 500,
      perStoneWeightsCt: [1.25, 1.25], // sum 2.50 ct
      settingBasePrice: 800,
    });

    // 500 * 2.50 = 1250
    expect(res.gemstoneComponent).toBe(1250);
    expect(res.settingComponent).toBe(800);
    expect(res.total).toBe(2050);
  });
});
