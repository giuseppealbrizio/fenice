import type { StorageAdapter } from './types.js';

export class GcsStorageAdapter implements StorageAdapter {
  constructor(
    private readonly bucketName: string,
    private readonly projectId: string,
  ) {}

  async upload(
    _key: string,
    _data: Buffer,
    _contentType: string,
  ): Promise<string> {
    // Google Cloud Storage integration placeholder
    // npm install @google-cloud/storage when ready for production
    throw new Error(
      `GCS adapter not yet implemented. Bucket: ${this.bucketName}, Project: ${this.projectId}`,
    );
  }

  async download(_key: string): Promise<Buffer> {
    throw new Error('GCS adapter not yet implemented');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('GCS adapter not yet implemented');
  }

  async getSignedUrl(
    _key: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    throw new Error('GCS adapter not yet implemented');
  }
}
