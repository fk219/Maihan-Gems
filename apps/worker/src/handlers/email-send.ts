/**
 * apps/worker/src/handlers/email-send.ts
 *
 * THE ONLY MODULE THAT SENDS EMAIL.
 *
 * Every other handler queues a job; this one renders and delivers. Keeping the
 * EmailPort out of the event handlers is what makes that a structural fact
 * rather than a convention: a reviewer can grep for `EmailPort` and find one
 * handler.
 *
 * The payload is re-validated against the notification contract before
 * rendering, because a job row can be written by any process and read by a
 * later deploy. A payload that does not parse dead-letters on the first
 * attempt; retrying it can never help.
 *
 * Logging: kind, message id, transport, job id. Never the address, the subject
 * or the body.
 */
import {
  EMAIL_SEND_JOB_TYPE,
  NotificationRequestSchema,
  type NotificationRequest,
} from '@maihan/contracts';
import { renderNotification, type RenderedNotification } from '@maihan/domain';

import { PermanentJobError } from '../dispatch/errors.js';
import { parseJobPayload } from '../dispatch/parse.js';
import type { JobHandler } from '../dispatch/registry.js';
import { EmailValidationError, type EmailPort, type EmailSendReceipt } from '../email/port.js';

function render(request: NotificationRequest): RenderedNotification {
  switch (request.kind) {
    case 'order_confirmation':
      return renderNotification('order_confirmation', request.data);
    case 'shipping_update':
      return renderNotification('shipping_update', request.data);
    case 'password_reset':
      return renderNotification('password_reset', request.data);
    case 'email_verification':
      return renderNotification('email_verification', request.data);
    case 'vendor_approved':
      return renderNotification('vendor_approved', request.data);
    case 'vendor_suspended':
      return renderNotification('vendor_suspended', request.data);
  }
}

export interface EmailSendHandlerDeps {
  readonly email: EmailPort;
}

export function createEmailSendJobHandler(deps: EmailSendHandlerDeps): JobHandler {
  return async function handleEmailSend(job, ctx): Promise<void> {
    const request = parseJobPayload(NotificationRequestSchema, job.payload, EMAIL_SEND_JOB_TYPE);

    let rendered: RenderedNotification;
    try {
      rendered = render(request);
    } catch {
      throw new PermanentJobError('notification template could not be rendered');
    }

    let receipt: EmailSendReceipt;
    try {
      receipt = await deps.email.send({
        to: request.recipient.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
    } catch (error) {
      if (error instanceof EmailValidationError) {
        // A message the transport refuses to validate will be refused forever.
        throw new PermanentJobError(error.message);
      }
      throw error;
    }

    ctx.logger.info('email.sent', 'Transactional email accepted by the transport', {
      kind: request.kind,
      message_id: receipt.messageId,
      transport: receipt.transport,
      job_id: job.id,
    });
  };
}
