/**
 * apps/web/src/integrations/media-storage.ts
 *
 * Track A5 — resolve the configured `ObjectStorage` driver once per process.
 *
 * The API never imports a vendor SDK: both drivers come from `@maihan/db`,
 * which owns the port. `none` stays null so the media endpoint fails closed
 * with a 500 rather than redirecting to a path nothing serves.
 */
import { resolve } from 'node:path';
import type { MediaStorageConfig } from '@maihan/config';
import {
  LocalDiskStorage,
  S3CompatibleStorage,
  type ObjectStorage,
} from '@maihan/db';

export function createMediaStorage(config: MediaStorageConfig): ObjectStorage | null {
  switch (config.driver) {
    case 'none':
      return null;
    case 'local':
      return new LocalDiskStorage(resolve(config.root));
    case 's3':
      return new S3CompatibleStorage({
        endpoint: config.endpoint,
        bucket: config.bucket,
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        publicBaseUrl: config.publicBaseUrl,
      });
  }
}
