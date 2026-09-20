import {
  SITE_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
  absoluteUrl,
  clampDescription,
} from "@/lib/seo/site";

/**
 * Per-route document metadata.
 *
 * React 19 hoists <title>, <meta> and <link> out of the tree and into <head>
 * on its own, so these can be rendered from inside a page component without a
 * helmet library. JSON-LD is the exception: React has no hoisting rule for it,
 * and Google reads structured data from <body> just as happily, so it stays
 * where it is rendered.
 */

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export interface SeoProps {
  /** Page title, without the site name — that gets appended. */
  title?: string;
  description?: string;
  /** Site-relative path this page should be indexed under, e.g. "/opac/about". */
  canonical?: string;
  /** Link-preview image. Site-relative or absolute. */
  image?: string;
  /** og:type — "website" for landing pages, "article" for news, "book" for titles. */
  type?: "website" | "article" | "book";
  /** Keeps a page out of the index entirely (staff tooling, patron areas). */
  noindex?: boolean;
  structuredData?: JsonLd;
}

/**
 * `</script>` inside a JSON string would otherwise close the tag early and
 * spill the payload into the document as markup.
 */
function safeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}

export function Seo({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
  structuredData,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const summary = description ? clampDescription(description) : undefined;
  const url = canonical ? absoluteUrl(canonical) : undefined;
  const preview = absoluteUrl(image || SITE_IMAGE);

  return (
    <>
      <title>{fullTitle}</title>
      {summary && <meta name="description" content={summary} />}
      {url && <link rel="canonical" href={url} />}
      <meta
        name="robots"
        content={
          noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1"
        }
      />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {summary && <meta property="og:description" content={summary} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={preview} />
      <meta property="og:locale" content="en_PH" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {summary && <meta name="twitter:description" content={summary} />}
      <meta name="twitter:image" content={preview} />

      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
        />
      )}
    </>
  );
}

export { SITE_NAME, SITE_ORIGIN };
