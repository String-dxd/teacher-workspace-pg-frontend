import { postMultipart } from './http';

export type AttachmentUploadType = 'ANNOUNCEMENT' | 'CONSENT_FORM';

export interface PreUploadResponse {
  attachmentId: number;
  presignedUrl: string;
  fields: Record<string, string>;
}

const S3_TRUSTED_PATTERN = /^(.+\.)?s3([.-].+)?\.amazonaws\.com$/;
const TRUSTED_UPLOAD_ORIGINS = (
  (import.meta.env as unknown as Record<string, string | undefined>).VITE_TRUSTED_UPLOAD_ORIGINS ??
  ''
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isPresignedUrlTrusted(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  if (S3_TRUSTED_PATTERN.test(hostname)) return true;
  if (TRUSTED_UPLOAD_ORIGINS.includes(hostname)) return true;
  return false;
}

export function validateAttachmentUpload(
  file: File,
  type: AttachmentUploadType,
): Promise<PreUploadResponse> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', type);
  fd.append('mimeType', file.type);
  fd.append('fileSize', String(file.size));
  return postMultipart<PreUploadResponse>('/files/2/preUploadValidation', fd);
}

export async function uploadToPresignedUrl(
  presignedUrl: string,
  fields: Record<string, string>,
  file: File,
): Promise<void> {
  if (!isPresignedUrlTrusted(presignedUrl)) {
    throw new Error('Upload failed — please try again.');
  }
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('file', file);
  const res = await fetch(presignedUrl, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}

function unwrapEnvelope<T>(json: unknown): T {
  if (
    json !== null &&
    typeof json === 'object' &&
    'body' in json &&
    'resultCode' in json &&
    typeof (json as Record<string, unknown>).resultCode === 'number'
  ) {
    return (json as { body: T }).body;
  }
  return json as T;
}

export async function verifyAttachmentUpload(
  attachmentId: number,
  { timeoutMs = 30_000, intervalMs = 500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ verified: boolean }> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const res = await fetch(`/api/files/2/postUploadVerification?attachmentId=${attachmentId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Verification request failed: ${res.status}`);
    const text = await res.text();
    const body = text ? (unwrapEnvelope(JSON.parse(text)) as { verified?: boolean }) : {};
    if (body.verified === true) return { verified: true };
    if (Date.now() >= deadline) throw new Error('Scan timed out.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
