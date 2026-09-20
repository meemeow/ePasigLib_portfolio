export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function convertImageToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") img.src = reader.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Conversion to WebP failed"));
        },
        "image/webp",
        0.8,
      );
    };
    img.onerror = () => reject(new Error("Could not read the selected image"));

    reader.readAsDataURL(file);
  });
}

export async function fileToWebPDataUrl(file: File): Promise<string> {
  return blobToBase64(await convertImageToWebP(file));
}

export async function convertImageToWebPWithLimit(
  file: File,
  maxBytes: number,
  maxWidth: number | null = 1600,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let scale = 1;
  if (maxWidth && bitmap.width > maxWidth) {
    scale = maxWidth / bitmap.width;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const draw = (currentScale: number): void => {
    canvas.width = Math.max(1, Math.round(bitmap.width * currentScale));
    canvas.height = Math.max(1, Math.round(bitmap.height * currentScale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  };

  let quality = 0.8;
  for (let attempt = 0; attempt < 8; attempt++) {
    draw(scale);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size <= maxBytes) return blob;

    if (quality > 0.5) quality = Math.max(0.5, quality - 0.1);
    else scale *= 0.9;
  }

  draw(scale);
  const final = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.5),
  );
  if (!final) throw new Error("Conversion to WebP failed");
  return final;
}
