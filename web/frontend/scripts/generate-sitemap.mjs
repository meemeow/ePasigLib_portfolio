/**
 * Emits sitemap.xml from the live catalogue after a build.
 *
 * The OPAC renders client-side, so a crawler that lands on /opac/collections
 * has no markup to walk and no way to discover the individual titles. The
 * sitemap is what gives it the full list of book URLs up front.
 *
 * Failure here is deliberately non-fatal: a deploy that ships without a
 * refreshed sitemap is a worse-ranked site, not a broken one, so a catalogue
 * outage degrades to the static routes rather than blocking the release.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../dist");

const ORIGIN = (process.env.VITE_SITE_ORIGIN || "https://epasiglibrary.com")
  .replace(/\/+$/, "");

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "epasiglib";
const REGION = process.env.VITE_FIREBASE_FUNCTIONS_REGION || "asia-east2";
const CATALOGUE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/opacCatalogue`;

/** Google rejects a sitemap past 50k URLs; split well short of the ceiling. */
const MAX_URLS_PER_FILE = 45000;

const STATIC_ROUTES = [
  { path: "/opac/home", priority: "1.0", changefreq: "weekly" },
  { path: "/opac/collections", priority: "0.9", changefreq: "daily" },
  { path: "/opac/about", priority: "0.7", changefreq: "monthly" },
  { path: "/opac/news_announcements", priority: "0.8", changefreq: "daily" },
];

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isoDate = (millis) => {
  const stamp = Number(millis);
  if (!Number.isFinite(stamp) || stamp <= 0) return null;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

function urlEntry({ path, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${xmlEscape(`${ORIGIN}${path}`)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

const urlSet = (entries) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `${entries.map(urlEntry).join("\n")}\n` +
  `</urlset>\n`;

const sitemapIndex = (files) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  files
    .map(
      (file) =>
        `  <sitemap>\n    <loc>${xmlEscape(`${ORIGIN}/${file}`)}</loc>\n` +
        `    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </sitemap>`,
    )
    .join("\n") +
  `\n</sitemapindex>\n`;

async function fetchCatalogue() {
  const response = await fetch(CATALOGUE_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`catalogue responded ${response.status}`);
  const body = await response.json();
  return Array.isArray(body?.collections) ? body.collections : [];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let books = [];
  try {
    books = await fetchCatalogue();
    console.log(`[sitemap] catalogue returned ${books.length} records`);
  } catch (error) {
    console.warn(
      `[sitemap] catalogue unreachable (${error.message}); ` +
        `emitting static routes only`,
    );
  }

  const bookEntries = books
    /** Archived titles stay reachable but should not be advertised. */
    .filter((book) => book?.id && book?.Status !== "Archived")
    .map((book) => ({
      path: `/opac/collections/${encodeURIComponent(book.id)}`,
      lastmod: isoDate(book.ModifiedOn ?? book.CreatedOn),
      changefreq: "monthly",
      priority: "0.6",
    }));

  const staticEntries = STATIC_ROUTES.map((route) => ({
    ...route,
    lastmod: new Date().toISOString().slice(0, 10),
  }));

  const all = [...staticEntries, ...bookEntries];
  const written = [];

  if (all.length <= MAX_URLS_PER_FILE) {
    await writeFile(resolve(OUT_DIR, "sitemap.xml"), urlSet(all), "utf8");
    written.push("sitemap.xml");
  } else {
    const chunks = [];
    for (let i = 0; i < all.length; i += MAX_URLS_PER_FILE) {
      chunks.push(all.slice(i, i + MAX_URLS_PER_FILE));
    }
    const names = chunks.map((_, i) => `sitemap-${i + 1}.xml`);
    await Promise.all(
      chunks.map((chunk, i) =>
        writeFile(resolve(OUT_DIR, names[i]), urlSet(chunk), "utf8"),
      ),
    );
    await writeFile(
      resolve(OUT_DIR, "sitemap.xml"),
      sitemapIndex(names),
      "utf8",
    );
    written.push("sitemap.xml (index)", ...names);
  }

  console.log(
    `[sitemap] wrote ${written.join(", ")} — ` +
      `${staticEntries.length} static + ${bookEntries.length} title URLs`,
  );
}

main().catch((error) => {
  console.error(`[sitemap] failed: ${error.message}`);
  process.exitCode = 0;
});
