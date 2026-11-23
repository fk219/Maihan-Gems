/**
 * apps/worker/src/email/sink-transport.spec.ts
 *
 * The sink's two safety properties:
 *   - the ring buffer is BOUNDED (a memory leak with PII is still a leak);
 *   - a file write can never land outside the mailbox directory, and the
 *     filename is built from the clock and a random id, never from the message.
 *
 * Disk writes go to a fresh temp directory, never to the repository's `.mail`.
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MailboxPathError,
  SinkEmailTransport,
  resolveMailboxFile,
} from './sink-transport.js';

const MESSAGE = {
  to: 'ada@example.com',
  subject: 'Order MG-2026-000123 confirmed',
  text: 'Hello Ada,\n\nThank you for your order.',
  html: '<p>Hello Ada,</p><p>Thank you for your order.</p>',
};

const created: string[] = [];

async function tempMailbox(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'maihan-mail-'));
  created.push(directory);
  return directory;
}

afterEach(async () => {
  while (created.length > 0) {
    const directory = created.pop();
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
});

describe('SinkEmailTransport — ring buffer', () => {
  it('keeps only the last N messages', async () => {
    const sink = new SinkEmailTransport({
      from: 'no-reply@maihan-gems.invalid',
      capacity: 2,
      writeToDisk: false,
    });
    for (let index = 0; index < 5; index += 1) {
      await sink.send({ ...MESSAGE, subject: `Message ${index}` });
    }
    expect(sink.size).toBe(2);
    expect(sink.messages().map((record) => record.subject)).toEqual(['Message 3', 'Message 4']);
  });

  it('returns a copy, so a caller cannot mutate the buffer', async () => {
    const sink = new SinkEmailTransport({ from: 'no-reply@maihan-gems.invalid' });
    await sink.send(MESSAGE);
    const snapshot = sink.messages() as unknown as Array<{ subject: string }>;
    snapshot[0]!.subject = 'mutated';
    expect(sink.messages()[0]?.subject).toBe(MESSAGE.subject);
  });

  it('returns a receipt with a message id and the transport name', async () => {
    const sink = new SinkEmailTransport({
      from: 'no-reply@maihan-gems.invalid',
      newMessageId: () => 'fixed-id',
    });
    const receipt = await sink.send(MESSAGE);
    expect(receipt).toEqual({ messageId: 'fixed-id@maihan-gems.invalid', transport: 'sink' });
  });

  it('refuses a message with a header injection before recording it', async () => {
    const sink = new SinkEmailTransport({ from: 'no-reply@maihan-gems.invalid' });
    await expect(
      sink.send({ ...MESSAGE, subject: 'Hello\r\nBcc: attacker@example.com' }),
    ).rejects.toThrow(/control character/);
    expect(sink.size).toBe(0);
  });

  it('refuses a recipient with an injected second address', async () => {
    const sink = new SinkEmailTransport({ from: 'no-reply@maihan-gems.invalid' });
    await expect(
      sink.send({ ...MESSAGE, to: 'ada@example.com, attacker@example.com' }),
    ).rejects.toThrow(/bare email address/);
    expect(sink.size).toBe(0);
  });
});

describe('SinkEmailTransport — disk containment', () => {
  it('writes exactly one file inside the mailbox directory', async () => {
    const directory = await tempMailbox();
    const sink = new SinkEmailTransport({
      from: 'no-reply@maihan-gems.invalid',
      mailboxDir: directory,
      writeToDisk: true,
    });

    const receipt = await sink.send(MESSAGE);
    const files = await readdir(directory);

    expect(files).toHaveLength(1);
    const persisted = sink.messages()[0]?.persistedPath;
    expect(persisted).toBeDefined();
    expect(persisted?.startsWith(`${resolve(directory)}${sep}`)).toBe(true);
    expect(persisted?.endsWith('.eml')).toBe(true);

    const content = await readFile(persisted as string, 'utf8');
    expect(content).toContain(`Subject: ${MESSAGE.subject}`);
    expect(content).toContain('Message-ID: <');
    expect(content).toContain(receipt.messageId);
    expect(content).toContain('multipart/alternative');
    expect(content).toContain('Thank you for your order.');
  });

  it('cannot be steered by a hostile subject or recipient', async () => {
    const directory = await tempMailbox();
    const sink = new SinkEmailTransport({
      from: 'no-reply@maihan-gems.invalid',
      mailboxDir: directory,
      writeToDisk: true,
      newMessageId: () => '../../escape',
    });

    await sink.send({
      ...MESSAGE,
      subject: '../../../../etc/passwd',
      to: 'ada@example.com',
    });

    const files = await readdir(directory);
    expect(files).toHaveLength(1);
    // The id was sanitised for the header and the filename was generated from
    // the clock and a counter; no part of the message steers the path.
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}T.*-\d{6}\.eml$/);
    expect(files[0]).not.toContain('..');
    expect(files[0]).not.toContain('escape');
  });

  it('writes nothing when writeToDisk is false', async () => {
    const directory = await tempMailbox();
    const sink = new SinkEmailTransport({
      from: 'no-reply@maihan-gems.invalid',
      mailboxDir: directory,
      writeToDisk: false,
    });
    await sink.send(MESSAGE);
    expect(await readdir(directory)).toHaveLength(0);
    expect(sink.messages()[0]?.persistedPath).toBeNull();
  });

  it('refuses a filename that escapes the root', () => {
    const root = join(tmpdir(), 'maihan-mail-root');
    expect(() => resolveMailboxFile(root, '../escape.eml')).toThrow(MailboxPathError);
    expect(() => resolveMailboxFile(root, '/absolute.eml')).toThrow(MailboxPathError);
    // A nested name is still contained; containment, not flatness, is the rule.
    expect(resolveMailboxFile(root, 'nested/file.eml')).toBe(
      join(resolve(root), 'nested', 'file.eml'),
    );
    expect(resolveMailboxFile(root, 'safe.eml')).toBe(join(resolve(root), 'safe.eml'));
  });
});
