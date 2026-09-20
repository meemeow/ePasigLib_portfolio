const FALLBACK_PATH = "updates/news/Pasig_City_Seal_Logo.png";

export function isFallbackCover(url: string | undefined): boolean {
  if (!url) return false;
  const match = url.match(/\/o\/([^?]+)/);
  if (!match || !match[1]) return false;
  try {
    return decodeURIComponent(match[1]) === FALLBACK_PATH;
  } catch {
    return false;
  }
}
