/**
 * apps/worker/src/email/sink-transport.ts
 *
 * The default transport. It accepts a message, keeps the last N in a bounded
 * ring buffer, and — in development only — writes the rendered message under
 * `./.mail` so a human can open it.
 *
 * Two safety properties, both tested:
 *
 *   1. BOUNDED. The ring buffer drops the oldest record when full. An unbounded
 *      in-memory mailbox is a memory leak with a PII payload.
 *
 *   2. CONTAINED. The filename is generated entirely from the clock and a
 *      random id; no user-controlled value ever reaches a path. `resolveMailboxFile`
 *      then proves the resolved path is inside the mailbox root and throws
 *      otherwise, so a bug in filename construction cannot escape the
 *      directory. Nothing is written outside it.
 *
 * The sink never logs. A caller may read `messages()` in a test; production
 * code has no reason to.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import { composeMimeMessage } from './mime.js';
import { sanitizeMessageId } from './message-id.js';
import {
  EmailDeliveryError,
  assertBareEmailAddress,
  assertSendable,
  type EmailMessage,
  type EmailPort,
  type EmailSendReceipt,
} from './port.js';

export class MailboxPathError extends Error {
  constructor(candidate: string) {
    super(`[EMAIL] refusing to write outside the mailbox directory: ${candidate}`);
    this.name = 'MailboxPathError';
  }
}

/**
 * Resolve a filename inside a mailbox root, refusing anything that escapes it.
 * Exported so the containment property is unit-testable on its own.
 */
export function resolveMailboxFile(root: string, fileName: string): string {
  const rootPath = resolve(root);
  const filePath = resolve(rootPath, fileName);
  if (filePath === rootPath || !filePath.startsWith(`${rootPath}${sep}`)) {
    throw new MailboxPathError(filePath);
  }
  return filePath;
}

export interface SinkFileSystem {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, data: string): Promise<void>;
}

const NODE_FILE_SYSTEM: SinkFileSystem = {
  async mkdir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  },
  async writeFile(path: string, data: string): Promise<void> {
    // `wx` refuses to overwrite: a collision is a bug, not a silent loss.
    await writeFile(path, data, { encoding: 'utf8', flag: 'wx' });
  },
};

export interface SinkEmailRecord extends EmailMessage {
  readonly messageId: string;
  readonly from: string;
  readonly acceptedAt: string;
  /** Absolute path when persisted, null when the sink is memory-only. */
  readonly persistedPath: string | null;
}

export interface SinkEmailTransportOptions {
  readonly from: string;
  /** Ring buffer capacity. Clamped to 1..10 000; default 100. */
  readonly capacity?: number;
  /** Directory for `.eml` files. Default `./.mail`. */
  readonly mailboxDir?: string;
  /** Development only. Config refuses this in production. */
  readonly writeToDisk?: boolean;
  readonly now?: () => Date;
  readonly newMessageId?: () => string;
  readonly fileSystem?: SinkFileSystem;
}

export class SinkEmailTransport implements EmailPort {
  readonly transport = 'sink' as const;

  private readonly from: string;
  private readonly capacity: number;
  private readonly mailboxDir: string;
  private readonly writeToDisk: boolean;
  private readonly now: () => Date;
  private readonly newMessageId: () => string;
  private readonly fileSystem: SinkFileSystem;
  private readonly records: SinkEmailRecord[] = [];
  private sequence = 0;

  constructor(options: SinkEmailTransportOptions) {
    this.from = assertBareEmailAddress(options.from, 'from');
    const capacity = Math.floor(options.capacity ?? 100);
    this.capacity = Math.min(Math.max(Number.isFinite(capacity) ? capacity : 100, 1), 10_000);
    this.mailboxDir = options.mailboxDir ?? '.mail';
    this.writeToDisk = options.writeToDisk === true;
    this.now = options.now ?? (() => new Date());
    this.newMessageId = options.newMessageId ?? randomUUID;
    this.fileSystem = options.fileSystem ?? NODE_FILE_SYSTEM;
  }

  /** A copy: a caller cannot mutate the buffer or hold a growing reference. */
  messages(): readonly SinkEmailRecord[] {
    return this.records.map((record) => ({ ...record }));
  }

  get size(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
  }

  async send(message: EmailMessage): Promise<EmailSendReceipt> {
    assertSendable(message);

    const acceptedAt = this.now();
    const messageId = `${sanitizeMessageId(this.newMessageId())}@maihan-gems.invalid`;
    const mime = composeMimeMessage({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId,
      date: acceptedAt,
    });

    let persistedPath: string | null = null;
    if (this.writeToDisk) {
      persistedPath = await this.persist(mime.raw, acceptedAt);
    }

    this.sequence += 1;
    this.records.push({
      messageId,
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      acceptedAt: acceptedAt.toISOString(),
      persistedPath,
    });
    while (this.records.length > this.capacity) this.records.shift();

    return { messageId, transport: 'sink' };
  }

  /**
   * The filename is built from the clock, a counter and the random message id.
   * Not one character of the recipient or subject participates, so a hostile
   * value cannot influence the path even before containment is checked.
   */
  private async persist(raw: string, acceptedAt: Date): Promise<string> {
    const stamp = acceptedAt.toISOString().replace(/[:.]/g, '-');
    const fileName = `${stamp}-${String(this.sequence).padStart(6, '0')}.eml`;
    const filePath = resolveMailboxFile(this.mailboxDir, fileName);
    try {
      await this.fileSystem.mkdir(resolve(this.mailboxDir));
      await this.fileSystem.writeFile(filePath, raw);
    } catch (error) {
      throw new EmailDeliveryError(
        `sink could not persist the message: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
    return filePath;
  }
}
