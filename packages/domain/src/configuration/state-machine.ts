/**
 * packages/domain/src/configuration/state-machine.ts
 *
 * Authority: technical_design/14_DYO_ARCHITECTURE.md section 3 ("Configuration lifecycle")
 *
 * Lifecycle:
 *   DRAFT --validate--> VALIDATING --pass--> VALID
 *                                 \--fail--> INCOMPATIBLE
 *   VALID --quote---------------------------> PRICED
 *   VALID --change stone/setting/options----> DRAFT (resets validation)
 *   INCOMPATIBLE --edit---------------------> DRAFT
 *   PRICED --add to cart--------------------> ADDED_TO_CART
 *   ADDED_TO_CART --order placed------------> ORDERED
 *   PRICED | ADDED_TO_CART --ttl------------> EXPIRED
 *
 * Invariants:
 *   - Any change to stone, setting variant or options resets to DRAFT and clears compatibility status.
 *   - Terminal EXPIRED: expired configurations cannot be revived.
 *   - Pure, deterministic domain logic with explicit transitions.
 */
import { DomainError } from '../errors.js';
import type { DyoState } from '../enums.js';

export type DyoTrigger =
  | 'SELECT_COMPONENTS'
  | 'START_VALIDATION'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'PRICE_QUOTED'
  | 'ADD_TO_CART'
  | 'ORDER_PLACED'
  | 'EXPIRE';

export interface TransitionResult {
  readonly nextState: DyoState;
  readonly resetValidation: boolean;
}

const ALLOWED_TRANSITIONS: Record<DyoState, readonly DyoTrigger[]> = {
  DRAFT: ['SELECT_COMPONENTS', 'START_VALIDATION', 'EXPIRE'],
  VALIDATING: ['VALIDATION_PASSED', 'VALIDATION_FAILED', 'SELECT_COMPONENTS'],
  VALID: ['PRICE_QUOTED', 'SELECT_COMPONENTS', 'START_VALIDATION', 'EXPIRE'],
  INCOMPATIBLE: ['SELECT_COMPONENTS', 'START_VALIDATION', 'EXPIRE'],
  PRICED: ['ADD_TO_CART', 'SELECT_COMPONENTS', 'START_VALIDATION', 'EXPIRE'],
  ADDED_TO_CART: ['ORDER_PLACED', 'SELECT_COMPONENTS', 'EXPIRE'],
  ORDERED: [], // terminal
  EXPIRED: [], // terminal
};

export function canTransition(currentState: DyoState, trigger: DyoTrigger): boolean {
  return ALLOWED_TRANSITIONS[currentState].includes(trigger);
}

export function transitionDyoState(currentState: DyoState, trigger: DyoTrigger): TransitionResult {
  if (!canTransition(currentState, trigger)) {
    throw new DomainError(
      'INVALID_DYO_STATE_TRANSITION',
      `Illegal DYO state transition from '${currentState}' via trigger '${trigger}'`,
    );
  }

  switch (trigger) {
    case 'SELECT_COMPONENTS':
      return { nextState: 'DRAFT', resetValidation: true };

    case 'START_VALIDATION':
      return { nextState: 'VALIDATING', resetValidation: false };

    case 'VALIDATION_PASSED':
      return { nextState: 'VALID', resetValidation: false };

    case 'VALIDATION_FAILED':
      return { nextState: 'INCOMPATIBLE', resetValidation: false };

    case 'PRICE_QUOTED':
      return { nextState: 'PRICED', resetValidation: false };

    case 'ADD_TO_CART':
      return { nextState: 'ADDED_TO_CART', resetValidation: false };

    case 'ORDER_PLACED':
      return { nextState: 'ORDERED', resetValidation: false };

    case 'EXPIRE':
      return { nextState: 'EXPIRED', resetValidation: false };

    default: {
      const _exhaustive: never = trigger;
      throw new DomainError('INVALID_DYO_TRIGGER', `Unhandled trigger: ${String(_exhaustive)}`);
    }
  }
}
