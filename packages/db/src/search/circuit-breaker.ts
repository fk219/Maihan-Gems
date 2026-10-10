/**
 * packages/db/src/search/circuit-breaker.ts
 *
 * Vector-arm circuit breaker for safe and graceful search degradation (Phase 5 Task 11).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 11:
 *     "Implement the vector-arm circuit breaker so search degrades to structured plus full-text."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §77-86 & §191-200
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures to trip open (default: 3). */
  readonly failureThreshold?: number;
  /** Cooldown duration in milliseconds before testing recovery (default: 30,000ms). */
  readonly resetTimeoutMs?: number;
}

export class VectorCircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = Math.max(1, options.failureThreshold ?? 3);
    this.resetTimeoutMs = Math.max(100, options.resetTimeoutMs ?? 30_000);
  }

  public getState(): CircuitBreakerState {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  public isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public trip(): void {
    this.state = 'OPEN';
    this.failureCount = this.failureThreshold;
    this.lastFailureTime = Date.now();
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

/** Default singleton instance shared across search orchestration calls. */
export const defaultVectorCircuitBreaker = new VectorCircuitBreaker();
