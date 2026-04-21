import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config.js';

export const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_KEY,
    secretAccessKey: env.S3_SECRET,
  },
  forcePathStyle: true,
});

export function publicObjectUrl(key: string): string {
  const base = env.S3_ENDPOINT.replace(/\/$/, '');
  return `${base}/${env.S3_BUCKET}/${key}`;
}

export async function putPublicObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicObjectUrl(key);
}
