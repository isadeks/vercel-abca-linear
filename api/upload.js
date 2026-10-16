/**
 * Vercel serverless function — POST /api/upload
 *
 * Accepts a JSON body { filename, mimeType } and returns a presigned S3 PUT
 * URL so the browser can upload a file directly to S3 without routing the
 * bytes through this function.
 *
 * Required env vars:
 *   S3_BUCKET              — S3 bucket name
 *   AWS_REGION             — defaults to "us-east-1"
 *   AWS_ACCESS_KEY_ID      — AWS credentials
 *   AWS_SECRET_ACCESS_KEY  — AWS credentials
 */

import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedUpload } from './_lib/s3-upload.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, mimeType } = req.body ?? {};

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename is required' });
  }
  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({ error: 'mimeType is required' });
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    return res.status(500).json({ error: 'S3_BUCKET env var not configured' });
  }

  const region = process.env.AWS_REGION ?? 'us-east-1';

  const s3Client = new S3Client({ region });

  try {
    const result = await createPresignedUpload({
      s3Client,
      getSignedUrl,
      PutObjectCommand,
      bucket,
      filename,
      mimeType,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[upload] presign error', err);
    return res.status(500).json({ error: 'Failed to create upload URL' });
  }
}
