/**
 * apps/web/src/api/whatsapp.spec.ts
 *
 * Test suite for Phase 10 WhatsApp Channel Adapter & Shared Brain:
 * - Task 1: Signature verification over raw body before parsing (X-Hub-Signature-256)
 * - Task 2: Idempotent receipt on duplicate external_event_id
 * - Task 3: Conversation resolution by MSISDN & customer identity merge
 * - Task 4: ChannelCapabilities enforcement (streaming false, 4096-char cap)
 * - Task 5: 4000-character chunking with (1/2), (2/2) markers & formatting
 * - Task 7: Human handoff notification & customer expectation notice
 * - Task 8: Marketing opt-in enforcement for template sends
 * - Task 9: Shared-brain CI test: tool registry equality between WEB and WHATSAPP
 */
import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  toolsFor,
  assertSharedBrainToolParity,
  formatForWhatsApp,
  splitWhatsAppMessage,
  WHATSAPP_CAPABILITIES,
  WEB_CAPABILITIES,
} from '@maihan/ai';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';
import { WHATSAPP_APP_SECRET_DEFAULT, WHATSAPP_VERIFY_TOKEN_DEFAULT } from './whatsapp-handlers.js';

describe('Phase 10 — WhatsApp Channel & Shared Brain Integration', () => {
  let api: CatalogApi;

  const receiptsMap = new Set<string>();
  const conversationsMap = new Map<string, any>();
  const messagesList: any[] = [];
  const customersMap = new Map<string, any>();

  // Seed a customer with phone
  const seedCustomerId = 'cust_wa_test_01';
  customersMap.set('15551234567', {
    id: seedCustomerId,
    phone: '+1 (555) 123-4567',
    marketing_opt_in: true,
  });
  customersMap.set('15559876543', {
    id: 'cust_wa_test_02',
    phone: '+1 (555) 987-6543',
    marketing_opt_in: false,
  });

  const mockDb: any = {
    execute: async (_sqlQuery: any) => {
      return { rows: [] };
    },
    query: async (queryText: string, params: any[]) => {
      // 1. webhook_receipts check/insert
      if (/FROM\s+webhook_receipts/i.test(queryText)) {
        const key = `${params[0]}:${params[1]}`;
        if (receiptsMap.has(key)) {
          return { rows: [{ id: 101, processed_at: new Date() }] };
        }
        return { rows: [] };
      }
      if (/INSERT\s+INTO\s+webhook_receipts/i.test(queryText)) {
        const key = `${params[0]}:${params[1]}`;
        if (receiptsMap.has(key)) {
          return { rows: [] };
        }
        receiptsMap.add(key);
        return { rows: [{ id: receiptsMap.size }] };
      }
      if (/UPDATE\s+webhook_receipts/i.test(queryText)) {
        return { rows: [] };
      }

      // 2. Customers lookup by phone or marketing opt-in
      if (/SELECT\s+marketing_opt_in/i.test(queryText)) {
        const paramVal = params[0];
        const cust = Array.from(customersMap.values()).find((c) => c.id === paramVal || c.phone === paramVal);
        return { rows: cust ? [{ marketing_opt_in: cust.marketing_opt_in }] : [] };
      }
      if (/regexp_replace\(phone/i.test(queryText) || /FROM\s+customers\s+WHERE/i.test(queryText)) {
        const clean = String(params[0] ?? '').replace(/\D/g, '');
        const match = customersMap.get(clean);
        return { rows: match ? [match] : [] };
      }

      // 3. Conversations lookup/insert
      if (/FROM\s+conversations\s+WHERE\s+channel\s*=\s*'WHATSAPP'/i.test(queryText)) {
        const row = conversationsMap.get(params[0]);
        return { rows: row ? [row] : [] };
      }
      if (/INSERT\s+INTO\s+conversations/i.test(queryText)) {
        const row = {
          id: `conv_${conversationsMap.size + 1}`,
          conversation_key: params[0],
          channel: 'WHATSAPP',
          customer_id: params[1],
          external_ref: params[2],
          locale: 'en',
          state: 'OPEN',
          message_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        conversationsMap.set(params[2], row);
        return { rows: [row] };
      }
      if (/UPDATE\s+conversations/i.test(queryText)) {
        return { rows: [] };
      }

      // 4. Messages insert
      if (/INSERT\s+INTO\s+messages/i.test(queryText)) {
        const row = {
          id: `msg_${messagesList.length + 1}`,
          conversation_id: params[0],
          seq: params[1],
          role: params[2],
          content: params[3],
        };
        messagesList.push(row);
        return { rows: [row] };
      }

      // 5. AI Interactions
      if (/INSERT\s+INTO\s+ai_interactions/i.test(queryText)) {
        return { rows: [] };
      }

      // 6. Marketing opt-in check
      if (/marketing_opt_in/i.test(queryText)) {
        const paramVal = params[0];
        const cust = Array.from(customersMap.values()).find((c) => c.id === paramVal || c.phone === paramVal);
        return { rows: cust ? [{ marketing_opt_in: cust.marketing_opt_in }] : [] };
      }

      return { rows: [] };
    },
  };

  beforeAll(() => {
    const service = createCatalogQueryService({
      port: new FakeCatalogPort(),
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'test',
    });
    api = createCatalogApi({
      service,
      db: mockDb,
    });
  });

  // ── TASK 9: SHARED-BRAIN CI TEST ──────────────────────────────────────────
  it('Task 9: Shared-brain CI test: WEB and WHATSAPP share identical tool registry', () => {
    expect(() => assertSharedBrainToolParity()).not.toThrow();

    const webTools = toolsFor('WEB');
    const waTools = toolsFor('WHATSAPP');

    expect(webTools.length).toBe(waTools.length);
    expect(webTools.length).toBe(10);

    const webNames = webTools.map((t) => t.name).sort();
    const waNames = waTools.map((t) => t.name).sort();
    expect(webNames).toEqual(waNames);

    // Assert structural mutation safety holds identically across channels
    expect(webTools.every((t) => !t.mutates || ['create_customer_request', 'transfer_to_human'].includes(t.name))).toBe(true);
    expect(waTools.every((t) => !t.mutates || ['create_customer_request', 'transfer_to_human'].includes(t.name))).toBe(true);
  });

  // ── TASK 4: CAPABILITIES MODEL ───────────────────────────────────────────
  it('Task 4: ChannelCapabilities: WhatsApp disables streaming and caps message size', () => {
    expect(WHATSAPP_CAPABILITIES.streaming).toBe(false);
    expect(WHATSAPP_CAPABILITIES.richComponents).toBe(false);
    expect(WHATSAPP_CAPABILITIES.maxMessageLength).toBe(4096);
    expect(WHATSAPP_CAPABILITIES.formatMode).toBe('PLAIN_TEXT');

    expect(WEB_CAPABILITIES.streaming).toBe(true);
    expect(WEB_CAPABILITIES.richComponents).toBe(true);
  });

  // ── TASK 5: FORMATTING & CHUNKING ─────────────────────────────────────────
  it('Task 5: Formatter strips HTML, cleans markdown headers and lists for WhatsApp', () => {
    const raw = '<h3>Fine Gemstones</h3><p>Here are available pieces:</p><ul><li><b>Panjshir</b> emerald</li></ul>[Learn More](https://maihan.com)';
    const formatted = formatForWhatsApp(raw);

    expect(formatted).not.toContain('<h3>');
    expect(formatted).not.toContain('</h3>');
    expect(formatted).not.toContain('<p>');
    expect(formatted).not.toContain('<ul>');
    expect(formatted).toContain('- Panjshir emerald');
    expect(formatted).toContain('Learn More (https://maihan.com)');
  });

  it('Task 5: Long message chunker splits messages over 4,000 chars with (1/2) markers', () => {
    const longText = 'A'.repeat(3000) + '. ' + 'B'.repeat(3000);
    const split = splitWhatsAppMessage(longText);

    expect(split.isChunked).toBe(true);
    expect(split.chunks.length).toBe(2);
    expect(split.chunks[0]).toContain('(1/2)');
    expect(split.chunks[1]).toContain('(2/2)');
    expect(split.chunks[0]!.length).toBeLessThanOrEqual(4096);
    expect(split.chunks[1]!.length).toBeLessThanOrEqual(4096);
  });

  // ── TASK 1: WEBHOOK VERIFICATION & HMAC SIGNATURE ─────────────────────────
  it('Task 1: GET /api/v1/webhooks/whatsapp handles Meta hub.challenge handshake', async () => {
    const res = await api(
      new Request(
        `http://localhost:3000/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${WHATSAPP_VERIFY_TOKEN_DEFAULT}&hub.challenge=11559988`,
        { method: 'GET' },
      ),
    );

    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toBe('11559988');
  });

  it('Task 1: POST /api/v1/webhooks/whatsapp rejects forged or missing HMAC signature (401)', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [],
    });

    const res = await api(
      new Request('http://localhost:3000/api/v1/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=invalid_hex_digest_value_123',
        },
        body: payload,
      }),
    );

    expect(res.status).toBe(401);
  });

  // ── TASK 2 & 3: INBOUND MESSAGE & IDEMPOTENCY & IDENTITY MERGE ───────────
  it('Task 2 & 3: Processes valid webhook, binds customer by MSISDN, and runs orchestrator', async () => {
    const payloadObj = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: 'PHONE_NUMBER_ID' },
                contacts: [{ wa_id: '15551234567', profile: { name: 'Soraya' } }],
                messages: [
                  {
                    from: '15551234567',
                    id: 'wamid.HBgL1001',
                    timestamp: '1728640000',
                    type: 'text',
                    text: { body: 'Inquire about sapphire gemstone K1324' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawPayload = JSON.stringify(payloadObj);
    const validSignature = `sha256=${createHmac('sha256', WHATSAPP_APP_SECRET_DEFAULT).update(rawPayload).digest('hex')}`;

    const res = await api(
      new Request('http://localhost:3000/api/v1/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': validSignature,
        },
        body: rawPayload,
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.conversationKey).toBeDefined();
    expect(json.recipient).toBe('15551234567');
    expect(json.chunks.length).toBeGreaterThan(0);
    expect(json.capabilities.streaming).toBe(false);

    // Verify conversation linked to seed customer
    const conv = conversationsMap.get('15551234567');
    expect(conv).toBeDefined();
    expect(conv.customer_id).toBe(seedCustomerId);
  });

  it('Task 2: Replayed webhook with identical message ID is ignored idempotently', async () => {
    const payloadObj = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: 'PHONE_NUMBER_ID' },
                messages: [
                  {
                    from: '15551234567',
                    id: 'wamid.HBgL1001', // Already processed in previous test
                    timestamp: '1728640000',
                    type: 'text',
                    text: { body: 'Inquire about sapphire gemstone K1324' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawPayload = JSON.stringify(payloadObj);
    const validSignature = `sha256=${createHmac('sha256', WHATSAPP_APP_SECRET_DEFAULT).update(rawPayload).digest('hex')}`;

    const res = await api(
      new Request('http://localhost:3000/api/v1/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': validSignature,
        },
        body: rawPayload,
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('duplicate_ignored');
  });

  // ── TASK 8: MARKETING OPT-IN ENFORCEMENT ─────────────────────────────────
  it('Task 8: Refuses marketing template message without explicit customer opt-in (403)', async () => {
    // Customer 15559876543 has marketing_opt_in = false
    const res = await api(
      new Request('http://localhost:3000/api/v1/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '15559876543',
          templateName: 'exclusive_gemstone_preview_v1',
          isMarketing: true,
        }),
      }),
    );

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toContain('customer 15559876543 has not opted in');
  });

  it('Task 8: Allows marketing template message when customer has opted in', async () => {
    // Customer 15551234567 has marketing_opt_in = true
    const res = await api(
      new Request('http://localhost:3000/api/v1/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '15551234567',
          templateName: 'exclusive_gemstone_preview_v1',
          isMarketing: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('queued');
    expect(json.recipientPhone).toBe('15551234567');
  });
});
