import { onRequest } from "firebase-functions/v2/https";
import * as zlib from "zlib";
import {
  catalogueVersion,
  fetchOpacCatalogue,
} from "./collection";

const MAX_AGE_SECONDS = 300;

const SHARED_MAX_AGE_SECONDS = 600;

const STALE_WHILE_REVALIDATE_SECONDS = 86400;

const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 9,
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 2_000_000,
  },
};

let encoded: {
  version: number | null;
  raw: Buffer;
  gzip: Buffer;
  brotli: Buffer;
} | null = null;

async function encodedBodies(version: number | null) {
  if (encoded && encoded.version === version) return encoded;

  const records = await fetchOpacCatalogue();
  const raw = Buffer.from(JSON.stringify({ collections: records }), "utf8");

  encoded = {
    version,
    raw,
    gzip: zlib.gzipSync(raw, { level: 9 }),
    brotli: zlib.brotliCompressSync(raw, BROTLI_OPTIONS),
  };
  return encoded;
}

export const opacCatalogue = onRequest(
  {
    cors: "*",
    invoker: "public",
  },
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD");
      res.status(405).json({ error: "Use GET." });
      return;
    }

    try {
      const version = await catalogueVersion();
      const etag = `W/"catalogue-${version ?? "unversioned"}"`;

      res.set(
        "Cache-Control",
        `public, max-age=${MAX_AGE_SECONDS}, s-maxage=${SHARED_MAX_AGE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
      );
      res.set("Vary", "Accept-Encoding");
      res.set("ETag", etag);

      if (version !== null && req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }

      const bodies = await encodedBodies(version);
      res.set("Content-Type", "application/json; charset=utf-8");

      const accepts = String(req.headers["accept-encoding"] || "");
      const body = accepts.includes("br")
        ? { buffer: bodies.brotli, encoding: "br" }
        : accepts.includes("gzip")
          ? { buffer: bodies.gzip, encoding: "gzip" }
          : { buffer: bodies.raw, encoding: null };

      if (body.encoding) res.set("Content-Encoding", body.encoding);
      res.set("Content-Length", String(body.buffer.length));
      res.status(200).end(body.buffer);
    } catch (error) {
      console.error("Failed to serve the OPAC catalogue:", error);
      res.set("Cache-Control", "no-store");
      res.status(500).json({ error: "Could not load the catalogue." });
    }
  },
);
