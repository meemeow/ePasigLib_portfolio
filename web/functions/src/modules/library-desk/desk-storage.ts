import { storage } from "../../core/firebase";

export const FALLBACK_NEWS_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/epasiglib.firebasestorage.app/o/updates%2Fnews%2FPasig_City_Seal_Logo.png?alt=media&token=653a869d-3f6e-4093-933e-42445c287e0a";

const FALLBACK_NEWS_PATH = "updates/news/Pasig_City_Seal_Logo.png";

export function storagePathFromDownloadURL(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  const match = url.match(/\/o\/([^?]+)/);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function isFallbackImage(urlOrPath: unknown): boolean {
  if (typeof urlOrPath !== "string" || !urlOrPath) return false;
  if (urlOrPath === FALLBACK_NEWS_IMAGE) return true;
  const path = storagePathFromDownloadURL(urlOrPath) ?? urlOrPath;
  return path === FALLBACK_NEWS_PATH;
}

export async function safeDeleteObject(path: string | null): Promise<void> {
  if (!path || isFallbackImage(path)) return;
  try {
    await storage.bucket().file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    console.warn("Failed to delete storage object", path, error);
  }
}

export async function safeDeletePrefix(prefix: string): Promise<void> {
  if (!prefix) return;
  const folder = prefix.endsWith("/") ? prefix : `${prefix}/`;
  try {
    const [objects] = await storage.bucket().getFiles({ prefix: folder });
    await Promise.all(
      objects
        .filter((object) => !isFallbackImage(object.name))
        .map((object) => object.delete({ ignoreNotFound: true })),
    );
  } catch (error) {
    console.warn("Failed to delete storage folder", folder, error);
  }
}

export async function safeDeleteFiles(
  files: ReadonlyArray<{ URL?: string }>,
): Promise<void> {
  await Promise.all(
    files.map((file) => safeDeleteObject(storagePathFromDownloadURL(file?.URL))),
  );
}
