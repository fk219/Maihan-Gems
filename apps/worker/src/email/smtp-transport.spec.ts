/**
 * apps/worker/src/email/smtp-transport.spec.ts
 *
 * A scripted SMTP server on 127.0.0.1, so the protocol client is exercised for
 * real without a network, a container or a credential.
 *
 * Proves:
 *   - a message is transmitted with the composed MIME structure;
 *   - dot-stuffing preserves a body line starting with `.`;
 *   - header injection is refused BEFORE a connection is opened;
 *   - a missing host / plaintext credentials fail closed at construction;
 *   - a 550 at RCPT is a delivery failure carrying the code;
 *   - a server that does not offer STARTTLS is refused, not downgraded.
 */
import { createServer, type Server, type Socket } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { EmailConfigError, EmailDeliveryError } from './port.js';
import { SmtpTransport } from './smtp-transport.js';

interface FakeSmtp {
  readonly port: number;
  readonly stats: { connections: number };
  readonly messages: string[];
  close(): Promise<void>;
}

const servers: FakeSmtp[] = [];

async function startFakeSmtp(options: { failRcpt?: boolean } = {}): Promise<FakeSmtp> {
  const messages: string[] = [];
  const stats = { connections: 0 };

  const server: Server = createServer((socket: Socket) => {
    stats.connections += 1;
    socket.setEncoding('utf8');
    socket.write('220 fake ESMTP\r\n');

    let buffer = '';
    let inData = false;
    let body = '';

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          body += buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          messages.push(body);
          body = '';
          socket.write('250 2.0.0 queued\r\n');
          continue;
        }

        const lineEnd = buffer.indexOf('\r\n');
        if (lineEnd === -1) return;
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        const command = line.split(' ')[0]?.toUpperCase() ?? '';

        if (command === 'EHLO' || command === 'HELO') {
          socket.write('250-fake\r\n250-SIZE 1048576\r\n250 8BITMIME\r\n');
        } else if (command === 'MAIL') {
          socket.write('250 2.1.0 ok\r\n');
        } else if (command === 'RCPT') {
          socket.write(options.failRcpt === true ? '550 5.1.1 no such user\r\n' : '250 2.1.5 ok\r\n');
        } else if (command === 'DATA') {
          inData = true;
          socket.write('354 go ahead\r\n');
        } else if (command === 'QUIT') {
          socket.write('221 bye\r\n');
          socket.end();
        } else {
          socket.write('250 ok\r\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('fake SMTP has no port');

  const fake: FakeSmtp = {
    port: address.port,
    stats,
    messages,
    async close(): Promise<void> {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
  servers.push(fake);
  return fake;
}

function transport(port: number, overrides: Partial<ConstructorParameters<typeof SmtpTransport>[0]> = {}): SmtpTransport {
  return new SmtpTransport({
    from: 'no-reply@maihan-gems.invalid',
    host: '127.0.0.1',
    port,
    security: 'plain',
    user: null,
    pass: null,
    allowInsecure: false,
    timeoutMs: 5_000,
    newMessageId: () => 'fixed-id',
    ...overrides,
  });
}

const MESSAGE = {
  to: 'ada@example.com',
  subject: 'Order MG-2026-000123 confirmed',
  text: 'Hello Ada,\n\nThank you for your order.\n.leading dot stays put',
  html: '<p>Hello Ada,</p>',
};

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    if (server !== undefined) await server.close();
  }
});

describe('SmtpTransport', () => {
  it('transmits a multipart message over a real socket', async () => {
    const smtp = await startFakeSmtp();
    const receipt = await transport(smtp.port).send(MESSAGE);

    expect(receipt.transport).toBe('smtp');
    expect(receipt.messageId).toBe('fixed-id@maihan-gems.invalid');
    expect(smtp.messages).toHaveLength(1);

    const raw = smtp.messages[0] ?? '';
    expect(raw).toContain('From: no-reply@maihan-gems.invalid');
    expect(raw).toContain('To: ada@example.com');
    expect(raw).toContain(`Subject: ${MESSAGE.subject}`);
    expect(raw).toContain('MIME-Version: 1.0');
    expect(raw).toContain('multipart/alternative');
    expect(raw).toContain('Thank you for your order.');
    expect(raw).toContain('..leading dot stays put');
    expect(raw).not.toContain('\r\n.leading dot stays put');
  });

  it('refuses a header injection before opening a connection', async () => {
    const smtp = await startFakeSmtp();
    await expect(
      transport(smtp.port).send({ ...MESSAGE, subject: 'Hi\r\nBcc: attacker@example.com' }),
    ).rejects.toThrow(/control character/);
    expect(smtp.stats.connections).toBe(0);
  });

  it('fails closed when the host is missing', () => {
    expect(
      () =>
        new SmtpTransport({
          from: 'no-reply@maihan-gems.invalid',
          host: '',
          port: 587,
          security: 'starttls',
          user: null,
          pass: null,
          allowInsecure: false,
          timeoutMs: 5_000,
        }),
    ).toThrow(EmailConfigError);
  });

  it('fails closed when a port is missing', () => {
    expect(
      () =>
        new SmtpTransport({
          from: 'no-reply@maihan-gems.invalid',
          host: 'smtp.example.com',
          port: Number.NaN,
          security: 'starttls',
          user: null,
          pass: null,
          allowInsecure: false,
          timeoutMs: 5_000,
        }),
    ).toThrow(/SMTP_PORT/);
  });

  it('refuses to send credentials over plaintext without an explicit override', () => {
    expect(
      () =>
        new SmtpTransport({
          from: 'no-reply@maihan-gems.invalid',
          host: 'smtp.example.com',
          port: 25,
          security: 'plain',
          user: 'user',
          pass: 'pass',
          allowInsecure: false,
          timeoutMs: 5_000,
        }),
    ).toThrow(/plaintext/);
  });

  it('reports a refused recipient with its SMTP code', async () => {
    const smtp = await startFakeSmtp({ failRcpt: true });
    const failure = await transport(smtp.port)
      .send(MESSAGE)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(EmailDeliveryError);
    expect((failure as EmailDeliveryError).code).toBe(550);
    expect(smtp.messages).toHaveLength(0);
  });

  it('refuses STARTTLS when the server does not advertise it', async () => {
    const smtp = await startFakeSmtp();
    const failure = await transport(smtp.port, { security: 'starttls' })
      .send(MESSAGE)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(EmailDeliveryError);
    expect((failure as Error).message).toMatch(/does not offer STARTTLS/);
    expect(smtp.messages).toHaveLength(0);
  });
});
