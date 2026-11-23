/**
 * apps/worker/src/email/port.ts
 *
 * The EmailPort: the only way rendered mail leaves this process.
 *
 * The port exists so the delivery mechanism is a decision, not a dependency.
 * `sink` is the default (nothing leaves the machine), `smtp` is a protocol
 * implementation with no vendor, and `none` fails closed rather than dropping
 * a message on the floor. A provider adapter, when the client chooses one,
 * implements this same interface and changes nothing else.
 *
 * Security rules enforced HERE, before any transport sees a message:
 *   - `to` and `subject` may not contain CR or LF (header injection);
 *   - `to` must look like a bare address, not a display-name form that could
 *     smuggle a second recipient;
 *   - a message must carry a subject and at least one body.
 *
 * The port never logs. A caller logs the kind, the transport and the message
 * id — never the address, the subject or the body.
 */

export type EmailTransportName = 'none' | 'sink' | 'smtp';

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface EmailSendReceipt {
  readonly messageId: string;
  readonly transport: Exclude<EmailTransportName, 'none'>;
}

export interface EmailPort {
  readonly transport: EmailTransportName;
  send(message: EmailMessage): Promise<EmailSendReceipt>;
}

export class EmailConfigError extends Error {
  constructor(variable: string, reason: string) {
    super(`[EMAIL] ${variable}: ${reason}`);
    this.name = 'EmailConfigError';
  }
}

export class EmailValidationError extends Error {
  constructor(reason: string) {
    super(`[EMAIL] refused: ${reason}`);
    this.name = 'EmailValidationError';
  }
}

export class EmailDeliveryError extends Error {
  constructor(
    reason: string,
    readonly code?: number,
  ) {
    super(`[EMAIL] delivery failed: ${reason}`);
    this.name = 'EmailDeliveryError';
  }
}

/** A bare address: no display name, no angle brackets, no control characters. */
export const BARE_EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function assertBareEmailAddress(value: string, field: string): string {
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 320) {
    throw new EmailValidationError(`${field} must be 1..320 characters`);
  }
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (/[\r\n\u0000-\u001f\u007f]/.test(candidate)) {
    throw new EmailValidationError(`${field} contains a control character`);
  }
  if (!BARE_EMAIL_PATTERN.test(candidate)) {
    throw new EmailValidationError(`${field} must be a bare email address`);
  }
  return candidate;
}

/**
 * Validate a message before it reaches a transport. Throws
 * `EmailValidationError`; nothing is logged and nothing is truncated silently.
 */
export function assertSendable(message: EmailMessage): void {
  assertBareEmailAddress(message.to, 'to');

  if (message.subject.trim().length === 0) {
    throw new EmailValidationError('subject must not be empty');
  }
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (/[\r\n\u0000-\u001f\u007f]/.test(message.subject)) {
    throw new EmailValidationError('subject contains a control character');
  }
  if (message.subject.length > 200) {
    throw new EmailValidationError('subject is longer than 200 characters');
  }
  if (message.text.trim().length === 0 && message.html.trim().length === 0) {
    throw new EmailValidationError('message has no body');
  }
}

/**
 * A transport that cannot send. Selected by `EMAIL_TRANSPORT=none` so a
 * misconfigured deployment fails loudly at the first order rather than
 * appearing to work while dropping mail.
 */
export class NoneEmailTransport implements EmailPort {
  readonly transport = 'none' as const;

  async send(_message: EmailMessage): Promise<EmailSendReceipt> {
    throw new EmailDeliveryError('no email transport is configured (EMAIL_TRANSPORT=none)');
  }
}
