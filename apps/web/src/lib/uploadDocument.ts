import { api } from '@/lib/api';
import { convertToWebp, exceedsUploadLimit } from '@/lib/convertToWebp';

/**
 * Converts, validates and uploads a document image.
 * Retries transient failures twice (Render cold starts / network blips)
 * before surfacing an error. Throws Error with a user-friendly message.
 */
export async function uploadDocument(file: File, docType: string): Promise<string> {
  const webp = await convertToWebp(file).catch(() => file);

  if (exceedsUploadLimit(webp)) {
    throw new Error(
      'File is too large (max 5MB). If you used the camera, try again — ' +
      'or pick a smaller photo from your library.',
    );
  }

  const form = new FormData();
  form.append('file', webp);

  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await api.post(`/uploads/document?type=${docType}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      // 4xx (except 408/429) won't succeed on retry
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  const serverMsg = lastErr?.response?.data?.message;
  throw new Error(serverMsg || 'Upload failed. Please check your connection and try again.');
}
