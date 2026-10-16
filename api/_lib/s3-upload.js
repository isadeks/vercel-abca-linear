/**
 * S3 presigned-upload helper.
 *
 * All AWS-SDK types are injected so this module stays framework-free and
 * unit-testable without real AWS credentials.  The Vercel function
 * (api/upload.js) wires in the real SDK; tests supply mocks.
 *
 * Required env vars (consumed by the Vercel function, not here):
 *   S3_BUCKET   — bucket name
 *   AWS_REGION  — AWS region (default: us-east-1)
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — standard AWS auth
 */

const DEFAULT_EXPIRES_IN = 300; // seconds (5 minutes)

/**
 * Derive a deterministic, URL-safe S3 object key from a filename.
 *
 * @param {string} filename - Original filename supplied by the client
 * @returns {string} S3 key, e.g. "uploads/1700000000000-my_photo.jpg"
 */
export function buildObjectKey(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new TypeError('filename must be a non-empty string');
  }
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `uploads/${ts}-${safe}`;
}

/**
 * Generate a presigned PUT URL so the browser can upload directly to S3.
 *
 * @param {object} opts
 * @param {object}   opts.s3Client          - AWS S3Client instance
 * @param {Function} opts.getSignedUrl       - AWS getSignedUrl helper
 * @param {Function} opts.PutObjectCommand   - AWS PutObjectCommand constructor
 * @param {string}   opts.bucket            - S3 bucket name
 * @param {string}   opts.filename          - Original filename from the client
 * @param {string}   opts.mimeType          - MIME type of the file
 * @param {number}  [opts.expiresIn=300]    - Seconds until the URL expires
 * @returns {Promise<{url: string, key: string, publicUrl: string}>}
 */
export async function createPresignedUpload({
  s3Client,
  getSignedUrl,
  PutObjectCommand,
  bucket,
  filename,
  mimeType,
  expiresIn = DEFAULT_EXPIRES_IN,
}) {
  if (!bucket) throw new Error('S3 bucket name is required');
  if (!filename) throw new Error('filename is required');
  if (!mimeType) throw new Error('mimeType is required');
  if (typeof getSignedUrl !== 'function') throw new TypeError('getSignedUrl must be a function');
  if (typeof PutObjectCommand !== 'function') throw new TypeError('PutObjectCommand must be a constructor');

  const key = buildObjectKey(filename);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  const publicUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

  return { url, key, publicUrl };
}
