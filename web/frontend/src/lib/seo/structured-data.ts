/**
 * schema.org payloads.
 *
 * A library catalogue is one of the few things Google has purpose-built types
 * for, so the detail pages describe themselves as Books held by a Library
 * rather than as anonymous web pages. Every builder drops empty fields — a
 * key present with an empty value is worse than an absent key, because the
 * rich-result validator flags it.
 */

import { SITE_NAME, SITE_ORIGIN, absoluteUrl, clampDescription } from "@/lib/seo/site";

type Node = Record<string, unknown>;

/** Strips undefined/empty entries so the emitted JSON-LD stays valid. */
function prune(node: Node): Node {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

export const LIBRARY_ID = `${SITE_ORIGIN}/#library`;

/**
 * The library itself. Address and hours are what earn a local-search panel,
 * so they are stated here rather than left to be inferred from the About page.
 */
export function libraryNode(): Node {
  return {
    "@type": "Library",
    "@id": LIBRARY_ID,
    name: SITE_NAME,
    alternateName: "Pasig City Library and Discovery Centrum",
    url: SITE_ORIGIN,
    logo: absoluteUrl("/assets/images/PKC_logo.png"),
    image: absoluteUrl("/assets/images/Pasig_Knowledge_Center.png"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Pasig City",
      addressRegion: "Metro Manila",
      addressCountry: "PH",
    },
    areaServed: "Pasig City",
    isAccessibleForFree: true,
  };
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    publisher: { "@id": LIBRARY_ID },
    inLanguage: "en-PH",
    /**
     * Declares the catalogue search so Google can offer a search box directly
     * under the site's result. The template must be a real, working URL.
     */
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/opac/collections?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BookNodeInput {
  id: string;
  title: string;
  author?: string;
  description?: string;
  cover?: string;
  publisher?: string;
  publicationYear?: string;
  isbn10?: string;
  isbn13?: string;
  edition?: string;
  pageCount?: string | number;
  materialType?: string;
  subjects?: string[];
  /**
   * Whether a lendable copy is on the shelf right now. Left undefined when
   * the record has no copies catalogued at all — see `bookNode`.
   */
  available?: boolean;
  /** How many lendable (non-reference) copies the record holds. */
  lendableCopies?: number;
}

/** A single catalogue title, held by the library. */
export function bookNode(book: BookNodeInput): Node {
  const url = `${SITE_ORIGIN}/opac/collections/${book.id}`;
  const pages = Number(book.pageCount);

  return prune({
    "@type": "Book",
    "@id": `${url}#book`,
    url,
    name: book.title,
    author: book.author
      ? { "@type": "Person", name: book.author }
      : undefined,
    description: book.description
      ? clampDescription(book.description, 300)
      : undefined,
    image: book.cover || undefined,
    publisher: book.publisher
      ? { "@type": "Organization", name: book.publisher }
      : undefined,
    datePublished: /^\d{4}$/.test(String(book.publicationYear || ""))
      ? String(book.publicationYear)
      : undefined,
    isbn: book.isbn13 || book.isbn10 || undefined,
    bookEdition: book.edition || undefined,
    numberOfPages: Number.isFinite(pages) && pages > 0 ? pages : undefined,
    bookFormat:
      book.materialType && /book/i.test(book.materialType)
        ? "https://schema.org/Hardcover"
        : undefined,
    about: book.subjects?.length ? book.subjects : undefined,
    inLanguage: "en",
    /**
     * Borrowing is free, and the holding library is what makes this record
     * different from the same title in any other catalogue.
     *
     * Roughly half the catalogue has no copies catalogued. Emitting
     * OutOfStock for those would assert something the record does not say,
     * so the offer is dropped rather than guessed.
     */
    offers:
      (book.lendableCopies ?? 0) > 0
        ? {
            "@type": "Offer",
            availability: book.available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            price: 0,
            priceCurrency: "PHP",
            seller: { "@id": LIBRARY_ID },
          }
        : undefined,
  });
}

/** Breadcrumb trail. Renders the path under the result instead of a raw URL. */
export function breadcrumbNode(
  trail: Array<{ name: string; path: string }>,
): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Wraps nodes in the @graph envelope a page should emit as one script. */
export function graph(...nodes: Array<Node | undefined>): Node {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean) as Node[],
  };
}
