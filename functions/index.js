/**
 * Bandwidth Hero Proxy — Netlify Serverless Function
 *
 * Original proxy concept: ayastreb/bandwidth-hero-proxy (MIT)
 * Serverless port:        adi-g15/bandwidth-hero-proxy (MIT)
 * This repo:              himshim/bandwidth-hero-proxy2 (MIT)
 *
 * Fix 1 — CORS headers on every response so Chrome extension can validate
 * Fix 2 — Cloudflare bypass (real browser header forwarding):
 *   Technique from ukind/bandwidth-hero-proxy2 by github.com/ukind (MIT)
 *   https://github.com/ukind/bandwidth-hero-proxy2
 * Fix 3 — URL validation & SSRF protection
 * Fix 4 — 8-second fetch timeout via Promise.race()
 *          (node-fetch v2 does not support AbortController/signal)
 * Fix 5 — Reject non-image responses (e.g. Cloudflare CAPTCHA HTML pages)
 * Fix 6 — Follow HTTP->HTTPS redirect chains
 *
 * Note: x-original-size and x-bytes-saved are already returned by
 * util/compress.js inside the `g` headers object — not added again here.
 */

const pick = require("../util/pick"),
  fetch = require("node-fetch"),
  shouldCompress = require("../util/shouldCompress"),
  compress = require("../util/compress"),
  DEFAULT_QUALITY = 40;

// Fix 1: CORS headers added to every response so the Chrome extension
// can successfully validate the service URL. Without these, the browser
// blocks the extension's fetch request with a CORS error even though
// the function is working correctly.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// ---- Fix 3: URL validation & SSRF protection --------------------------------
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isPrivateHost(hostname) {
  return [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./, // AWS/GCP metadata endpoint
    /^::1$/,
  ].some((p) => p.test(hostname));
}
// -----------------------------------------------------------------------------

// ---- Fix 4: Timeout helper (works with node-fetch v2) -----------------------
function fetchWithTimeout(url, options, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("FETCH_TIMEOUT")), ms)
  );
  return Promise.race([fetch(url, options), timeout]);
}
// -----------------------------------------------------------------------------

exports.handler = async (e, t) => {
  // Handle CORS preflight OPTIONS request
  if (e.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let { url: r } = e.queryStringParameters,
    { jpeg: s, bw: o, l: a } = e.queryStringParameters;

  if (!r)
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: "Bandwidth Hero Data Compression Service",
    };

  try {
    r = JSON.parse(r);
  } catch {}
  Array.isArray(r) && (r = r.join("&url="));
  r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

  // -- Fix 3: Validate URL before doing anything with it ---------------------
  if (!isValidUrl(r)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: "Invalid URL" };
  }
  const parsedUrl = new URL(r);
  if (isPrivateHost(parsedUrl.hostname)) {
    return { statusCode: 403, headers: CORS_HEADERS, body: "Forbidden" };
  }
  // --------------------------------------------------------------------------

  let d = !s,
    n = 0 != o,
    i = parseInt(a, 10) || DEFAULT_QUALITY;

  try {
    let h = {}, c, l;

    try {
      const response = await fetchWithTimeout(
        r,
        {
          // -- Fix 2: Forward real browser headers (Cloudflare bypass) --------
          // Credit: ukind/bandwidth-hero-proxy2
          //   https://github.com/ukind/bandwidth-hero-proxy2
          // The original sent "Bandwidth-Hero Compressor" as the user-agent,
          // which Cloudflare immediately blocks as a bot. Forwarding the real
          // browser headers from the extension request fixes this.
          headers: {
            ...pick(e.headers, ["cookie", "dnt", "referer"]),
            "user-agent":
              e.headers["user-agent"] ||
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "accept":
              e.headers["accept"] ||
              "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "accept-language":
              e.headers["accept-language"] || "en-US,en;q=0.9",
            // Do NOT forward accept-encoding — Sharp needs raw bytes, not gzip
            "accept-encoding": "identity",
            "x-forwarded-for": e.headers["x-forwarded-for"] || e.ip,
            via: "1.1 bandwidth-hero",
          },
          redirect: "follow", // Fix 6: follow HTTP->HTTPS redirect chains
        },
        8000 // Fix 4: 8 second timeout
      );

      if (!response.ok) {
        return {
          statusCode: response.status || 302,
          headers: CORS_HEADERS,
          body: "",
        };
      }

      h = response.headers;
      c = await response.buffer();
      l = response.headers.get("content-type") || "";

    } catch (fetchErr) {
      if (fetchErr.message === "FETCH_TIMEOUT") {
        return {
          statusCode: 504,
          headers: CORS_HEADERS,
          body: "Upstream fetch timed out",
        };
      }
      throw fetchErr;
    }

    // -- Fix 5: Reject non-image responses ------------------------------------
    // Cloudflare returns an HTML CAPTCHA page on blocked requests.
    // Without this check Sharp tries to compress HTML and crashes silently.
    if (l && !l.startsWith("image/")) {
      console.log("Non-image content-type received:", l, "for URL:", r);
      return {
        statusCode: 415,
        headers: CORS_HEADERS,
        body: `Upstream returned non-image response (${l}). The origin may be blocking proxy requests.`,
      };
    }
    // -------------------------------------------------------------------------

    let p = c.length;

    if (!shouldCompress(l, p, d))
      return (
        console.log("Bypassing... Size: ", c.length),
        {
          statusCode: 200,
          body: c.toString("base64"),
          isBase64Encoded: !0,
          headers: { ...CORS_HEADERS, "content-encoding": "identity", ...h },
        }
      );

    {
      let { err: u, output: y, headers: g } = await compress(c, d, n, i, p);
      if (u) throw (console.log("Conversion failed: ", r), u);
      console.log(`From ${p}, Saved: ${(p - y.length) / p}%`);
      let $ = y.toString("base64");
      return {
        statusCode: 200,
        body: $,
        isBase64Encoded: !0,
        // g already contains content-type, content-length,
        // x-original-size and x-bytes-saved from util/compress.js
        headers: { ...CORS_HEADERS, "content-encoding": "identity", ...h, ...g },
      };
    }
  } catch (f) {
    return (
      console.error(f),
      { statusCode: 500, headers: CORS_HEADERS, body: f.message || "" }
    );
  }
};
