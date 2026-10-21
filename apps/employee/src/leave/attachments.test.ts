import type { TenantApi } from '@lms/api';
import { describe, expect, it, vi } from 'vitest';
import { attachmentProblem, resolveUploadUrl, uploadAttachment } from './attachments';

const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

describe('attachmentProblem', () => {
  it('accepts PDF, JPEG and PNG up to 10 MB', () => {
    expect(attachmentProblem(file('letter.pdf', 'application/pdf', 1000))).toBeNull();
    expect(attachmentProblem(file('scan.png', 'image/png', 10 * 1024 * 1024))).toBeNull();
  });

  it('rejects other types, larger and empty files before uploading', () => {
    expect(attachmentProblem(file('notes.docx', 'application/msword', 10))).toBe(
      'Attach a PDF, JPEG or PNG file',
    );
    expect(attachmentProblem(file('scan.png', 'image/png', 10 * 1024 * 1024 + 1))).toBe(
      'Attachments can be at most 10 MB',
    );
    expect(attachmentProblem(file('empty.pdf', 'application/pdf', 0))).toBe('The file is empty');
  });
});

describe('resolveUploadUrl', () => {
  it('keeps absolute presigned URLs and resolves local paths against the API', () => {
    expect(resolveUploadUrl('https://bucket.s3.amazonaws.com/k?X-Amz=1', 'https://api.example.test')).toBe(
      'https://bucket.s3.amazonaws.com/k?X-Amz=1',
    );
    expect(resolveUploadUrl('/local/storage/k', 'http://localhost:8080')).toBe(
      'http://localhost:8080/local/storage/k',
    );
    expect(resolveUploadUrl('/local/storage/k', '')).toBe(`${window.location.origin}/local/storage/k`);
  });
});

describe('uploadAttachment', () => {
  it('registers the attachment, then PUTs the file with the presigned headers', async () => {
    const POST = vi.fn(async () => ({
      data: {
        attachmentId: 'att-1',
        uploadUrl: '/local/storage/tenants/t1/a/letter.pdf',
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
      },
    }));
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const letter = file('letter.pdf', 'application/pdf', 12);

    const id = await uploadAttachment(
      { client: { POST } } as unknown as TenantApi,
      'http://localhost:8080',
      letter,
    );

    expect(id).toBe('att-1');
    expect(POST).toHaveBeenCalledWith('/api/v1/leave-requests/attachments', {
      body: { fileName: 'letter.pdf', contentType: 'application/pdf', sizeBytes: 12 },
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/local/storage/tenants/t1/a/letter.pdf', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: letter,
    });
  });

  it('fails when storage refuses the file', async () => {
    const POST = vi.fn(async () => ({
      data: { attachmentId: 'att-1', uploadUrl: '/u', method: 'PUT', headers: {} },
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 403 })),
    );

    await expect(
      uploadAttachment({ client: { POST } } as unknown as TenantApi, '', file('a.pdf', 'application/pdf', 1)),
    ).rejects.toMatchObject({ detail: 'The file could not be uploaded (403)' });
  });
});
