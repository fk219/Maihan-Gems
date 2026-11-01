/**
 * Transactional email seam.
 *
 * There is no provider configured, so messages are written to
 * `fresh.email_outbox` (state QUEUED) and logged in dev. Nothing is claimed
 * to have been delivered: a production provider drains the outbox and marks
 * rows SENT. Callers pass plain text; no secrets belong in the body.
 */
import type { AnyClient } from './db.js';
import { log } from './logging.js';

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
  kind?: 'TRANSACTIONAL' | 'MARKETING';
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const linkify = (value: string): string => {
  const escaped = escapeHtml(value);
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) =>
    `<a href="${url}" style="color:#9A7B2C;text-decoration:underline;word-break:break-all;">${url}</a>`);
};

const bodyToHtml = (body: string): string =>
  body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;color:#4A4238;font-size:15px;line-height:1.7;">${linkify(paragraph).replaceAll('\n', '<br />')}</p>`)
    .join('');

export function renderEmailHtml(subject: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F2EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2EE;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FBF8F2;border:1px solid #E8DFCE;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#14110D;padding:34px 34px 30px;text-align:center;">
                <p style="margin:0 0 10px;color:#D4AF37;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;font-family:Arial,sans-serif;">Geneva · New York · London</p>
                <p style="margin:0;color:#F6F2E9;font-size:30px;letter-spacing:0.18em;font-family:Georgia,'Times New Roman',serif;">MAIHAN GEMS</p>
                <p style="margin:8px 0 0;color:#A39E93;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-family:Arial,sans-serif;">Natural gemstones &amp; fine jewelry</p>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 34px 10px;">
                <p style="margin:0 0 8px;color:#9A7B2C;font-size:10px;letter-spacing:0.26em;text-transform:uppercase;font-family:Arial,sans-serif;">Private client services</p>
                <h1 style="margin:0 0 22px;color:#1A1612;font-size:25px;line-height:1.25;font-weight:normal;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(subject)}</h1>
                <div style="height:2px;width:42px;background:linear-gradient(90deg,#F3DFA2,#D4AF37 55%,#9A7B2C);margin:0 0 24px;"></div>
                ${bodyToHtml(body)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 34px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8DFCE;padding-top:20px;">
                  <tr>
                    <td style="padding-top:20px;color:#8A857B;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
                      The atelier replies to this message personally. If you did not request this correspondence, no action is required.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#14110D;padding:22px 34px;text-align:center;">
                <p style="margin:0;color:#D4AF37;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;font-family:Arial,sans-serif;">Maihan Gems · Private Client Services</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function queueEmail(client: AnyClient, email: OutboundEmail): Promise<number> {
  const { rows } = await client.query(
    `INSERT INTO fresh.email_outbox (to_email, subject, body, kind)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [email.to, email.subject, email.body, email.kind ?? 'TRANSACTIONAL'],
  );
  const id = Number(rows[0]!.id);
  if (process.env.MAIHAN_ENV !== 'production') {
    log('info', 'email queued (dev transport)', { outbox_id: id, to: email.to, subject: email.subject });
  }
  return id;
}

export function resetEmail(kind: 'CUSTOMER' | 'VENDOR' | 'ADMIN', token: string): { subject: string; body: string } {
  const label = kind === 'VENDOR' ? 'Partner Atelier' : kind === 'ADMIN' ? 'Maison Operations' : 'Maihan Gems';
  const body = [
    `A password reset was requested for your ${label} account.`,
    '',
    `Reset token: ${token}`,
    '',
    'The token expires in 60 minutes and can be used once.',
    'If you did not request this, no action is required — your password is unchanged.',
  ].join('\n');
  return { subject: `${label} — password reset`, body };
}

export function verificationEmail(token: string): { subject: string; body: string } {
  const link = `${process.env.SITE_URL ?? 'http://localhost:3000'}/account?verify=${token}`;
  return {
    subject: 'Maihan Gems — verify your email',
    body: [
      'Confirm your email address to complete your Maihan Gems client account.',
      '',
      `Verification link: ${link}`,
      `Verification token: ${token}`,
      '',
      'The link expires in 24 hours. If you did not create an account, no action is required.',
    ].join('\n'),
  };
}

export function orderEmail(orderNumber: string, total: string, currency: string, accessToken?: string): { subject: string; body: string } {
  return {
    subject: `Maihan Gems — order ${orderNumber}`,
    body: [
      `Your order ${orderNumber} has been recorded.`,
      `Total: ${total} ${currency}`,
      '',
      ...(accessToken
        ? [`Confirmation (private link): ${process.env.SITE_URL ?? 'http://localhost:3000'}/checkout/confirmation/${orderNumber}?token=${accessToken}`, '']
        : []),
      'The atelier confirms settlement and dispatch by email.',
    ].join('\n'),
  };
}


export function paymentEmail(orderNumber: string, total: string, currency: string): { subject: string; body: string } {
  return {
    subject: `Maihan Gems — payment received for ${orderNumber}`,
    body: [
      `Payment for order ${orderNumber} has been recorded.`,
      `Amount: ${total} ${currency}`,
      '',
      'The atelier now prepares your piece for insured dispatch.',
    ].join('\n'),
  };
}

export function shippedEmail(orderNumber: string, carrier: string, trackingNumber: string): { subject: string; body: string } {
  return {
    subject: `Maihan Gems — ${orderNumber} has shipped`,
    body: [
      `Order ${orderNumber} is on its way.`,
      `Carrier: ${carrier}`,
      `Tracking: ${trackingNumber}`,
      '',
      'The atelier confirms delivery by email.',
    ].join('\n'),
  };
}

export function cancelledEmail(orderNumber: string, refunded: number | null, currency: string): { subject: string; body: string } {
  return {
    subject: `Maihan Gems — ${orderNumber} cancelled`,
    body: [
      `Order ${orderNumber} has been cancelled.`,
      ...(refunded && refunded > 0
        ? [`A refund of ${refunded.toFixed(2)} ${currency} has been recorded and is pending settlement.`, '']
        : []),
      'Reserved stones have returned to the vault.',
    ].join('\n'),
  };
}

/* ------------------------------------------------------------ outbox drain */

export interface DispatchResult {
  provider_configured: boolean;
  sent: number;
  failed: number;
  queued: number;
}

/**
 * Drain QUEUED outbox rows through the configured provider (Resend REST).
 * Without RESEND_API_KEY this is a no-op: rows stay QUEUED and the call says
 * so — delivery is never claimed.
 */
export async function dispatchOutbox(client: AnyClient, limit = 50): Promise<DispatchResult> {
  const key = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'] ?? 'concierge@maihangems.com';
  const { rows } = await client.query(
    `SELECT id, to_email, subject, body FROM fresh.email_outbox WHERE state = 'QUEUED' ORDER BY id LIMIT $1`,
    [Math.min(limit, 200)],
  );
  if (!key) return { provider_configured: false, sent: 0, failed: 0, queued: rows.length };

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: row.to_email, subject: row.subject, text: row.body, html: renderEmailHtml(row.subject, row.body) }),
      });
      if (res.ok) {
        await client.query(`UPDATE fresh.email_outbox SET state = 'SENT', sent_at = now(), attempts = attempts + 1 WHERE id = $1`, [row.id]);
        sent += 1;
      } else {
        const text = (await res.text().catch(() => '')).slice(0, 500);
        await client.query(
          `UPDATE fresh.email_outbox
           SET attempts = attempts + 1, last_error = $2,
               state = CASE WHEN attempts + 1 >= 5 THEN 'FAILED' ELSE 'QUEUED' END
           WHERE id = $1`,
          [row.id, text],
        );
        failed += 1;
      }
    } catch (cause) {
      await client.query(
        `UPDATE fresh.email_outbox
         SET attempts = attempts + 1, last_error = $2,
             state = CASE WHEN attempts + 1 >= 5 THEN 'FAILED' ELSE 'QUEUED' END
         WHERE id = $1`,
        [row.id, cause instanceof Error ? cause.message.slice(0, 500) : 'dispatch failed'],
      );
      failed += 1;
    }
  }
  return { provider_configured: true, sent, failed, queued: rows.length - sent - failed };
}

export async function outboxSummary(client: AnyClient) {
  const { rows } = await client.query(
    `SELECT state, count(*)::int AS count FROM fresh.email_outbox GROUP BY state`,
  );
  const queued = rows.find((r) => r.state === 'QUEUED')?.count ?? 0;
  const sent = rows.find((r) => r.state === 'SENT')?.count ?? 0;
  const failed = rows.find((r) => r.state === 'FAILED')?.count ?? 0;
  return { queued, sent, failed, provider_configured: Boolean(process.env['RESEND_API_KEY']) };
}


export async function listOutbox(client: AnyClient, limit = 50) {
  const { rows } = await client.query(
    `SELECT id, to_email, subject, state, attempts, last_error, created_at::text AS created_at, sent_at::text AS sent_at
     FROM fresh.email_outbox ORDER BY id DESC LIMIT $1`,
    [Math.min(limit, 200)],
  );
  return rows;
}
