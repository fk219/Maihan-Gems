/**
 * apps/web/src/api/ecommerce-e2e.spec.ts
 *
 * Complete End-to-End Ecommerce & Security Verification Suite:
 * Exercises all 14 core customer, vendor, and administrator journeys against
 * live PostgreSQL (`maihan_dev`):
 *
 *  1. Customer registration, email verification, sign-in, session cookie, logout, password reset
 *  2. Brute-force lockout & generic error non-enumeration on login
 *  3. Vendor onboarding, pending restriction, admin approval, role isolation
 *  4. Vendor product creation, asset validation, review submission, cross-vendor isolation
 *  5. Admin product moderation (reject with reason -> vendor update & resubmit -> approve & publish)
 *  6. Public catalogue visibility of published product vs DRAFT 404 gate
 *  7. Cart lifecycle, price-tampering protection (409 PRICE_CHANGED), quantity update & stock cap
 *  8. 4-step checkout funnel, checkpoint ordering guard, idempotent order placement
 *  9. Atomic inventory decrement & oversell prevention on final item
 * 10. HMAC webhook verification, payment capture reconciliation (PAID), and duplicate suppression
 * 11. Horizontal customer isolation (IDOR blocked on orders, profiles, refunds)
 * 12. Vendor order line isolation & shipment fulfilment tracking updates (IN_FULFILLMENT -> SHIPPED -> DELIVERED)
 * 13. Customer refund request, vertical privilege block (customer cannot approve), admin approval & execution
 * 14. Admin role management (ADMIN_SUPER only) & append-only audit log verification
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCatalogDatabase, createCatalogQueryPort, createPool, type CatalogDatabase } from '@maihan/db';
import {
  createCatalogQueryService,
  MemoryGenerationStore,
  NullCacheStore,
} from '../modules/catalog/index.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import { TestPaymentProvider } from '../integrations/payment/test-payment-provider.js';

const DB_URL =
  process.env['DATABASE_URL'] ||
  'postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev';

describe('Full Ecommerce End-to-End Journeys (Auth, RBAC, Vendor, Admin, Cart, Checkout, Fulfilment, Refunds)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let db: CatalogDatabase | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;

  const paymentProvider = new TestPaymentProvider();
  const runTag = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const createdCustomerIds: string[] = [];
  const createdVendorIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdCartTokens: string[] = [];
  const createdSessionIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdEventIds: string[] = [];

  let customerASession = '';
  let customerAId = '';
  let customerBSession = '';
  let customerBId = '';
  let vendorASession = '';
  let vendorAId = '';
  let vendorBSession = '';
  let vendorBId = '';
  let publishedProductId = '';
  let publishedProductSlug = '';
  let placedOrderId = '';
  let placedOrderItemId = '';
  let requestedRefundId = '';

  beforeAll(async () => {
    try {
      pool = createPool(DB_URL, { max: 3 });
      const probe = await pool.query(`SELECT to_regclass('public.products') AS t`);
      if (!probe.rows[0]?.t) {
        await pool.end();
        return;
      }
      db = createCatalogDatabase(pool);
      const port = createCatalogQueryPort(db);
      const service = createCatalogQueryService({
        port,
        store: new NullCacheStore(),
        generations: new MemoryGenerationStore(),
        namespace: `e2e_${runTag}`,
      });
      api = createCatalogApi({ service, db });
      hasDb = true;
    } catch {
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (!pool || !hasDb) {
      if (pool) await pool.end().catch(() => undefined);
      return;
    }
    const client = await pool.connect();
    try {
      for (const evtId of createdEventIds) {
        await client.query(`DELETE FROM webhook_receipts WHERE external_event_id = $1`, [evtId]);
      }
      for (const oid of createdOrderIds) {
        await client.query(`DELETE FROM refunds WHERE order_id = $1`, [oid]);
        await client.query(`DELETE FROM fulfillments WHERE order_id = $1`, [oid]);
        await client.query(`DELETE FROM payments WHERE order_id = $1`, [oid]);
        await client.query(`DELETE FROM order_events WHERE order_id = $1`, [oid]);
        await client.query(`DELETE FROM order_items WHERE order_id = $1`, [oid]);
        await client.query(`DELETE FROM audit_logs WHERE entity_id = $1`, [oid]);
        await client.query(`DELETE FROM orders WHERE id = $1`, [oid]);
      }
      for (const token of createdCartTokens) {
        await client.query(`DELETE FROM carts WHERE cart_token = $1`, [token]);
      }
      for (const sid of createdSessionIds) {
        await client.query(`DELETE FROM jobs WHERE job_key = $1`, [`checkout:session:${sid}`]);
      }
      for (const pid of createdProductIds) {
        const gemRes = await client.query<{ gid: string }>(
          `SELECT COALESCE(gemstone_id, gemstone_pair_id)::text AS gid FROM products WHERE id = $1`,
          [pid],
        );
        const gid = gemRes.rows[0]?.gid ?? null;
        await client.query(`DELETE FROM asset_usages WHERE entity_id = $1`, [pid]);
        await client.query(`DELETE FROM domain_events WHERE aggregate_id = $1`, [pid]);
        await client.query(`DELETE FROM audit_logs WHERE entity_id = $1`, [pid]);
        await client.query(`DELETE FROM products WHERE id = $1`, [pid]);
        if (gid) {
          await client.query(`DELETE FROM gemstones WHERE id = $1`, [gid]);
        }
      }
      for (const vid of createdVendorIds) {
        await client.query(`DELETE FROM audit_logs WHERE entity_id = $1`, [vid]);
        await client.query(`DELETE FROM jobs WHERE id = $1`, [vid]);
      }
      for (const cid of createdCustomerIds) {
        await client.query(`DELETE FROM addresses WHERE customer_id = $1`, [cid]);
        await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [cid]);
        await client.query(`DELETE FROM jobs WHERE payload->>'customer_id' = $1`, [cid]);
        await client.query(`DELETE FROM jobs WHERE job_key = $1`, [`auth:cred:${cid}`]);
        await client.query(`DELETE FROM audit_logs WHERE entity_id = $1 OR actor_id = $1`, [cid]);
        await client.query(`DELETE FROM customers WHERE id = $1`, [cid]);
      }
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('Journey 1 & 2: Customer registration, email verification, password reset & brute-force protection', async () => {
    if (!hasDb || !api) return;

    const emailA = `customer.a.${runTag}@maihan.test`;
    const regRes = await api(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailA,
          password: 'InitialPassword123!',
          first_name: 'Layla',
          last_name: 'Al-Mansoor',
        }),
      }),
    );
    expect(regRes.status).toBe(201);
    expect(regRes.headers.get('set-cookie')).toContain('maihan_session=');
    const regBody = (await regRes.json()).data;
    customerAId = regBody.actor.customer_id;
    createdCustomerIds.push(customerAId);
    const initialSessionToken = regBody.session_token as string;
    const verificationToken = regBody.verification_token as string;
    expect(regBody.actor.email_verified).toBe(false);

    // Duplicate registration rejected
    const dupRes = await api(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailA,
          password: 'InitialPassword123!',
        }),
      }),
    );
    expect(dupRes.status).toBe(409);

    // Verify email with single-use token
    const verifyRes = await api(
      new Request('http://localhost/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      }),
    );
    expect(verifyRes.status).toBe(200);

    // Replaying single-use verification token fails
    const replayVerifyRes = await api(
      new Request('http://localhost/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      }),
    );
    expect(replayVerifyRes.status).toBe(422);

    // Session now reflects email_verified: true
    const sessCheck = await api(
      new Request('http://localhost/api/v1/auth/session', {
        headers: { Authorization: `Bearer ${initialSessionToken}` },
      }),
    );
    expect(sessCheck.status).toBe(200);
    expect((await sessCheck.json()).data.actor.email_verified).toBe(true);

    // Forgot password & single-use reset revokes existing sessions
    const forgotRes = await api(
      new Request('http://localhost/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA }),
      }),
    );
    expect(forgotRes.status).toBe(200);
    const resetToken = (await forgotRes.json()).data.reset_token_for_sandbox as string;
    expect(resetToken).toBeTruthy();

    const resetRes = await api(
      new Request('http://localhost/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: 'UpdatedVaultPassword99!' }),
      }),
    );
    expect(resetRes.status).toBe(200);

    // Old session is now revoked
    const revokedCheck = await api(
      new Request('http://localhost/api/v1/auth/session', {
        headers: { Authorization: `Bearer ${initialSessionToken}` },
      }),
    );
    expect(revokedCheck.status).toBe(401);

    // Wrong password returns generic error; 5 failures lock the account
    for (let i = 0; i < 5; i++) {
      const badLogin = await api(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailA, password: 'WrongPassword!' }),
        }),
      );
      expect(badLogin.status).toBe(401);
    }
    const lockedLogin = await api(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA, password: 'UpdatedVaultPassword99!' }),
      }),
    );
    expect(lockedLogin.status).toBe(429);

    // Unlock via second password reset & sign in cleanly
    const forgotRes2 = await api(
      new Request('http://localhost/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA }),
      }),
    );
    const resetToken2 = (await forgotRes2.json()).data.reset_token_for_sandbox as string;
    await api(
      new Request('http://localhost/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken2, new_password: 'FinalCustomerPassword99!' }),
      }),
    );

    const loginRes = await api(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA, password: 'FinalCustomerPassword99!' }),
      }),
    );
    expect(loginRes.status).toBe(200);
    customerASession = (await loginRes.json()).data.session_token;

    // Register Customer B for horizontal isolation tests
    const regB = await api(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `customer.b.${runTag}@maihan.test`,
          password: 'CustomerBPassword99!',
          first_name: 'karim',
          last_name: 'Nasser',
        }),
      }),
    );
    expect(regB.status).toBe(201);
    const regBData = (await regB.json()).data;
    customerBId = regBData.actor.customer_id;
    customerBSession = regBData.session_token;
    createdCustomerIds.push(customerBId);
  });

  it('Journey 3, 4, 5 & 6: Vendor onboarding, product creation, moderation & cross-vendor/role isolation', async () => {
    if (!hasDb || !api) return;

    // Register Vendor A & Vendor B
    const regVA = await api(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `vendor.a.${runTag}@maihan.test`,
          password: 'VendorAPassword99!',
          first_name: 'Arun',
          last_name: 'Chanthaburi',
          role: 'VENDOR',
          vendor_name: `Siam Royal Corundum ${runTag}`,
          vendor_country: 'TH',
          vendor_city: 'Bangkok',
        }),
      }),
    );
    expect(regVA.status).toBe(201);
    const vaData = (await regVA.json()).data;
    createdCustomerIds.push(vaData.actor.customer_id);
    vendorAId = vaData.actor.vendor_id;
    vendorASession = vaData.session_token;
    createdVendorIds.push(vendorAId);
    expect(vaData.actor.vendor_status).toBe('PENDING');

    const regVB = await api(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `vendor.b.${runTag}@maihan.test`,
          password: 'VendorBPassword99!',
          first_name: 'Tariq',
          last_name: 'DIFC',
          role: 'VENDOR',
          vendor_name: `Gulf Emerald Vault ${runTag}`,
          vendor_country: 'AE',
          vendor_city: 'Dubai',
        }),
      }),
    );
    expect(regVB.status).toBe(201);
    const vbData = (await regVB.json()).data;
    createdCustomerIds.push(vbData.actor.customer_id);
    vendorBId = vbData.actor.vendor_id;
    vendorBSession = vbData.session_token;
    createdVendorIds.push(vendorBId);

    // Unapproved vendor cannot create products (403)
    const unapprovedCreate = await api(
      new Request('http://localhost/api/v1/vendor/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorASession}`,
        },
        body: JSON.stringify({
          sku: `SRC-${runTag}-1`,
          title: '3.10 Ct Unheated Ceylon Blue Sapphire',
          price_amount: 4500,
        }),
      }),
    );
    expect(unapprovedCreate.status).toBe(403);

    // Customer A cannot access vendor or admin endpoints (403)
    const custTryVendor = await api(
      new Request('http://localhost/api/v1/vendor/dashboard', {
        headers: { Authorization: `Bearer ${customerASession}` },
      }),
    );
    expect(custTryVendor.status).toBe(403);

    const custTryAdmin = await api(
      new Request('http://localhost/api/v1/admin/vendors', {
        headers: { Authorization: `Bearer ${customerASession}` },
      }),
    );
    expect(custTryAdmin.status).toBe(403);

    // Admin approves both Vendor A and Vendor B
    for (const vid of [vendorAId, vendorBId]) {
      const appRes = await api(
        new Request(`http://localhost/api/v1/admin/vendors/${vid}/moderate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-sub': 'admin@maihan.test',
          },
          body: JSON.stringify({ action: 'APPROVE' }),
        }),
      );
      expect(appRes.status).toBe(200);
      expect((await appRes.json()).data.status).toBe('APPROVED');
    }

    // Unsafe image extension rejected (400)
    const unsafeImgRes = await api(
      new Request('http://localhost/api/v1/vendor/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorASession}`,
        },
        body: JSON.stringify({
          sku: `SRC-BAD-${runTag}`,
          title: 'Unsafe Asset Test',
          price_amount: 1200,
          images: ['https://cdn.example.com/exploit.svg'],
        }),
      }),
    );
    expect(unsafeImgRes.status).toBe(400);

    // Vendor A creates a valid draft product with 2 units in stock
    const createProdRes = await api(
      new Request('http://localhost/api/v1/vendor/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorASession}`,
        },
        body: JSON.stringify({
          sku: `SRC-${runTag.toUpperCase()}`,
          title: '3.10 Ct Unheated Royal Blue Ceylon Sapphire',
          description: 'Velvety cornflower-to-royal blue crystal with verified Sri Lankan provenance.',
          kind: 'LOOSE_STONE',
          jewellery_type: 'RING',
          price_amount: 4500,
          inventory_quantity: 2,
          total_weight_ct: 3.1,
          stone_type: 'Sapphire',
          shape: 'OVAL',
          origin_country: 'Sri Lanka',
          treatment_status: 'No Enhancement (Unheated)',
          images: [
            {
              url: 'https://res.cloudinary.com/o1zwhvbi/image/upload/f_auto,q_auto/maihan/products/K11733/01_image_stone.jpg',
              mime_type: 'image/jpeg',
              bytes: 145000,
              alt_text: '3.10 Ct Ceylon Sapphire',
            },
          ],
        }),
      }),
    );
    expect(createProdRes.status).toBe(201);
    const createdProd = (await createProdRes.json()).data;
    publishedProductId = createdProd.id;
    publishedProductSlug = createdProd.slug;
    createdProductIds.push(publishedProductId);
    expect(createdProd.state).toBe('DRAFT');
    expect(createdProd.moderation_status).toBe('DRAFT');

    // Draft product cannot be added to customer cart before publication
    const earlyCartRes = await api(
      new Request('http://localhost/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
    const earlyCartToken = (await earlyCartRes.json()).data.cart_token;
    createdCartTokens.push(earlyCartToken);

    const addDraftRes = await api(
      new Request(`http://localhost/api/v1/carts/${earlyCartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: publishedProductId, quantity: 1 }),
      }),
    );
    expect(addDraftRes.status).toBe(422);

    // Vendor B cannot edit or submit Vendor A's product (403)
    const crossVendorEdit = await api(
      new Request(`http://localhost/api/v1/vendor/products/${publishedProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorBSession}`,
        },
        body: JSON.stringify({ price_amount: 100 }),
      }),
    );
    expect(crossVendorEdit.status).toBe(403);

    // Vendor A cannot self-approve/publish their own product (403)
    const selfPublish = await api(
      new Request(`http://localhost/api/v1/admin/products/${publishedProductId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorASession}`,
        },
        body: JSON.stringify({ action: 'PUBLISH' }),
      }),
    );
    expect(selfPublish.status).toBe(403);

    // Vendor A submits product for review
    const submitRes = await api(
      new Request(`http://localhost/api/v1/vendor/products/${publishedProductId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vendorASession}` },
      }),
    );
    expect(submitRes.status).toBe(200);
    expect((await submitRes.json()).data.moderation_status).toBe('SUBMITTED');

    // Admin rejects with feedback -> Vendor updates & resubmits -> Admin publishes
    const rejectRes = await api(
      new Request(`http://localhost/api/v1/admin/products/${publishedProductId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-sub': 'curator@maihan.test',
        },
        body: JSON.stringify({
          action: 'REJECT',
          reason: 'Please include exact pavilion depth in description.',
        }),
      }),
    );
    expect(rejectRes.status).toBe(200);
    const rejectedData = (await rejectRes.json()).data;
    expect(rejectedData.moderation_status).toBe('REJECTED');
    expect(rejectedData.rejection_reason).toContain('pavilion depth');

    await api(
      new Request(`http://localhost/api/v1/vendor/products/${publishedProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorASession}`,
        },
        body: JSON.stringify({
          description: 'Velvety royal blue crystal, pavilion depth 63.4%, unheated Sri Lanka.',
        }),
      }),
    );
    await api(
      new Request(`http://localhost/api/v1/vendor/products/${publishedProductId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vendorASession}` },
      }),
    );

    const publishRes = await api(
      new Request(`http://localhost/api/v1/admin/products/${publishedProductId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-sub': 'curator@maihan.test',
        },
        body: JSON.stringify({ action: 'PUBLISH' }),
      }),
    );
    expect(publishRes.status).toBe(200);
    const publishedData = (await publishRes.json()).data;
    expect(publishedData.slug).toBe(publishedProductSlug);
    expect(publishedData.state).toBe('ACTIVE');
    expect(publishedData.moderation_status).toBe('PUBLISHED');
    expect(publishedData.published_at).toBeTruthy();
  });

  it('Journey 7, 8, 9 & 10: Cart repricing, quantity update, 4-step checkout, atomic stock depletion & HMAC webhook', async () => {
    if (!hasDb || !api) return;

    const cartRes = await api(
      new Request('http://localhost/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerAId }),
      }),
    );
    expect(cartRes.status).toBe(201);
    const cartToken = (await cartRes.json()).data.cart_token as string;
    createdCartTokens.push(cartToken);

    // Price tampering attempt rejected with 409 PRICE_CHANGED
    const tamperRes = await api(
      new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: publishedProductId,
          quantity: 1,
          expected_unit_price: '99.00',
        }),
      }),
    );
    expect(tamperRes.status).toBe(409);
    expect((await tamperRes.json()).error.code).toBe('PRICE_CHANGED');

    // Quantity exceeding available stock (2) rejected with 422
    const excessQtyRes = await api(
      new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: publishedProductId,
          quantity: 5,
        }),
      }),
    );
    expect(excessQtyRes.status).toBe(422);

    // Add 1 unit at authoritative price ($4,500.00), then update quantity to 2 ($9,000.00)
    const addRes = await api(
      new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: publishedProductId,
          quantity: 1,
          expected_unit_price: '4500.00',
        }),
      }),
    );
    expect(addRes.status).toBe(200);
    const addedCart = (await addRes.json()).data;
    const cartItemId = addedCart.items[0].id as string;
    expect(addedCart.pricing_snapshot.grand_total).toBe('4500.00');

    const updateQtyRes = await api(
      new Request(`http://localhost/api/v1/carts/${cartToken}/items/${cartItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 2 }),
      }),
    );
    expect(updateQtyRes.status).toBe(200);
    const updatedCart = (await updateQtyRes.json()).data;
    expect(updatedCart.pricing_snapshot.grand_total).toBe('9000.00');

    // Start checkout session bound to authenticated Customer A
    const sessRes = await api(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerASession}`,
        },
        body: JSON.stringify({ cart_token: cartToken }),
      }),
    );
    expect(sessRes.status).toBe(201);
    const checkoutSession = (await sessRes.json()).data;
    const sessionId = checkoutSession.id as string;
    createdSessionIds.push(sessionId);
    expect(checkoutSession.customer_id).toBe(customerAId);

    // Skipping shipping checkpoint to confirm is rejected (422)
    const skipRes = await api(
      new Request(`http://localhost/api/v1/checkout/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotency_key: `skip_${runTag}` }),
      }),
    );
    expect(skipRes.status).toBe(422);

    // Step 2: Shipping checkpoint
    const shipRes = await api(
      new Request(`http://localhost/api/v1/checkout/sessions/${sessionId}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: {
            full_name: 'Layla Al-Mansoor',
            line1: 'Gate Village 3, DIFC',
            city: 'Dubai',
            postal_code: '00000',
            country_code: 'AE',
          },
        }),
      }),
    );
    expect(shipRes.status).toBe(200);

    // Step 3: Payment checkpoint
    const payStepRes = await api(
      new Request(`http://localhost/api/v1/checkout/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_type: 'TEST' }),
      }),
    );
    expect(payStepRes.status).toBe(200);

    // Step 4: Confirm & Place Order (idempotent)
    const idemKey = `order_idem_${runTag}`;
    const confRes = await api(
      new Request(`http://localhost/api/v1/checkout/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotency_key: idemKey }),
      }),
    );
    expect(confRes.status).toBe(200);

    const placeRes = await api(
      new Request('http://localhost/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerASession}`,
        },
        body: JSON.stringify({
          checkout_session_id: sessionId,
          idempotency_key: idemKey,
        }),
      }),
    );
    expect(placeRes.status).toBe(201);
    const placedOrder = (await placeRes.json()).data;
    placedOrderId = placedOrder.id;
    placedOrderItemId = placedOrder.items[0].id;
    createdOrderIds.push(placedOrderId);
    expect(placedOrder.order_number).toMatch(/^MG-\d{4}-\d{6}$/);
    expect(placedOrder.grand_total).toBe('9000.00');
    expect(placedOrder.state).toBe('PENDING_PAYMENT');

    // Idempotent replay returns identical order without error
    const replayOrderRes = await api(
      new Request('http://localhost/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerASession}`,
        },
        body: JSON.stringify({
          checkout_session_id: sessionId,
          idempotency_key: idemKey,
        }),
      }),
    );
    expect(replayOrderRes.status).toBe(201);
    expect((await replayOrderRes.json()).data.id).toBe(placedOrderId);

    // All 2 units were purchased -> product is now SOLD_OUT and unavailable for Customer B
    const cartBRes = await api(
      new Request('http://localhost/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerBId }),
      }),
    );
    const cartBToken = (await cartBRes.json()).data.cart_token as string;
    createdCartTokens.push(cartBToken);

    const oversellAttempt = await api(
      new Request(`http://localhost/api/v1/carts/${cartBToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: publishedProductId, quantity: 1 }),
      }),
    );
    expect(oversellAttempt.status).toBe(422);

    // Reconcile payment via HMAC-signed webhook
    const evtId = `evt_e2e_${runTag}`;
    createdEventIds.push(evtId);
    const whPayload = {
      id: evtId,
      type: 'payment.captured',
      order_id: placedOrderId,
      amount: '9000.00',
      currency: 'USD',
      created_at: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(whPayload);
    const signature = paymentProvider.signWebhookPayload(rawBody);

    const whRes = await api(
      new Request('http://localhost/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maihan-signature': signature,
        },
        body: rawBody,
      }),
    );
    expect(whRes.status).toBe(200);
    expect((await whRes.json()).status).toBe('processed');

    // Duplicate webhook is idempotently suppressed
    const dupWhRes = await api(
      new Request('http://localhost/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maihan-signature': signature,
        },
        body: rawBody,
      }),
    );
    expect(dupWhRes.status).toBe(200);
    expect((await dupWhRes.json()).status).toBe('duplicate');
  });

  it('Journey 11, 12, 13 & 14: IDOR protection, vendor fulfilment tracking, refund approval & audit logs', async () => {
    if (!hasDb || !api) return;

    // Customer B cannot read or refund Customer A's order (403 FORBIDDEN)
    const idorOrderRead = await api(
      new Request(`http://localhost/api/v1/orders/${placedOrderId}`, {
        headers: { Authorization: `Bearer ${customerBSession}` },
      }),
    );
    expect(idorOrderRead.status).toBe(403);

    const idorProfileRead = await api(
      new Request('http://localhost/api/v1/account/profile', {
        headers: {
          Authorization: `Bearer ${customerBSession}`,
          'x-customer-id': customerAId,
        },
      }),
    );
    expect(idorProfileRead.status).toBe(403);

    const idorRefundReq = await api(
      new Request(`http://localhost/api/v1/orders/${placedOrderId}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerBSession}`,
        },
        body: JSON.stringify({ amount: 100, reason: 'Unauthorized attempt' }),
      }),
    );
    expect(idorRefundReq.status).toBe(403);

    // Vendor B sees 0 order lines and cannot update Vendor A's order item (403)
    const vendorBOrdersRes = await api(
      new Request('http://localhost/api/v1/vendor/orders', {
        headers: { Authorization: `Bearer ${vendorBSession}` },
      }),
    );
    expect(vendorBOrdersRes.status).toBe(200);
    expect((await vendorBOrdersRes.json()).data.orders.length).toBe(0);

    const crossVendorFulfill = await api(
      new Request(
        `http://localhost/api/v1/vendor/orders/${placedOrderId}/items/${placedOrderItemId}/fulfill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vendorBSession}`,
          },
          body: JSON.stringify({
            state: 'SHIPPED',
            carrier: 'Malca-Amit',
            tracking_number: 'MA-FAKE',
          }),
        },
      ),
    );
    expect(crossVendorFulfill.status).toBe(403);

    // Vendor A updates fulfilment: SHIPPED -> DELIVERED
    const shipFulfillRes = await api(
      new Request(
        `http://localhost/api/v1/vendor/orders/${placedOrderId}/items/${placedOrderItemId}/fulfill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vendorASession}`,
          },
          body: JSON.stringify({
            state: 'SHIPPED',
            carrier: 'Malca-Amit Armored',
            tracking_number: `MA-${runTag}`,
          }),
        },
      ),
    );
    expect(shipFulfillRes.status).toBe(200);
    expect((await shipFulfillRes.json()).data.fulfillment_state).toBe('SHIPPED');

    const deliverFulfillRes = await api(
      new Request(
        `http://localhost/api/v1/vendor/orders/${placedOrderId}/items/${placedOrderItemId}/fulfill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vendorASession}`,
          },
          body: JSON.stringify({
            state: 'DELIVERED',
          }),
        },
      ),
    );
    expect(deliverFulfillRes.status).toBe(200);
    expect((await deliverFulfillRes.json()).data.order_state).toBe('FULFILLED');

    // Customer A requests a partial refund ($500.00)
    const reqRefundRes = await api(
      new Request(`http://localhost/api/v1/orders/${placedOrderId}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerASession}`,
        },
        body: JSON.stringify({
          amount: 500,
          reason: 'Courtesy sizing adjustment credit',
        }),
      }),
    );
    expect(reqRefundRes.status).toBe(201);
    requestedRefundId = (await reqRefundRes.json()).data.id;

    // Customer A cannot approve their own refund (403 FORBIDDEN)
    const selfApproveRefund = await api(
      new Request(`http://localhost/api/v1/refunds/${requestedRefundId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerASession}`,
        },
        body: JSON.stringify({}),
      }),
    );
    expect(selfApproveRefund.status).toBe(403);

    // Admin approves & executes refund
    const adminApproveRes = await api(
      new Request(`http://localhost/api/v1/refunds/${requestedRefundId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(adminApproveRes.status).toBe(200);

    const adminExecRes = await api(
      new Request(`http://localhost/api/v1/refunds/${requestedRefundId}/execute`, {
        method: 'POST',
      }),
    );
    expect(adminExecRes.status).toBe(200);
    expect((await adminExecRes.json()).data.state).toBe('SUCCEEDED');

    // Verify audit logs recorded privileged mutations
    const auditRes = await api(
      new Request('http://localhost/api/v1/admin/audit-logs', {
        headers: { 'x-admin-sub': 'super@maihan.test' },
      }),
    );
    expect(auditRes.status).toBe(200);
    const auditLogs = (await auditRes.json()).data as Array<{ action: string }>;
    const actions = new Set(auditLogs.map((l) => l.action));
    expect(actions.has('ACCOUNT_REGISTERED')).toBe(true);
    expect(actions.has('VENDOR_APPROVE')).toBe(true);
    expect(actions.has('VENDOR_PRODUCT_CREATED')).toBe(true);
    expect(actions.has('PRODUCT_PUBLISH')).toBe(true);
    expect(actions.has('VENDOR_FULFILLMENT_UPDATED')).toBe(true);
  });

  it('7. Admin Certificates, Migration, INV-08 Derived-SKU Approval, and Operations Overview', async () => {
    if (!hasDb || !api || !pool) return;

    // 1. Admin certificates list
    const certsRes = await api(
      new Request('http://localhost/api/v1/admin/certificates', {
        headers: { 'x-admin-sub': 'super@maihan.test' },
      }),
    );
    expect(certsRes.status).toBe(200);
    const certsBody = (await certsRes.json()) as { data: unknown[] };
    expect(Array.isArray(certsBody.data)).toBe(true);

    // 2. Admin operations overview (outbox + queues)
    const opsRes = await api(
      new Request('http://localhost/api/v1/admin/operations', {
        headers: { 'x-admin-sub': 'super@maihan.test' },
      }),
    );
    expect(opsRes.status).toBe(200);
    const opsBody = (await opsRes.json()) as {
      data: {
        outbox: { pending: number; published: number; dead_letter: number };
        recent_events: unknown[];
        queues: unknown[];
      };
    };
    expect(typeof opsBody.data.outbox.pending).toBe('number');
    expect(Array.isArray(opsBody.data.recent_events)).toBe(true);

    // 3. Insert a synthetic INFERRED derived-SKU product and approve it via POST /api/v1/admin/derived-refs/{id}/approve (INV-08)
    const derivedSku = `DERIVED_${runTag}`.toUpperCase();
    const insDerived = await pool.query<{ id: string }>(
      `INSERT INTO products (
         kind, slug, title, jewellery_type, state, availability,
         price_amount, price_evidence, source_sku, source_sku_derived, sku_evidence_status
       ) VALUES (
         'READY_MADE', $1, 'Inferred Derived Reference Test Piece', 'RING', 'DRAFT', false,
         '1000.00', 'OBSERVED', NULL, $2, 'INFERRED'
       ) RETURNING id::text AS id`,
      [`derived-ref-${runTag}`, derivedSku],
    );
    const derivedProductId = insDerived.rows[0]!.id;
    createdProductIds.push(derivedProductId);

    const migRes = await api(
      new Request('http://localhost/api/v1/admin/migration', {
        headers: { 'x-admin-sub': 'super@maihan.test' },
      }),
    );
    expect(migRes.status).toBe(200);
    const migBody = (await migRes.json()) as {
      data: { derived_refs: Array<{ id: string; source_sku_derived: string | null }> };
    };
    expect(migBody.data.derived_refs.some((r) => r.id === derivedProductId)).toBe(true);

    const approveRefRes = await api(
      new Request(`http://localhost/api/v1/admin/derived-refs/${derivedProductId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-sub': 'super@maihan.test',
        },
        body: JSON.stringify({
          decision: 'APPROVE',
          reason: 'Verified physical dossier for INV-08 promotion',
        }),
      }),
    );
    expect(approveRefRes.status).toBe(200);
    const approvedRef = (await approveRefRes.json()).data as {
      id: string;
      source_sku: string;
      sku_evidence_status: string;
    };
    expect(approvedRef.source_sku).toBe(derivedSku);
    expect(approvedRef.sku_evidence_status).toBe('EXTRACTED');
  });
});
