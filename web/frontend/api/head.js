/**
 * Crawler-facing <head> for the OPAC.
 *
 * The app renders client-side, so the HTML that leaves the server is an empty
 * #root with one hardcoded <title>. Google may eventually run the JS, but
 * Bing, Facebook, Messenger and every other link-preview fetcher will not —
 * they read what arrives in the first response and nothing more.
 *
 * This function serves that same SPA shell with a real <head> stamped into
 * it: title, description, canonical, Open Graph and JSON-LD built from the
 * live catalogue. The <body> is untouched, so the page hydrates and behaves
 * identically for humans. The injected metadata always describes what the
 * rendered page actually shows, which is what separates this from cloaking.
 */

const ORIGIN = (process.env.VITE_SITE_ORIGIN || "https://epasiglibrary.com").replace(
  /\/+$/,
  "",
);
const SITE_NAME = "Pasig Knowledge Center";
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "epasiglib";
const REGION = process.env.VITE_FIREBASE_FUNCTIONS_REGION || "asia-east2";
const CATALOGUE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/opacCatalogue`;

const DEFAULT_IMAGE = `${ORIGIN}/assets/images/Pasig_Knowledge_Center.png`;

/** The catalogue is ~1.6MB; hold it per warm instance rather than per request. */
const CATALOGUE_TTL_MS = 10 * 60 * 1000;
let catalogue = { at: 0, byId: null };

/** SPA shell, fetched once per instance from the deployment's own static output. */
let shell = null;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Catalogue records carry stray leading/trailing spaces in some titles. */
const trim = (value) => String(value ?? "").trim();

const clamp = (text, max = 155) => {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")}…`;
};

async function loadShell(req) {
  if (shell) return shell;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const res = await fetch(`${proto}://${host}/index.html`, {
    headers: { Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`shell fetch failed: ${res.status}`);
  shell = await res.text();
  return shell;
}

async function loadCatalogue() {
  const now = Date.now();
  if (catalogue.byId && now - catalogue.at < CATALOGUE_TTL_MS) {
    return catalogue.byId;
  }
  const res = await fetch(CATALOGUE_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`catalogue responded ${res.status}`);
  const body = await res.json();
  const byId = new Map(
    (Array.isArray(body?.collections) ? body.collections : []).map((book) => [
      book.id,
      book,
    ]),
  );
  catalogue = { at: now, byId };
  return byId;
}

const STATIC_PAGES = {
  "/opac/home": {
    description:
      "Search the Pasig Knowledge Center catalogue — books, references and periodicals held by Pasig City's public library. Free to browse, free to borrow.",
  },
  "/opac/collections": {
    description:
      "Browse and search every title held by the Pasig Knowledge Center — books, references and periodicals, with live availability for each copy.",
  },
  "/opac/about": {
    description:
      "Pasig Knowledge Center, formerly the Pasig City Library and Discovery Centrum — opening hours, reading areas, and how to visit.",
  },
  "/opac/news_announcements": {
    description:
      "Programs, closures, new arrivals and service updates from the Pasig Knowledge Center.",
    type: "article",
  },
};

function libraryGraph() {
  return {
    "@type": "Library",
    "@id": `${ORIGIN}/#library`,
    name: SITE_NAME,
    alternateName: "Pasig City Library and Discovery Centrum",
    url: ORIGIN,
    image: DEFAULT_IMAGE,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Pasig City",
      addressRegion: "Metro Manila",
      addressCountry: "PH",
    },
    isAccessibleForFree: true,
  };
}

function bookGraph(book, url) {
  const copies = Array.isArray(book.Copies) ? book.Copies : [];
  /** Reference-only copies cannot be borrowed, so they are not availability. */
  const lendable = copies.filter((copy) => !copy?.ForLibraryUse);

  const node = {
    "@type": "Book",
    "@id": `${url}#book`,
    url,
    name: trim(book.CollectionTitle),
    inLanguage: "en",
  };

  /**
   * Roughly half the catalogue has no copy records at all. Claiming
   * OutOfStock for those would be asserting something the data does not say,
   * so the offer is omitted entirely rather than guessed.
   */
  if (lendable.length > 0) {
    node.offers = {
      "@type": "Offer",
      availability: lendable.some((copy) => copy?.Availability === "Available")
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      price: 0,
      priceCurrency: "PHP",
      seller: { "@id": `${ORIGIN}/#library` },
    };
  }

  if (book.MainAuthor) {
    node.author = { "@type": "Person", name: trim(book.MainAuthor) };
  }
  if (book.Publisher) {
    node.publisher = { "@type": "Organization", name: trim(book.Publisher) };
  }
  if (book.Description) node.description = clamp(book.Description, 300);
  if (book.CollectionImage) node.image = book.CollectionImage;
  if (/^\d{4}$/.test(String(book.PublicationYear || ""))) {
    node.datePublished = String(book.PublicationYear);
  }
  if (book.ISBN13 || book.ISBN10) node.isbn = book.ISBN13 || book.ISBN10;
  if (Array.isArray(book.Subjects) && book.Subjects.length) {
    node.about = book.Subjects;
  }
  return node;
}

/** Resolves a request path to the metadata that describes it. */
async function describe(pathname) {
  const bookMatch = pathname.match(/^\/opac\/collections\/([^/]+)\/?$/);

  if (bookMatch) {
    const id = decodeURIComponent(bookMatch[1]);
    const url = `${ORIGIN}/opac/collections/${id}`;

    try {
      const book = (await loadCatalogue()).get(id);
      if (!book) {
        return { title: "Book not found", noindex: true, canonical: url };
      }

      const bookTitle = trim(book.CollectionTitle);
      const author = trim(book.MainAuthor);

      const title = author ? `${bookTitle} — ${author}` : bookTitle;

      const description =
        book.Description ||
        [
          bookTitle,
          author && `by ${author}`,
          trim(book.Publisher),
          trim(book.PublicationYear),
        ]
          .filter(Boolean)
          .join(", ") + " — available at the Pasig Knowledge Center.";

      return {
        title,
        description,
        canonical: url,
        image: book.CollectionImage || DEFAULT_IMAGE,
        type: "book",
        graph: [
          libraryGraph(),
          bookGraph(book, url),
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              ["Home", "/opac/home"],
              ["Catalogue", "/opac/collections"],
              [bookTitle, `/opac/collections/${id}`],
            ].map(([name, path], index) => ({
              "@type": "ListItem",
              position: index + 1,
              name,
              item: `${ORIGIN}${path}`,
            })),
          },
        ],
      };
    } catch {
      /* Catalogue unreachable: fall back to the bare site name, which is
         what an omitted title already renders. */
      return { canonical: url };
    }
  }

  const page = STATIC_PAGES[pathname.replace(/\/$/, "")];
  if (page) {
    return {
      ...page,
      canonical: `${ORIGIN}${pathname.replace(/\/$/, "")}`,
      graph: [libraryGraph()],
    };
  }

  return { canonical: `${ORIGIN}${pathname}` };
}

function renderHead(meta) {
  const title = meta.title ? `${meta.title} | ${SITE_NAME}` : SITE_NAME;
  const description = meta.description ? clamp(meta.description) : null;
  const image = meta.image || DEFAULT_IMAGE;

  return [
    `<title>${escapeHtml(title)}</title>`,
    description &&
      `<meta name="description" content="${escapeHtml(description)}" />`,
    meta.canonical &&
      `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta name="robots" content="${
      meta.noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1"
    }" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type || "website")}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    description &&
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    meta.canonical &&
      `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:locale" content="en_PH" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    description &&
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    meta.graph &&
      `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@graph": meta.graph,
      }).replace(/</g, "\\u003c")}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

export default async function handler(req, res) {
  const pathname = (req.url || "/").split("?")[0];

  try {
    const [html, meta] = await Promise.all([loadShell(req), describe(pathname)]);

    /**
     * The shell's own <title> would otherwise sit alongside the injected one
     * and win by document order, so it is dropped before the new head lands.
     */
    const stripped = html.replace(/<title>.*?<\/title>/is, "");
    const injected = stripped.replace(
      /<\/head>/i,
      `    ${renderHead(meta)}\n  </head>`,
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    );
    res.status(200).send(injected);
  } catch (error) {
    /**
     * Metadata is an enhancement — if anything here fails the visitor must
     * still get a working app, so fall back to the untouched shell.
     */
    console.error(`[head] ${pathname}: ${error.message}`);
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(await loadShell(req));
    } catch {
      res.status(500).send("Internal Server Error");
    }
  }
}
