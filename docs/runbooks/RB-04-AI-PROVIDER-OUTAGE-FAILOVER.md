# RB-04: AI Provider Outage & Grounding Failover Runbook

**Document ID:** `RB-04-AI-PROVIDER-OUTAGE-FAILOVER`  
**Severity:** P1  
**Trigger:** `ai_grounded_ratio < 0.60` (10m window) or upstream AI provider returning 5xx / timeout rate $> 5\%$.  
**Owner:** `ai-operations`  
**Escalation Path:** AI Lead $\to$ Product Director  

---

## 1. Initial Triage

1. **Verify Alert Dimension:**
   - **Grounding Collapse (`ai_grounded_ratio < 0.60`):** The model is generating claims that cannot be resolved to citations or verified catalog facts (ADR-003, technical_design/18, doc 28 §2).
   - **Provider Outage:** Primary model gateway (e.g. Anthropic/OpenAI via gateway) unreachable or rate-limited.
2. **Examine AI Telemetry:**
   - Check `packages/ai` logs: inspect `event: "ai.grounding.violation"` and `event: "ai.guardrail.trigger"`.
   - Ensure NO customer prompt or conversation text is leaked into unredacted logs (`content_redacted` only).

---

## 2. Emergency Mitigation Procedures

### Step 1: Immediate Safety Gate
If `ai_grounded_ratio` drops below 0.50, activate the emergency failover switch in application config:
```bash
# Force AI Concierge into honest customer handoff fallback
AI_GROUNDING_FAILSAFE_ACTIVE=true
```
Under this setting:
- The orchestrator gracefully halts synthetic product generation.
- It provides honest customer advisory: *"Our gemologists are currently curating custom recommendations. May we connect you directly with a specialist?"*
- Immediately routes inquiries to `AWAITING_HUMAN` queue.

### Step 2: Model Gateway Provider Failover
- If primary provider is reporting errors, verify secondary provider configured in `ModelGateway` (e.g. OpenRouter fallback).
- The `ModelGateway` failover chain automatically executes:
  1. Primary Provider (e.g. Claude 3.5 Sonnet) $\to$
  2. Alternative Provider $\to$
  3. Strict Refusal / Human Handoff.

### Step 3: Inspect Vector Retrieval & Corpus Quality
- Ensure pgvector embeddings table `knowledge_chunks` is accessible.
- Verify similarity threshold and confidence cutoff are not returning empty citation sets.

---

## 3. Exit Criteria

1. `ai_grounded_ratio` stabilizes above $0.80$ over 20 consecutive turns.
2. Provider error rate drops to $0\%$.
3. Human handoff queue transitions smoothly.
