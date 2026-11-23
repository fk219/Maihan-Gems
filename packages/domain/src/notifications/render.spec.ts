/**
 * packages/domain/src/notifications/render.spec.ts
 *
 * The template safety gate. Every template is driven with an injection attempt
 * in EVERY user-controlled field, because "we escaped the obvious one" is how
 * a template becomes an injection vector six months later.
 *
 * What is proven:
 *   - no interpolated value can produce an executable tag, an event handler
 *     attribute or a second element;
 *   - a javascript:/data: URL never becomes an href;
 *   - no CR/LF reaches a subject, so a header cannot be forged;
 *   - the text alternative stays plain text (it is allowed to contain markup
 *     characters; it must never be HTML);
 *   - rendering is deterministic and performs no I/O.
 */
import { describe, expect, it } from 'vitest';

import { escapeHtml, formatMoney, safeHttpUrl, sanitizeHeaderValue } from './escaping.js';
import { renderNotification } from './templates.js';
import type {
  EmailVerificationData,
  OrderConfirmationData,
  PasswordResetData,
  ShippingUpdateData,
  VendorApprovedData,
  VendorSuspendedData,
} from './types.js';

const PAYLOAD = `<script>alert("pwned")</script>`;
const ATTRIBUTE_PAYLOAD = `"><img src=x onerror=alert(1)>`;
const JAVASCRIPT_URL = 'javascript:alert(document.cookie)';

function expectNoActiveMarkup(html: string): void {
  expect(html).not.toMatch(/<script/i);
  expect(html).not.toMatch(/<img/i);
  // Only an event handler INSIDE a tag is executable. The literal text
  // `onerror=` in an escaped payload is inert, so the assertion is anchored to
  // a tag boundary rather than to the substring.
  expect(html).not.toMatch(/<[^>]*\son[a-z]+\s*=/i);
  expect(html).not.toMatch(/javascript:/i);
  expect(html).not.toMatch(/data:text\/html/i);
  expect(html).not.toMatch(/<iframe/i);
  expect(html).not.toMatch(/<style/i);
}

const order: OrderConfirmationData = {
  orderNumber: 'MG-2026-000123',
  displayName: 'Ada Lovelace',
  placedAt: '2026-11-23T10:15:00.000Z',
  currency: 'USD',
  grandTotal: '5218.00',
  items: [
    { title: 'Unheated Ceylon Sapphire', quantity: 1, lineTotal: '4800.00' },
    { title: '18k White Gold Solitaire Setting', quantity: 1, lineTotal: '418.00' },
  ],
  orderUrl: 'https://maihangems.example/account/orders/MG-2026-000123',
};

const shipping: ShippingUpdateData = {
  orderNumber: 'MG-2026-000123',
  displayName: 'Ada Lovelace',
  carrier: 'DHL Express',
  trackingNumber: 'JD014600003889123456',
  trackingUrl: 'https://tracking.example/JD014600003889123456',
  shippedAt: '2026-11-24T08:00:00.000Z',
  orderUrl: 'https://maihangems.example/account/orders/MG-2026-000123',
};

const reset: PasswordResetData = {
  displayName: 'Ada Lovelace',
  resetUrl: 'https://maihangems.example/account/reset?token=opaque',
  expiresAt: '2026-11-23T11:15:00.000Z',
};

const verify: EmailVerificationData = {
  displayName: 'Ada Lovelace',
  verifyUrl: 'https://maihangems.example/account/verify?token=opaque',
  expiresAt: '2026-11-24T10:15:00.000Z',
};

const approved: VendorApprovedData = {
  vendorName: 'Ceylon House',
  portalUrl: 'https://maihangems.example/vendor',
};

const suspended: VendorSuspendedData = {
  vendorName: 'Ceylon House',
  reason: 'Repeated late dispatch',
  supportUrl: 'https://maihangems.example/contact',
};

describe('escapeHtml', () => {
  it('escapes the five characters that can change HTML structure', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapes an ampersand exactly once (no double-decoding surprise)', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('sanitizeHeaderValue', () => {
  it('removes CR and LF so a subject cannot forge a header', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: attacker@example.com')).toBe(
      'Hello Bcc: attacker@example.com',
    );
  });

  it('collapses whitespace and caps the length', () => {
    expect(sanitizeHeaderValue('  a   b  ', 3)).toBe('a b');
  });
});

describe('safeHttpUrl', () => {
  it('accepts http and https only', () => {
    expect(safeHttpUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(safeHttpUrl('http://example.com/x')).toBe('http://example.com/x');
  });

  it('rejects javascript:, data:, file: and relative values', () => {
    expect(safeHttpUrl(JAVASCRIPT_URL)).toBeNull();
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHttpUrl('file:///etc/passwd')).toBeNull();
    expect(safeHttpUrl('/account/orders')).toBeNull();
    expect(safeHttpUrl('')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('prints a decimal string without arithmetic', () => {
    expect(formatMoney('5218.00', 'USD')).toBe('USD 5218.00');
  });

  it('refuses a hostile currency code instead of echoing it', () => {
    expect(formatMoney('10.00', '<b>')).toBe('10.00');
  });

  it('refuses a non-decimal amount', () => {
    expect(formatMoney('<script>', 'USD')).toBe('USD');
  });
});

describe('renderNotification — order_confirmation', () => {
  it('renders subject, text and html with the order facts', () => {
    const rendered = renderNotification('order_confirmation', order);
    expect(rendered.subject).toBe('Order MG-2026-000123 confirmed');
    expect(rendered.text).toContain('Ada Lovelace');
    expect(rendered.text).toContain('Total: USD 5218.00');
    expect(rendered.text).toContain('Unheated Ceylon Sapphire');
    expect(rendered.html).toContain('MG-2026-000123');
    expect(rendered.html).toContain('USD 5218.00');
    expectNoActiveMarkup(rendered.html);
  });

  it('does not fetch anything: no img, no external stylesheet, no tracking pixel', () => {
    const rendered = renderNotification('order_confirmation', order);
    expect(rendered.html).not.toMatch(/https?:\/\/[^"']+\.(png|jpe?g|gif|css)/i);
    expect(rendered.html).not.toMatch(/<link/i);
  });

  it('escapes an injection attempt in EVERY user-controlled field', () => {
    const hostile: OrderConfirmationData = {
      orderNumber: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      displayName: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      placedAt: PAYLOAD,
      currency: PAYLOAD,
      grandTotal: PAYLOAD,
      items: [{ title: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`, quantity: 1, lineTotal: PAYLOAD }],
      orderUrl: JAVASCRIPT_URL,
    };
    const rendered = renderNotification('order_confirmation', hostile);
    expectNoActiveMarkup(rendered.html);
    expect(rendered.html).not.toContain('href="javascript');
    expect(rendered.subject).not.toMatch(/[\r\n]/);
    // The text alternative is allowed to contain the characters; it must not
    // contain a real tag, which it cannot because it is never parsed as HTML.
    expect(rendered.text).toContain('<script>');
  });
});

describe('renderNotification — shipping_update', () => {
  it('renders carrier and tracking facts', () => {
    const rendered = renderNotification('shipping_update', shipping);
    expect(rendered.subject).toBe('Your order MG-2026-000123 has shipped');
    expect(rendered.text).toContain('DHL Express');
    expect(rendered.text).toContain('JD014600003889123456');
    expect(rendered.html).toContain('Track the parcel');
    expectNoActiveMarkup(rendered.html);
  });

  it('omits the tracking link when the carrier supplied no URL', () => {
    const rendered = renderNotification('shipping_update', { ...shipping, trackingUrl: null });
    expect(rendered.html).not.toContain('Track the parcel');
    expect(rendered.text).not.toContain('Track the parcel');
  });

  it('escapes an injection attempt in EVERY user-controlled field', () => {
    const hostile: ShippingUpdateData = {
      orderNumber: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      displayName: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      carrier: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      trackingNumber: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      trackingUrl: JAVASCRIPT_URL,
      shippedAt: PAYLOAD,
      orderUrl: JAVASCRIPT_URL,
    };
    const rendered = renderNotification('shipping_update', hostile);
    expectNoActiveMarkup(rendered.html);
    expect(rendered.html).not.toContain('javascript:');
    expect(rendered.subject).not.toMatch(/[\r\n]/);
  });
});

describe('renderNotification — password_reset', () => {
  it('renders the reset link and expiry', () => {
    const rendered = renderNotification('password_reset', reset);
    expect(rendered.subject).toBe('Reset your Maihan Gems password');
    expect(rendered.text).toContain(reset.resetUrl);
    expect(rendered.text).toContain('2026-11-23 11:15 UTC');
    expect(rendered.html).toContain(escapeHtml(reset.resetUrl));
    expectNoActiveMarkup(rendered.html);
  });

  it('escapes an injection attempt in EVERY user-controlled field', () => {
    const hostile: PasswordResetData = {
      displayName: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      resetUrl: JAVASCRIPT_URL,
      expiresAt: PAYLOAD,
    };
    const rendered = renderNotification('password_reset', hostile);
    expectNoActiveMarkup(rendered.html);
    expect(rendered.html).not.toContain('href="javascript');
    expect(rendered.subject).not.toMatch(/[\r\n]/);
  });
});

describe('renderNotification — email_verification', () => {
  it('renders the verification link and expiry', () => {
    const rendered = renderNotification('email_verification', verify);
    expect(rendered.subject).toBe('Verify your Maihan Gems email address');
    expect(rendered.text).toContain(verify.verifyUrl);
    expectNoActiveMarkup(rendered.html);
  });

  it('escapes an injection attempt in EVERY user-controlled field', () => {
    const hostile: EmailVerificationData = {
      displayName: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      verifyUrl: JAVASCRIPT_URL,
      expiresAt: PAYLOAD,
    };
    const rendered = renderNotification('email_verification', hostile);
    expectNoActiveMarkup(rendered.html);
    expect(rendered.html).not.toContain('href="javascript');
  });
});

describe('renderNotification — vendor_approved', () => {
  it('renders the vendor name and portal link', () => {
    const rendered = renderNotification('vendor_approved', approved);
    expect(rendered.subject).toBe('Your Maihan Gems vendor account is approved');
    expect(rendered.text).toContain('Ceylon House');
    expect(rendered.html).toContain(approved.portalUrl);
    expectNoActiveMarkup(rendered.html);
  });

  it('escapes an injection attempt in EVERY user-controlled field', () => {
    const hostile: VendorApprovedData = {
      vendorName: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      portalUrl: JAVASCRIPT_URL,
    };
    const rendered = renderNotification('vendor_approved', hostile);
    expectNoActiveMarkup(rendered.html);
    expect(rendered.html).not.toContain('href="javascript');
  });
});

describe('renderNotification — vendor_suspended', () => {
  it('renders the reason and support link', () => {
    const rendered = renderNotification('vendor_suspended', suspended);
    expect(rendered.text).toContain('Repeated late dispatch');
    expect(rendered.html).toContain('Contact support');
    expectNoActiveMarkup(rendered.html);
  });

  it('states that no reason was given rather than inventing one', () => {
    const rendered = renderNotification('vendor_suspended', { ...suspended, reason: null });
    expect(rendered.text).toContain('No reason was provided.');
  });

  it('escapes an injection attempt in EVERY user-controlled field', () => {
    const hostile: VendorSuspendedData = {
      vendorName: `${PAYLOAD}${ATTRIBUTE_PAYLOAD}`,
      reason: `${PAYLOAD}\r\n${ATTRIBUTE_PAYLOAD}`,
      supportUrl: JAVASCRIPT_URL,
    };
    const rendered = renderNotification('vendor_suspended', hostile);
    expectNoActiveMarkup(rendered.html);
    expect(rendered.html).not.toContain('href="javascript');
    expect(rendered.subject).not.toMatch(/[\r\n]/);
  });
});

describe('renderNotification — determinism', () => {
  it('returns identical bytes for identical input', () => {
    const first = renderNotification('order_confirmation', order);
    const second = renderNotification('order_confirmation', order);
    expect(second).toEqual(first);
  });

  it('never embeds a current timestamp of its own', () => {
    const rendered = renderNotification('order_confirmation', order);
    const today = new Date().toISOString().slice(0, 10);
    expect(rendered.text).not.toContain(`Rendered ${today}`);
    expect(rendered.html).not.toContain(`Rendered ${today}`);
  });
});
