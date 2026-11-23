/**
 * apps/worker/src/email/index.ts
 *
 * Build the EmailPort from configuration. This is the ONLY place a transport
 * class is named; every caller sees `EmailPort`.
 */
import type { EmailConfig } from '@maihan/config';

import { NoneEmailTransport, type EmailPort } from './port.js';
import { SinkEmailTransport } from './sink-transport.js';
import { SmtpTransport } from './smtp-transport.js';

export * from './port.js';
export { composeMimeMessage, dotStuff, type ComposedMime, type MimeMessageInput } from './mime.js';
export {
  SinkEmailTransport,
  MailboxPathError,
  resolveMailboxFile,
  type SinkEmailRecord,
  type SinkEmailTransportOptions,
  type SinkFileSystem,
} from './sink-transport.js';
export { SmtpTransport, type SmtpSecurity, type SmtpTransportConfig } from './smtp-transport.js';

function assertNever(value: never): never {
  throw new Error(`EMAIL: unhandled transport ${String(value)}`);
}

export function createEmailPort(config: EmailConfig): EmailPort {
  switch (config.transport) {
    case 'none':
      return new NoneEmailTransport();
    case 'sink':
      return new SinkEmailTransport({
        from: config.from,
        capacity: config.capacity,
        mailboxDir: config.mailboxDir,
        writeToDisk: config.writeToDisk,
      });
    case 'smtp':
      return new SmtpTransport({
        from: config.from,
        host: config.host,
        port: config.port,
        security: config.security,
        user: config.user,
        pass: config.pass,
        allowInsecure: config.allowInsecure,
        timeoutMs: config.timeoutMs,
      });
    default:
      return assertNever(config);
  }
}
