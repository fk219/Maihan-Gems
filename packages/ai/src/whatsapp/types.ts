/**
 * packages/ai/src/whatsapp/types.ts
 *
 * Authority: technical_design/20_WHATSAPP_ARCHITECTURE.md §3, §4, §6
 *
 * Channel capabilities, message formatting, and WhatsApp transport models.
 */

export interface ChannelCapabilities {
  readonly streaming: boolean;
  readonly richComponents: boolean;
  readonly maxMessageLength: number;
  readonly supportsButtons: boolean;
  readonly supportsMedia: boolean;
  readonly formatMode: 'MARKDOWN_COMPACT' | 'PLAIN_TEXT';
}

export const WHATSAPP_CAPABILITIES: ChannelCapabilities = {
  streaming: false,
  richComponents: false,
  maxMessageLength: 4096,
  supportsButtons: false,
  supportsMedia: true,
  formatMode: 'PLAIN_TEXT',
};

export const WEB_CAPABILITIES: ChannelCapabilities = {
  streaming: true,
  richComponents: true,
  maxMessageLength: Infinity,
  supportsButtons: true,
  supportsMedia: true,
  formatMode: 'MARKDOWN_COMPACT',
};

export interface WhatsAppSplitMessage {
  readonly chunks: ReadonlyArray<string>;
  readonly isChunked: boolean;
}

export interface WhatsAppTemplatePayload {
  readonly templateName: string;
  readonly languageCode: string;
  readonly recipientPhone: string;
  readonly parameters?: Record<string, string>;
}
