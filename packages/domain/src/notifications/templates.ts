/**
 * packages/domain/src/notifications/templates.ts
 *
 * BUILD_BACKLOG Track B4 — the six transactional email templates, rendered by
 * pure functions.
 *
 * Rules this file obeys and the tests enforce:
 *   - No I/O, no clock, no environment, no secrets. Every input is an argument.
 *   - Every interpolated value is sanitised and, for HTML, escaped.
 *   - The subject is single-line plain text; CR/LF can never reach a header.
 *   - Only absolute http(s) URLs become links. No images, no tracking pixels,
 *     no remote CSS: an email must not phone home.
 *   - No amount is computed here. Money arrives as a decimal string and is
 *     printed as one (technical_design/26 §4).
 *
 * Adding a kind means adding it to NOTIFICATION_KINDS, NotificationDataMap,
 * this file's switch and its tests; the exhaustive switch fails the build if
 * one is missed.
 */
import {
  escapeHtml,
  formatIsoDate,
  formatIsoDateTime,
  formatMoney,
  safeHttpUrl,
  sanitizeHeaderValue,
  sanitizeTextValue,
} from './escaping.js';
import type {
  EmailVerificationData,
  NotificationDataFor,
  NotificationKind,
  NotificationOrderLine,
  OrderConfirmationData,
  PasswordResetData,
  RenderedNotification,
  ShippingUpdateData,
  VendorApprovedData,
  VendorSuspendedData,
} from './types.js';

const BODY_STYLE = 'margin:0;padding:24px;background:#f7f7f5;font-family:Georgia,serif;color:#1d1d1b;';
const CARD_STYLE = 'max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border:1px solid #e6e4df;';
const WORDMARK_STYLE = 'margin:0 0 24px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#6b6659;';
const HEADING_STYLE = 'margin:0 0 16px;font-size:24px;font-weight:400;line-height:1.25;';
const PARAGRAPH_STYLE = 'margin:0 0 16px;font-size:16px;line-height:1.6;';
const MUTED_STYLE = 'margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b6659;';
const BUTTON_STYLE =
  'display:inline-block;padding:12px 20px;border:1px solid #1d1d1b;color:#1d1d1b;text-decoration:none;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;';

function htmlDocument(subject: string, bodyHtml: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(subject)}</title>`,
    '</head>',
    `<body style="${BODY_STYLE}">`,
    `<div style="${CARD_STYLE}">`,
    `<p style="${WORDMARK_STYLE}">Maihan Gems</p>`,
    bodyHtml,
    '<hr style="border:none;border-top:1px solid #e6e4df;margin:28px 0 16px;">',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#6b6659;">',
    'This message was sent because of an activity on a Maihan Gems account or order.',
    '</p>',
    '</div>',
    '</body>',
    '</html>',
  ].join('\n');
}

/** A paragraph whose newlines survive in HTML without becoming markup. */
function htmlParagraph(value: string, style = PARAGRAPH_STYLE): string {
  return `<p style="${style}">${escapeHtml(sanitizeTextValue(value))}</p>`;
}

/** Render a link only when the URL survives the http(s) check. */
function htmlLink(url: string, label: string): string {
  const safe = safeHttpUrl(url);
  if (safe === null) return '';
  return `<a href="${escapeHtml(safe)}" style="${BUTTON_STYLE}">${escapeHtml(label)}</a>`;
}

function textLink(url: string, label: string): string {
  const safe = safeHttpUrl(url);
  if (safe === null) return '';
  return `${label}: ${safe}`;
}

/** Join text lines and collapse runs of blank lines into a single blank line. */
function composeText(lines: readonly string[]): string {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function greeting(displayName: string | null): string {
  const name = displayName === null ? '' : sanitizeHeaderValue(displayName, 120);
  return name.length === 0 ? 'Hello,' : `Hello ${name},`;
}

function htmlGreeting(displayName: string | null): string {
  const name = displayName === null ? '' : sanitizeHeaderValue(displayName, 120);
  return name.length === 0 ? 'Hello,' : `Hello ${escapeHtml(name)},`;
}

function orderLineText(line: NotificationOrderLine, currency: string): string {
  const title = sanitizeHeaderValue(line.title, 160);
  const quantity = Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 1;
  return `  - ${quantity} x ${title} - ${formatMoney(line.lineTotal, currency)}`;
}

function orderLineHtml(line: NotificationOrderLine, currency: string): string {
  const title = escapeHtml(sanitizeHeaderValue(line.title, 160));
  const quantity = Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 1;
  return `<li style="margin:0 0 8px;">${quantity} &times; ${title} &mdash; ${escapeHtml(
    formatMoney(line.lineTotal, currency),
  )}</li>`;
}

function renderOrderConfirmation(data: OrderConfirmationData): RenderedNotification {
  const orderNumber = sanitizeHeaderValue(data.orderNumber, 64);
  const subject = sanitizeHeaderValue(`Order ${orderNumber} confirmed`);
  const placedAt = formatIsoDate(data.placedAt);
  const total = formatMoney(data.grandTotal, data.currency);
  const items = data.items;

  const text = composeText([
    greeting(data.displayName),
    '',
    'Thank you for your order. We are preparing it now.',
    '',
    `Order: ${orderNumber}`,
    `Placed: ${placedAt}`,
    items.length === 0 ? '' : 'Items:',
    ...items.map((line) => orderLineText(line, data.currency)),
    '',
    `Total: ${total}`,
    '',
    textLink(data.orderUrl, 'View your order'),
    '',
    'Maihan Gems',
  ]);

  const itemsHtml =
    items.length === 0
      ? ''
      : `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6;">${items
          .map((line) => orderLineHtml(line, data.currency))
          .join('')}</ul>`;

  const html = htmlDocument(
    subject,
    [
      `<h1 style="${HEADING_STYLE}">${htmlGreeting(data.displayName)}</h1>`,
      htmlParagraph('Thank you for your order. We are preparing it now.'),
      htmlParagraph(`Order: ${orderNumber}`, PARAGRAPH_STYLE),
      htmlParagraph(`Placed: ${placedAt}`, PARAGRAPH_STYLE),
      itemsHtml,
      htmlParagraph(`Total: ${total}`, 'margin:0 0 24px;font-size:18px;line-height:1.4;'),
      htmlLink(data.orderUrl, 'View your order'),
    ].join('\n'),
  );

  return { subject, text, html };
}

function renderShippingUpdate(data: ShippingUpdateData): RenderedNotification {
  const orderNumber = sanitizeHeaderValue(data.orderNumber, 64);
  const carrier = sanitizeHeaderValue(data.carrier, 80);
  const trackingNumber = sanitizeHeaderValue(data.trackingNumber, 120);
  const subject = sanitizeHeaderValue(`Your order ${orderNumber} has shipped`);
  const shippedAt = formatIsoDate(data.shippedAt);
  const trackingLink = data.trackingUrl === null ? '' : textLink(data.trackingUrl, 'Track the parcel');

  const text = composeText([
    greeting(data.displayName),
    '',
    'Your order has left our workshop.',
    '',
    `Order: ${orderNumber}`,
    `Carrier: ${carrier}`,
    `Tracking number: ${trackingNumber}`,
    `Shipped: ${shippedAt}`,
    trackingLink,
    '',
    textLink(data.orderUrl, 'View your order'),
    '',
    'Maihan Gems',
  ]);

  const html = htmlDocument(
    subject,
    [
      `<h1 style="${HEADING_STYLE}">${htmlGreeting(data.displayName)}</h1>`,
      htmlParagraph('Your order has left our workshop.'),
      htmlParagraph(`Order: ${orderNumber}`),
      htmlParagraph(`Carrier: ${carrier}`),
      htmlParagraph(`Tracking number: ${trackingNumber}`),
      htmlParagraph(`Shipped: ${shippedAt}`),
      data.trackingUrl === null ? '' : htmlLink(data.trackingUrl, 'Track the parcel'),
      '<div style="height:12px;"></div>',
      htmlLink(data.orderUrl, 'View your order'),
    ].join('\n'),
  );

  return { subject, text, html };
}

function renderPasswordReset(data: PasswordResetData): RenderedNotification {
  const subject = 'Reset your Maihan Gems password';
  const expires = formatIsoDateTime(data.expiresAt);

  const text = composeText([
    greeting(data.displayName),
    '',
    'Someone asked to reset the password for this address. If that was you, use the link below.',
    '',
    textLink(data.resetUrl, 'Reset your password'),
    '',
    `The link expires ${expires}.`,
    '',
    'If you did not ask for this, no action is needed and your password has not changed.',
    '',
    'Maihan Gems',
  ]);

  const html = htmlDocument(
    subject,
    [
      `<h1 style="${HEADING_STYLE}">${htmlGreeting(data.displayName)}</h1>`,
      htmlParagraph(
        'Someone asked to reset the password for this address. If that was you, use the button below.',
      ),
      htmlLink(data.resetUrl, 'Reset your password'),
      '<div style="height:16px;"></div>',
      htmlParagraph(`The link expires ${expires}.`, MUTED_STYLE),
      htmlParagraph(
        'If you did not ask for this, no action is needed and your password has not changed.',
        MUTED_STYLE,
      ),
    ].join('\n'),
  );

  return { subject, text, html };
}

function renderEmailVerification(data: EmailVerificationData): RenderedNotification {
  const subject = 'Verify your Maihan Gems email address';
  const expires = formatIsoDateTime(data.expiresAt);

  const text = composeText([
    greeting(data.displayName),
    '',
    'Confirm this address so we can send order updates and keep your account secure.',
    '',
    textLink(data.verifyUrl, 'Verify your email address'),
    '',
    `The link expires ${expires}.`,
    '',
    'If you did not create a Maihan Gems account, you can ignore this message.',
    '',
    'Maihan Gems',
  ]);

  const html = htmlDocument(
    subject,
    [
      `<h1 style="${HEADING_STYLE}">${htmlGreeting(data.displayName)}</h1>`,
      htmlParagraph(
        'Confirm this address so we can send order updates and keep your account secure.',
      ),
      htmlLink(data.verifyUrl, 'Verify your email address'),
      '<div style="height:16px;"></div>',
      htmlParagraph(`The link expires ${expires}.`, MUTED_STYLE),
      htmlParagraph(
        'If you did not create a Maihan Gems account, you can ignore this message.',
        MUTED_STYLE,
      ),
    ].join('\n'),
  );

  return { subject, text, html };
}

function renderVendorApproved(data: VendorApprovedData): RenderedNotification {
  const vendorName = sanitizeHeaderValue(data.vendorName, 120);
  const subject = 'Your Maihan Gems vendor account is approved';

  const text = [
    `Hello ${vendorName},`,
    '',
    'Your vendor account has been approved. You can now list stock in the vendor portal.',
    '',
    textLink(data.portalUrl, 'Open the vendor portal'),
    '',
    'Maihan Gems',
  ].join('\n');

  const html = htmlDocument(
    subject,
    [
      `<h1 style="${HEADING_STYLE}">Hello ${escapeHtml(vendorName)},</h1>`,
      htmlParagraph('Your vendor account has been approved. You can now list stock in the vendor portal.'),
      htmlLink(data.portalUrl, 'Open the vendor portal'),
    ].join('\n'),
  );

  return { subject, text, html };
}

function renderVendorSuspended(data: VendorSuspendedData): RenderedNotification {
  const vendorName = sanitizeHeaderValue(data.vendorName, 120);
  const subject = 'Your Maihan Gems vendor account is suspended';
  const reason = data.reason === null ? null : sanitizeTextValue(data.reason, 500);

  const text = [
    `Hello ${vendorName},`,
    '',
    'Your vendor account has been suspended. Stock remains on record but cannot be sold while the account is suspended.',
    '',
    reason === null || reason.length === 0 ? 'No reason was provided.' : `Reason: ${reason}`,
    '',
    textLink(data.supportUrl, 'Contact support'),
    '',
    'Maihan Gems',
  ].join('\n');

  const html = htmlDocument(
    subject,
    [
      `<h1 style="${HEADING_STYLE}">Hello ${escapeHtml(vendorName)},</h1>`,
      htmlParagraph(
        'Your vendor account has been suspended. Stock remains on record but cannot be sold while the account is suspended.',
      ),
      htmlParagraph(
        reason === null || reason.length === 0 ? 'No reason was provided.' : `Reason: ${reason}`,
      ),
      htmlLink(data.supportUrl, 'Contact support'),
    ].join('\n'),
  );

  return { subject, text, html };
}

function assertNever(value: never): never {
  throw new Error(`NOTIFICATION: unhandled kind ${String(value)}`);
}

/**
 * Render one notification. Pure: the same inputs always produce the same
 * bytes, on any host, at any time.
 */
export function renderNotification<K extends NotificationKind>(
  kind: K,
  data: NotificationDataFor<K>,
): RenderedNotification {
  // TypeScript cannot narrow a generic parameter through a switch, so each
  // arm narrows explicitly. The exhaustiveness guard below makes a new kind a
  // compile error rather than a silent empty email.
  switch (kind) {
    case 'order_confirmation':
      return renderOrderConfirmation(data as OrderConfirmationData);
    case 'shipping_update':
      return renderShippingUpdate(data as ShippingUpdateData);
    case 'password_reset':
      return renderPasswordReset(data as PasswordResetData);
    case 'email_verification':
      return renderEmailVerification(data as EmailVerificationData);
    case 'vendor_approved':
      return renderVendorApproved(data as VendorApprovedData);
    case 'vendor_suspended':
      return renderVendorSuspended(data as VendorSuspendedData);
    default:
      return assertNever(kind as never);
  }
}
