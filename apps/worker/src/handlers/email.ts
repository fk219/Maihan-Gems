/**
 * apps/worker/src/handlers/email.ts
 *
 * Transactional email delivery for the notify.email job handler (M-05).
 *
 * Mirrors the storefront's TransactionalEmailProvider contract (same env
 * configuration, same provider order: Resend → Mailtrap → honest
 * OUTBOX_LOG fallback) without importing from apps/web — the worker is a
 * separate process with its own dependency surface.
 */
export interface OutgoingEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly category?: string;
}

export interface EmailDeliveryResult {
  readonly delivered: boolean;
  readonly provider: 'RESEND' | 'MAILTRAP' | 'OUTBOX_LOG';
  readonly messageId: string;
}

const EMAIL_FROM = process.env['EMAIL_FROM'] ?? 'concierge@maihangems.com';

export async function sendTransactionalEmail(email: OutgoingEmail): Promise<EmailDeliveryResult> {
  const resendKey = process.env['RESEND_API_KEY']?.trim() ?? '';
  const mailtrapToken = process.env['MAILTRAP_API_TOKEN']?.trim() ?? '';

  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Resend email delivery failed with HTTP ${response.status}`);
    }
    const data = (await response.json()) as { id?: string };
    return { delivered: true, provider: 'RESEND', messageId: data.id ?? `resend_${Date.now()}` };
  }

  if (mailtrapToken) {
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mailtrapToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: EMAIL_FROM, name: 'Maihan Gems Concierge' },
        to: [{ email: email.to }],
        subject: email.subject,
        text: email.text,
        category: email.category ?? 'transactional',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Mailtrap email delivery failed with HTTP ${response.status}`);
    }
    const data = (await response.json()) as { message_ids?: string[] };
    return {
      delivered: true,
      provider: 'MAILTRAP',
      messageId: data.message_ids?.[0] ?? `mailtrap_${Date.now()}`,
    };
  }

  // No provider configured: record the honest disposition rather than
  // pretending a send occurred. The notification remains readable in-app
  // (recordNotification's own row) — nothing is lost, nothing is faked.
  return {
    delivered: false,
    provider: 'OUTBOX_LOG',
    messageId: `outbox_${Date.now()}`,
  };
}
