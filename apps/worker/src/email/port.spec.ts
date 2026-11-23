/**
 * apps/worker/src/email/port.spec.ts
 *
 * The port's pre-transport guarantees, independent of any transport:
 *   - a message with an injected header, an empty subject or no body is
 *     refused before a transport is chosen;
 *   - `none` fails closed instead of pretending to send;
 *   - `createEmailPort` selects exactly the configured transport.
 */
import { describe, expect, it } from 'vitest';

import { createEmailPort } from './index.js';
import {
  EmailValidationError,
  NoneEmailTransport,
  assertSendable,
  type EmailMessage,
} from './port.js';
import { SinkEmailTransport } from './sink-transport.js';
import { SmtpTransport } from './smtp-transport.js';

const VALID: EmailMessage = {
  to: 'ada@example.com',
  subject: 'Order MG-2026-000123 confirmed',
  text: 'Thank you.',
  html: '<p>Thank you.</p>',
};

describe('assertSendable', () => {
  it('accepts a well-formed message', () => {
    expect(() => assertSendable(VALID)).not.toThrow();
  });

  it('rejects CR/LF in the subject', () => {
    expect(() => assertSendable({ ...VALID, subject: 'Hi\r\nBcc: x@example.com' })).toThrow(
      EmailValidationError,
    );
  });

  it('rejects CR/LF in the recipient', () => {
    expect(() => assertSendable({ ...VALID, to: 'ada@example.com\r\nBcc: x@example.com' })).toThrow(
      EmailValidationError,
    );
  });

  it('rejects a display-name recipient form', () => {
    expect(() => assertSendable({ ...VALID, to: 'Ada <ada@example.com>' })).toThrow(
      EmailValidationError,
    );
  });

  it('rejects an empty subject', () => {
    expect(() => assertSendable({ ...VALID, subject: '   ' })).toThrow(EmailValidationError);
  });

  it('rejects a message with no body', () => {
    expect(() => assertSendable({ ...VALID, text: ' ', html: ' ' })).toThrow(EmailValidationError);
  });
});

describe('NoneEmailTransport', () => {
  it('fails closed rather than dropping the message', async () => {
    const transport = new NoneEmailTransport();
    expect(transport.transport).toBe('none');
    await expect(transport.send(VALID)).rejects.toThrow(/no email transport is configured/);
  });
});

describe('createEmailPort', () => {
  it('selects the sink by default configuration', () => {
    const port = createEmailPort({
      transport: 'sink',
      from: 'no-reply@maihan-gems.invalid',
      capacity: 10,
      mailboxDir: '.mail',
      writeToDisk: false,
    });
    expect(port).toBeInstanceOf(SinkEmailTransport);
    expect(port.transport).toBe('sink');
  });

  it('selects none without requiring a sender address', () => {
    const port = createEmailPort({ transport: 'none' });
    expect(port).toBeInstanceOf(NoneEmailTransport);
  });

  it('constructs an SMTP transport without connecting', () => {
    const port = createEmailPort({
      transport: 'smtp',
      from: 'no-reply@maihan-gems.invalid',
      host: 'smtp.example.com',
      port: 587,
      security: 'starttls',
      user: null,
      pass: null,
      allowInsecure: false,
      timeoutMs: 5_000,
    });
    expect(port).toBeInstanceOf(SmtpTransport);
  });
});
