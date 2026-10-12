# RB-05: WhatsApp Webhook Failures & Deduplication Degradation Runbook

**Document ID:** `RB-05-WHATSAPP-WEBHOOK-FAILURES`  
**Severity:** P1  
**Trigger:** `whatsapp_webhook_failure_rate > 1.0%` (5m window) or signature verification rejection spike.  
**Owner:** `integrations-oncall`  
**Escalation Path:** Integrations Lead $\to$ VP Operations  

---

## 1. Initial Triage

1. **Verify Webhook Receipt Status:**
   - Check API endpoint logs for `POST /api/v1/webhooks/whatsapp`.
   - Inspect status codes:
     - 401 / 403: Signature verification failure (`X-Hub-Signature-256` mismatch).
     - 422: Malformed payload structure.
     - 500: Database idempotency check or orchestrator processing error.
2. **Verify Meta Webhook Delivery Health:**
   - Check Meta WhatsApp Cloud API developer portal for webhook status and delivery latency.

---

## 2. Root Cause Analysis & Mitigation

| Cause | Indicator | Fix Action |
|---|---|---|
| **App Secret Mismatch** | Spike in `WHATSAPP_INVALID_SIGNATURE` | Verify `WHATSAPP_APP_SECRET` in environment variables. Ensure no extra whitespace or quotes. |
| **Raw Body Parsing Drift** | Signature check fails after middleware changes | Confirm HMAC is calculated strictly over the raw bytes BEFORE any JSON parsing (`technical_design/20 §1`). |
| **Idempotency Lock Contention** | Database timeouts on `webhook_receipts` insert | Inspect duplicate event delivery from Meta. Idempotency logic must handle concurrent deliveries with `ON CONFLICT DO NOTHING` or unique transaction isolation. |
| **24-Hour Service Window Expiry** | Outbound messages rejected by Meta API | Verify session window expiration. Switch to registered Meta WhatsApp utility templates for notifications outside the window. |

---

## 3. Recovery Verification

1. Send synthetic test webhook with valid test HMAC signature:
   ```bash
   pnpm --filter @maihan/web test src/api/whatsapp.spec.ts
   ```
2. Confirm 100% pass on signature verification and idempotency deduplication.
3. Observe `whatsapp_webhook_failure_rate` drop below $0.1\%$ in metrics.
