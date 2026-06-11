/**
 * Converts an image File to WebP format using the browser Canvas API.
 * - Downscales so the longest edge is at most MAX_EDGE px (ID docs don't need more).
 * - Retries at lower quality if the result still exceeds the server's 5MB limit.
 * - Non-image files are returned unchanged.
 */
const MAX_EDGE = 1920;
const SERVER_LIMIT = 5 * 1024 * 1024; // keep in sync with API MAX_SIZE
const TARGET_SIZE = 4.5 * 1024 * 1024; // safety margin below the limit

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

export async function convertToWebp(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }
  // Already-WebP files still go through the pipeline if oversized — they may
  // need downscaling to pass the server limit.
  if (file.type === 'image/webp' && file.size <= TARGET_SIZE) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      let blob: Blob | null = null;
      for (const quality of [0.85, 0.7, 0.55]) {
        blob = await canvasToBlob(canvas, quality);
        if (blob && blob.size <= TARGET_SIZE) break;
      }

      if (!blob) {
        resolve(file);
        return;
      }

      resolve(new File(
        [blob],
        file.name.replace(/\.[^.]+$/, '.webp'),
        { type: 'image/webp', lastModified: Date.now() },
      ));
    };

    img.onerror = () => {
      // HEIC or undecodable format — can't convert in this browser.
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/** True if the file would be rejected by the server's 5MB multer limit. */
export function exceedsUploadLimit(file: File): boolean {
  return file.size > SERVER_LIMIT;
}
