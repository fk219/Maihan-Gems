/**
 * packages/contracts/src/dto/whatsapp/index.ts
 *
 * Authority: technical_design/20_WHATSAPP_ARCHITECTURE.md §2, §7, §8
 *
 * Zod DTO contracts for Meta WhatsApp Cloud API webhooks & messages:
 * - Inbound webhook envelope (entry, changes, messages, statuses)
 * - Channel capabilities (non-streaming, length capped, text/media)
 * - Template message requests (outside 24-hr customer service window)
 * - Opt-in record verification
 */
import { z } from 'zod';

export const WhatsAppMessageSenderSchema = z
  .object({
    wa_id: z.string(),
    profile: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export const WhatsAppTextPayloadSchema = z
  .object({
    body: z.string(),
  })
  .strict();

export const WhatsAppMediaPayloadSchema = z
  .object({
    id: z.string(),
    mime_type: z.string(),
    sha256: z.string().optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
  })
  .strict();

export const WhatsAppInboundMessageSchema = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string(),
    type: z.enum(['text', 'image', 'document', 'audio', 'video', 'interactive', 'button']),
    text: WhatsAppTextPayloadSchema.optional(),
    image: WhatsAppMediaPayloadSchema.optional(),
    document: WhatsAppMediaPayloadSchema.optional(),
  })
  .passthrough();

export const WhatsAppInboundValueSchema = z
  .object({
    messaging_product: z.literal('whatsapp'),
    metadata: z
      .object({
        display_phone_number: z.string().optional(),
        phone_number_id: z.string(),
      })
      .passthrough(),
    contacts: z.array(WhatsAppMessageSenderSchema).optional(),
    messages: z.array(WhatsAppInboundMessageSchema).optional(),
    statuses: z.array(z.record(z.unknown())).optional(),
  })
  .passthrough();

export const WhatsAppWebhookEntrySchema = z
  .object({
    id: z.string(),
    changes: z.array(
      z
        .object({
          value: WhatsAppInboundValueSchema,
          field: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const WhatsAppWebhookPayloadSchema = z
  .object({
    object: z.literal('whatsapp_business_account'),
    entry: z.array(WhatsAppWebhookEntrySchema),
  })
  .passthrough();

export type WhatsAppWebhookPayload = z.infer<typeof WhatsAppWebhookPayloadSchema>;
export type WhatsAppInboundMessage = z.infer<typeof WhatsAppInboundMessageSchema>;

export const WhatsAppSendTextRequestSchema = z
  .object({
    recipientPhone: z.string().min(5),
    message: z.string().min(1).max(4096),
    previewUrl: z.boolean().optional(),
  })
  .strict();

export type WhatsAppSendTextRequest = z.infer<typeof WhatsAppSendTextRequestSchema>;

export const WhatsAppSendTemplateRequestSchema = z
  .object({
    recipientPhone: z.string().min(5),
    templateName: z.string(),
    languageCode: z.string().default('en'),
    components: z.array(z.record(z.unknown())).optional(),
  })
  .strict();

export type WhatsAppSendTemplateRequest = z.infer<typeof WhatsAppSendTemplateRequestSchema>;
