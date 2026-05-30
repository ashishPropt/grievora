import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Vultr Object Storage is S3-compatible
const s3 = new S3Client({
  endpoint: config.vultrStorage.endpoint,
  region: config.vultrStorage.region,
  credentials: {
    accessKeyId: config.vultrStorage.accessKey,
    secretAccessKey: config.vultrStorage.secretKey,
  },
  forcePathStyle: true,
});

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  const ext = originalName.split('.').pop() || 'bin';
  const key = `evidence/${uuidv4()}.${ext}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.vultrStorage.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'private',
      })
    );
    logger.info('File uploaded', { key });
    return key;
  } catch (err) {
    logger.error('File upload failed', { error: String(err) });
    throw new Error('File upload failed');
  }
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: config.vultrStorage.bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
