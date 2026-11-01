/**
 * DB-backed integration checks. Skips cleanly when DATABASE_URL is absent.
 * Every write runs inside a transaction that is rolled back, so the target
 * database is never mutated by the suite.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { hashKey, hashPassword, verifyPassword } from '../auth.js';
import { setupVendorPassword, resolveVendorSession } from '../vendor-auth.js';
import { requestPasswordReset, resetPassword } from '../password-resets.js';
import { createDiscount, updateDiscount, recordRefund, updateOrderStatus } from '../admin.js';
import { cancelOrder, getOrderAuthorized, payOrder, getOrCreateCart, addProductToCart, checkoutCart } from '../commerce.js';
import { expireReservations, cleanupExpired } from '../maintenance.js';
import { verifyCertificate } from '../certificates.js';
import { issueVerification, verifyEmail } from '../email-verification.js';
import { listAddresses, createAddress, setDefaultAddress, deleteAddress } from '../addresses.js';
import { dispatchOutbox } from '../mail.js';
import { checkRateLimitShared } from '../rate-limit.js';
import { catalogueExists, sitemapPage } from '../storefront.js';
import { createLead, unsubscribeLead } from '../admin.js';
import { conciergeQuery } from '../concierge.js';
import { adminTotpSetup, adminTotpEnable, adminLogin, adminVerifyTotp, resolveAdminSession } from '../vendor-auth.js';
import { totpAt } from '../totp.js';

const URL = process.env['DATABASE_URL'];
const describeDb = describe.skipIf(!URL);

if (!URL) {
  describe.skip('database integration (set DATABASE_URL to run)', () => {
    it('skipped', () => undefined);
  });
}

describeDb('fresh schema integration', () => {
  const client = new pg.Client({ connectionString: URL });

  beforeAll(async () => {
    await client.connect();
  });
  afterAll(async () => {
    await client.end();
  });

  async function inRollback(fn: (c: pg.Client) => Promise<void>): Promise<void> {
    await client.query('BEGIN');
    try {
      await fn(client);
    } finally {
      await client.query('ROLLBACK');
    }
  }

  it('has the ordered migration chain and the reference vocabulary', async () => {
    const mig = await client.query<{ n: string }>('SELECT count(*)::text AS n FROM fresh.schema_migrations');
    expect(Number(mig.rows[0]!.n)).toBeGreaterThanOrEqual(14);
    const varieties = await client.query<{ n: string }>('SELECT count(*)::text AS n FROM fresh.gemstone_varieties');
    expect(Number(varieties.rows[0]!.n)).toBe(86);
    const families = await client.query<{ n: string }>('SELECT count(*)::text AS n FROM fresh.gemstone_families');
    expect(Number(families.rows[0]!.n)).toBe(11);
  });

  it('sets a vendor password from the one-time key and issues a session', async () => {
    await inRollback(async (c) => {
      const suffix = String(Math.floor(900 + Math.random() * 99));
      const code = `V-TS-${suffix}`;
      const apiKey = `key-${suffix}`;
      const v = await c.query(
        `INSERT INTO fresh.vendors (code, name, country, status) VALUES ($1,'Integration House','TH','ACTIVE') RETURNING id`,
        [code],
      );
      await c.query(
        `INSERT INTO fresh.vendor_onboarding (vendor_id, legal_name, contact_name, email, country, status, api_key_hash)
         VALUES ($1,'Integration House Co','Tester','integration@test.example','TH','APPROVED',$2)`,
        [v.rows[0]!.id, hashKey(apiKey)],
      );
      const r = await setupVendorPassword(c as never, code, apiKey, 'PartnerPass2026!', null);
      expect(r.vendor.code).toBe(code);
      const me = await resolveVendorSession(c as never, `Bearer ${r.token}`);
      expect(me?.vendorCode).toBe(code);
      await expect(setupVendorPassword(c as never, code, 'wrong-key', 'whatever123', null)).rejects.toThrow();
    });
  });

  it('issues a single-use customer reset token and replaces the password', async () => {
    await inRollback(async (c) => {
      const ins = await c.query(
        `INSERT INTO fresh.customers (email, password_hash) VALUES ('reset-int@test.example', $1) RETURNING id`,
        [hashPassword('OldPassword2026!')],
      );
      const id = Number(ins.rows[0]!.id);
      const asked = await requestPasswordReset(c as never, 'CUSTOMER', 'reset-int@test.example');
      expect(asked.ok).toBe(true);
      expect(asked.token).toBeTruthy();
      await resetPassword(c as never, 'CUSTOMER', asked.token!, 'NewPassword2026!');
      const row = await c.query(`SELECT password_hash FROM fresh.customers WHERE id = $1`, [id]);
      expect(verifyPassword('NewPassword2026!', String(row.rows[0]!.password_hash))).toBe(true);
      await expect(resetPassword(c as never, 'CUSTOMER', asked.token!, 'ThirdPassword2026!')).rejects.toThrow();
    });
  });

  it('creates and pauses a discount code', async () => {
    await inRollback(async (c) => {
      const d = await createDiscount(c as never, { code: 'INTTEST10', kind: 'PERCENT', value: 10 }, 'admin');
      expect(d.code).toBe('INTTEST10');
      const paused = await updateDiscount(c as never, Number(d.id), { active: false }, 'admin');
      expect(paused.active).toBe(false);
      await expect(createDiscount(c as never, { code: 'INTTEST10', kind: 'PERCENT', value: 10 }, 'admin')).rejects.toThrow();
    });
  });

  it('records a refund against a captured payment without over-refunding', async () => {
    await inRollback(async (c) => {
      const number = `MG-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;
      const o = await c.query(
        `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount, discount_amount, grand_total, shipping_address)
         VALUES ($1,'refund-int@test.example','PAID','USD',100,0,0,0,100,'{}'::jsonb) RETURNING id`,
        [number],
      );
      const orderId = Number(o.rows[0]!.id);
      await c.query(
        `INSERT INTO fresh.payments (order_id, provider, provider_ref, state, amount, currency, captured_at)
         VALUES ($1,'test','int-ref','CAPTURED',100,'USD', now())`,
        [orderId],
      );
      const refund = await recordRefund(c as never, number, 25, 'integration test', 'admin');
      expect(refund.state).toBe('PENDING');
      const ev = await c.query(`SELECT count(*)::int AS n FROM fresh.order_events WHERE order_id = $1 AND event = 'REFUND_RECORDED'`, [orderId]);
      expect(ev.rows[0]!.n).toBe(1);
      await expect(recordRefund(c as never, number, 80, 'too much', 'admin')).rejects.toThrow();
    });
  });

  it('gates public order reads on the checkout token or owning email', async () => {
    await inRollback(async (c) => {
      const number = `MG-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;
      await c.query(
        `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount, discount_amount, grand_total, shipping_address, access_token_hash)
         VALUES ($1,'guest-int@test.example','PENDING_PAYMENT','USD',10,0,0,0,10,'{}'::jsonb,$2)`,
        [number, hashKey('order-token-int')],
      );
      const withToken = await getOrderAuthorized(c as never, number, { token: 'order-token-int', customer: null });
      expect(withToken?.order_number).toBe(number);
      const wrongToken = await getOrderAuthorized(c as never, number, { token: 'wrong', customer: null });
      expect(wrongToken).toBeNull();
      const anonymous = await getOrderAuthorized(c as never, number, { customer: null });
      expect(anonymous).toBeNull();
      const owner = await getOrderAuthorized(c as never, number, { customer: { id: 999999, email: 'guest-int@test.example' } });
      expect(owner?.order_number).toBe(number);
    });
  });

  it('stamps delivered_at when the order is marked delivered', async () => {
    await inRollback(async (c) => {
      const number = `MG-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;
      const o = await c.query(
        `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount, discount_amount, grand_total, shipping_address)
         VALUES ($1,'ship-int@test.example','IN_FULFILLMENT','USD',10,0,0,0,10,'{}'::jsonb) RETURNING id`,
        [number],
      );
      const orderId = Number(o.rows[0]!.id);
      await c.query(
        `INSERT INTO fresh.order_fulfillments (order_id, carrier, tracking_number, state, shipped_at)
         VALUES ($1,'DHL','TRACK-1','SHIPPED', now())`,
        [orderId],
      );
      await updateOrderStatus(c as never, number, 'FULFILLED', 'admin');
      await updateOrderStatus(c as never, number, 'DELIVERED', 'admin');
      const f = await c.query(`SELECT state, delivered_at FROM fresh.order_fulfillments WHERE order_id = $1`, [orderId]);
      expect(f.rows[0]!.state).toBe('DELIVERED');
      expect(f.rows[0]!.delivered_at).not.toBeNull();
    });
  });

  it('cancels a paid order, restores the stone and records a pending refund', async () => {
    await inRollback(async (c) => {
      const v = await c.query(`SELECT id FROM fresh.gemstone_varieties LIMIT 1`);
      const suffix = String(Math.floor(100000 + Math.random() * 899999));
      const gem = await c.query(
        `INSERT INTO fresh.gemstones (ref, slug, name, variety_id, kind, pieces, currency, quantity, status, origin_type)
         VALUES ($1,$2,'Cancel Test Stone',$3,'SINGLE',1,'USD',0,'SOLD','NATURAL') RETURNING id`,
        [`G-CAN-TST-HQ-${suffix}`, `cancel-test-${suffix}`, v.rows[0]!.id],
      );
      const gemId = Number(gem.rows[0]!.id);
      const jt = await c.query(`SELECT id FROM fresh.jewellery_types LIMIT 1`);
      const setting = await c.query(`SELECT id FROM fresh.settings LIMIT 1`);
      const product = await c.query(
        `INSERT INTO fresh.products (ref, slug, name, jewellery_type_id, kind, setting_id, gemstone_id, currency, status)
         VALUES ($1,$2,'Cancel Test Piece',$3,'CONFIGURED',$4,$5,'USD','ACTIVE') RETURNING id`,
        [`J-R-TST-HQ-${suffix}`, `cancel-test-piece-${suffix}`, jt.rows[0]!.id, setting.rows[0]!.id, gemId],
      );
      const productId = Number(product.rows[0]!.id);
      const number = `MG-2026-${suffix}`;
      const o = await c.query(
        `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount, discount_amount, grand_total, shipping_address)
         VALUES ($1,'cancel-int@test.example','PAID','USD',100,0,0,0,100,'{}'::jsonb) RETURNING id`,
        [number],
      );
      const orderId = Number(o.rows[0]!.id);
      await c.query(
        `INSERT INTO fresh.order_items (order_id, product_id, gemstone_id, description, code_snapshot, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,'Cancel Test Stone','G-CAN-TST',1,100,100)`,
        [orderId, productId, gemId],
      );
      await c.query(
        `INSERT INTO fresh.payments (order_id, provider, provider_ref, state, amount, currency, captured_at)
         VALUES ($1,'test','cancel-ref','CAPTURED',100,'USD', now())`,
        [orderId],
      );
      const result = await cancelOrder(c as never, number, 'integration cancel', 'admin');
      expect(result.status).toBe('CANCELLED');
      expect(result.refunded).toBe(100);
      const status = await c.query(`SELECT status FROM fresh.gemstones WHERE id = $1`, [gemId]);
      expect(status.rows[0]!.status).toBe('ACTIVE');
      const refunds = await c.query(`SELECT amount::text AS amount, state FROM fresh.refunds WHERE order_id = $1`, [orderId]);
      expect(refunds.rows[0]).toEqual({ amount: '100.00', state: 'PENDING' });
    });
  });

  it('verifies a certificate for the public catalogue', async () => {
    await inRollback(async (c) => {
      const v = await c.query(`SELECT id FROM fresh.gemstone_varieties LIMIT 1`);
      const suffix = String(Math.floor(100000 + Math.random() * 899999));
      const gem = await c.query(
        `INSERT INTO fresh.gemstones (ref, slug, name, variety_id, kind, pieces, currency, quantity, status, origin_type)
         VALUES ($1,$2,'Cert Test Stone',$3,'SINGLE',1,'USD',1,'ACTIVE','NATURAL') RETURNING id`,
        [`G-CER-TST-HQ-${suffix}`, `cert-test-${suffix}`, v.rows[0]!.id],
      );
      const cert = await c.query(
        `INSERT INTO fresh.certificates (owner_kind, owner_id, agency, cert_no) VALUES ('gemstone',$1,'GRS','CERT-INT-1') RETURNING id`,
        [gem.rows[0]!.id],
      );
      const verified = await verifyCertificate(c as never, Number(cert.rows[0]!.id), 'VERIFIED', 'admin');
      expect(verified.verified).toBe('VERIFIED');
      const flagged = await verifyCertificate(c as never, Number(cert.rows[0]!.id), 'FLAGGED', 'admin');
      expect(flagged.verified).toBe('FLAGGED');
    });
  });

  it('verifies a customer email with a single-use token', async () => {
    await inRollback(async (c) => {
      const ins = await c.query(
        `INSERT INTO fresh.customers (email, password_hash) VALUES ('verify-int@test.example', $1) RETURNING id`,
        [hashPassword('VerifyPass2026!')],
      );
      const id = Number(ins.rows[0]!.id);
      const issued = await issueVerification(c as never, id, 'verify-int@test.example');
      expect(issued.dev_token).toBeTruthy();
      const result = await verifyEmail(c as never, issued.dev_token!);
      expect(result.email).toBe('verify-int@test.example');
      const row = await c.query(`SELECT email_verified_at FROM fresh.customers WHERE id = $1`, [id]);
      expect(row.rows[0]!.email_verified_at).not.toBeNull();
      await expect(verifyEmail(c as never, issued.dev_token!)).rejects.toThrow();
      const outbox = await c.query(`SELECT count(*)::int AS n FROM fresh.email_outbox WHERE to_email = 'verify-int@test.example'`);
      expect(outbox.rows[0]!.n).toBe(1);
    });
  });

  it('manages the customer address book', async () => {
    await inRollback(async (c) => {
      const ins = await c.query(
        `INSERT INTO fresh.customers (email, password_hash) VALUES ('address-int@test.example', $1) RETURNING id`,
        [hashPassword('AddressPass2026!')],
      );
      const id = Number(ins.rows[0]!.id);
      const first = await createAddress(c as never, id, {
        label: 'Home', recipient: 'Noor Adib', line1: '1 Palm Road', city: 'Dubai', postal_code: '00000', country: 'ae',
      });
      expect(first.country).toBe('AE');
      const second = await createAddress(c as never, id, {
        label: 'Office', recipient: 'Noor Adib', line1: '2 Creek Road', city: 'Dubai', postal_code: '11111', country: 'AE',
      });
      await setDefaultAddress(c as never, id, Number(second.id));
      const list = await listAddresses(c as never, id);
      expect(list).toHaveLength(2);
      expect((list.find((a) => a.is_default) as { id: number }).id).toBe(second.id);
      await deleteAddress(c as never, id, Number(first.id));
      expect(await listAddresses(c as never, id)).toHaveLength(1);
      await expect(createAddress(c as never, id, { recipient: 'X', line1: 'Y', city: 'Z', postal_code: '1', country: 'UAE' })).rejects.toThrow();
    });
  });

  it('queues a payment email when the test instrument captures payment', async () => {
    await inRollback(async (c) => {
      const number = `MG-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;
      await c.query(
        `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount, discount_amount, grand_total, shipping_address)
         VALUES ($1,'pay-int@test.example','PENDING_PAYMENT','USD',10,0,0,0,10,'{}'::jsonb)`,
        [number],
      );
      await payOrder(c as never, number);
      const mail = await c.query(`SELECT subject FROM fresh.email_outbox WHERE to_email = 'pay-int@test.example' ORDER BY id DESC LIMIT 1`);
      expect(String(mail.rows[0]!.subject)).toContain('payment received');
    });
  });

  it('leaves queued email untouched when no provider is configured', async () => {
    await inRollback(async (c) => {
      await c.query(`INSERT INTO fresh.email_outbox (to_email, subject, body) VALUES ('queue-int@test.example','queued','body')`);
      const result = await dispatchOutbox(c as never);
      expect(result.provider_configured).toBe(false);
      expect(result.queued).toBeGreaterThanOrEqual(1);
      const row = await c.query(`SELECT state FROM fresh.email_outbox WHERE to_email = 'queue-int@test.example'`);
      expect(row.rows[0]!.state).toBe('QUEUED');
    });
  });

  it('shares rate-limit windows through the database', async () => {
    await inRollback(async (c) => {
      const ip = `198.18.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
      for (let i = 0; i < 5; i += 1) {
        const r = await checkRateLimitShared(c as never, ip, '/api/v1/auth/login', 'POST');
        expect(r.allowed).toBe(true);
        expect(r.scope).toBe('auth');
      }
      const blocked = await checkRateLimitShared(c as never, ip, '/api/v1/auth/login', 'POST');
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      const read = await checkRateLimitShared(c as never, ip, '/api/v1/catalogue/gemstones', 'GET');
      expect(read.allowed).toBe(true);
    });
  });

  it('answers existence checks for the edge 404 guard', async () => {
    const known = await catalogueExists(client, 'variety', 'ruby');
    expect(known.exists).toBe(true);
    const unknown = await catalogueExists(client, 'variety', 'not-a-real-variety');
    expect(unknown.exists).toBe(false);
    const badKind = await catalogueExists(client, 'nonsense', 'ruby');
    expect(badKind.exists).toBe(false);
  });

  it('pages the sitemap by kind', async () => {
    const varieties = await sitemapPage(client, 'variety', 0, 10);
    expect(varieties.total).toBe(86);
    expect(varieties.items).toHaveLength(10);
    const bad = await sitemapPage(client, 'nonsense', 0, 10);
    expect(bad.total).toBe(0);
  });

  it('unsubscribes newsletter leads without touching other sources', async () => {
    await inRollback(async (c) => {
      await createLead(c as never, 'unsub-int@test.example', null, 'newsletter');
      await createLead(c as never, 'unsub-int@test.example', 'Noor', 'viewing_request');
      await unsubscribeLead(c as never, 'unsub-int@test.example');
      const rows = await c.query(
        `SELECT source, status FROM fresh.leads WHERE email = 'unsub-int@test.example' ORDER BY source`,
      );
      const bySource = Object.fromEntries(rows.rows.map((r) => [r.source, r.status]));
      expect(bySource['newsletter']).toBe('LOST');
      expect(bySource['viewing_request']).toBe('NEW');
    });
  });

  it('interprets a concierge request against the live vocabulary', async () => {
    const result = await conciergeQuery(client, 'Unheated ruby under $5,000');
    const labels = result.interpretation.map((i) => i.label);
    expect(labels).toContain('Variety');
    expect(labels).toContain('Budget');
    expect(Array.isArray(result.items)).toBe(true);
    if (result.total === 0) expect(result.refusal).toBeTruthy();
    else expect(result.items.length).toBeGreaterThan(0);
    const empty = await conciergeQuery(client, '');
    expect(empty.refusal).toBeTruthy();
  });

  it('decrements ready-made stock at checkout and restocks on cancellation', async () => {
    await inRollback(async (c) => {
      const jt = await c.query(`SELECT id FROM fresh.jewellery_types LIMIT 1`);
      const suffix = String(Math.floor(100000 + Math.random() * 899999));
      const prod = await c.query(
        `INSERT INTO fresh.products (ref, slug, name, jewellery_type_id, kind, price_amount, currency, status, quantity)
         VALUES ($1,$2,'Stock Test Piece',$3,'READY_MADE',120,'USD','ACTIVE',2) RETURNING id`,
        [`J-R-STK-HQ-${suffix}`, `stock-test-${suffix}`, jt.rows[0]!.id],
      );
      const productRef = `J-R-STK-HQ-${suffix}`;
      const cart = await getOrCreateCart(c as never, undefined);
      await addProductToCart(c as never, cart.token, productRef, 2);
      const order = await checkoutCart(c as never, cart.token, {
        email: 'stock-int@test.example',
        shipping_address: { recipient: 'Stock Tester', line1: '1 Road', city: 'Dubai', postal_code: '00000', country: 'AE' },
      });
      const after = await c.query(`SELECT quantity FROM fresh.products WHERE id = $1`, [prod.rows[0]!.id]);
      expect(after.rows[0]!.quantity).toBe(0);

      const second = await getOrCreateCart(c as never, undefined);
      await expect(addProductToCart(c as never, second.token, productRef, 1)).rejects.toThrow();

      await cancelOrder(c as never, order.order_number, 'stock test', 'admin');
      const restored = await c.query(`SELECT quantity FROM fresh.products WHERE id = $1`, [prod.rows[0]!.id]);
      expect(restored.rows[0]!.quantity).toBe(2);
    });
  });

  it('expires abandoned reservations and releases the stone', async () => {
    await inRollback(async (c) => {
      const v = await c.query(`SELECT id FROM fresh.gemstone_varieties LIMIT 1`);
      const suffix = String(Math.floor(100000 + Math.random() * 899999));
      const gem = await c.query(
        `INSERT INTO fresh.gemstones (ref, slug, name, variety_id, kind, pieces, currency, quantity, status, origin_type)
         VALUES ($1,$2,'Reserve Sweep Stone',$3,'SINGLE',1,'USD',0,'RESERVED','NATURAL') RETURNING id`,
        [`G-RSV-TST-HQ-${suffix}`, `reserve-sweep-${suffix}`, v.rows[0]!.id],
      );
      const cart = await getOrCreateCart(c as never, undefined);
      await c.query(
        `INSERT INTO fresh.inventory_reservations (owner_kind, owner_id, cart_id, state, expires_at, previous_status)
         VALUES ('gemstone',$1,(SELECT id FROM fresh.carts WHERE token=$2),'ACTIVE', now() - interval '1 hour','ACTIVE')`,
        [gem.rows[0]!.id, cart.token],
      );
      const result = await expireReservations(c as never);
      expect(result.reservations_expired).toBeGreaterThanOrEqual(1);
      const gemStatus = await c.query(`SELECT status FROM fresh.gemstones WHERE id = $1`, [gem.rows[0]!.id]);
      expect(gemStatus.rows[0]!.status).toBe('ACTIVE');
      const res = await c.query(`SELECT state FROM fresh.inventory_reservations WHERE owner_id = $1`, [gem.rows[0]!.id]);
      expect(res.rows[0]!.state).toBe('EXPIRED');
    });
  });

  it('prunes expired sessions, tokens, outbox, carts and limiter rows', async () => {
    await inRollback(async (c) => {
      const customer = await c.query(
        `INSERT INTO fresh.customers (email, password_hash) VALUES ('cleanup-int@test.example', $1) RETURNING id`,
        [hashPassword('CleanupPass2026!')],
      );
      const cid = customer.rows[0]!.id;
      await c.query(`INSERT INTO fresh.auth_sessions (customer_id, token_hash, expires_at) VALUES ($1,'cleanup-session', now() - interval '8 days')`, [cid]);
      await c.query(`INSERT INTO fresh.password_resets (actor_kind, actor_id, token_hash, expires_at) VALUES ('CUSTOMER',$1,'cleanup-reset', now() - interval '8 days')`, [cid]);
      await c.query(`INSERT INTO fresh.email_verifications (customer_id, token_hash, expires_at) VALUES ($1,'cleanup-verify', now() - interval '8 days')`, [cid]);
      await c.query(`INSERT INTO fresh.email_outbox (to_email, subject, body, state, created_at) VALUES ('cleanup-int@test.example','old','body','SENT', now() - interval '40 days')`);
      await c.query(`INSERT INTO fresh.carts (token, status, created_at) VALUES (gen_random_uuid(), 'ACTIVE', now() - interval '8 days')`);
      await c.query(`INSERT INTO fresh.rate_limits (key, count, reset_at) VALUES ('cleanup:key', 1, now() - interval '2 hours')`);

      const report = await cleanupExpired(c as never);
      expect(report.sessions_deleted).toBeGreaterThanOrEqual(1);
      expect(report.tokens_deleted).toBeGreaterThanOrEqual(2);
      expect(report.outbox_deleted).toBeGreaterThanOrEqual(1);
      expect(report.carts_deleted).toBeGreaterThanOrEqual(1);
      expect(report.rate_limits_deleted).toBeGreaterThanOrEqual(1);
      const sessions = await c.query(`SELECT count(*)::int AS n FROM fresh.auth_sessions WHERE token_hash = 'cleanup-session'`);
      expect(sessions.rows[0]!.n).toBe(0);
    });
  });

  it('sells and restores a configured product with its stone', async () => {
    await inRollback(async (c) => {
      const v = await c.query(`SELECT id FROM fresh.gemstone_varieties LIMIT 1`);
      const jt = await c.query(`SELECT id FROM fresh.jewellery_types LIMIT 1`);
      const setting = await c.query(`SELECT id FROM fresh.settings LIMIT 1`);
      const suffix = String(Math.floor(100000 + Math.random() * 899999));
      const gem = await c.query(
        `INSERT INTO fresh.gemstones (ref, slug, name, variety_id, kind, pieces, currency, quantity, status, origin_type)
         VALUES ($1,$2,'Configured Sync Stone',$3,'SINGLE',1,'USD',1,'ACTIVE','NATURAL') RETURNING id`,
        [`G-CFG-TST-HQ-${suffix}`, `configured-sync-${suffix}`, v.rows[0]!.id],
      );
      const prod = await c.query(
        `INSERT INTO fresh.products (ref, slug, name, jewellery_type_id, kind, setting_id, gemstone_id, price_amount, currency, status)
         VALUES ($1,$2,'Configured Sync Piece',$3,'CONFIGURED',$4,$5,250,'USD','ACTIVE') RETURNING id`,
        [`J-R-CFG-HQ-${suffix}`, `configured-sync-piece-${suffix}`, jt.rows[0]!.id, setting.rows[0]!.id, gem.rows[0]!.id],
      );
      const cart = await getOrCreateCart(c as never, undefined);
      await addProductToCart(c as never, cart.token, `J-R-CFG-HQ-${suffix}`, 1);
      const order = await checkoutCart(c as never, cart.token, {
        email: 'configured-int@test.example',
        shipping_address: { recipient: 'Configured Tester', line1: '1 Road', city: 'Dubai', postal_code: '00000', country: 'AE' },
      });
      await payOrder(c as never, order.order_number);
      // Products keep DRAFT/ACTIVE/ARCHIVED; availability follows the stone.
      const product = await c.query(`SELECT status FROM fresh.products WHERE id = $1`, [prod.rows[0]!.id]);
      expect(product.rows[0]!.status).toBe('ACTIVE');
      const gemSold = await c.query(`SELECT status FROM fresh.gemstones WHERE id = $1`, [gem.rows[0]!.id]);
      expect(gemSold.rows[0]!.status).toBe('SOLD');

      await cancelOrder(c as never, order.order_number, 'configured sync test', 'admin');
      const productAfter = await c.query(`SELECT status FROM fresh.products WHERE id = $1`, [prod.rows[0]!.id]);
      expect(productAfter.rows[0]!.status).toBe('ACTIVE');
      const gemRestored = await c.query(`SELECT status FROM fresh.gemstones WHERE id = $1`, [gem.rows[0]!.id]);
      expect(gemRestored.rows[0]!.status).toBe('ACTIVE');
    });
  });

  it('enables TOTP and requires the second step at login', async () => {
    await inRollback(async (c) => {
      const admin = await c.query(`SELECT id, email FROM fresh.admin_users ORDER BY id LIMIT 1`);
      const adminId = Number(admin.rows[0]!.id);
      const email = String(admin.rows[0]!.email);

      const setup = await adminTotpSetup(c as never, adminId, email);
      const counter = Math.floor(Date.now() / 30_000);
      const code = totpAt(setup.secret, counter);
      await adminTotpEnable(c as never, adminId, code);

      const login = await adminLogin(c as never, email, 'maihan-admin-dev', null);
      expect(login.requires_2fa).toBe(true);
      expect(login.challenge_token).toBeTruthy();
      expect(login.token).toBeUndefined();

      const verified = await adminVerifyTotp(
        c as never,
        login.challenge_token!,
        totpAt(setup.secret, Math.floor(Date.now() / 30_000)),
      );
      expect(verified.token).toBeTruthy();
      const session = await resolveAdminSession(c as never, `Bearer ${verified.token}`);
      expect(session?.adminId).toBe(adminId);
      await expect(adminVerifyTotp(c as never, login.challenge_token!, code)).rejects.toThrow();
    });
  });
});
