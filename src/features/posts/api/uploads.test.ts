import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({
  postMultipart: vi.fn(),
}));

import { postMultipart } from './http';
import {
  isPresignedUrlTrusted,
  uploadToPresignedUrl,
  validateAttachmentUpload,
  verifyAttachmentUpload,
} from './uploads';

describe('api/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.restoreAllMocks());

  describe('validateAttachmentUpload', () => {
    it('posts FormData to /files/2/preUploadValidation', async () => {
      vi.mocked(postMultipart).mockResolvedValue({
        attachmentId: 1,
        presignedUrl: 'https://s3.amazonaws.com/bucket',
        fields: { key: 'value' },
      });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = await validateAttachmentUpload(file, 'ANNOUNCEMENT');

      expect(postMultipart).toHaveBeenCalledTimes(1);
      const [path, formData] = vi.mocked(postMultipart).mock.calls[0];
      expect(path).toBe('/files/2/preUploadValidation');
      expect(formData).toBeInstanceOf(FormData);
      expect(result.attachmentId).toBe(1);
    });

    it('includes file metadata in FormData', async () => {
      vi.mocked(postMultipart).mockResolvedValue({
        attachmentId: 1,
        presignedUrl: 'https://s3.amazonaws.com/bucket',
        fields: {},
      });

      const file = new File(['x'.repeat(1024)], 'doc.pdf', { type: 'application/pdf' });
      await validateAttachmentUpload(file, 'CONSENT_FORM');

      const formData = vi.mocked(postMultipart).mock.calls[0][1] as FormData;
      expect(formData.get('type')).toBe('CONSENT_FORM');
      expect(formData.get('mimeType')).toBe('application/pdf');
      expect(formData.get('fileSize')).toBe('1024');
    });
  });

  describe('isPresignedUrlTrusted', () => {
    it('trusts s3.amazonaws.com URLs', () => {
      expect(isPresignedUrlTrusted('https://bucket.s3.amazonaws.com/key')).toBe(true);
      expect(isPresignedUrlTrusted('https://bucket.s3.us-east-1.amazonaws.com/key')).toBe(true);
      expect(isPresignedUrlTrusted('https://s3.amazonaws.com/bucket/key')).toBe(true);
    });

    it('rejects non-S3 URLs', () => {
      expect(isPresignedUrlTrusted('https://evil.com/upload')).toBe(false);
      expect(isPresignedUrlTrusted('https://s3.amazonaws.com.evil.com/key')).toBe(false);
    });

    it('rejects non-HTTPS URLs', () => {
      expect(isPresignedUrlTrusted('http://bucket.s3.amazonaws.com/key')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isPresignedUrlTrusted('not a url')).toBe(false);
    });
  });

  describe('uploadToPresignedUrl', () => {
    it('posts FormData to presigned URL with fields before file', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['content'], 'test.pdf');
      await uploadToPresignedUrl('https://s3.amazonaws.com/bucket', { key: 'val' }, file);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://s3.amazonaws.com/bucket');
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
    });

    it('throws if URL is not trusted', async () => {
      const file = new File(['content'], 'test.pdf');
      await expect(uploadToPresignedUrl('https://evil.com/upload', {}, file)).rejects.toThrow();
    });

    it('throws on non-OK response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

      const file = new File(['content'], 'test.pdf');
      await expect(
        uploadToPresignedUrl('https://s3.amazonaws.com/bucket', {}, file),
      ).rejects.toThrow('S3 upload failed');
    });
  });

  describe('verifyAttachmentUpload', () => {
    it('polls until verified is true', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ body: { verified: false }, resultCode: 1 }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ body: { verified: true }, resultCode: 1 }), {
            status: 200,
          }),
        );
      vi.stubGlobal('fetch', mockFetch);

      const result = await verifyAttachmentUpload(123, { intervalMs: 10, timeoutMs: 5000 });
      expect(result.verified).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws on timeout', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify({ body: { verified: false }, resultCode: 1 }), {
              status: 200,
            }),
          ),
        ),
      );

      await expect(verifyAttachmentUpload(123, { intervalMs: 10, timeoutMs: 50 })).rejects.toThrow(
        'Scan timed out',
      );
    });
  });
});
