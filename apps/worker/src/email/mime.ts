/**
 * apps/worker/src/email/mime.ts
 *
 * Compose an RFC 5322 / MIME multipart/alternative message. Shared by the SMTP
 * transport and the sink, so what is written to `./.mail` is byte-for-byte the
 * shape SMTP would send (minus dot-stuffing, which is a transport concern).
 *
 * No dependency: base64 is `Buffer`, and the one header that needs RFC 2047
 * encoding gets it here.
 *
 * Header injection is impossible by construction: every header value is
 * re-checked for CR/LF, and the address and subject were already validated by
 * `assertSendable`.
 */
import { EmailValidationError } from './port.js';

export interface MimeMessageInput {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  /** Bare hex, no angle brackets. */
  readonly messageId: string;
  readonly date: Date;
}

export interface ComposedMime {
  readonly messageId: string;
  readonly boundary: string;
  readonly headers: readonly (readonly [string, string])[];
  /** Header block + CRLF + body, ready for DATA or for an .eml file. */
  readonly raw: string;
}

/** RFC 2047 B-encoding for a header containing anything outside printable ASCII. */
function encodeHeaderValue(value: string): string {
  if (!/[^\x20-\x7e]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function assertHeaderSafe(name: string, value: string): void {
  // eslint-disable-next-line no-control-regex -- matching CR/LF/NUL is the point
  if (/[\r\n\u0000]/.test(value)) {
    throw new EmailValidationError(`${name} contains a header separator`);
  }
}

/** Fold CRLF: a MIME body is CRLF-terminated, whatever the platform. */
function toCrlf(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
}

export function composeMimeMessage(input: MimeMessageInput): ComposedMime {
  const boundary = `maihan-${input.messageId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const headers: Array<readonly [string, string]> = [
    ['From', input.from],
    ['To', input.to],
    ['Subject', encodeHeaderValue(input.subject)],
    ['Date', input.date.toUTCString()],
    ['Message-ID', `<${input.messageId}>`],
    ['MIME-Version', '1.0'],
    ['Content-Type', `multipart/alternative; boundary="${boundary}"`],
  ];

  for (const [name, value] of headers) {
    assertHeaderSafe(name, value);
    if (value.trim().length === 0) {
      throw new EmailValidationError(`${name} must not be empty`);
    }
  }

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    toCrlf(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    toCrlf(input.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const raw = `${headers.map(([name, value]) => `${name}: ${value}`).join('\r\n')}\r\n\r\n${body}`;
  return { messageId: input.messageId, boundary, headers, raw };
}

/**
 * SMTP DATA requires every line beginning with `.` to be doubled, and the
 * message to end with a lone `.` line. Doing this in the transport keeps the
 * composed message faithful for the sink.
 */
export function dotStuff(message: string): string {
  return message.replace(/(^|\r\n)\./g, '$1..');
}
