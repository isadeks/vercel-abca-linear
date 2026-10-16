import { describe, it, expect, vi } from 'vitest';
import { buildObjectKey, createPresignedUpload } from '../api/_lib/s3-upload.js';

// ── buildObjectKey ─────────────────────────────────────────────────────────

describe('buildObjectKey', () => {
  it('returns a key under the uploads/ prefix', () => {
    const key = buildObjectKey('photo.jpg');
    expect(key.startsWith('uploads/')).toBe(true);
  });

  it('includes the original filename', () => {
    const key = buildObjectKey('my-file.pdf');
    expect(key.endsWith('my-file.pdf')).toBe(true);
  });

  it('replaces unsafe characters with underscores', () => {
    const key = buildObjectKey('my file (1).jpg');
    expect(key).not.toMatch(/[ ()]/);
    expect(key).toMatch(/uploads\/\d+-my_file__1_.jpg/);
  });

  it('contains a numeric timestamp', () => {
    const before = Date.now();
    const key = buildObjectKey('x.txt');
    const after = Date.now();
    const ts = parseInt(key.split('/')[1].split('-')[0], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('throws TypeError for missing filename', () => {
    expect(() => buildObjectKey('')).toThrow(TypeError);
    expect(() => buildObjectKey(null)).toThrow(TypeError);
  });
});

// ── createPresignedUpload ──────────────────────────────────────────────────

describe('createPresignedUpload', () => {
  const makeMocks = () => {
    const fakeUrl = 'https://my-bucket.s3.amazonaws.com/uploads/key?X-Amz-Signature=abc';
    const getSignedUrl = vi.fn().mockResolvedValue(fakeUrl);
    const PutObjectCommand = vi.fn().mockImplementation((params) => ({ ...params, type: 'PutObject' }));
    const s3Client = {};
    return { getSignedUrl, PutObjectCommand, s3Client, fakeUrl };
  };

  it('returns url, key, and publicUrl', async () => {
    const { getSignedUrl, PutObjectCommand, s3Client, fakeUrl } = makeMocks();

    const result = await createPresignedUpload({
      s3Client,
      getSignedUrl,
      PutObjectCommand,
      bucket: 'my-bucket',
      filename: 'report.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.url).toBe(fakeUrl);
    expect(result.key).toMatch(/^uploads\/\d+-report\.pdf$/);
    expect(result.publicUrl).toContain('my-bucket.s3.amazonaws.com');
    expect(result.publicUrl).toContain(result.key);
  });

  it('calls PutObjectCommand with correct params', async () => {
    const { getSignedUrl, PutObjectCommand, s3Client } = makeMocks();

    await createPresignedUpload({
      s3Client,
      getSignedUrl,
      PutObjectCommand,
      bucket: 'test-bucket',
      filename: 'image.png',
      mimeType: 'image/png',
    });

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        ContentType: 'image/png',
      }),
    );
  });

  it('passes expiresIn to getSignedUrl', async () => {
    const { getSignedUrl, PutObjectCommand, s3Client } = makeMocks();

    await createPresignedUpload({
      s3Client,
      getSignedUrl,
      PutObjectCommand,
      bucket: 'b',
      filename: 'f.txt',
      mimeType: 'text/plain',
      expiresIn: 600,
    });

    expect(getSignedUrl).toHaveBeenCalledWith(
      s3Client,
      expect.anything(),
      expect.objectContaining({ expiresIn: 600 }),
    );
  });

  it('throws when bucket is missing', async () => {
    const { getSignedUrl, PutObjectCommand, s3Client } = makeMocks();
    await expect(
      createPresignedUpload({
        s3Client,
        getSignedUrl,
        PutObjectCommand,
        bucket: '',
        filename: 'f.txt',
        mimeType: 'text/plain',
      }),
    ).rejects.toThrow('S3 bucket name is required');
  });

  it('throws TypeError when getSignedUrl is not a function', async () => {
    const { PutObjectCommand, s3Client } = makeMocks();
    await expect(
      createPresignedUpload({
        s3Client,
        getSignedUrl: 'not-a-function',
        PutObjectCommand,
        bucket: 'b',
        filename: 'f.txt',
        mimeType: 'text/plain',
      }),
    ).rejects.toThrow(TypeError);
  });
});
