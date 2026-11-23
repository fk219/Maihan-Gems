/**
 * packages/domain/src/notifications/index.ts
 *
 * The notification surface: types, escaping primitives and renderers.
 * Public surface only — no I/O, no clock, no configuration.
 */
export * from './types.js';
export {
  escapeHtml,
  formatIsoDate,
  formatIsoDateTime,
  formatMoney,
  safeAmount,
  safeCurrencyCode,
  safeHttpUrl,
  sanitizeHeaderValue,
  sanitizeTextValue,
} from './escaping.js';
export { renderNotification } from './templates.js';
