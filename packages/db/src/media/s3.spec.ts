/**
 * packages/db/src/media/s3.spec.ts — A2 properties.
 *
 * The signer is proven against AWS's own `get-vanilla` SigV4 test vector
 * (botocore `tests/unit/auth/aws4_testsuite`), then the driver is proven
 * against a fake fetch. Nothing here touches a network or a bucket.
 */
import { describe, expect, it } from 'vitest';
import {
  EMPTY_PAYLOAD_SHA256,
  S3CompatibleStorage,
  S3StorageConfigError,
  S3StorageError,
  amzDate,
  canonicalQueryString,
  canonicalUri,
  signRequestV4,
  uriEncode,
} from './s3.js';
import { StorageKeyError, sha256Hex } from './storage.js';

const FIXED_NOW = new Date('2015-08-30T12:36:00.000Z');

describe('SigV4 against the AWS test vector', () => {
  it('reproduces the published get-vanilla signature', () => {
    const signed = signRequestV4({
      method: 'GET',
      url: 'http://example.amazonaws.com/',
      headers: { host: 'example.amazonaws.com', 'x-amz-date': '20150830T123600Z' },
      payloadHash: EMPTY_PAYLOAD_SHA256,
      region: 'us-east-1',
      service: 'service',
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      now: FIXED_NOW,
    });

    expect(signed.signedHeaders).toBe('host;x-amz-date');
    expect(signed.scope).toBe('20150830/us-east-1/service/aws4_request');
    expect(signed.canonicalRequestHash).toBe(
      'bb579772317eb040ac9ed261061d46c1f17a8133879d6129b6e1c25292927e63',
    );
    expect(signed.signature).toBe(
      '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
    expect(signed.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
        'SignedHeaders=host;x-amz-date, ' +
        'Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
  });
});

describe('signRequestV4 determinism and header set', () => {
  const base = {
    method: 'PUT',
    url: 'https://r2.example.com/maihan-media/ab/cd/abc.png?x=2&a=1',
    headers: {
      'Content-Type': 'image/png',
      'X-Amz-Content-Sha256': 'a'.repeat(64),
      'X-Amz-Date': '20150830T123600Z',
    },
    payloadHash: 'a'.repeat(64),
    region: 'auto',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'secret',
    now: FIXED_NOW,
  } as const;

  it('is deterministic for identical inputs', () => {
    expect(signRequestV4(base)).toEqual(signRequestV4(base));
  });

  it('changes when the clock, body hash or key changes', () => {
    const original = signRequestV4(base).signature;
    expect(
      signRequestV4({ ...base, now: new Date('2015-08-31T12:36:00.000Z') }).signature,
    ).not.toBe(original);
    expect(signRequestV4({ ...base, payloadHash: 'b'.repeat(64) }).signature).not.toBe(original);
    expect(signRequestV4({ ...base, secretAccessKey: 'other' }).signature).not.toBe(original);
  });

  it('signs the full sorted header set, lowercased, plus host', () => {
    const signed = signRequestV4(base);
    expect(signed.signedHeaders).toBe(
      'content-type;host;x-amz-content-sha256;x-amz-date',
    );
    expect(signed.headers['host']).toBe('r2.example.com');
    expect(signed.headers['content-type']).toBe('image/png');
    expect(signed.headers['authorization']).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/,
    );
  });

  it('uses the documented scope format', () => {
    const signed = signRequestV4({ ...base, service: 's3', region: 'eu-west-2' });
    expect(signed.scope).toMatch(/^\d{8}\/[a-z0-9-]+\/[a-z0-9]+\/aws4_request$/);
    expect(signed.scope).toBe('20150830/eu-west-2/s3/aws4_request');
    expect(signed.stringToSign.split('\n')[2]).toBe(signed.scope);
  });

  it('refuses malformed inputs instead of signing them', () => {
    expect(() => signRequestV4({ ...base, now: new Date('nope') })).toThrow(S3StorageConfigError);
    expect(() => signRequestV4({ ...base, accessKeyId: '' })).toThrow(S3StorageConfigError);
    expect(() => signRequestV4({ ...base, region: '' })).toThrow(S3StorageConfigError);
  });
});

describe('canonicalisation', () => {
  it('encodes per RFC 3986 and preserves key separators', () => {
    expect(uriEncode("a b!'()*~")).toBe('a%20b%21%27%28%29%2A~');
    expect(canonicalUri('/maihan media/a+b.png')).toBe('/maihan%20media/a%2Bb.png');
  });

  it('sorts query parameters after encoding', () => {
    expect(canonicalQueryString('?b=2&a=1&a=0&empty')).toBe('a=0&a=1&b=2&empty=');
  });

  it('formats the date in UTC without locale dependence', () => {
    expect(amzDate(FIXED_NOW)).toBe('20150830T123600Z');
  });
});

interface FakeCall {
  url: string;
  init: RequestInit;
}

function fakeFetch(respond: () => Response): { impl: typeof fetch; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond();
  }) as typeof fetch;
  return { impl, calls };
}

function storageWith(impl: typeof fetch): S3CompatibleStorage {
  return new S3CompatibleStorage({
    endpoint: 'https://r2.example.com/',
    bucket: 'maihan-media',
    region: 'auto',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'secret',
    publicBaseUrl: 'https://cdn.example.com',
    fetch: impl,
    now: () => FIXED_NOW,
  });
}

const KEY = 'ab/cd/' + 'a'.repeat(64) + '.png';

describe('S3CompatibleStorage', () => {
  it('PUTs path-style with a signed body hash and immutable metadata', async () => {
    const { impl, calls } = fakeFetch(() => new Response(null, { status: 200 }));
    const storage = storageWith(impl);
    const body = new Uint8Array([1, 2, 3]);

    const stored = await storage.put({ key: KEY, body, contentType: 'image/png' });

    expect(calls).toHaveLength(1);
    const call = calls[0] as FakeCall;
    expect(call.url).toBe(`https://r2.example.com/maihan-media/${KEY}`);
    expect(call.init.method).toBe('PUT');
    const headers = call.init.headers as Record<string, string>;
    expect(headers['authorization']).toContain('AWS4-HMAC-SHA256');
    expect(headers['x-amz-content-sha256']).toBe(sha256Hex(body));
    expect(headers['x-amz-meta-sha256']).toBe(sha256Hex(body));
    expect(headers['content-type']).toBe('image/png');
    expect(headers['host']).toBeUndefined();
    expect(stored).toEqual({
      key: KEY,
      size: 3,
      contentType: 'image/png',
      sha256: sha256Hex(body),
    });
  });

  it('GETs bytes and maps 404 to null', async () => {
    const bytes = new Uint8Array([7, 8]);
    const found = storageWith(fakeFetch(() => new Response(bytes, { status: 200 })).impl);
    expect(await found.get(KEY)).toEqual(bytes);

    const missing = storageWith(fakeFetch(() => new Response(null, { status: 404 })).impl);
    expect(await missing.get(KEY)).toBeNull();
  });

  it('HEADs metadata and maps 404 to null', async () => {
    const { impl, calls } = fakeFetch(
      () =>
        new Response(null, {
          status: 200,
          headers: {
            'content-length': '3',
            'content-type': 'image/png',
            'x-amz-meta-sha256': 'deadbeef',
          },
        }),
    );
    const storage = storageWith(impl);
    expect(await storage.head(KEY)).toEqual({
      key: KEY,
      size: 3,
      contentType: 'image/png',
      sha256: 'deadbeef',
    });
    expect(calls[0]?.init.method).toBe('HEAD');

    const missing = storageWith(fakeFetch(() => new Response(null, { status: 404 })).impl);
    expect(await missing.head(KEY)).toBeNull();
  });

  it('DELETEs idempotently and surfaces real failures', async () => {
    const ok = storageWith(fakeFetch(() => new Response(null, { status: 204 })).impl);
    await expect(ok.delete(KEY)).resolves.toBeUndefined();

    const gone = storageWith(fakeFetch(() => new Response(null, { status: 404 })).impl);
    await expect(gone.delete(KEY)).resolves.toBeUndefined();

    const broken = storageWith(fakeFetch(() => new Response('nope', { status: 500 })).impl);
    await expect(broken.delete(KEY)).rejects.toBeInstanceOf(S3StorageError);
  });

  it('builds public URLs from the configured CDN origin', () => {
    const storage = storageWith(fakeFetch(() => new Response(null, { status: 200 })).impl);
    expect(storage.publicUrl(KEY)).toBe(`https://cdn.example.com/${KEY}`);
  });

  it('refuses keys that could escape the bucket prefix', async () => {
    const storage = storageWith(fakeFetch(() => new Response(null, { status: 200 })).impl);
    await expect(
      storage.put({ key: '../escape.png', body: new Uint8Array([1]), contentType: 'image/png' }),
    ).rejects.toBeInstanceOf(StorageKeyError);
    expect(() => storage.publicUrl('/absolute.png')).toThrow(StorageKeyError);
  });
});
