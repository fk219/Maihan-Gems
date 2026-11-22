import { describe, expect, it } from 'vitest';

import { readAuthErrorMessage } from './auth-client.js';

/**
 * The forms show the server's message, never a guessed one. The reader must
 * therefore prefer the field-level detail (the rule the customer can fix) over
 * the generic envelope text, and must always answer with a string.
 */
describe('readAuthErrorMessage', () => {
  it('prefers the first field-level detail over the generic top-level message', () => {
    const body = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed.',
        details: [{ path: 'password', code: 'too_small', message: 'Password must be at least 12 characters long.' }],
      },
    };
    expect(readAuthErrorMessage(body, 'fallback')).toBe(
      'Password must be at least 12 characters long.',
    );
  });

  it('falls back to the envelope message when there are no details', () => {
    const body = { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } };
    expect(readAuthErrorMessage(body, 'fallback')).toBe('Invalid email or password.');
  });

  it('never returns an empty or non-string message', () => {
    expect(readAuthErrorMessage({ error: { message: '   ' } }, 'fallback')).toBe('fallback');
    expect(readAuthErrorMessage({ error: { details: [{ message: 42 }] } }, 'fallback')).toBe(
      'fallback',
    );
    expect(readAuthErrorMessage({ error: null }, 'fallback')).toBe('fallback');
  });

  it('survives a body that is not an envelope at all', () => {
    expect(readAuthErrorMessage(null, 'fallback')).toBe('fallback');
    expect(readAuthErrorMessage('nope', 'fallback')).toBe('fallback');
    expect(readAuthErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
