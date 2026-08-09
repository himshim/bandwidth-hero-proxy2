/**
 * Bandwidth Hero Proxy — Netlify Serverless Function
 *
 * Original proxy concept: ayastreb/bandwidth-hero-proxy (MIT)
 * Serverless port:        adi-g15/bandwidth-hero-proxy (MIT)
 * This repo:              himshim/bandwidth-hero-proxy2 (MIT)
 */

const shouldCompress = require("../util/shouldCompress");
const compress       = require("../util/compress");
const { isValidUrl, isPrivateHost } = require("../util/validate");
const { fetchWithRedirectCheck } = require("../util/fetch");

const DEFAULT_QUALITY = 40;

const BH_VERSION = "2.0.0";
const BH_API     = 1;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Netlify-CDN-Cache-Control: CDN-only directive, stripped before the browser sees it.
//   durable   — share the cache entry across all edge nodes (not per-node).
//   s-maxage  — keep compressed images at the edge for 7 days.
//   stale-while-revalidate — serve stale while refreshing in the background.
//
// Cache-Control: browser directive — always revalidate, never serve stale.
//   Prevents the browser disk cache from serving an old colour image after
//   the user enables greyscale, or an old quality level after changing settings.
//
// Netlify-Vary: only vary the CDN cache key on the params that change the output.
//   Stray params (utm_*, fbclid, etc.) are ignored — no cache fragmentation.
const CACHE_HEADERS = {
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=604800, stale-while-revalidate=86400",
  "Cache-Control":             "public, max-age=0, must-revalidate",
  "Netlify-Vary":              "query=url|quality|bw|jpeg|max_width|l",
};

// Protocol telemetry headers exposed on every successful image response.
const BH_BACKEND_HEADERS = {
  "x-bh-backend":  "bandwidth-proxy-2",
  "x-bh-version":  BH_VERSION,
  "x-bh-api":      String(BH_API),
  "x-bh-features": "webp,grayscale,maxwidth,stats",
};

// Headers that must NOT be forwarded from the upstream origin:
//   - Hop-by-hop headers (RFC 7230 §6.1) — connection-scoped, meaningless end-to-end.
//   - Headers the proxy sets itself — forwarding them would silently override our values.
//   - Upstream security headers — scoped to the origin's domain, not ours.
//   - CDN-internal headers (Cloudflare cf-*, age, via) — irrelevant to the client.
const UPSTREAM_HEADER_DENYLIST = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
  "cache-control", "content-encoding", "content-length",
  "set-cookie", "strict-transport-security",
  "age", "via", "alt-svc", "server",
  "cf-cache-status", "cf-ray",
]);

exports.handler = async (e) => {
  if (e.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let { url: r } = e.queryStringParameters;

  // jpeg:      "1" = use JPEG (client has no WebP), "0" or absent = use WebP
  // bw:        "1" = grayscale, "0" or absent = colour
  // quality/l: compression quality 1–100.
  //            Our extension sends "quality=", original ayastreb sends "l=".
  //            Both accepted so this proxy works with either extension.
  // max_width: downscale images wider than this before compressing, 0 = no limit.
  //            Our extension sends this; original extension does not — safe to ignore.
  const { jpeg: s, bw: o, quality: q, l, max_width: mw } = e.queryStringParameters;

  if (!r) {
    return { statusCode: 200, headers: CORS_HEADERS, body: "bandwidth-hero-proxy" };
  }

  try { r = JSON.parse(r); } catch {}
  Array.isArray(r) && (r = r.join("&url="));
  r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

  if (!isValidUrl(r)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: "Invalid URL" };
  }
  const parsedUrl = new URL(r);
  if (isPrivateHost(parsedUrl.hostname)) {
    return { statusCode: 403, headers: CORS_HEADERS, body: "Forbidden" };
  }

  // useWebp: true unless client explicitly sent jpeg=1.
  const useWebp = s !== "1";

  // grayscale: only true when bw is explicitly "1".
  const grayscale = o === "1";

  // Accept both param names for compatibility with original and our extension.
  const quality  = parseInt(q || l, 10) || DEFAULT_QUALITY;

  const maxWidth = parseInt(mw, 10) || 0;

  try {
    let upstreamHeaders = {}, body, contentType;

    try {
      const response = await fetchWithRedirectCheck(
        r,
        {
          headers: {
            ...(e.headers.cookie   && { cookie:   e.headers.cookie }),
            ...(e.headers.dnt      && { dnt:      e.headers.dnt }),
            ...(e.headers.referer  && { referer:  e.headers.referer }),
            "user-agent":
              e.headers["user-agent"] ||
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "accept":
              e.headers["accept"] ||
              "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "accept-language": e.headers["accept-language"] || "en-US,en;q=0.9",
            "accept-encoding": "identity",
            "x-forwarded-for": e.headers["x-forwarded-for"] || e.ip,
            via: "1.1 bandwidth-hero",
          },
          timeout: 8000
        }
      );

      if (!response.ok) {
        return { statusCode: response.status || 302, headers: CORS_HEADERS, body: "" };
      }

      // Forward only safe, non-conflicting headers from the upstream response.
      response.headers.forEach((value, key) => {
        if (!UPSTREAM_HEADER_DENYLIST.has(key.toLowerCase())) {
          upstreamHeaders[key] = value;
        }
      });

      const arrayBuffer = await response.arrayBuffer();
      body        = Buffer.from(arrayBuffer);
      contentType = response.headers.get("content-type") || "";

    } catch (fetchErr) {
      if (fetchErr.message === "FETCH_TIMEOUT") {
        return { statusCode: 504, headers: CORS_HEADERS, body: "Upstream fetch timed out" };
      }
      throw fetchErr;
    }

    if (contentType && !contentType.startsWith("image/")) {
      console.log("Non-image content-type:", contentType, "for URL:", r);
      return {
        statusCode: 415,
        headers:    CORS_HEADERS,
        body:       `Upstream returned non-image response (${contentType})`,
      };
    }

    const originalSize = body.length;

    // useWebp doubles as the isTransparent flag: WebP supports transparency so
    // the lower 1024-byte minimum threshold applies in WebP mode, meaning almost
    // all images get compressed. In JPEG mode the higher PNG/GIF threshold applies.
    if (!shouldCompress(contentType, originalSize, useWebp)) {
      console.log("Bypassing compression. Size:", originalSize);
      return {
        statusCode:      200,
        body:            body.toString("base64"),
        isBase64Encoded: true,
        headers: {
          ...CORS_HEADERS,
          ...CACHE_HEADERS,
          "content-encoding":     "identity",
          ...upstreamHeaders,
          ...BH_BACKEND_HEADERS,
          "x-bh-original-size":   String(originalSize),
          "x-bh-compressed-size": String(originalSize),
          "x-bh-bytes-saved":     "0",
        },
      };
    }

    const { err, output, headers: compressedHeaders } = await compress(
      body, useWebp, grayscale, quality, originalSize, maxWidth
    );

    if (err) {
      console.log("Compression failed:", r);
      throw err;
    }

    console.log(
      `From ${originalSize}, saved: ${((originalSize - output.length) / originalSize * 100).toFixed(1)}%`
    );

    return {
      statusCode:      200,
      body:            output.toString("base64"),
      isBase64Encoded: true,
      headers: {
        ...CORS_HEADERS,
        ...CACHE_HEADERS,
        "content-encoding":     "identity",
        ...upstreamHeaders,
        ...compressedHeaders,
        ...BH_BACKEND_HEADERS,
        "x-bh-original-size":   String(originalSize),
        "x-bh-compressed-size": String(output.length),
        "x-bh-bytes-saved":     String(originalSize - output.length),
      },
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: CORS_HEADERS, body: err.message || "" };
  }
};