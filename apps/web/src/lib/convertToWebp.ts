/**
 * Converts an image File to WebP format using the browser Canvas API.
 * - If the file is already WebP, returns it as-is.
 * - Non-image files are returned unchanged.
 * - Quality: 0.85 (good balance of size vs clarity for ID cards / documents)
 */
export async function convertToWebp(file: File): Promise<File> {
  // Skip non-images or already WebP
  if (!file.type.startsWith('image/') || file.type === 'image/webp') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file); // fallback: return original
        return;
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // fallback: return original
            return;
          }
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webp'),
            { type: 'image/webp', lastModified: Date.now() },
          );
          resolve(webpFile);
        },
        'image/webp',
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback: return original
    };

    img.src = url;
  });
}
