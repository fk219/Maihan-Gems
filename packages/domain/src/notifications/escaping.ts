/**
 * packages/domain/src/notifications/escaping.ts
 *
 * The escaping primitives every template is required to use.
 *
 * Two threats are handled here, and both are tested:
 *
 *   1. HTML injection. Every interpolated value passes through `escapeHtml`.
 *      A customer note, a vendor name or a carrier string is untrusted input
 *      even when it arrives from our own database, because it originated with
 *      a person.
 *
 *   2. Header injection. `sanitizeHeaderValue` removes CR, LF and every other
 *      control character, so a value interpolated into a subject cannot forge
 *      a `Bcc:` line. The SMTP transport repeats this check as defence in
 *      depth (technical_design/27 §10: never trust a single layer).
 *
 * A third, narrower guard lives in `safeHttpUrl`: only http(s) survives. A
 * `javascript:` URL in an href is a click-triggered script execution, and a
 * template that renders one has become an injection vector even though every
 * character was "escaped".
 *
 * Pure: no I/O, no clock, no environment.
 */

const HTML_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
});

/** Escape a value for HTML text and for a quoted attribute. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`]/g, (character) => HTML_ENTITIES[character] ?? character);
}

/**
 * A subject is a mail header. CR/LF end the header and start a new one, so
 * they are removed rather than escaped; the rest of the control range goes
 * with them. The cap keeps a hostile 10 MB value out of a header.
 */
export function sanitizeHeaderValue(value: string, maxLength = 200): string {
  return value
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * A body value may legitimately contain newlines (a vendor's suspension
 * reason, for example). Everything else in the C0/C1 control range is
 * stripped: it has no business in an email body and some of it is a terminal
 * escape sequence waiting for a log viewer.
 */
export function sanitizeTextValue(value: string, maxLength = 2000): string {
  return value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .slice(0, maxLength);
}

/**
 * Only an absolute http(s) URL may become an href. Anything else — a
 * `javascript:` payload, a `data:` URI, a relative path that would resolve
 * against the mail client's own origin — is dropped rather than rendered.
 */
export function safeHttpUrl(value: string): string | null {
  const candidate = value.trim();
  if (candidate.length === 0) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * A three-letter ISO-4217 code or nothing. The currency code is interpolated
 * into money strings; refusing anything else means a hostile value can never
 * reach the output at all.
 */
export function safeCurrencyCode(value: string): string | null {
  const candidate = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(candidate) ? candidate : null;
}

/** A decimal money string or nothing. No arithmetic, no rounding, no floats. */
export function safeAmount(value: string): string | null {
  const candidate = value.trim();
  return /^\d{1,15}(?:\.\d{1,2})?$/.test(candidate) ? candidate : null;
}

/**
 * Deterministic date formatting: `YYYY-MM-DD` in UTC. Intl is deliberately
 * avoided — a locale-dependent email is not reproducible, and the domain must
 * not depend on the host's ICU data.
 */
export function formatIsoDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return sanitizeHeaderValue(value, 40);
  return parsed.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD HH:MM UTC`, again deterministic. */
export function formatIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return sanitizeHeaderValue(value, 40);
  const iso = parsed.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** `USD 1234.00`, or the bare amount when the currency code is unusable. */
export function formatMoney(amount: string, currency: string): string {
  const safe = safeAmount(amount);
  const code = safeCurrencyCode(currency);
  if (safe === null) return code === null ? '' : code;
  return code === null ? safe : `${code} ${safe}`;
}
