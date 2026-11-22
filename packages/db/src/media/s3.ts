/**
 * packages/db/src/media/s3.ts
 *
 * Track A2 — an S3-compatible `ObjectStorage` driver with no SDK.
 *
 * Cloudflare R2 and S3 speak the same HTTP API, so the only thing this
 * package needs is AWS Signature Version 4 over the platform `fetch`. Adding
 * `@aws-sdk/client-s3` would be a runtime dependency and require an ADR
 * (AGENTS.md 6.5); the signing algorithm is small, fully specified and — most
 * importantly — testable without a network.
 *
 * Two exports matter:
 *   - `signRequestV4` is PURE. It takes a clock value, never reads one, and
 *     returns the canonical request, the string to sign and the signature.
 *     That makes it verifiable against AWS's published test vectors.
 *   - `S3CompatibleStorage` is the driver. It signs, sends, and maps HTTP
 *     status to the `ObjectStorage` contract (404 -> null, other failures ->
 *     a typed error). Path-style addressing is used because R2 and MinIO
 *     both support it and it keeps the bucket visible in the URL.
 *
 * Honest limitation: this file has been verified against the AWS SigV4 test
 * vector and against a fake fetch. It has NOT been exercised against a live
 * R2/S3 bucket in this repository.
 */
import { createHash, createHmac } from 'node:crypto';
import {
  assertSafeKey,
  sha256Hex,
  type ObjectStorage,
  type PutObjectInput,
  type StoredObject,
} from './storage.js';

const ALGORITHM = 'AWS4-HMAC-SHA256';
const DEFAULT_SERVICE = 's3';
const DEFAULT_TIMEOUT_MS = 20_000;

/** SHA-256 of zero bytes; the payload hash of every bodyless request. */
export const EMPTY_PAYLOAD_SHA256 = sha256Hex(new Uint8Array(0));

export class S3StorageConfigError extends Error {
  constructor(reason: string) {
    super(`S3_CONFIG: ${reason}`);
    this.name = 'S3StorageConfigError';
  }
}

export class S3StorageError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
  ) {
    super(`S3_${operation.toUpperCase()}_FAILED: HTTP ${status}`);
    this.name = 'S3StorageError';
  }
}

export interface SignRequestV4Input {
  readonly method: string;
  /** Absolute URL including query string. */
  readonly url: string;
  /** Request headers to sign. `host` and `x-amz-date` are derived if absent. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Hex SHA-256 of the body, or `UNSIGNED-PAYLOAD`. */
  readonly payloadHash: string;
  readonly region: string;
  /** Defaults to `s3`. */
  readonly service?: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Temporary-credential token; signed when present. */
  readonly sessionToken?: string;
  /** Injected for determinism. */
  readonly now: Date;
}

export interface SignedRequestV4 {
  readonly method: string;
  readonly url: string;
  /** Signed headers plus `authorization`. Host is included for inspection. */
  readonly headers: Readonly<Record<string, string>>;
  readonly canonicalRequest: string;
  readonly canonicalRequestHash: string;
  readonly stringToSign: string;
  readonly scope: string;
  readonly signedHeaders: string;
  readonly signature: string;
  readonly authorization: string;
}

/** RFC 3986 encoding, including the characters `encodeURIComponent` leaves. */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** S3 canonical URI: every segment encoded, `/` separators preserved. */
export function canonicalUri(pathname: string): string {
  const path = pathname.length === 0 ? '/' : pathname;
  return path
    .split('/')
    .map((segment) => uriEncode(safeDecode(segment)))
    .join('/');
}

/** Sorted, encoded query string. Repeated keys sort by encoded value. */
export function canonicalQueryString(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (raw.length === 0) return '';
  const pairs: Array<readonly [string, string]> = raw
    .split('&')
    .filter((part) => part.length > 0)
    .map((part) => {
      const separator = part.indexOf('=');
      const key = separator === -1 ? part : part.slice(0, separator);
      const value = separator === -1 ? '' : part.slice(separator + 1);
      return [uriEncode(safeDecode(key)), uriEncode(safeDecode(value))] as const;
    });
  pairs.sort(([keyA, valueA], [keyB, valueB]) => {
    if (keyA !== keyB) return keyA < keyB ? -1 : 1;
    if (valueA === valueB) return 0;
    return valueA < valueB ? -1 : 1;
  });
  return pairs.map(([key, value]) => `${key}=${value}`).join('&');
}

/** `20150830T123600Z`, always UTC, never locale-dependent. */
export function amzDate(now: Date): string {
  const iso = now.toISOString();
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, 'aws4_request');
}

function normalizeHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Sign one request. Pure: the same inputs always produce the same signature,
 * and nothing is read from the clock or the environment.
 */
export function signRequestV4(input: SignRequestV4Input): SignedRequestV4 {
  if (Number.isNaN(input.now.getTime())) {
    throw new S3StorageConfigError('now must be a valid Date');
  }
  if (input.accessKeyId.length === 0) {
    throw new S3StorageConfigError('accessKeyId is required');
  }
  if (input.secretAccessKey.length === 0) {
    throw new S3StorageConfigError('secretAccessKey is required');
  }
  if (input.region.length === 0) {
    throw new S3StorageConfigError('region is required');
  }
  if (input.payloadHash.length === 0) {
    throw new S3StorageConfigError('payloadHash is required');
  }

  const url = new URL(input.url);
  const method = input.method.toUpperCase();
  const service = input.service ?? DEFAULT_SERVICE;

  const headers = new Map<string, string>();
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    const lower = name.toLowerCase();
    if (lower === 'authorization') continue;
    headers.set(lower, normalizeHeaderValue(value));
  }
  if (!headers.has('host')) headers.set('host', url.host);
  if (!headers.has('x-amz-date')) headers.set('x-amz-date', amzDate(input.now));
  if (input.sessionToken !== undefined && !headers.has('x-amz-security-token')) {
    headers.set('x-amz-security-token', input.sessionToken);
  }

  const orderedNames = [...headers.keys()].sort();
  const canonicalHeaders = orderedNames
    .map((name) => `${name}:${headers.get(name) as string}\n`)
    .join('');
  const signedHeaders = orderedNames.join(';');

  const canonicalRequest = [
    method,
    canonicalUri(url.pathname),
    canonicalQueryString(url.search),
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join('\n');

  const canonicalRequestHash = createHash('sha256').update(canonicalRequest, 'utf8').digest('hex');
  const dateStamp = amzDate(input.now).slice(0, 8);
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;
  const stringToSign = [ALGORITHM, amzDate(input.now), scope, canonicalRequestHash].join('\n');
  const signingKey = deriveSigningKey(input.secretAccessKey, dateStamp, input.region, service);
  const signature = hmac(signingKey, stringToSign).toString('hex');
  const authorization =
    `${ALGORITHM} Credential=${input.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    method,
    url: input.url,
    headers: { ...Object.fromEntries(headers), authorization },
    canonicalRequest,
    canonicalRequestHash,
    stringToSign,
    scope,
    signedHeaders,
    signature,
    authorization,
  };
}

export interface S3CompatibleStorageOptions {
  /** Origin of the S3 API, e.g. `https://account.r2.cloudflarestorage.com`. */
  readonly endpoint: string;
  readonly bucket: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Public CDN origin that serves the bucket, used only by `publicUrl`. */
  readonly publicBaseUrl: string;
  readonly sessionToken?: string;
  /** Injectable for tests; defaults to the platform fetch. */
  readonly fetch?: typeof fetch;
  /** Injectable for deterministic signatures in tests. */
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

function requireHttpUrl(value: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new S3StorageConfigError(`${label} must be an absolute URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new S3StorageConfigError(`${label} must use http or https`);
  }
  return value.replace(/\/+$/, '');
}

/**
 * Path-style S3 driver:
 *
 *   PUT    {endpoint}/{bucket}/{key}
 *   GET    {endpoint}/{bucket}/{key}
 *   HEAD   {endpoint}/{bucket}/{key}
 *   DELETE {endpoint}/{bucket}/{key}
 *
 * Keys are guarded by `assertSafeKey`, so the object path can never be used
 * to address another bucket or escape the endpoint's path prefix.
 */
export class S3CompatibleStorage implements ObjectStorage {
  private readonly endpoint: string;
  private readonly publicBaseUrl: string;
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly timeoutMs: number;

  constructor(options: S3CompatibleStorageOptions) {
    this.endpoint = requireHttpUrl(options.endpoint, 'endpoint');
    this.publicBaseUrl = requireHttpUrl(options.publicBaseUrl, 'publicBaseUrl');
    if (options.bucket.length === 0) throw new S3StorageConfigError('bucket is required');
    if (options.region.length === 0) throw new S3StorageConfigError('region is required');
    if (options.accessKeyId.length === 0) throw new S3StorageConfigError('accessKeyId is required');
    if (options.secretAccessKey.length === 0) {
      throw new S3StorageConfigError('secretAccessKey is required');
    }
    this.bucket = options.bucket;
    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.sessionToken = options.sessionToken;
    this.fetchImpl = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private objectUrl(key: string): string {
    assertSafeKey(key);
    const encodedKey = key
      .split('/')
      .map((segment) => uriEncode(segment))
      .join('/');
    return `${this.endpoint}/${uriEncode(this.bucket)}/${encodedKey}`;
  }

  private sign(
    method: string,
    url: string,
    headers: Record<string, string>,
    payloadHash: string,
  ): SignedRequestV4 {
    return signRequestV4({
      method,
      url,
      headers,
      payloadHash,
      region: this.region,
      service: 's3',
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      ...(this.sessionToken === undefined ? {} : { sessionToken: this.sessionToken }),
      now: this.now(),
    });
  }

  private async send(signed: SignedRequestV4, body?: Uint8Array): Promise<Response> {
    // `host` is signed but must be set by the HTTP client, not by us: fetch
    // derives it from the URL and the signed value is identical.
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(signed.headers)) {
      if (name !== 'host') headers[name] = value;
    }
    const init: RequestInit = {
      method: signed.method,
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    };
    if (body !== undefined) init.body = body as unknown as RequestInit['body'];
    return this.fetchImpl(signed.url, init);
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const url = this.objectUrl(input.key);
    const payloadHash = sha256Hex(input.body);
    const signed = this.sign(
      'PUT',
      url,
      {
        'content-type': input.contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-meta-sha256': payloadHash,
      },
      payloadHash,
    );

    const response = await this.send(signed, input.body);
    if (!response.ok) throw new S3StorageError('put', response.status);

    return {
      key: input.key,
      size: input.body.byteLength,
      contentType: input.contentType,
      sha256: payloadHash,
    };
  }

  async get(key: string): Promise<Uint8Array | null> {
    const url = this.objectUrl(key);
    const signed = this.sign('GET', url, { 'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256 }, EMPTY_PAYLOAD_SHA256);
    const response = await this.send(signed);
    if (response.status === 404) return null;
    if (!response.ok) throw new S3StorageError('get', response.status);
    return new Uint8Array(await response.arrayBuffer());
  }

  async head(key: string): Promise<StoredObject | null> {
    const url = this.objectUrl(key);
    const signed = this.sign('HEAD', url, { 'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256 }, EMPTY_PAYLOAD_SHA256);
    const response = await this.send(signed);
    if (response.status === 404) return null;
    if (!response.ok) throw new S3StorageError('head', response.status);

    const size = Number(response.headers.get('content-length') ?? '0');
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const sha256 = response.headers.get('x-amz-meta-sha256') ?? '';
    return {
      key,
      size: Number.isFinite(size) ? size : 0,
      contentType,
      sha256,
    };
  }

  async delete(key: string): Promise<void> {
    const url = this.objectUrl(key);
    const signed = this.sign('DELETE', url, { 'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256 }, EMPTY_PAYLOAD_SHA256);
    const response = await this.send(signed);
    if (response.status === 404) return;
    if (!response.ok) throw new S3StorageError('delete', response.status);
  }

  publicUrl(key: string): string {
    assertSafeKey(key);
    const encodedKey = key
      .split('/')
      .map((segment) => uriEncode(segment))
      .join('/');
    return `${this.publicBaseUrl}/${encodedKey}`;
  }
}
