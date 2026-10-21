import type { TenantApi } from '@lms/api';
import { ApiError } from '@lms/api';

/** What the backend accepts (LeaveAttachmentService). */
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** A problem with the file itself, before anything is sent; null when it can be uploaded. */
export function attachmentProblem(file: File): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) {
    return 'Attach a PDF, JPEG or PNG file';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'Attachments can be at most 10 MB';
  }
  if (file.size === 0) {
    return 'The file is empty';
  }
  return null;
}

/** Presigned URLs are absolute for S3; the local profile's are paths on the API's origin. */
export function resolveUploadUrl(url: string, apiBaseUrl: string): string {
  return new URL(url, apiBaseUrl || window.location.origin).toString();
}

/**
 * Attaching is two steps: the API registers the attachment and returns a presigned URL, then the file
 * goes straight to storage. Returns the attachment id to send with the leave request.
 */
export async function uploadAttachment(api: TenantApi, apiBaseUrl: string, file: File): Promise<string> {
  const { data } = await api.client.POST('/api/v1/leave-requests/attachments', {
    body: { fileName: file.name, contentType: file.type, sizeBytes: file.size },
  });
  if (!data?.uploadUrl || !data.attachmentId) {
    throw new ApiError({
      status: 0,
      errorCode: 'UNEXPECTED_RESPONSE',
      detail: 'The upload could not be started',
    });
  }
  let response: Response;
  try {
    response = await fetch(resolveUploadUrl(data.uploadUrl, apiBaseUrl), {
      method: data.method ?? 'PUT',
      headers: data.headers ?? {},
      body: file,
    });
  } catch (error) {
    throw ApiError.network(error);
  }
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      errorCode: 'UNEXPECTED_RESPONSE',
      detail: `The file could not be uploaded (${response.status})`,
    });
  }
  return data.attachmentId;
}
