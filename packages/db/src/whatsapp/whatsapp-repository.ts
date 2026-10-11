/**
 * packages/db/src/whatsapp/whatsapp-repository.ts
 *
 * Authority: technical_design/20_WHATSAPP_ARCHITECTURE.md §2, §4, §7
 *
 * Repository operations for WhatsApp channel integration:
 * - Webhook receipt idempotency (unique provider, external_event_id)
 * - Customer binding via phone (MSISDN lookup & linking)
 * - Conversation resolution by external_ref (channel='WHATSAPP', external_ref=wa_id)
 * - Opt-in checking & recording
 */
import type { DbClient, ConversationRow } from '../ai/ai-repository.js';

export interface CustomerPhoneMatch {
  readonly id: string;
  readonly phone: string | null;
  readonly marketing_opt_in: boolean;
}

/**
 * Record a webhook receipt idempotently using direct SQL.
 */
export async function recordWhatsAppReceipt(
  client: DbClient | any,
  input: {
    readonly provider: string;
    readonly externalEventId: string;
    readonly signatureValid: boolean;
    readonly eventType?: string | null;
    readonly payload: Record<string, unknown>;
  },
): Promise<{ id?: number; isDuplicate: boolean }> {
  // Check if exists
  const checkSql = `
    SELECT id, processed_at
    FROM webhook_receipts
    WHERE provider = $1 AND external_event_id = $2
    LIMIT 1;
  `;
  const existing = await client.query(checkSql, [input.provider, input.externalEventId]);
  if (existing.rows.length > 0) {
    return { id: existing.rows[0].id, isDuplicate: true };
  }

  const insertSql = `
    INSERT INTO webhook_receipts (
      provider, external_event_id, signature_valid, event_type, payload
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (provider, external_event_id) DO NOTHING
    RETURNING id;
  `;
  const res = await client.query(insertSql, [
    input.provider,
    input.externalEventId,
    input.signatureValid,
    input.eventType ?? null,
    JSON.stringify(input.payload),
  ]);

  if (res.rows.length === 0) {
    return { isDuplicate: true };
  }
  return { id: res.rows[0].id, isDuplicate: false };
}

/**
 * Mark a webhook receipt as processed.
 */
export async function markWebhookProcessed(
  client: DbClient | any,
  receiptId: number,
  error?: string | null,
): Promise<void> {
  await client.query(
    'UPDATE webhook_receipts SET processed_at = now(), processing_error = $2 WHERE id = $1;',
    [receiptId, error ?? null],
  );
}

/**
 * Lookup customer by phone number (MSISDN).
 * Normalizes phone by stripping leading '+' for exact or suffix match.
 */
export async function findCustomerByPhone(
  client: DbClient | any,
  phone: string,
): Promise<CustomerPhoneMatch | null> {
  const clean = phone.replace(/\D/g, '');
  const query = `
    SELECT id, phone, marketing_opt_in
    FROM customers
    WHERE regexp_replace(phone, '\\D', '', 'g') = $1
       OR regexp_replace(phone, '\\D', '', 'g') LIKE '%' || $1
    LIMIT 1;
  `;
  const res = await client.query(query, [clean]);
  return res.rows[0] ?? null;
}

/**
 * Resolve or create a WhatsApp conversation by thread key (external_ref = wa_id).
 */
export async function resolveWhatsAppConversation(
  client: DbClient | any,
  waId: string,
  customerId?: string | null,
): Promise<ConversationRow> {
  const selectQuery = `
    SELECT * FROM conversations
    WHERE channel = 'WHATSAPP' AND external_ref = $1
    LIMIT 1;
  `;
  const existing = await client.query(selectQuery, [waId]);
  if (existing.rows.length > 0) {
    const row: ConversationRow = existing.rows[0];
    // If newly discovered customerId and existing conversation has no customer_id, link them
    if (customerId && !row.customer_id) {
      const updateQuery = `
        UPDATE conversations
        SET customer_id = $2, updated_at = now()
        WHERE id = $1
        RETURNING *;
      `;
      const updated = await client.query(updateQuery, [row.id, customerId]);
      return updated.rows[0];
    }
    return row;
  }

  // Create new conversation
  const convKey = `wa_${waId}_${Date.now().toString(36)}`;
  const insertQuery = `
    INSERT INTO conversations (
      conversation_key, channel, customer_id, external_ref, locale, state
    ) VALUES ($1, 'WHATSAPP', $2, $3, 'en', 'OPEN')
    RETURNING *;
  `;
  const created = await client.query(insertQuery, [convKey, customerId ?? null, waId]);
  return created.rows[0];
}

/**
 * Check whether a customer has opted in to marketing communication.
 */
export async function checkMarketingOptIn(
  client: DbClient | any,
  customerId: string,
): Promise<boolean> {
  const res = await client.query(
    'SELECT marketing_opt_in FROM customers WHERE id = $1;',
    [customerId],
  );
  if (res.rows.length === 0) return false;
  return Boolean(res.rows[0].marketing_opt_in);
}
