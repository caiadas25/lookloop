import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB cap on fetched HTML
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const REQUEST_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const;
const IMAGE_EXT_RE = /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i;

export interface ExtractedProduct {
  imageUrl: string;
  title: string;
}

/** Reject obviously private / non-routable addresses to mitigate SSRF. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  // IPv6: block loopback, link-local, unique-local.
  const v = ip.toLowerCase();
  return (
    v === "::1" ||
    v === "::" ||
    v.startsWith("fe80") ||
    v.startsWith("fc") ||
    v.startsWith("fd")
  );
}

/** Validate scheme and resolve the host, throwing if it points anywhere private. */
async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  const host = url.hostname;
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("That address is not allowed.");
  } else {
    const results = await lookup(host, { all: true });
    if (results.some((r) => isPrivateAddress(r.address))) {
      throw new Error("That host is not allowed.");
    }
  }
  return url;
}

function readableTitleFromUrl(url: URL): string {
  const filename = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  const withoutExt = filename.replace(/\.[a-z0-9]+$/i, "");
  const title = withoutExt.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return title || "Clothing item";
}

function looksLikeImageUrl(url: URL): boolean {
  return IMAGE_EXT_RE.test(url.pathname);
}

function isImageContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().split(";")[0].trim().startsWith("image/") ?? false;
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Read a page's HTML with a size cap. */
async function readHtml(res: Response): Promise<string> {
  try {
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > MAX_BYTES) {
          reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (err) {
    res.body?.cancel();
    throw err;
  }
}

/**
 * Pull a product image + title out of raw HTML.
 * Priority: og:image -> JSON-LD Product.image -> twitter:image -> largest <img>.
 * Returns null when nothing usable is found.
 */
export function extractFromHtml(html: string, baseUrl: string): ExtractedProduct | null {
  const $ = cheerio.load(html);
  const resolve = (src?: string | null): string | null => {
    if (!src) return null;
    try {
      return new URL(src, baseUrl).toString();
    } catch {
      return null;
    }
  };

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "Clothing item";

  // 1. Open Graph
  const og = resolve($('meta[property="og:image"]').attr("content"));
  if (og) return { imageUrl: og, title };

  // 2. JSON-LD Product.image
  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();
  for (const raw of scripts) {
    const img = imageFromJsonLd(raw);
    const resolved = resolve(img);
    if (resolved) return { imageUrl: resolved, title };
  }

  // 3. Twitter card
  const tw = resolve($('meta[name="twitter:image"]').attr("content"));
  if (tw) return { imageUrl: tw, title };

  // 4. Largest <img> by declared dimensions (heuristic fallback)
  let bestUrl: string | null = null;
  let bestArea = -1;
  $("img").each((_, el) => {
    const url = resolve($(el).attr("src") || $(el).attr("data-src"));
    if (!url) return;
    const w = Number($(el).attr("width")) || 0;
    const h = Number($(el).attr("height")) || 0;
    const area = w * h;
    if (area > bestArea) {
      bestArea = area;
      bestUrl = url;
    }
  });
  if (bestUrl) return { imageUrl: bestUrl, title };

  return null;
}

/** Walk a (possibly nested / @graph) JSON-LD blob looking for a Product image. */
function imageFromJsonLd(raw: string): string | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const nodes: unknown[] = Array.isArray(data) ? data : [data];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) nodes.push(...obj["@graph"]);
    const image = obj.image;
    if (typeof image === "string") return image;
    if (Array.isArray(image) && typeof image[0] === "string") return image[0];
    if (image && typeof image === "object") {
      const url = (image as Record<string, unknown>).url;
      if (typeof url === "string") return url;
    }
  }
  return null;
}

/** End-to-end: validate, fetch, and extract a product image from a store URL. */
export async function extractProduct(rawUrl: string): Promise<ExtractedProduct> {
  const url = await assertSafeUrl(rawUrl);
  const res = await fetchWithTimeout(url);
  const finalUrl = new URL(res.url);
  if (!res.ok) {
    const subject = looksLikeImageUrl(url) ? "image link" : "store";
    throw new Error(
      `The ${subject} returned ${res.status}. Paste a direct product image link or upload the image instead.`,
    );
  }

  if (isImageContentType(res.headers.get("content-type"))) {
    res.body?.cancel();
    return {
      imageUrl: finalUrl.toString(),
      title: readableTitleFromUrl(finalUrl),
    };
  }

  if (looksLikeImageUrl(url)) {
    res.body?.cancel();
    throw new Error("That image link didn't return an image. Try uploading the image instead.");
  }

  const html = await readHtml(res);
  const product = extractFromHtml(html, url.toString());
  if (!product) {
    throw new Error(
      "Couldn't find a product image on that page. Paste a direct product image link or upload the image instead.",
    );
  }
  return product;
}
