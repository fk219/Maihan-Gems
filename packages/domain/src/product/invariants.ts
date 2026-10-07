/**
 * packages/domain — INV-01, INV-02, INV-03 as pure predicates
 * (doc 05 "Invariant implementations"; SoT 7.3; doc 04 "Constraints").
 *
 * These are the domain-level forms of the composition invariants. The database
 * constraints products_composition_ck, products_no_pair_on_non_earrings_ck and
 * products_earrings_need_pair_ck are the enforcement; the domain predicates
 * exist to produce a precise error BEFORE a write reaches the database.
 * Tests must prove the database rejects violations too (done at the migration
 * layer); the domain must never be the only line of defence.
 *
 * Semantics, transcribed from the authoritative products_composition_ck CASE
 * (which doc 04 labels INV-01) and the two companion constraints:
 *
 *   INV-01 (composition by kind):
 *     CONFIGURED   -> settingVariantId required AND exactly one of
 *                     gemstoneId / gemstonePairId (neither or both = invalid)
 *     SETTING_ONLY -> settingVariantId required AND both stone references null
 *     otherwise (READY_MADE, LOOSE_STONE, STONE_PAIR) -> settingVariantId null
 *
 *   INV-02: a gemstone pair may attach only to EARRINGS.
 *   INV-03: CONFIGURED EARRINGS require a gemstone pair.
 *
 * The predicates are pure: no I/O, no clock, no environment.
 */
import type { JewelleryType, ProductKind } from '../enums.js';
import { InvariantError } from '../errors.js';

/**
 * Cross-aggregate references are by id only (doc 05 "Aggregates and roots").
 * A Product holds settingVariantId, never a SettingVariant object.
 */
export interface ProductComposition {
  readonly kind: ProductKind;
  readonly jewelleryType: JewelleryType;
  readonly settingVariantId: string | null;
  readonly gemstoneId: string | null;
  readonly gemstonePairId: string | null;
}

/** INV-01: composition by kind, matching products_composition_ck exactly. */
export function satisfiesInv01(p: ProductComposition): boolean {
  switch (p.kind) {
    case 'CONFIGURED':
      return (
        p.settingVariantId !== null &&
        (p.gemstoneId === null) !== (p.gemstonePairId === null)
      );
    case 'SETTING_ONLY':
      return p.settingVariantId !== null && p.gemstoneId === null && p.gemstonePairId === null;
    default:
      return p.settingVariantId === null;
  }
}

/** INV-02: a pair may attach only to EARRINGS (gemstone_pair_id IS NULL OR jewellery_type = 'EARRINGS'). */
export function satisfiesInv02(p: ProductComposition): boolean {
  return p.gemstonePairId === null || p.jewelleryType === 'EARRINGS';
}

/** INV-03: CONFIGURED EARRINGS require a pair (jewellery_type <> 'EARRINGS' OR kind <> 'CONFIGURED' OR gemstone_pair_id IS NOT NULL). */
export function satisfiesInv03(p: ProductComposition): boolean {
  return p.jewelleryType !== 'EARRINGS' || p.kind !== 'CONFIGURED' || p.gemstonePairId !== null;
}

/**
 * The authoritative entry point: validates the full composition and throws the
 * FIRST violated invariant with its stable identifier. Order mirrors doc 05:
 * INV-01 first, then INV-02, then INV-03.
 */
export function assertComposition(p: ProductComposition): void {
  if (p.kind === 'CONFIGURED') {
    if (p.settingVariantId === null) {
      throw new InvariantError('INV-01', 'setting_variant_id required', { kind: p.kind, jewelleryType: p.jewelleryType });
    }
    const hasStone = p.gemstoneId !== null;
    const hasPair = p.gemstonePairId !== null;
    if (hasStone === hasPair) {
      throw new InvariantError('INV-01', 'exactly one of gemstone_id or gemstone_pair_id', {
        kind: p.kind,
        hasStone,
        hasPair,
      });
    }
  } else if (p.kind === 'SETTING_ONLY') {
    if (p.settingVariantId === null) {
      throw new InvariantError('INV-01', 'setting_variant_id required', { kind: p.kind, jewelleryType: p.jewelleryType });
    }
    if (p.gemstoneId !== null || p.gemstonePairId !== null) {
      throw new InvariantError('INV-01', 'SETTING_ONLY products must not reference a gemstone', { kind: p.kind });
    }
  } else if (p.settingVariantId !== null) {
    throw new InvariantError('INV-01', 'only CONFIGURED and SETTING_ONLY products may reference a setting variant', {
      kind: p.kind,
    });
  }

  if (!satisfiesInv02(p)) {
    throw new InvariantError('INV-02', 'a gemstone pair may attach only to EARRINGS', {
      jewelleryType: p.jewelleryType,
      hasPair: p.gemstonePairId !== null,
    });
  }

  if (!satisfiesInv03(p)) {
    throw new InvariantError('INV-03', 'CONFIGURED EARRINGS require a gemstone pair', {
      kind: p.kind,
      jewelleryType: p.jewelleryType,
    });
  }
}
