/**
 * One place for the facts every crawler-facing surface needs to agree on.
 *
 * Canonical URLs, the sitemap and the Open Graph tags all have to name the
 * same origin or search engines treat them as different sites, so the origin
 * lives here rather than being spelled out at each call site. Override it with
 * VITE_SITE_ORIGIN when building for a preview domain.
 */

const FALLBACK_ORIGIN = "https://epasiglibrary.com";

export const SITE_ORIGIN = (
  (import.meta.env?.VITE_SITE_ORIGIN as string | undefined) || FALLBACK_ORIGIN
).replace(/\/+$/, "");

export const SITE_NAME = "Pasig Knowledge Center";

export const SITE_TAGLINE = "Pasig City's public library and discovery centrum";

/** Used for link previews when a page has no image of its own. */
export const SITE_IMAGE = "/assets/images/Pasig_Knowledge_Center.png";

/**
 * Absolute URL for a site-relative path. Anything already absolute is passed
 * through untouched, so book covers served from Firebase Storage survive.
 */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Trims a description to something a search result will actually show.
 * Google renders roughly 155-160 characters; past that the tail is wasted, so
 * cut on a word boundary rather than mid-word.
 */
export function clampDescription(text: string, max = 155): string {
  const flat = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}
