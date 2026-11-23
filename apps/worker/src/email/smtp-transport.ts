/**
 * apps/worker/src/email/smtp-transport.ts
 *
 * A small SMTP client over `node:net` / `node:tls`. No dependency, no vendor.
 *
 * Scope, stated honestly: EHLO, optional STARTTLS or implicit TLS, optional
 * AUTH LOGIN, MAIL/RCPT/DATA/QUIT. No PIPELINING, no DSN, no 8BITMIME
 * negotiation beyond declaring 8bit. That is enough for a transactional relay
 * and small enough to audit.
 *
 * Fail-closed rules:
 *   - a missing host/from/port is a configuration error at CONSTRUCTION, not a
 *     silent no-op at the first order;
 *   - credentials are never sent over a plaintext connection unless
 *     `allowInsecure` was explicitly set;
 *   - STARTTLS is refused when the server does not advertise it, rather than
 *     falling back to plaintext;
 *   - a non-2xx reply at any step is a delivery failure with the code.
 *
 * The transport never logs the recipient, the subject or the body.
 */
import { randomUUID } from 'node:crypto';
import { connect as netConnect, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';

import { composeMimeMessage, dotStuff } from './mime.js';
import { sanitizeMessageId } from './message-id.js';
import {
  EmailConfigError,
  EmailDeliveryError,
  assertBareEmailAddress,
  assertSendable,
  type EmailMessage,
  type EmailPort,
  type EmailSendReceipt,
} from './port.js';

export type SmtpSecurity = 'plain' | 'starttls' | 'tls';

export interface SmtpTransportConfig {
  readonly from: string;
  readonly host: string;
  readonly port: number;
  readonly security: SmtpSecurity;
  readonly user: string | null;
  readonly pass: string | null;
  /** Only for a local relay that offers no TLS. Never set in production. */
  readonly allowInsecure: boolean;
  readonly timeoutMs: number;
  readonly heloName?: string;
  readonly now?: () => Date;
  readonly newMessageId?: () => string;
}

/** One SMTP reply: a code plus every line, continuation markers removed. */
interface SmtpReply {
  readonly code: number;
  readonly lines: readonly string[];
}

/**
 * A line-oriented client over a socket. Responses are read with a queue so a
 * multi-line 250 reply and a single-line 250 reply take the same code path.
 */
class SmtpSession {
  private buffer = '';
  /** Lines that arrived before a reader asked for them. */
  private readonly queuedLines: string[] = [];
  private readonly pending: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private failure: Error | null = null;
  private closing = false;

  constructor(private readonly socket: Socket | TLSSocket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string | Buffer) => this.onData(String(chunk)));
    socket.on('error', (error: Error) => this.fail(error));
    socket.on('close', () => this.fail(new EmailDeliveryError('connection closed by the server')));
    socket.on('timeout', () => this.fail(new EmailDeliveryError('socket timeout')));
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let index = this.buffer.indexOf('\n');
    while (index !== -1) {
      const line = this.buffer.slice(0, index).replace(/\r$/, '');
      this.buffer = this.buffer.slice(index + 1);
      // A reply may arrive as one chunk containing several lines, while the
      // reader consumes them one at a time. Buffer rather than treat the
      // second line as unsolicited data.
      const waiter = this.pending.shift();
      if (waiter !== undefined) {
        waiter.resolve(line);
      } else if (!this.closing) {
        this.queuedLines.push(line);
      }
      index = this.buffer.indexOf('\n');
    }
  }

  private fail(error: Error): void {
    if (this.failure === null) this.failure = error;
    while (this.pending.length > 0) {
      const waiter = this.pending.shift();
      waiter?.reject(this.failure);
    }
  }

  readLine(): Promise<string> {
    if (this.failure !== null) return Promise.reject(this.failure);
    const queued = this.queuedLines.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    return new Promise<string>((resolve, reject) => {
      this.pending.push({ resolve, reject });
    });
  }

  async readReply(): Promise<SmtpReply> {
    const lines: string[] = [];
    for (;;) {
      const line = await this.readLine();
      const match = /^(\d{3})([ -])(.*)$/.exec(line);
      if (match === null) {
        throw new EmailDeliveryError('malformed SMTP reply');
      }
      lines.push(match[3] ?? '');
      if (match[2] === ' ') {
        return { code: Number(match[1]), lines };
      }
      if (lines.length > 100) {
        throw new EmailDeliveryError('SMTP reply is unreasonably long');
      }
    }
  }

  async command(command: string, expected: readonly number[]): Promise<SmtpReply> {
    this.socket.write(`${command}\r\n`);
    const reply = await this.readReply();
    if (!expected.includes(reply.code)) {
      throw new EmailDeliveryError(
        `unexpected reply to ${command.split(' ')[0] ?? 'command'}`,
        reply.code,
      );
    }
    return reply;
  }

  /** Send DATA without waiting for a reply (the body follows in one write). */
  writeRaw(data: string): void {
    this.socket.write(data);
  }

  async quit(): Promise<void> {
    this.closing = true;
    this.socket.removeAllListeners('data');
    try {
      this.socket.write('QUIT\r\n');
    } catch {
      // A relay that closed first is not an error worth surfacing.
    }
    this.socket.end();
  }

  /**
   * Stop listening before the socket is handed to `tls.connect`. Any listener
   * left attached would receive the TLS handshake bytes as SMTP text.
   */
  detach(): void {
    this.socket.removeAllListeners();
    this.socket.pause();
  }

  destroy(): void {
    this.socket.destroy();
  }
}

function assertSmtpConfig(config: Partial<SmtpTransportConfig>): void {
  if (config.host === undefined || config.host.trim() === '') {
    throw new EmailConfigError('SMTP_HOST', 'required for EMAIL_TRANSPORT=smtp');
  }
  if (!Number.isInteger(config.port) || (config.port ?? 0) < 1 || (config.port ?? 0) > 65_535) {
    throw new EmailConfigError('SMTP_PORT', 'must be an integer between 1 and 65535');
  }
  if (
    config.security !== 'plain' &&
    config.security !== 'starttls' &&
    config.security !== 'tls'
  ) {
    throw new EmailConfigError('SMTP_SECURITY', 'must be "plain", "starttls" or "tls"');
  }
  if (config.from === undefined) {
    throw new EmailConfigError('EMAIL_FROM', 'required for EMAIL_TRANSPORT=smtp');
  }
  assertBareEmailAddress(config.from, 'from');
  if (config.security === 'plain' && config.user != null && config.allowInsecure !== true) {
    throw new EmailConfigError(
      'SMTP_SECURITY',
      'refusing to send credentials over plaintext; use starttls or tls',
    );
  }
  if (!Number.isFinite(config.timeoutMs) || (config.timeoutMs ?? 0) < 1_000) {
    throw new EmailConfigError('SMTP_TIMEOUT_MS', 'must be at least 1000');
  }
}

export class SmtpTransport implements EmailPort {
  readonly transport = 'smtp' as const;

  private readonly config: SmtpTransportConfig;

  constructor(config: SmtpTransportConfig) {
    assertSmtpConfig(config);
    this.config = config;
  }

  async send(message: EmailMessage): Promise<EmailSendReceipt> {
    assertSendable(message);

    const messageId = `${sanitizeMessageId((this.config.newMessageId ?? randomUUID)())}@maihan-gems.invalid`;
    const mime = composeMimeMessage({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId,
      date: (this.config.now ?? (() => new Date()))(),
    });

    const socket = await this.openSocket();
    let session = new SmtpSession(socket);
    const deadline = setTimeout(() => {
      session.destroy();
    }, this.config.timeoutMs);
    deadline.unref?.();

    try {
      const capabilities = await this.greet(session);
      session = await this.negotiateSecurity(session, socket, capabilities);
      await this.authenticate(session);
      await session.command(`MAIL FROM:<${this.config.from}>`, [250]);
      await session.command(`RCPT TO:<${message.to}>`, [250, 251]);
      await session.command('DATA', [354]);
      const payload = dotStuff(mime.raw.endsWith('\r\n') ? mime.raw : `${mime.raw}\r\n`);
      session.writeRaw(`${payload}.\r\n`);
      const accepted = await session.readReply();
      if (accepted.code !== 250) {
        throw new EmailDeliveryError('message was not accepted', accepted.code);
      }
      await session.quit();
      return { messageId, transport: 'smtp' };
    } catch (error) {
      session.destroy();
      if (error instanceof EmailDeliveryError || error instanceof EmailConfigError) throw error;
      throw new EmailDeliveryError(error instanceof Error ? error.message : 'unknown failure');
    } finally {
      clearTimeout(deadline);
    }
  }

  private async openSocket(): Promise<Socket | TLSSocket> {
    const { host, port, security, timeoutMs } = this.config;
    if (security === 'tls') {
      return new Promise<TLSSocket>((resolve, reject) => {
        const socket = tlsConnect({ host, port, servername: host });
        socket.setTimeout(timeoutMs);
        socket.once('secureConnect', () => resolve(socket));
        socket.once('error', (error: Error) => reject(new EmailDeliveryError(error.message)));
      });
    }

    return new Promise<Socket>((resolve, reject) => {
      const socket = netConnect({ host, port });
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => resolve(socket));
      socket.once('error', (error: Error) => reject(new EmailDeliveryError(error.message)));
    });
  }

  /** Greet and EHLO; returns the advertised capabilities. */
  private async greet(session: SmtpSession): Promise<readonly string[]> {
    const greeting = await session.readReply();
    if (greeting.code !== 220) {
      throw new EmailDeliveryError('server did not greet', greeting.code);
    }
    const ehlo = await session.command(`EHLO ${this.config.heloName ?? 'maihan-gems-worker'}`, [250]);
    return ehlo.lines;
  }

  /**
   * `plain` sends as-is; `tls` is already encrypted by `openSocket`; `starttls`
   * upgrades in place. A server that does not advertise STARTTLS is refused
   * rather than silently downgraded.
   */
  private async negotiateSecurity(
    session: SmtpSession,
    socket: Socket | TLSSocket,
    capabilities: readonly string[],
  ): Promise<SmtpSession> {
    if (this.config.security === 'plain') {
      if (this.config.user !== null && !this.config.allowInsecure) {
        throw new EmailDeliveryError('refusing to send credentials over plaintext');
      }
      return session;
    }
    if (this.config.security === 'tls') return session;

    if (!capabilities.some((line) => /^STARTTLS\b/i.test(line.trim()))) {
      throw new EmailDeliveryError('server does not offer STARTTLS; refusing plaintext');
    }

    await session.command('STARTTLS', [220]);
    session.detach();

    const secure = await new Promise<TLSSocket>((resolve, reject) => {
      const tls = tlsConnect({ socket, servername: this.config.host });
      tls.setTimeout(this.config.timeoutMs);
      tls.once('secureConnect', () => resolve(tls));
      tls.once('error', (error: Error) => reject(new EmailDeliveryError(error.message)));
    });

    const upgraded = new SmtpSession(secure);
    // RFC 3207: the client must discard prior knowledge and EHLO again.
    await upgraded.command(`EHLO ${this.config.heloName ?? 'maihan-gems-worker'}`, [250]);
    return upgraded;
  }

  private async authenticate(session: SmtpSession): Promise<void> {
    const { user, pass } = this.config;
    if (user === null || pass === null) return;
    await session.command('AUTH LOGIN', [334]);
    await session.command(Buffer.from(user, 'utf8').toString('base64'), [334]);
    await session.command(Buffer.from(pass, 'utf8').toString('base64'), [235]);
  }
}
