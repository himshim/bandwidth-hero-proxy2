/**
 * Bandwidth Hero Proxy — Netlify Serverless Function
 *
 * Original proxy concept: ayastreb/bandwidth-hero-proxy (MIT)
 * Serverless port:        adi-g15/bandwidth-hero-proxy (MIT)
 * This repo:              himshim/bandwidth-hero-proxy2 (MIT)
 *
 * Fix 1 — Correct validation response body ("bandwidth-hero-proxy")
 * Fix 2 — CORS headers on every response (Chrome extension requirement)
 * Fix 3 — Cloudflare bypass (real browser header forwarding)
 *          Technique from ukind/bandwidth-hero-proxy2 by github.com/ukind (MIT)
 *          https://github.com/ukind/bandwidth-hero-proxy2
 * Fix 4 — URL validation & SSRF protection
 * Fix 5 — 8-second fetch timeout via Promise.race()
 *          (node-fetch v2 does not support AbortController/signal)
 * Fix 6 — Reject non-image responses (e.g. Cloudflare CAPTCHA HTML pages)
 * Fix 7 — Follow HTTP->HTTPS redirect chains
 *
 * Note: x-original-size and x-bytes-saved are already returned by
 * util/compress.js inside the `g` headers object — not added again here.
 */

const pick = require("../util/pick"),
  fetch = require("node-fetch"),
  shouldCompress = require("../util/shouldCompress"),
  compress = require("../util/compress"),
  DEFAULT_QUALITY = 40;

// Fix 2: CORS headers on every response so Chrome extension can validate.
// netlify.toml [[headers]] does NOT apply to function responses — must be
// set here inside the function itself.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Fix 4: Validate URL is a real public http/https address, blocking
// anyone from pointing the proxy at internal/private network IPs (SSRF).
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

// Fix 5: Promise.race() timeout — node-fetch v2 does not support
// AbortController/signal, so this is the correct approach for v2.
function fetchWithTimeout(url, options, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("FETCH_TIMEOUT")), ms)
  );
  return Promise.race([fetch(url, options), timeout]);
}

exports.handler = async (e, t) => {
  // Handle CORS preflight request from browser/extension
  if (e.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let { url: r } = e.queryStringParameters,
    { jpeg: s, bw: o, l: a } = e.queryStringParameters;

  // Fix 1: Must return exactly "bandwidth-hero-proxy" — this is what the
  // Bandwidth Hero extension checks to validate the service URL.
  // The previous string "Bandwidth Hero Data Compression Service" caused
  // the extension to reject the URL with "Invalid compression service address".
  if (!r)
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: "bandwidth-hero-proxy",
    };

  try {
    r = JSON.parse(r);
  } catch {}
  Array.isArray(r) && (r = r.join("&url="));
  r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

  // Fix 4: Validate URL
  if (!isValidUrl(r)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: "Invalid URL" };
  }
  const parsedUrl = new URL(r);
  if (isPrivateHost(parsedUrl.hostname)) {
    return { statusCode: 403, headers: CORS_HEADERS, body: "Forbidden" };
  }

  let d = !s,
    n = 0 != o,
    i = parseInt(a, 10) || DEFAULT_QUALITY;

  try {
    let h = {}, c, l;

    try {
      const response = await fetchWithTimeout(
        r,
        {
          headers: {
            // Fix 3: Forward real browser headers to bypass Cloudflare bot detection.
            // Credit: ukind/bandwidth-hero-proxy2 (https://github.com/ukind/bandwidth-hero-proxy2)
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
          redirect: "follow", // Fix 7: follow HTTP->HTTPS redirect chains
        },
        8000 // Fix 5: 8 second timeout
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

    // Fix 6: Reject non-image responses.
    // Cloudflare returns HTML CAPTCHA pages on blocked requests — without
    // this check Sharp tries to compress HTML and crashes silently.
    if (l && !l.startsWith("image/")) {
      console.log("Non-image content-type received:", l, "for URL:", r);
      return {
        statusCode: 415,
        headers: CORS_HEADERS,
        body: `Upstream returned non-image response (${l}). The origin may be blocking proxy requests.`,
      };
    }

    let p = c.length;

    if (!shouldCompress(l, p, d)) {
      console.log("Bypassing... Size: ", c.length);
      return {
        statusCode: 200,
        body: c.toString("base64"),
        isBase64Encoded: true,
        headers: { ...CORS_HEADERS, "content-encoding": "identity", ...h },
      };
    }

    const { err: u, output: y, headers: g } = await compress(c, d, n, i, p);
    if (u) {
      console.log("Conversion failed: ", r);
      throw u;
    }

    console.log(`From ${p}, Saved: ${((p - y.length) / p * 100).toFixed(1)}%`);

    return {
      statusCode: 200,
      body: y.toString("base64"),
      isBase64Encoded: true,
      // g already contains content-type, content-length,
      // x-original-size and x-bytes-saved from util/compress.js
      headers: { ...CORS_HEADERS, "content-encoding": "identity", ...h, ...g },
    };

  } catch (f) {
    console.error(f);
    return { statusCode: 500, headers: CORS_HEADERS, body: f.message || "" };
  }
};
